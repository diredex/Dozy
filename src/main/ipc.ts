// ipc.ts — Register all IPC channels between main and renderer
// All OS-level work stays in main; renderer only sees typed invoke/on wrappers

import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import path from 'path'
import { scanEngines, addManualEngine, removeEngine } from './engine-scanner'
import { scanToolchains } from './toolchain-scanner'
import { installVsComponent, installDotnetSdk, patchUE51EngineBug, installDotnetRuntime } from './installer'
import { startBuildQueue, cancelBuild } from './builder'
import type { PluginInfo, EngineInstall } from '../shared/types'

// ── Plugin parsing ───────────────────────────────────────────

function parseUplugin(filePath: string): PluginInfo {
  const content = readFileSync(filePath, 'utf-8')
  const json = JSON.parse(content)
  return {
    filePath,
    name: json.FriendlyName || json.Name || path.basename(filePath, '.uplugin'),
    version: json.VersionName || json.Version?.toString(),
    description: json.Description,
    engineVersion: json.EngineVersion
  }
}


// ── Output directory state ───────────────────────────────────

let currentOutputDir = ''

function getDefaultOutputDir(pluginPath?: string): string {
  if (app.isPackaged) {
    return path.join(app.getPath('documents'), 'Dozy-Output')
  }
  if (pluginPath) {
    return path.join(path.dirname(pluginPath), 'Dozy-Output')
  }
  return path.join(process.cwd(), 'Dozy-Output')
}

// ── Channel registration ─────────────────────────────────────

export function registerIpcHandlers(): void {
  // ── Engines ──────────────────────────────────────────────

  ipcMain.handle('engines:scan', async () => {
    return await scanEngines()
  })

  ipcMain.handle('engines:add', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Select Unreal Engine Root Directory',
      properties: ['openDirectory'],
      message: 'Choose the root folder of an Unreal Engine installation'
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return addManualEngine(result.filePaths[0])
  })

  ipcMain.handle('engines:remove', async (_event, enginePath: string) => {
    removeEngine(enginePath)
  })

  // ── Toolchain ────────────────────────────────────────────

  ipcMain.handle('toolchain:scan', async (_event, engines: EngineInstall[]) => {
    return await scanToolchains(engines)
  })

  ipcMain.handle(
    'toolchain:install',
    async (event, componentId: string, vsInstallPath?: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, message: 'No window' }

      if (componentId === 'dotnet-sdk') {
        return await installDotnetSdk(win)
      } else {
        return await installVsComponent(componentId, vsInstallPath, win)
      }
    }
  )

  // ── Plugin ───────────────────────────────────────────────

  ipcMain.handle('plugin:parse', async (_event, filePath: string) => {
    return parseUplugin(filePath)
  })

  ipcMain.handle('plugin:browse', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Select .uplugin File',
      filters: [{ name: 'Unreal Plugin', extensions: ['uplugin'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ── Build ────────────────────────────────────────────────

  ipcMain.handle(
    'build:start',
    async (
      event,
      pluginPath: string,
      engines: EngineInstall[],
      outputDir: string,
      targetPlatforms: string[]
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      currentOutputDir = outputDir || getDefaultOutputDir(pluginPath)
      await startBuildQueue(pluginPath, engines, currentOutputDir, targetPlatforms, win)
    }
  )

  ipcMain.handle('build:cancel', async () => {
    cancelBuild()
  })

  // ── Shell ────────────────────────────────────────────────

  ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
    shell.openPath(folderPath)
  })

  ipcMain.handle('shell:openFile', async (_event, filePath: string) => {
    shell.openPath(filePath)
  })

  // ── Settings ─────────────────────────────────────────────

  ipcMain.handle('settings:getOutputDir', async () => {
    if (!currentOutputDir) {
      currentOutputDir = getDefaultOutputDir()
    }
    return currentOutputDir
  })

  ipcMain.handle('settings:setOutputDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Output Directory'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      currentOutputDir = result.filePaths[0]
      return currentOutputDir
    }
    return null
  })

  // ── Defender ─────────────────────────────────────────────

  ipcMain.handle('settings:whitelistDefender', async (_event, dir: string) => {
    return new Promise<void>((resolve, reject) => {
      // Use Base64 encoding to avoid any quote escaping issues in PowerShell
      const script = `Add-MpPreference -ExclusionPath '${dir}'`
      const encoded = Buffer.from(script, 'utf16le').toString('base64')
      const psCommand = `Start-Process powershell -WindowStyle Hidden -Verb RunAs -ArgumentList "-NoProfile -EncodedCommand ${encoded}" -Wait`
      
      import('child_process').then(({ execFile }) => {
        execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCommand], (error) => {
          if (error) {
            reject(new Error(`Failed to add Defender exclusion. You may have cancelled the UAC prompt.`))
          } else {
            resolve()
          }
        })
      })
    })
  })

  // ── Toolchain ────────────────────────────────────────────

  ipcMain.handle('toolchain:patchUE51', async (_event, enginePath: string) => {
    await patchUE51EngineBug(enginePath)
  })

  ipcMain.handle('toolchain:installDotnetRuntime', async () => {
    return installDotnetRuntime()
  })

  // ── Theme ──────────────────────────────────────────────
  ipcMain.on('theme:set', (event, isDark: boolean) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.setBackgroundColor(isDark ? '#09090b' : '#ffffff')
    }
  })

  // ── Window Controls ────────────────────────────────────
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}

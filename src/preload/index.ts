// preload/index.ts — Typed contextBridge API
// Exposes only invoke/on wrappers; renderer has zero Node.js access

import { contextBridge, ipcRenderer } from 'electron'
import type {
  EngineInstall,
  ToolchainReport,
  PluginInfo,
  BuildJob,
  BuildResult,
  InstallProgress
} from '../shared/types'

// ── API exposed to renderer ──────────────────────────────────

const api = {
  // ── Engines ────────────────────────────────────────────
  scanEngines: (): Promise<EngineInstall[]> => ipcRenderer.invoke('engines:scan'),

  addEngine: (): Promise<EngineInstall | null> => ipcRenderer.invoke('engines:add'),

  removeEngine: (enginePath: string): Promise<void> =>
    ipcRenderer.invoke('engines:remove', enginePath),

  // ── Theme & Window ─────────────────────────────────────
  setTheme: (isDark: boolean): void => ipcRenderer.send('theme:set', isDark),
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close'),

  // ── Toolchain ──────────────────────────────────────────
  scanToolchain: (engines: EngineInstall[]): Promise<ToolchainReport[]> =>
    ipcRenderer.invoke('toolchain:scan', engines),

  installComponent: (
    componentId: string,
    vsInstallPath?: string
  ): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('toolchain:install', componentId, vsInstallPath),

  // ── Plugin ─────────────────────────────────────────────
  parsePlugin: (filePath: string): Promise<PluginInfo> =>
    ipcRenderer.invoke('plugin:parse', filePath),

  browsePlugin: (): Promise<string | null> => ipcRenderer.invoke('plugin:browse'),

  // ── Build ──────────────────────────────────────────────
  startBuild: (
    pluginPath: string,
    engines: EngineInstall[],
    outputDir: string,
    targetPlatforms: string[]
  ): Promise<void> => ipcRenderer.invoke('build:start', pluginPath, engines, outputDir, targetPlatforms),

  cancelBuild: (): Promise<void> => ipcRenderer.invoke('build:cancel'),

  // ── Build event listeners (main → renderer) ────────────
  onBuildLog: (
    callback: (data: { engineVersion: string; line: string }) => void
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { engineVersion: string; line: string }): void => {
      callback(data)
    }
    ipcRenderer.on('build:log', handler)
    return () => ipcRenderer.removeListener('build:log', handler)
  },

  onBuildProgress: (callback: (job: BuildJob) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, job: BuildJob): void => {
      callback(job)
    }
    ipcRenderer.on('build:progress', handler)
    return () => ipcRenderer.removeListener('build:progress', handler)
  },

  onBuildComplete: (callback: (result: BuildResult) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: BuildResult): void => {
      callback(result)
    }
    ipcRenderer.on('build:complete', handler)
    return () => ipcRenderer.removeListener('build:complete', handler)
  },

  onBuildQueueDone: (callback: (results: BuildResult[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, results: BuildResult[]): void => {
      callback(results)
    }
    ipcRenderer.on('build:queue-done', handler)
    return () => ipcRenderer.removeListener('build:queue-done', handler)
  },

  onInstallProgress: (callback: (progress: InstallProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: InstallProgress): void => {
      callback(progress)
    }
    ipcRenderer.on('install:progress', handler)
    return () => ipcRenderer.removeListener('install:progress', handler)
  },

  // ── Shell ──────────────────────────────────────────────
  openFolder: (folderPath: string): Promise<void> =>
    ipcRenderer.invoke('shell:openFolder', folderPath),

  openFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:openFile', filePath),

  // ── Settings ───────────────────────────────────────────
  getOutputDir: (): Promise<string> => ipcRenderer.invoke('settings:getOutputDir'),
  setOutputDir: (): Promise<string | null> => ipcRenderer.invoke('settings:setOutputDir'),
  whitelistDefender: (dir: string): Promise<void> => ipcRenderer.invoke('settings:whitelistDefender', dir),

  // ── Toolchain ──────────────────────────────────────────
  patchUE51EngineBug: (enginePath: string): Promise<void> => ipcRenderer.invoke('toolchain:patchUE51', enginePath)
}

// Expose to renderer as window.api
contextBridge.exposeInMainWorld('api', api)

// ── Type export for renderer ─────────────────────────────────
export type PbtApi = typeof api

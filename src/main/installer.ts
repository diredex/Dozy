import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { shell, BrowserWindow } from 'electron'

const execAsync = promisify(exec)

/**
 * Automates installing a specific Visual Studio component using the VS Installer.
 */
export async function installVsComponent(componentId: string, vsInstallPath: string | undefined, _win: BrowserWindow): Promise<boolean> {
  try {
    const setupPath = path.join(
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      'Microsoft Visual Studio',
      'Installer',
      'setup.exe'
    )

    if (!fs.existsSync(setupPath)) {
      shell.openExternal('https://visualstudio.microsoft.com/downloads/')
      return false
    }

    if (vsInstallPath) {
      const installCmd = `"${setupPath}" modify --installPath "${vsInstallPath}" --add ${componentId} --passive`
      await execAsync(installCmd)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Failed to install VS component:', error)
    return false
  }
}

/**
 * Directs the user to the .NET SDK download page.
 */
export async function installDotnetSdk(_win: BrowserWindow): Promise<boolean> {
  // Usually Unreal Engine requires .NET 6.0 SDK or 8.0 SDK depending on version
  await shell.openExternal('https://dotnet.microsoft.com/en-us/download/dotnet')
  return true
}

/**
 * Directly patches the UE 5.1/5.2 ConcurrentLinearAllocator.h bug 
 * that occurs when compiling with modern MSVC v14.38+.
 */
export async function patchUE51EngineBug(enginePath: string): Promise<void> {
  const headerPath = path.join(
    enginePath,
    'Engine', 'Source', 'Runtime', 'Core', 'Public', 'Experimental', 'ConcurrentLinearAllocator.h'
  )

  if (!fs.existsSync(headerPath)) {
    throw new Error(`Could not find header file at ${headerPath}`)
  }

  const content = await fs.promises.readFile(headerPath, 'utf-8')
  
  // Check if already patched
  if (content.includes('#ifndef __has_feature')) {
    return // Already patched
  }

  // Find an appropriate anchor line before the __has_feature usage
  const possibleAnchors = [
    '#if PLATFORM_HAS_ASAN_INCLUDE',
    '#if __has_include(<sanitizer/asan_interface.h>)',
    '#ifdef USE_MALLOC_BINNED3',
    '#pragma once'
  ]

  let anchorLine: string | undefined
  for (const anchor of possibleAnchors) {
    if (content.includes(anchor)) {
      anchorLine = anchor
      break
    }
  }

  if (!anchorLine) {
    throw new Error('Header file does not contain recognized structure to apply patch.')
  }

  // Inject the polyfill fix directly above the anchor line (or after #pragma once if that's the anchor)
  const replacement = anchorLine === '#pragma once' 
    ? `#pragma once\n\n#ifndef __has_feature\n\t#define __has_feature(x) 0\n#endif`
    : `#ifndef __has_feature\n\t#define __has_feature(x) 0\n#endif\n\n${anchorLine}`

  const fixedContent = content.replace(anchorLine, replacement)

  // Epic Games Launcher installs files as Read-Only. We must remove the Read-Only flag before writing.
  try {
    await fs.promises.chmod(headerPath, 0o666)
  } catch (err) {
    console.warn('Failed to chmod file, writing might fail:', err)
  }

  await fs.promises.writeFile(headerPath, fixedContent, 'utf-8')
}

/**
 * Opens the .NET 8 Desktop Runtime download page.
 * UE 5.0–5.3 build tools require .NET ≤8 because BinaryFormatter was removed in .NET 9.
 */
export async function installDotnetRuntime(): Promise<boolean> {
  await shell.openExternal('https://dotnet.microsoft.com/en-us/download/dotnet/8.0')
  return true
}

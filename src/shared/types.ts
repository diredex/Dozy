// ============================================================
// Shared type definitions — used by main, preload, and renderer
// ============================================================

// -- Engine Detection --

export type EngineSource = 'registry' | 'manifest' | 'manual'

export interface EngineInstall {
  /** Semver-style version string, e.g. "5.4.4" */
  version: string
  /** Resolved absolute path to the engine root */
  path: string
  /** How this engine was discovered */
  source: EngineSource
}

// -- Toolchain Detection --

export type ComponentKind = 'vs-component' | 'dotnet-sdk'

export interface ToolchainComponent {
  /** VS component ID or "dotnet-sdk" */
  id: string
  /** Human-readable name shown in UI */
  displayName: string
  /** Category */
  kind: ComponentKind
}

export interface ToolchainReport {
  engineVersion: string
  /** false when vswhere.exe itself is absent (no VS at all) */
  vsInstalled: boolean
  /** VS installation path (if any) */
  vsInstallPath?: string
  /** Components required but not found */
  missing: ToolchainComponent[]
}

// -- Build Flow --

export type BuildStatus = 'queued' | 'building' | 'packaging' | 'success' | 'failed' | 'cancelled'

export interface BuildJob {
  engineVersion: string
  enginePath: string
  status: BuildStatus
  logPath?: string
  outputPath?: string
  zipPath?: string
  errorSummary?: string
  actionableError?: 'missing_ue51_toolchain'
  /** Lines of live log output */
  logLines: string[]
}

export interface BuildResult {
  engineVersion: string
  enginePath: string
  success: boolean
  logPath: string
  outputPath?: string
  zipPath?: string
  zipSizeBytes?: number
  errorSummary?: string
  actionableError?: 'missing_ue51_toolchain'
}

// -- Installer --

export type InstallStatus = 'idle' | 'installing' | 'verifying' | 'complete' | 'failed'

export interface InstallProgress {
  componentId: string
  status: InstallStatus
  message?: string
}

// -- Plugin Info --

export interface PluginInfo {
  /** Absolute path to the .uplugin file */
  filePath: string
  /** Plugin name from JSON */
  name: string
  /** Version string from JSON */
  version?: string
  /** Description from JSON */
  description?: string
  /** EngineVersion field (informational only) */
  engineVersion?: string
}

// -- Settings --

export interface AppSettings {
  outputDir: string
  targetPlatforms: string[]
}

// -- IPC Channel Map --
// Typed map of all IPC channels for type-safe invoke/on wrappers

export interface IpcChannelMap {
  // Invoke (renderer → main, returns a value)
  'engines:scan': { args: []; return: EngineInstall[] }
  'engines:add': { args: []; return: EngineInstall | null }
  'engines:remove': { args: [path: string]; return: void }
  'toolchain:scan': { args: [engines: EngineInstall[]]; return: ToolchainReport[] }
  'toolchain:install': {
    args: [componentId: string, vsInstallPath?: string]
    return: { success: boolean; message: string }
  }
  'build:start': {
    args: [pluginPath: string, engines: EngineInstall[], outputDir: string, targetPlatforms: string[]]
    return: void
  }
  'build:cancel': { args: []; return: void }
  'plugin:parse': { args: [filePath: string]; return: PluginInfo }
  'plugin:browse': { args: []; return: string | null }
  'shell:openFolder': { args: [folderPath: string]; return: void }
  'shell:openFile': { args: [filePath: string]; return: void }
  'settings:getOutputDir': { args: []; return: string }
  'settings:setOutputDir': { args: []; return: string | null }
}

// Event channels (main → renderer, push-based)
export interface IpcEventMap {
  'build:log': { engineVersion: string; line: string }
  'build:progress': BuildJob
  'build:complete': BuildResult
  'build:queue-done': BuildResult[]
  'install:progress': InstallProgress
}

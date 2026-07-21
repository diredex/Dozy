// builder.ts — RunUAT BuildPlugin runner
// Sequential queue, live log streaming, error pattern extraction

import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import type { EngineInstall, BuildJob, BuildResult } from '../shared/types'
import { packagePlugin } from './packager'

// ── Known error patterns ─────────────────────────────────────

const ERROR_PATTERNS = [
  {
    pattern: /UnrealBuildTool has banned the MSVC.*$/m,
    extract: (match: RegExpMatchArray): string => match[0]
  },
  {
    pattern: /ERROR: (.+)$/m,
    extract: (match: RegExpMatchArray): string => match[1]
  },
  {
    pattern: /FAILED/i,
    extract: (): string => 'Build failed — check log for details'
  }
]

function extractErrorSummary(logContent: string): { summary: string, actionableError?: 'missing_ue51_toolchain' } | undefined {
  if (/error C4668: '__has_feature' is not defined/i.test(logContent)) {
    return { 
      summary: 'Incompatible Visual Studio 2022 compiler detected. Unreal Engine 5.1 requires an older MSVC v14.36 toolchain.',
      actionableError: 'missing_ue51_toolchain'
    }
  }

  for (const { pattern, extract } of ERROR_PATTERNS) {
    const match = logContent.match(pattern)
    if (match) return { summary: extract(match) }
  }
  return undefined
}

// ── Path validation ──────────────────────────────────────────

/**
 * Validate the .uplugin path is not inside any engine directory.
 * UAT will fail or behave unexpectedly if the plugin is inside the engine tree.
 */
export function validatePluginPath(pluginPath: string, engines: EngineInstall[]): string | null {
  const resolvedPlugin = path.resolve(pluginPath).toLowerCase()

  for (const engine of engines) {
    const resolvedEngine = path.resolve(engine.path).toLowerCase()
    if (resolvedPlugin.startsWith(resolvedEngine)) {
      return `Plugin path is inside the engine directory "${engine.path}". Move the plugin outside any engine installation before building.`
    }
  }

  if (!existsSync(pluginPath)) {
    return `Plugin file not found: ${pluginPath}`
  }

  return null // Valid
}

// ── Build runner ─────────────────────────────────────────────

let currentProcess: ChildProcessWithoutNullStreams | null = null
let cancelled = false

export function cancelBuild(): void {
  cancelled = true
  if (currentProcess) {
    currentProcess.kill('SIGTERM')
    // On Windows, also kill the whole process tree
    try {
      if (currentProcess.pid) {
        spawn('taskkill', ['/pid', String(currentProcess.pid), '/f', '/t'], { shell: true })
      }
    } catch {
      // Best effort
    }
  }
}

async function buildSingle(
  pluginPath: string,
  engine: EngineInstall,
  outputDir: string,
  targetPlatforms: string[],
  win: BrowserWindow
): Promise<BuildResult> {
  const version = engine.version
  const logDir = path.join(outputDir, 'logs')
  const logPath = path.join(logDir, `build_${version}.log`)
  const packageDir = path.join(outputDir, 'validated', version)

  mkdirSync(logDir, { recursive: true })
  mkdirSync(packageDir, { recursive: true })

  const runUatPath = path.join(engine.path, 'Engine', 'Build', 'BatchFiles', 'RunUAT.bat')
  const platforms = targetPlatforms.join('+')

  const args = [
    'BuildPlugin',
    `-Plugin="${pluginPath}"`,
    `-Package="${packageDir}"`,
    '-Rocket',
    `-TargetPlatforms=${platforms}`
  ]

  // Notify renderer: building
  const job: BuildJob = {
    engineVersion: version,
    enginePath: engine.path,
    status: 'building',
    logPath,
    logLines: []
  }
  win.webContents.send('build:progress', job)

  return new Promise<BuildResult>((resolve) => {
    const logStream = createWriteStream(logPath, { encoding: 'utf-8' })
    let fullLog = ''

    const proc = spawn(`"${runUatPath}"`, args, {
      shell: true,
      cwd: path.dirname(pluginPath),
      env: { ...process.env }
    })

    currentProcess = proc

    const handleLine = (line: string): void => {
      fullLog += line + '\n'
      logStream.write(line + '\n')
      win.webContents.send('build:log', { engineVersion: version, line })
    }

    let stdoutBuffer = ''
    proc.stdout.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() || ''
      for (const line of lines) {
        handleLine(line.replace(/\r$/, ''))
      }
    })

    let stderrBuffer = ''
    proc.stderr.on('data', (data: Buffer) => {
      stderrBuffer += data.toString()
      const lines = stderrBuffer.split('\n')
      stderrBuffer = lines.pop() || ''
      for (const line of lines) {
        handleLine(`[stderr] ${line.replace(/\r$/, '')}`)
      }
    })

    proc.on('close', async (code) => {
      // Flush remaining buffers
      if (stdoutBuffer) handleLine(stdoutBuffer)
      if (stderrBuffer) handleLine(`[stderr] ${stderrBuffer}`)
      logStream.end()

      currentProcess = null

      // Success = exit code 0 AND no "Result: Failed" in log
      const hasFailLine = /Result:\s*Failed/i.test(fullLog)
      const success = code === 0 && !hasFailLine && !cancelled

      let actionableError: BuildJob['actionableError'] = undefined
      let errorSummary: string | undefined

      if (!success) {
        if (cancelled) {
          errorSummary = 'Build cancelled by user.'
        } else {
          const parsedError = extractErrorSummary(fullLog)
          if (parsedError) {
            errorSummary = parsedError.summary
            actionableError = parsedError.actionableError
          } else {
            errorSummary = `Build exited with code ${code}`
          }
        }
      }

      let zipPath: string | undefined
      let zipSizeBytes: number | undefined

      // Package on success
      if (success) {
        win.webContents.send('build:progress', {
          ...job,
          status: 'packaging'
        } satisfies BuildJob)

        try {
          const pkgResult = await packagePlugin(pluginPath, packageDir, outputDir, version)
          zipPath = pkgResult.zipPath
          zipSizeBytes = pkgResult.sizeBytes
        } catch (err) {
          errorSummary = `Packaging failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        }
      }

      const result: BuildResult = {
        engineVersion: version,
        enginePath: job.enginePath,
        success: success && !errorSummary,
        logPath,
        outputPath: packageDir,
        zipPath,
        zipSizeBytes,
        errorSummary,
        actionableError
      }

      win.webContents.send('build:progress', {
        ...job,
        status: result.success ? 'success' : 'failed',
        outputPath: packageDir,
        zipPath,
        errorSummary,
        actionableError
      } satisfies BuildJob)

      win.webContents.send('build:complete', result)
      resolve(result)
    })

    proc.on('error', (err) => {
      logStream.end()
      currentProcess = null

      const result: BuildResult = {
        engineVersion: version,
        success: false,
        logPath,
        errorSummary: `Failed to start build process: ${err.message}`
      }

      win.webContents.send('build:progress', {
        ...job,
        status: 'failed',
        errorSummary: result.errorSummary
      } satisfies BuildJob)

      win.webContents.send('build:complete', result)
      resolve(result)
    })
  })
}

// ── Build queue ──────────────────────────────────────────────

export async function startBuildQueue(
  pluginPath: string,
  engines: EngineInstall[],
  outputDir: string,
  targetPlatforms: string[],
  win: BrowserWindow
): Promise<BuildResult[]> {
  cancelled = false
  const results: BuildResult[] = []

  // Validate plugin path before starting
  const validationError = validatePluginPath(pluginPath, engines)
  if (validationError) {
    // Send immediate failure for all engines
    for (const engine of engines) {
      const result: BuildResult = {
        engineVersion: engine.version,
        success: false,
        logPath: '',
        errorSummary: validationError
      }
      results.push(result)
      win.webContents.send('build:complete', result)
    }
    win.webContents.send('build:queue-done', results)
    return results
  }

  // Sequential execution (no parallelism — UBT thrashes CPU/disk)
  for (const engine of engines) {
    if (cancelled) {
      const result: BuildResult = {
        engineVersion: engine.version,
        success: false,
        logPath: '',
        errorSummary: 'Build was cancelled'
      }
      results.push(result)
      win.webContents.send('build:complete', result)
      continue
    }

    const result = await buildSingle(pluginPath, engine, outputDir, targetPlatforms, win)
    results.push(result)
  }

  win.webContents.send('build:queue-done', results)
  return results
}

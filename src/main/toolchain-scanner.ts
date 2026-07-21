// toolchain-scanner.ts — Detect Visual Studio installations + MSVC toolsets + .NET SDK
// Cross-references against the externalized toolchain-requirements.json

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import type { EngineInstall, ToolchainReport, ToolchainComponent } from '../shared/types'

// ── Toolchain requirements config ────────────────────────────

interface ToolchainRequirement {
  ueVersionPattern: string
  msvcComponentId: string
  msvcDisplayName: string
  windowsSdkComponentPattern: string
}

interface ToolchainConfig {
  requirements: ToolchainRequirement[]
  dotnetRequired: boolean
  dotnetMinVersion: string
}

function loadRequirements(): ToolchainConfig {
  // Try loading from the project root (works in dev and packaged builds)
  const candidates = [
    path.join(process.cwd(), 'toolchain-requirements.json'),
    path.join(__dirname, '..', '..', 'toolchain-requirements.json'),
    path.join(__dirname, '..', 'toolchain-requirements.json')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf-8')
      return JSON.parse(content) as ToolchainConfig
    }
  }

  // Fallback hardcoded minimal config
  return {
    requirements: [],
    dotnetRequired: true,
    dotnetMinVersion: '6.0.0'
  }
}

// ── vswhere integration ──────────────────────────────────────

interface VsWhereInstance {
  instanceId: string
  installationPath: string
  installationVersion: string
  displayName: string
  catalog?: {
    productLineVersion?: string
  }
  packages?: Array<{ id: string }>
}

function getVswherePath(): string | null {
  const vswhere = path.join(
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'Microsoft Visual Studio',
    'Installer',
    'vswhere.exe'
  )
  return existsSync(vswhere) ? vswhere : null
}

function runVswhere(vswherePath: string): VsWhereInstance[] {
  try {
    const output = execSync(
      `"${vswherePath}" -all -products * -format json -include packages`,
      { encoding: 'utf-8', timeout: 30_000 }
    )
    return JSON.parse(output) as VsWhereInstance[]
  } catch {
    return []
  }
}

// ── .NET SDK check ───────────────────────────────────────────

function getDotnetVersion(): string | null {
  try {
    const output = execSync('dotnet --version', {
      encoding: 'utf-8',
      timeout: 10_000
    })
    return output.trim()
  } catch {
    return null
  }
}

function isVersionGte(actual: string, minimum: string): boolean {
  const aParts = actual.split('.').map(Number)
  const mParts = minimum.split('.').map(Number)
  for (let i = 0; i < Math.max(aParts.length, mParts.length); i++) {
    const a = aParts[i] || 0
    const m = mParts[i] || 0
    if (a > m) return true
    if (a < m) return false
  }
  return true // equal
}

// ── Version pattern matching ─────────────────────────────────

function matchesVersionPattern(version: string, pattern: string): boolean {
  const vParts = version.split('.')
  const pParts = pattern.split('.')

  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i] === '*') continue
    if (vParts[i] !== pParts[i]) return false
  }
  return true
}

// ── Main scan function ───────────────────────────────────────

export async function scanToolchains(engines: EngineInstall[]): Promise<ToolchainReport[]> {
  const config = loadRequirements()
  const reports: ToolchainReport[] = []

  // Check vswhere
  const vswherePath = getVswherePath()
  if (!vswherePath) {
    // No VS installed at all
    for (const engine of engines) {
      reports.push({
        engineVersion: engine.version,
        vsInstalled: false,
        missing: [
          {
            id: 'visual-studio-2022',
            displayName: 'Visual Studio 2022 (not installed)',
            kind: 'vs-component'
          }
        ]
      })
    }
    return reports
  }

  // Get VS instances
  const vsInstances = runVswhere(vswherePath)

  // Collect all installed package IDs across all VS instances
  const allPackageIds = new Set<string>()
  let primaryVsPath = ''

  for (const instance of vsInstances) {
    if (!primaryVsPath) primaryVsPath = instance.installationPath
    if (instance.packages) {
      for (const pkg of instance.packages) {
        allPackageIds.add(pkg.id)
      }
    }
  }

  // Check .NET SDK
  const dotnetVersion = getDotnetVersion()
  const dotnetOk =
    !config.dotnetRequired || (dotnetVersion !== null && isVersionGte(dotnetVersion, config.dotnetMinVersion))

  // Build report for each engine
  for (const engine of engines) {
    const missing: ToolchainComponent[] = []

    // Find matching requirement for this engine version
    const req = config.requirements.find((r) => matchesVersionPattern(engine.version, r.ueVersionPattern))

    if (req) {
      // Check MSVC toolset
      if (!allPackageIds.has(req.msvcComponentId)) {
        missing.push({
          id: req.msvcComponentId,
          displayName: req.msvcDisplayName,
          kind: 'vs-component'
        })
      }

      // Check Windows SDK — pattern match (any Windows 10/11 SDK)
      const hasWindowsSdk = Array.from(allPackageIds).some((id) =>
        id.startsWith(req.windowsSdkComponentPattern)
      )
      if (!hasWindowsSdk) {
        missing.push({
          id: 'Microsoft.VisualStudio.Component.Windows11SDK.22621',
          displayName: 'Windows 11 SDK (10.0.22621)',
          kind: 'vs-component'
        })
      }
    }

    // Check .NET SDK
    if (!dotnetOk) {
      missing.push({
        id: 'dotnet-sdk',
        displayName: `.NET SDK ${config.dotnetMinVersion}+ (${dotnetVersion ? `found ${dotnetVersion}` : 'not found'})`,
        kind: 'dotnet-sdk'
      })
    }

    reports.push({
      engineVersion: engine.version,
      vsInstalled: vsInstances.length > 0,
      vsInstallPath: primaryVsPath || undefined,
      missing
    })
  }

  return reports
}

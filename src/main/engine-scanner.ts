// engine-scanner.ts — Detect installed Unreal Engine instances
// Sources: Windows Registry, Epic Manifests, User-added (manual)

import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import type { EngineInstall, EngineSource } from '../shared/types'

// ── Registry scanning ────────────────────────────────────────

function scanRegistry(): Map<string, { path: string; source: EngineSource }> {
  const found = new Map<string, { path: string; source: EngineSource }>()

  try {
    const output = execSync(
      'reg query "HKLM\\SOFTWARE\\EpicGames\\Unreal Engine" /s',
      { encoding: 'utf-8', timeout: 10_000 }
    )

    // Each subkey block looks like:
    //   HKEY_LOCAL_MACHINE\SOFTWARE\EpicGames\Unreal Engine\5.4
    //       InstalledDirectory    REG_SZ    C:\Program Files\Epic Games\UE_5.4
    const lines = output.split('\n')
    let currentPath: string | null = null

    for (const line of lines) {
      const dirMatch = line.match(/InstalledDirectory\s+REG_SZ\s+(.+)/i)
      if (dirMatch) {
        currentPath = dirMatch[1].trim()
        if (currentPath) {
          const resolved = path.resolve(currentPath)
          found.set(resolved, { path: resolved, source: 'registry' })
        }
      }
    }
  } catch {
    // Registry key doesn't exist or reg.exe failed — not an error, just no engines found
  }

  return found
}

// ── Manifest scanning ────────────────────────────────────────

function scanManifests(): Map<string, { path: string; source: EngineSource }> {
  const found = new Map<string, { path: string; source: EngineSource }>()

  const manifestDir = path.join(
    process.env.ProgramData || 'C:\\ProgramData',
    'Epic',
    'EpicGamesLauncher',
    'Data',
    'Manifests'
  )

  if (!existsSync(manifestDir)) return found

  try {
    const files = readdirSync(manifestDir).filter((f) => f.endsWith('.item'))

    for (const file of files) {
      try {
        const content = readFileSync(path.join(manifestDir, file), 'utf-8')
        const manifest = JSON.parse(content)

        if (
          typeof manifest.AppName === 'string' &&
          manifest.AppName.startsWith('UE_') &&
          typeof manifest.InstallLocation === 'string'
        ) {
          const resolved = path.resolve(manifest.InstallLocation)
          // Don't overwrite registry entries (registry is higher priority)
          if (!found.has(resolved)) {
            found.set(resolved, { path: resolved, source: 'manifest' })
          }
        }
      } catch {
        // Single manifest parse failure — skip it, continue
      }
    }
  } catch {
    // Can't read manifest directory — not fatal
  }

  return found
}

// ── Validation ───────────────────────────────────────────────

interface BuildVersion {
  MajorVersion: number
  MinorVersion: number
  PatchVersion: number
}

/**
 * Validate an engine path by:
 * 1. Reading Build.version for authoritative version
 * 2. Confirming RunUAT.bat exists
 *
 * Returns null if validation fails.
 */
export function validateEnginePath(
  enginePath: string,
  source: EngineSource
): EngineInstall | null {
  const resolved = path.resolve(enginePath)

  // Check Build.version
  const buildVersionPath = path.join(resolved, 'Engine', 'Build', 'Build.version')
  if (!existsSync(buildVersionPath)) return null

  let buildVersion: BuildVersion
  try {
    const content = readFileSync(buildVersionPath, 'utf-8')
    buildVersion = JSON.parse(content)
  } catch {
    return null
  }

  if (
    typeof buildVersion.MajorVersion !== 'number' ||
    typeof buildVersion.MinorVersion !== 'number' ||
    typeof buildVersion.PatchVersion !== 'number'
  ) {
    return null
  }

  // Check RunUAT.bat exists
  const runUatPath = path.join(resolved, 'Engine', 'Build', 'BatchFiles', 'RunUAT.bat')
  if (!existsSync(runUatPath)) return null

  const version = `${buildVersion.MajorVersion}.${buildVersion.MinorVersion}.${buildVersion.PatchVersion}`

  return {
    version,
    path: resolved,
    source
  }
}

// ── Main scan function ───────────────────────────────────────

/** Manually added engines (persisted in memory for the session) */
const manualEngines = new Map<string, { path: string; source: EngineSource }>()

export function addManualEngine(enginePath: string): EngineInstall | null {
  const resolved = path.resolve(enginePath)
  const validated = validateEnginePath(resolved, 'manual')
  if (validated) {
    manualEngines.set(resolved, { path: resolved, source: 'manual' })
  }
  return validated
}

export function removeEngine(enginePath: string): void {
  const resolved = path.resolve(enginePath)
  manualEngines.delete(resolved)
}

/**
 * Scan all sources, merge, deduplicate by resolved path, validate each.
 * Returns only engines that pass validation.
 */
export async function scanEngines(): Promise<EngineInstall[]> {
  // Collect candidates from all sources
  const candidates = new Map<string, { path: string; source: EngineSource }>()

  // Registry first (highest priority label)
  const registryResults = scanRegistry()
  for (const [key, val] of registryResults) {
    candidates.set(key, val)
  }

  // Manifest fallback (won't overwrite registry entries)
  const manifestResults = scanManifests()
  for (const [key, val] of manifestResults) {
    if (!candidates.has(key)) {
      candidates.set(key, val)
    }
  }

  // Manual additions
  for (const [key, val] of manualEngines) {
    if (!candidates.has(key)) {
      candidates.set(key, val)
    }
  }

  // Validate each candidate
  const engines: EngineInstall[] = []
  for (const [, candidate] of candidates) {
    const validated = validateEnginePath(candidate.path, candidate.source)
    if (validated) {
      engines.push(validated)
    }
  }

  // Sort by version descending (newest first)
  engines.sort((a, b) => {
    const aParts = a.version.split('.').map(Number)
    const bParts = b.version.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if ((bParts[i] || 0) !== (aParts[i] || 0)) {
        return (bParts[i] || 0) - (aParts[i] || 0)
      }
    }
    return 0
  })

  return engines
}

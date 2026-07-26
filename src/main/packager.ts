// packager.ts — Strip + zip plugin output for Fab/Marketplace submission
// Strips Intermediate/Saved from a copy, zips to submission/<Plugin>_<ver>.zip

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs'
import path from 'path'
import archiver from 'archiver'
import { createWriteStream } from 'fs'

// ── Directories to strip ─────────────────────────────────────
// Epic Games Fab/Marketplace guidelines require submission zips to contain ONLY
// source code (Source/, Resources/, Config/, Content/, .uplugin).
// Binaries/, Intermediate/, and Saved/ MUST be stripped before uploading.

const STRIP_DIRS = new Set(['binaries', 'intermediate', 'saved'])

// ── Copy directory tree, skipping stripped dirs ──────────────

function copyDirFiltered(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })

  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      if (STRIP_DIRS.has(entry.name.toLowerCase())) {
        continue // Skip stripped directories
      }
      copyDirFiltered(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// ── Find the actual plugin root inside UAT's output ──────────
// UAT wraps the plugin inside HostProject/Plugins/<PluginName>/
// We need to find and extract just the plugin folder.

function findPluginRoot(buildOutputDir: string, pluginName: string): string {
  // Standard UAT output structure: <buildOutputDir>/HostProject/Plugins/<PluginName>/
  const hostProjectPath = path.join(buildOutputDir, 'HostProject', 'Plugins', pluginName)
  if (existsSync(hostProjectPath)) {
    // Verify it actually has content (a .uplugin file or Binaries/)
    const upluginFile = path.join(hostProjectPath, `${pluginName}.uplugin`)
    if (existsSync(upluginFile)) {
      return hostProjectPath
    }
    // Try case-insensitive search inside the Plugins directory
    const pluginsDir = path.join(buildOutputDir, 'HostProject', 'Plugins')
    if (existsSync(pluginsDir)) {
      const entries = readdirSync(pluginsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const candidate = path.join(pluginsDir, entry.name)
          // Look for any .uplugin file inside
          const candidateFiles = readdirSync(candidate)
          if (candidateFiles.some(f => f.endsWith('.uplugin'))) {
            return candidate
          }
        }
      }
    }
  }

  // Fallback: check if the build output itself has a .uplugin at root level
  try {
    const rootFiles = readdirSync(buildOutputDir)
    if (rootFiles.some(f => f.endsWith('.uplugin'))) {
      return buildOutputDir
    }
  } catch {
    // Directory might not exist
  }

  // Last resort: return the build output dir as-is
  return buildOutputDir
}

// ── Check if a directory has actual content ──────────────────

function dirHasContent(dir: string): boolean {
  if (!existsSync(dir)) return false
  try {
    const entries = readdirSync(dir)
    // Check for actual plugin files, not just empty directories
    return entries.some(entry => {
      const fullPath = path.join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isFile()) return true
      if (stat.isDirectory() && !STRIP_DIRS.has(entry.toLowerCase())) {
        return dirHasContent(fullPath)
      }
      return false
    })
  } catch {
    return false
  }
}

// ── Zip a directory ──────────────────────────────────────────

function zipDirectory(sourceDir: string, outPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      resolve(archive.pointer()) // size in bytes
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
}

// ── Main package function ────────────────────────────────────

export interface PackageResult {
  zipPath: string
  sizeBytes: number
}

/**
 * Package a successfully built plugin:
 * 1. Find the actual plugin content inside UAT's HostProject wrapper
 * 2. Copy it, stripping Intermediate/Saved (but keeping Binaries!)
 * 3. Zip the stripped copy for submission
 *
 * @param pluginPath - Path to the original .uplugin file (used to derive plugin name)
 * @param buildOutputDir - Path to the validated build output (the -Package dir)
 * @param outputRoot - Root output directory (where submission/ lives)
 * @param version - Engine version string for naming
 */
export async function packagePlugin(
  pluginPath: string,
  buildOutputDir: string,
  outputRoot: string,
  version: string
): Promise<PackageResult> {
  // Derive plugin name from .uplugin filename
  const pluginName = path.basename(pluginPath, '.uplugin')

  // Find the actual plugin root inside UAT's output structure
  const pluginRoot = findPluginRoot(buildOutputDir, pluginName)

  // Verify the plugin root has actual content
  if (!dirHasContent(pluginRoot)) {
    throw new Error(`Build output is empty — no plugin files found in ${pluginRoot}`)
  }

  const submissionDir = path.join(outputRoot, 'submission')
  mkdirSync(submissionDir, { recursive: true })

  // Create a temp stripped copy
  const strippedDir = path.join(outputRoot, '_stripped_temp', version)
  if (existsSync(strippedDir)) {
    // Clean previous
    const { rmSync } = await import('fs')
    rmSync(strippedDir, { recursive: true, force: true })
  }

  // Copy with filtering — from the PLUGIN root, not the HostProject wrapper
  copyDirFiltered(pluginRoot, strippedDir)

  // Zip
  const zipPath = path.join(submissionDir, `${pluginName}_${version}.zip`)
  const sizeBytes = await zipDirectory(strippedDir, zipPath)

  // Clean up temp stripped dir
  try {
    const { rmSync } = await import('fs')
    rmSync(strippedDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }

  return { zipPath, sizeBytes }
}

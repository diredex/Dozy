// packager.ts — Strip + zip plugin output for Fab/Marketplace submission
// Strips Binaries/Intermediate/Saved from a copy, zips to submission/<Plugin>_<ver>.zip

import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs'
import path from 'path'
import archiver from 'archiver'
import { createWriteStream } from 'fs'

// ── Directories to strip ─────────────────────────────────────

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
 * 1. Copy build output, stripping Binaries/Intermediate/Saved
 * 2. Zip the stripped copy for submission
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

  const submissionDir = path.join(outputRoot, 'submission')
  mkdirSync(submissionDir, { recursive: true })

  // Create a temp stripped copy
  const strippedDir = path.join(outputRoot, '_stripped_temp', version)
  if (existsSync(strippedDir)) {
    // Clean previous
    const { rmSync } = await import('fs')
    rmSync(strippedDir, { recursive: true, force: true })
  }

  // Copy with filtering
  copyDirFiltered(buildOutputDir, strippedDir)

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

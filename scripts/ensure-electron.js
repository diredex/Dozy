const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function ensureElectron() {
  const electronDist = path.join(__dirname, '../node_modules/electron/dist');
  const electronExe = path.join(electronDist, 'electron.exe');
  const pathTxt = path.join(__dirname, '../node_modules/electron/path.txt');

  if (fs.existsSync(electronExe) && fs.existsSync(pathTxt)) {
    return; // Already installed and intact
  }

  console.log('⚠️ Electron binary missing (likely blocked by Defender or folder move). Repairing...');

  try {
    const { downloadArtifact } = require('@electron/get');
    const { version } = require('../node_modules/electron/package.json');

    // This won't actually download if it's cached, it just returns the path to the cached zip
    const zipPath = await downloadArtifact({
      version,
      artifactName: 'electron',
      platform: 'win32',
      arch: process.arch,
      force: false
    });

    console.log('📦 Found cached Electron zip:', zipPath);
    console.log('🔧 Force extracting via PowerShell to bypass Node I/O blocks...');

    // Use PowerShell's Expand-Archive to safely bypass Node's I/O lock
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${electronDist}' -Force"`, { stdio: 'inherit' });

    // Write path.txt WITHOUT trailing newline
    fs.writeFileSync(pathTxt, 'electron.exe');

    console.log('✅ Electron successfully repaired!');
  } catch (error) {
    console.error('❌ Failed to repair Electron:', error);
    process.exit(1);
  }
}

ensureElectron();

<div align="center">
  <img src="DozyLogo.png" alt="Dozy Logo" width="160" />
  <h1>Dozy 🐑</h1>
  <p><strong>The ultimate automated build & packaging tool for Unreal Engine Plugins</strong></p>

  <p>
    <a href="https://github.com/diredex/Dozy/releases"><img src="https://img.shields.io/github/v/release/diredex/Dozy?style=for-the-badge&color=007AFF" alt="Version" /></a>
    <a href="https://github.com/diredex/Dozy/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&color=007AFF" alt="License" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white" alt="Electron" /></a>
  </p>
  
  <p>
    <i>Stop fighting with batch scripts. Start shipping your plugins faster.</i>
  </p>
</div>

<br />

## 🌟 The Problem it Solves
Shipping a plugin to the Unreal Engine Marketplace or Fab requires building your code against **every supported engine version** individually, extracting the correct files, and zipping them up perfectly. Historically, this meant maintaining fragile batch scripts or running the `RunUAT` command line tool manually over and over.

**Dozy** is a cross-platform desktop application that automates this entire pipeline. Drag and drop your `.uplugin`, select your target engines, and click Build. Dozy handles the rest.

<br />

## ✨ Core Features

<table>
  <tr>
    <td width="50%">
      <h3>🛠️ Multi-Version Compilation</h3>
      <p>Instantly build your plugin against multiple Unreal Engine versions simultaneously. Dozy automatically detects all engine installations (Launcher & Source builds) on your system.</p>
    </td>
    <td width="50%">
      <h3>📦 Fab-Ready Packaging</h3>
      <p>Dozy runs the official Unreal Automation Tool (UAT) HostProject step, strips unnecessary intermediate files, and automatically creates a `.zip` structured exactly how Epic Games requires.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🛡️ Defender Auto-Whitelisting</h3>
      <p>UnrealBuildTool dynamically generates code that Windows Defender Smart App Control frequently flags and kills. Dozy seamlessly adds your output directories to Defender's exclusion list for uninterrupted builds.</p>
    </td>
    <td width="50%">
      <h3>🎨 Beautiful, Responsive UI</h3>
      <p>Built with React, Tailwind CSS, and shadcn/ui. Enjoy a modern, sleek dark-mode interface with smooth animations and live build logs.</p>
    </td>
  </tr>
</table>

<br />

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+
- **Unreal Engine**: At least one installation (Launcher or Source)
- **Visual Studio**: With the Desktop development with C++ workload installed

### Installation & Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/diredex/Dozy.git
   cd Dozy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```

### 🛠️ Building for Production
To build a production-ready `.exe` installer for Windows:
```bash
npm run build:win
```
The output installer will be located in the `dist` directory.

<br />

## 🤝 Open Source Community

Dozy is proudly open-source and welcomes community contributions!

* **[Contributing Guidelines](CONTRIBUTING.md)**: Read our guide to learn how to run the app locally and submit a pull request.
* **[Code of Conduct](CODE_OF_CONDUCT.md)**: We enforce a respectful, welcoming community standard.
* **[Security Policy](SECURITY.md)**: Found a vulnerability? Read our policy on how to responsibly disclose it.

### Submitting Issues
If you encounter a bug or have a feature request, please use the provided [Issue Templates](https://github.com/diredex/Dozy/issues/new/choose) to ensure we have all the context we need to help!

<br />

## 📝 License
This project is open-sourced under the [MIT License](LICENSE).

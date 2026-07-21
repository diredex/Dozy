<div align="center">
  <img src="DozyLogo.png" alt="Dozy Logo" width="128" />
  <h1>Dozy</h1>
  <p><strong>The ultimate automated build tool for Unreal Engine Plugins</strong></p>
</div>

Dozy 🐑 is a sleek, cross-platform desktop application that automates Unreal Engine plugin builds across multiple engine versions and packages submission-ready ZIPs for Fab and the Unreal Engine Marketplace.

## ✨ Features
* **Multi-Version Compilation:** Instantly build your plugin against multiple Unreal Engine versions simultaneously.
* **Automated Packaging:** Automatically creates `.zip` files properly structured for Fab and Marketplace submission.
* **Windows Defender Whitelisting:** Seamlessly adds your output directories to Defender's exclusion list to prevent UnrealBuildTool's temporary C# compilers from triggering Smart App Control.
* **Beautiful UI:** Built on modern web tech with a sleek, dark-mode, animated interface.

## 🚀 Tech Stack
* **Framework:** [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/)
* **Frontend:** [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
* **Font:** Inter, JetBrains Mono, & Quicksand

## 📦 Getting Started

### Prerequisites
* Node.js (v18+)
* Unreal Engine installations (Epic Games Launcher or Source builds)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Dozy.git
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

## 🛠️ Building for Production
To build a production-ready `.exe` installer for Windows:

```bash
npm run build:win
```
The output installer will be located in the `dist` directory.

## 🤝 Contributing
Contributions, issues and feature requests are welcome! Feel free to check the [issues page](#).

## 📝 License
This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.

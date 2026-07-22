# Contributing to Dozy

First off, thank you for considering contributing to Dozy! It's people like you that make Dozy such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Setting up your environment

1. **Prerequisites**: Ensure you have Node.js (v20.x or later) installed.
2. **Fork & Clone**: Fork the repo and clone your fork locally.
3. **Install dependencies**: Run `npm install` in the project root.
4. **Run the app**: Run `npm run dev` to start the Electron dev server with hot-reload.

## Development Workflow

- The main Electron process code is in `src/main`.
- The React UI (renderer) is in `src/renderer`.
- Shared types are in `src/shared`.

Please ensure that your code passes the TypeScript compiler checks by running `npm run typecheck` before submitting a pull request.

## Pull Requests

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes (`npm run typecheck` and `npm run build:win`).
5. Issue that pull request!

## Code Style

- Use `npm run dev` to verify the application still runs locally.
- Follow the existing style conventions (Tailwind CSS, React functional components).

Thank you for contributing!

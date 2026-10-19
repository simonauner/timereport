# Timereport

Time reporting in the browser. A static site built with Vite, React and
TypeScript, deployed to GitHub Pages at <https://www.auner.se/timereport/>.

## Getting started

```bash
nvm use
npm install
npm run dev
```

| Command             | What it does                   |
| ------------------- | ------------------------------ |
| `npm run dev`       | Dev server on localhost:5173   |
| `npm run build`     | Typecheck and build to `dist/` |
| `npm run preview`   | Serve the build from `dist/`   |
| `npm run lint`      | oxlint                         |
| `npm run typecheck` | tsc                            |
| `npm run format`    | Prettier                       |

## Deploying

[GitHub Actions](.github/workflows/deploy.yml) checks and builds every push
and pull request, and deploys pushes to `main` to GitHub Pages. The site is
served from `/<repo>/`; the workflow passes that to Vite as
`PAGES_BASE_PATH`.

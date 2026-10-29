# Timereport

Time reporting in the browser. A static site built with Vite, React and
TypeScript, styled with shadcn/ui on Base UI and Tailwind CSS, deployed to GitHub Pages at <https://www.auner.se/timereport/>.

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

## Home screen and offline

The site can be added to the home screen and opens without signal.
[vite-plugin-pwa](https://vite-pwa-org.netlify.app/) in
[vite.config.ts](vite.config.ts) writes the web app manifest and a service
worker that precaches the build. A new version is fetched in the
background and shown the next time the app is opened. The icons in
[public/](public/) are made from `public/icon.png`, with the settings in
[pwa-assets.config.ts](pwa-assets.config.ts):

```bash
npx @vite-pwa/assets-generator
```

`vite preview` needs the same `PAGES_BASE_PATH` as the build, or the service
worker isn't found.

## Sync between devices

Times and settings are kept in `localStorage`, every value under its own key
with when it was set, so copies from two devices merge with the latest
change to each key winning ([src/lib/userData.ts](src/lib/userData.ts)).
Turning on sync under Settings creates a random secret; other devices
connect with a private link, a QR code, a pairing code or a recovery key
([src/lib/sync.ts](src/lib/sync.ts)). There are no accounts.

[sync/](sync/) is the sync server: a Cloudflare Worker with one Durable
Object per synced list in SQLite, stored under a hash of the secret, and one
more for pairing codes. It is the same as season-o-meter's, without friends
and share links.

The app only offers sync when it's built with `VITE_SYNC_URL`, which the
deploy workflow takes from the `SYNC_URL` repository variable.

```bash
cd sync
npm install
npm run dev     # http://localhost:8787, accepts http://localhost:5173
VITE_SYNC_URL=http://localhost:8787 npm run dev   # in the root, for the app
```

## Deploying

[GitHub Actions](.github/workflows/deploy.yml) checks and builds every push
and pull request, and deploys pushes to `main` to GitHub Pages, and the
sync server to Cloudflare with the `CLOUDFLARE_API_TOKEN` repository secret. The site is
served from `/<repo>/`; the workflow passes that to Vite as
`PAGES_BASE_PATH`.

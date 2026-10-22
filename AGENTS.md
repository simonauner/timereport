# Notes for agents

[README.md](README.md) describes the project. This is what it takes to work
on it.

## Node version

The repository needs Node 24 ([.nvmrc](.nvmrc)), but a new shell may start
with an older default. Check with `node -v` and switch with nvm before
running anything. Shell state doesn't carry over between commands, so do it
in the same command:

```sh
source ~/.nvm/nvm.sh && nvm use && npm run typecheck
```

## Checks

The same as CI ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)),
after `npm ci`:

```sh
npm run lint
npm run typecheck
npm test
npx prettier --check .
```

`npm test` checks [src/lib](src/lib) against the cases in
[fixtures/](fixtures/), which the Android app's logic in
[android/core](android/core) is checked against too. A change to how times
are worked out goes in both, and `npm run fixtures` rewrites what the cases
expect. The Kotlin side needs a JDK, 17 or later:
`cd android && ./gradlew :core:test`
([.github/workflows/android.yml](.github/workflows/android.yml) runs it, and
builds the app).

The sync server in [sync/](sync/) has its own dependencies:
`npm ci --prefix sync && npm run typecheck --prefix sync`. It imports
`src/lib/userData.ts`, `syncProtocol.ts` and `pairingCode.ts`, so changes
to the stored keys need the server deployed too.

## UI

The UI is built from [shadcn/ui](https://ui.shadcn.com/) components on
[Base UI](https://base-ui.com/), styled with Tailwind CSS v4
([components.json](components.json), style `base-nova`). Use the standard
components in [src/components/ui/](src/components/ui/) and their variants
rather than styling elements by hand, and add missing ones with the CLI:

```sh
npx shadcn@latest add <component>
```

Files in `src/components/ui/` are kept as shadcn writes them, so they can be
updated with `npx shadcn@latest add <component> --diff`; Prettier and oxlint
skip them. Theme colors are the CSS variables in
[src/index.css](src/index.css); dark mode is the `dark` class, set from the
system setting in [index.html](index.html).

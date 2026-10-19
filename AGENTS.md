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
npx prettier --check .
```

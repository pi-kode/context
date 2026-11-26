# Contributing to @pi-kode/context

## Prerequisites

- Node.js 22+
- npm

## Local Development

Install dependencies without generating a lockfile (this repository does not commit `package-lock.json`):

```sh
npm install --no-package-lock
```

Run typechecking:

```sh
npm run typecheck
```

## Project Structure

- `index.ts` — package entry point exported to `pi`.
- `lib/src/features/context.ts` — extension entry point with single-registration guard.
- `lib/src/extensions/context.ts` — `pi` lifecycle hooks (`session_*`, `resources_discover`, `before_agent_start`, `tool_result`) and `/pk-memory`, `/pk-prompt` commands.
- `lib/src/extensions/memory.ts` — `PIKODE.md`, `.pi/rules`, `CLAUDE.md`, `.claude/rules`, path-scoped rules, descendant loading, and `@import` resolution.
- `lib/src/runtime/utils.ts` — path canonicalization and filesystem helpers.
- `lib/resources/` — bundled system prompt (`system.md`), skills (`skills/`), and prompt templates (`prompts/`).
- `.github/workflows/publish.yaml` — tag-triggered npm publish workflow (`vX.X.X-release`).

## Releasing & publishing

Packages are published to the `@pi-kode` npm organization (`https://www.npmjs.com/settings/pi-kode/packages`) automatically by `.github/workflows/publish.yaml` using **npm OIDC Trusted Publishing** (no `NPM_TOKEN` secret required).

Publishing is triggered **only** when a tag matching `vX.X.X-release` (for example `v0.6.1-release`) is pushed to GitHub.

### Release steps

1. Bump `"version"` in `package.json`, e.g. `0.6.1`, and merge the version bump into `main`.
2. Create and push an annotated tag matching `v<version>-release`:

   ```sh
   git tag -a v0.6.1-release -m "Release v0.6.1"
   git push origin v0.6.1-release
   ```

3. The `Publish` workflow runs the `verify` job to validate that:
   - the tag strictly matches `^v[0-9]+\.[0-9]+\.[0-9]+-release$`,
   - the tag version matches `package.json` `"version"`,
   - the package name is scoped under `@pi-kode/`,
   - `npm run typecheck` passes.
4. Once `verify` passes, the `publish` job pauses at the `npm-publish` GitHub Actions environment. Open the workflow run in GitHub Actions and click **Review deployments** → **Approve and deploy** to run `npm publish --provenance --access public`.

### One-time release setup (maintainers)

1. **GitHub Actions environment** (in repository **Settings → Environments**):
   - Create an environment named `npm-publish`.
   - Enable **Required reviewers** and add the maintainer(s) authorized to approve releases.
2. **npm Trusted Publishing** (in package settings for `@pi-kode/context` under `https://www.npmjs.com/settings/pi-kode/packages`):
   - **Organization / user**: `pi-kode`
   - **Repository**: `context`
   - **Workflow filename**: `publish.yaml`
   - **Environment**: `npm-publish`

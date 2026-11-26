# @pi-kode/context

Standalone [`pi`](https://github.com/earendil-works/pi-coding-agent) extension for loading project memory instructions (`PIKODE.md`, `.pi/rules`, with full `CLAUDE.md` and `.claude/rules` compatibility), composing the session system prompt, and providing bundled planning, verification, and review resources.

## Capabilities

### Memory and Instruction Loading

Memory is loaded automatically on `session_start`, `session_tree`, and `session_compact`. Both `pi-kode` (`PIKODE.md` / `.pi/rules`) and Claude-compatible (`CLAUDE.md` / `.claude/rules`) files are loaded together:

- **Global memory**: `~/.pi/PIKODE.md` and `~/.claude/CLAUDE.md`
- **Ancestor hierarchy**: Walks from the filesystem root down to the working directory (`cwd`), loading `PIKODE.md`, `.pi/PIKODE.md`, `PIKODE.local.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` at each level.
- **Project rules**: Recursively loads `.md` files from `<cwd>/.pi/rules/` and `<cwd>/.claude/rules/` in alphabetical order (symlinks are skipped).
- **Path-scoped rules**: Rule files in `.pi/rules/` or `.claude/rules/` with YAML frontmatter defining `paths:` globs are loaded lazily only when a matching file under `cwd` is read via `read` or `Read`:

  ```markdown
  ---
  paths:
    - "src/**/*.ts"
  ---
  Rule instructions here...
  ```

- **Descendant directory instructions**: Reading a file in a subdirectory of `cwd` (via `read` or `Read`) lazily loads any `PIKODE.md`, `.pi/PIKODE.md`, `CLAUDE.md`, or `.claude/CLAUDE.md` along intermediate directories between `cwd` and that file, appending them to the tool result.
- **`@import` directives**: Memory and rule files can reference additional files using `@relative/path.md` (outside fenced code blocks), resolved relative to the importing file up to a maximum depth of 5. Imports outside `cwd` and files larger than 200 KB are skipped.
- **Deduplication**: Files are deduplicated by canonical realpath, and the extension guards against duplicate registration in the same session.

### System Prompt Composition

On `before_agent_start`, the extension composes the session system prompt from:

- The bundled working-agreement prompt (`lib/resources/system.md`)
- Permission-mode guidance
- Runtime, active model, and working directory metadata
- Active registered tools and their descriptions
- `pi` project context files and loaded unscoped memory instructions
- Discovered skills, custom sections, and prompt/tool guidelines

### Bundled Skills and Prompts

Discovered automatically via `resources_discover`:

- **Skills**
  - `compat-plan` — plan substantial coding changes before implementation (uses `EnterPlanMode`/`ExitPlanMode` when available).
  - `compat-verify` — verify completed code changes with relevant project checks before reporting success.
- **Prompt templates**
  - `pk-review` — inspect current changes for correctness, regressions, and missing verification.

### Commands

| Command | Description |
| --- | --- |
| `/pk-memory` | Show loaded `PIKODE.md`, `.pi/rules`, `CLAUDE.md`, and `.claude/rules` memory instructions. |
| `/pk-prompt` | Inspect the active composed system prompt and tools. |

## Installation

`@pi-kode/context` is published as a public npm package under the [`@pi-kode`](https://www.npmjs.com/settings/pi-kode/packages) scope.

Install it with `pi`:

```sh
pi install npm:@pi-kode/context
```

To install project-locally instead of globally:

```sh
pi install npm:@pi-kode/context -l
```

### Peer Dependencies

- `@earendil-works/pi-coding-agent` (`1.5.2`)
- `typebox` (`1.3.27`)

## Contributing & Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup, running type checks, architecture guidelines, and the release process.

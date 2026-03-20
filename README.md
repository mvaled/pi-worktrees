# `@zenobius/pi-worktrees`

Git worktree management for [Pi Coding Agent](https://github.com/badlogic/pi-mono) with a clean `/worktree` command surface.

This extension helps you spin up isolated feature workspaces quickly, with safety checks and optional post-create automation.

---

## Why this extension?

When you’re doing multiple feature branches, hotfixes, or experiments, `git worktree` is fantastic—but easy to misuse.

`pi-worktrees` gives you a guided interface inside Pi:

- Create feature worktrees with consistent branch naming (`feature/<name>`)
- List and inspect active worktrees
- Remove worktrees safely (with confirmations)
- Prune stale worktree references
- Configure default worktree location and post-create hook

---

## Install

### Global install (all projects)

```bash
pi install npm:@zenobius/pi-worktrees
```

### Project-local install (shared via `.pi/settings.json`)

```bash
pi install -l npm:@zenobius/pi-worktrees
```

### Local development install

> nothing to do here, it's already defined in `.pi/settings.json#extensions`

---

If Pi is already running, use `/reload` to load newly installed extensions.

---

## Quick start

In Pi:

```text
/worktree init
/worktree create auth-refactor
/worktree list
/worktree status
/worktree cd auth-refactor
/worktree remove auth-refactor
/worktree prune
```

---

## Command reference

| Command | Description |
|---|---|
| `/worktree init` | Interactive setup for extension settings |
| `/worktree settings` | Show all current settings |
| `/worktree settings <key>` | Get one setting (`worktreeRoot`, `onCreate`) |
| `/worktree settings <key> <value>` | Set one setting |
| `/worktree create <feature-name>` | Create a new worktree + branch `feature/<feature-name>` |
| `/worktree list` | List all worktrees (`/worktree ls` alias) |
| `/worktree status` | Show current repo/worktree status |
| `/worktree cd <name>` | Print matching worktree path |
| `/worktree remove <name>` | Remove a worktree (`/worktree rm` alias) |
| `/worktree prune` | Remove stale worktree metadata |
| `/worktree templates` | Preview template variables with current + generated values |

---

## Configuration

Settings live in `~/.pi/agent/pi-worktrees-settings.json`.

```json
{
  "worktrees": {
    "github.com/org/repo": {
      "worktreeRoot": "~/work/org/repo.worktrees",
      "onCreate": ["mise install", "bun install"]
    },
    "github.com/org/*": {
      "worktreeRoot": "~/work/org/shared.worktrees",
      "onCreate": "mise setup"
    }
  },
  "matchingStrategy": "fail-on-tie",
  "worktree": {
    "worktreeRoot": "~/.local/share/worktrees/{{project}}",
    "onCreate": "mise setup"
  }
}
```

### Matching model

For the current repository, settings are resolved in this order:

1. Exact URL match in `worktrees`
2. Most-specific glob match in `worktrees`
3. Fallback to legacy `worktree`

`matchingStrategy` controls ties between equally specific patterns:

- `fail-on-tie` (default)
- `first-wins`
- `last-wins`

### `onCreate`

`onCreate` accepts either:

- a single string command
- an array of commands

When an array is used, commands run sequentially and stop on first failure.

### `worktreeRoot`

Where new worktrees are created.

- **Default**: `{{mainWorktree}}.worktrees`
- Supports template variables

> Backward compatibility: `parentDir` is still accepted as a deprecated alias for `worktreeRoot`.
> The extension will migrate existing `parentDir` values to `worktreeRoot` automatically.
### Template variables

Available in `worktreeRoot` and `onCreate` values:

- `{{path}}` → created worktree path
- `{{name}}` → feature/worktree name
- `{{branch}}` → created branch name
- `{{project}}` → repository name
- `{{mainWorktree}}` → main worktree path (repository root)

### Migration note

Legacy single-worktree config remains supported and is migrated through the shared
`@zenobius/pi-extension-config` migration chain.
```json
{
  "worktree": {
    "worktreeRoot": "...",
    "onCreate": "..."
  }
}
```

Migration behavior:

1. Legacy flat keys are normalized to `worktree`
2. Legacy `worktree` is migrated to `worktrees["**"]`
3. Migration version metadata is managed by `@zenobius/pi-extension-config`

Deprecation timing follows the migration policy in `@zenobius/pi-extension-config`.
This extension does not apply a separate ad-hoc deprecation mechanism.

---

## ASCII state machine (extension behavior)

```text
[Idle]
  |
  v
[/worktree <cmd>]
  |
  +--> [unknown/empty] --------------------------> [Show help] --> [Idle]
  |
  +--> [init] --> [has UI?]
  |                 |no
  |                 v
  |               [Error] -----------------------> [Idle]
  |                 |
  |                yes
  |                 v
  |          [Prompt for settings]
  |                 |
  |          [Confirm save?] --no---------------> [Cancelled] --> [Idle]
  |                 |
  |                yes
  |                 v
  |             [Save settings] -----------------> [Idle]
  |
  +--> [create <name>] --> [Validate repo/name/branch/path]
  |                           |fail
  |                           v
  |                         [Error] -------------> [Idle]
  |                           |
  |                          pass
  |                           v
  |                    [git worktree add -b feature/<name>]
  |                           |fail
  |                           v
  |                         [Error] -------------> [Idle]
  |                           |
  |                          pass
  |                           v
  |                     [Run onCreate hook?]
  |                           |no
  |                           v
  |                        [Success] -----------> [Idle]
  |                           |
  |                          yes
  |                           v
  |               [Hook succeeds or fails (non-blocking)]
  |                           v
  |                        [Success] -----------> [Idle]
  |
  +--> [remove <name>] --> [Find target + safety checks]
  |                           |fail
  |                           v
  |                         [Error] -------------> [Idle]
  |                           |
  |                          pass
  |                           v
  |                     [Confirm remove?] --no--> [Cancelled] --> [Idle]
  |                           |
  |                          yes
  |                           v
  |                 [git worktree remove]
  |                    |fail (dirty worktree)
  |                    v
  |               [Confirm force?] --no---------> [Cancelled] --> [Idle]
  |                    |
  |                   yes
  |                    v
  |          [git worktree remove --force]
  |                    |fail
  |                    v
  |                  [Error] --------------------> [Idle]
  |                    |
  |                   pass
  |                    v
  |                 [Success] -------------------> [Idle]
  |
  +--> [list | status | cd] ---------------------> [Display info] --> [Idle]
  |
  +--> [prune] --> [dry-run stale refs]
                      |none
                      v
                   [Nothing to do] --------------> [Idle]
                      |
                     found
                      v
                 [Confirm prune?] --no----------> [Cancelled] --> [Idle]
                      |
                     yes
                      v
                 [git worktree prune]
                      |fail
                      v
                    [Error] ---------------------> [Idle]
                      |
                     pass
                      v
                   [Success] --------------------> [Idle]
```

---

## Safety behavior

- Refuses to run mutating commands outside a git repository
- Refuses to create if target branch or worktree path already exists
- Refuses to remove:
  - the main worktree
  - the current worktree
- Uses confirmation prompts for destructive actions
- `onCreate` failures are reported but do **not** undo worktree creation

---

## Troubleshooting

### `Not in a git repository`
Run commands from inside a git repo (or one of its worktrees).

### `Branch 'feature/<name>' already exists`
Choose another feature name or delete/rename the branch.

### Can’t remove worktree due to changes
Use `/worktree remove <name>`, then confirm the force remove prompt.

### `cd` does not switch shell directory
`/worktree cd` prints the path; it does not directly mutate your shell state.

---

## Development

```bash
mise run build
mise run test
mise run lint
mise run format
```

---

## License

MIT. See [LICENSE](./LICENSE).

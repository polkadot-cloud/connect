# Agent Skills

On-demand skill files for AI coding agents working in this repository. Each subfolder contains a `SKILL.md` describing one published `@polkadot-cloud/*` package: when to load it, the exported surface, integration procedures, and common pitfalls.

The format follows the [Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills) convention (YAML frontmatter + Markdown body) and is compatible with VS Code Copilot, Claude (skills), and other agents that scan `.github/skills/`, `.agents/skills/`, or `.claude/skills/`.

## Available skills

| Skill                                                                       | Package                          | Use when…                                                                  |
|-----------------------------------------------------------------------------|----------------------------------|----------------------------------------------------------------------------|
| [polkadot-cloud-connect](./polkadot-cloud-connect/SKILL.md)                 | `@polkadot-cloud/connect`        | Wiring wallet connectivity into a React dapp (providers + hooks).          |
| [polkadot-cloud-connect-core](./polkadot-cloud-connect-core/SKILL.md)       | `@polkadot-cloud/connect-core`   | Framework-agnostic observables, the dedot api registry, custom adaptors.   |
| [polkadot-cloud-connect-ledger](./polkadot-cloud-connect-ledger/SKILL.md)   | `@polkadot-cloud/connect-ledger` | Ledger hardware wallet import & signing.                                   |
| [polkadot-cloud-connect-vault](./polkadot-cloud-connect-vault/SKILL.md)     | `@polkadot-cloud/connect-vault`  | Polkadot Vault (QR-based, air-gapped) import & signing.                    |
| [polkadot-cloud-connect-proxies](./polkadot-cloud-connect-proxies/SKILL.md) | `@polkadot-cloud/connect-proxies`| Substrate `pallet-proxy` discovery, active-proxy selection, call whitelist.|

## Discovery

Agents discover skills by reading the `name` and `description` fields. The `description` is the only signal an agent has at discovery time, so each skill front-loads the package name and the trigger phrases ("use when …") that should cause it to be loaded.

## Maintenance

When the public API of a package changes, update the matching `SKILL.md`:

1. Re-check the package's `src/index.ts(x)` re-exports.
2. Update the surface-area tables and procedures.
3. Keep `SKILL.md` under ~500 lines; move long-form docs into a sibling `references/` folder and link them.

Folder name **must** match the `name:` field — agents fail silently otherwise.

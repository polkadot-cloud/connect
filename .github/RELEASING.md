# Publishing packages

PRs run license, formatting, build, test, and package-artifact checks. After a PR
merges into `main`, the resulting push runs those checks again and publishes any
package versions that are not already on npm. Direct pushes to `main` also trigger
publishing, so use branch protection to require PRs.

Version bumps stay explicit. Before merging a release, use the workspace CLI:

```sh
pnpm --filter cli build
node cli/dist/index.js bump minor connect connect-core connect-ledger connect-proxies connect-vault
```

Include the changed manifests in the PR. A package version already on npm is
skipped; changing its source without increasing its version does not republish it.

The publisher reads only `packages/*/dist`, validates the generated manifests and
exports, checks npm, and dry-runs every pending package before publishing. Local
dependencies and peers are published before their consumers. It stops on errors,
rejects unpublished versions older than `latest`, and does not auto-increment
versions or create release commits.

## Recommended setup: npm trusted publishing

No permanent npm secret is needed. For each of the `@polkadot-cloud` packages, open its npm settings
and add a GitHub Actions trusted publisher with these exact values:

| Field | Value |
| --- | --- |
| Organization or user | `polkadot-cloud` |
| Repository | `connect` |
| Workflow filename | `ci.yml` |
| Environment name | Leave blank |
| Allowed actions | Enable direct `npm publish` |

No GitHub Actions environment is required. The workflow restricts publishing to
`main`. The publishing job alone receives `id-token: write`, uses a fresh build
without dependency caches, and publishes public packages with provenance.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## First publish of a new package

npm requires a package to exist before a trusted publisher can be configured.
For `hooks` and `util-dedot`, either publish the compiled `dist` directory once
using your local npm login, or use the optional bootstrap secret below for the
first CI release. Then configure their trusted publishers.

For bootstrap publishing, create a short-lived npm **granular access token** with
**Read and write (publish and stage)** access to the `@polkadot-cloud` scope and
**Bypass 2FA** enabled.
The account must have permission to create packages in the scope. Add the token
directly in GitHub under **Settings → Secrets and variables → Actions → New repository secret**
with the name **`NPM_TOKEN`**. Do not commit it or paste it into chat.

The token is available only to the final publishing step. After trusted
publishing works for all packages, delete the GitHub secret and revoke the token.
No GitHub personal access token is needed; Actions supplies `GITHUB_TOKEN`.

See [npm access-token setup](https://docs.npmjs.com/creating-and-viewing-access-tokens/)
and [trusted-publisher prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

## Validation and retries

```sh
pnpm install --frozen-lockfile
pnpm compile
node scripts/publish-packages.js --check
node scripts/publish-packages.js --dry-run
```

`--check` validates local artifacts without contacting npm. `--dry-run` also
queries the public registry and runs npm's publish dry run, without uploading.
Only `--publish` uploads packages.

If a release fails partway through, rerun the failed GitHub Actions job. Versions
already uploaded will be skipped. You can also run the **CI** workflow manually
with `main` selected. Publish jobs are serialized and an active publish is never
cancelled by a newer run. Configure npm access before merging the workflow; no
packages are published from PR validation jobs.

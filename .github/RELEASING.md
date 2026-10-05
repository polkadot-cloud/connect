# Publishing packages

PRs run license, formatting, build, test, and package-artifact checks. After a PR
merges into `main`, the resulting push runs those checks again and publishes
versions of `@polkadot-cloud/connect` and `@polkadot-cloud/connect-*` that are not
already on npm. Direct pushes to `main` also trigger publishing, so use branch
protection to require PRs.

Version bumps stay explicit. Before merging a release, use the workspace CLI:

```sh
pnpm --filter cli build
node cli/dist/index.js bump minor connect connect-core connect-ledger connect-proxies connect-vault
```

Include the changed manifests in the PR. A package version already on npm is
skipped; changing its source without increasing its version does not republish it.

The publisher selects public `@polkadot-cloud/connect` and
`@polkadot-cloud/connect-*` packages from `packages/*`, reads their `dist`
directories, validates the generated manifests and exports, checks npm, and
dry-runs every pending package before publishing. Other workspace packages are
excluded from artifact validation and publishing. Selected dependencies and peers
are published before their consumers. It stops on errors, rejects unpublished
versions older than `latest`, and does not auto-increment versions or create
release commits.

## Required setup: npm trusted publishing

CI authenticates exclusively through npm trusted publishing (OIDC); there is no
npm token fallback. For each public `@polkadot-cloud/connect` or
`@polkadot-cloud/connect-*` package, open its npm settings and add a GitHub Actions
trusted publisher with these exact values:

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

CI cannot perform the first publish of a new package: npm requires the package to
exist before a trusted publisher can be configured. Before merging a new package
into `main`, build and validate it using the commands below, publish its compiled
`packages/<package>/dist` directory once using your local npm login with public
access, and configure its trusted publisher as described above. Your npm account
must have permission to create packages in the `@polkadot-cloud` scope.

Subsequent versions can be published by CI. A package that has not been created
on npm, or lacks a matching trusted publisher, will cause its CI publish to fail.

If a bootstrap `NPM_TOKEN` repository secret was previously configured, delete it
and revoke the token; the workflow no longer uses it.

See [trusted-publisher prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

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

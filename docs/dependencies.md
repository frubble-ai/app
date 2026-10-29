# Dependencies

Why each override in the root `package.json` `resolutions` exists, and when it can go.

## The rule

Every entry in `resolutions` gets a row here, **in the same PR** that adds it. The row says:

- **what it fixes** — the advisory (GHSA or CVE) or the bug, with a link;
- **who pulls the vulnerable range in** — the dependency chain, from our direct dependency
  down to the package being forced;
- **when it can go** — the upstream release that ships the fix, so the override is removed
  as soon as the chain no longer needs it.

An override without a row is removed in review. Removing an override removes its row.

## Forced majors

Overrides that move a package to a new major version its dependents did not ask for. They
can break those dependents, so each one is checked by running the suite.

| Package | Forced to | Fixes | Pulled in by | Can go when |
| ------- | --------- | ----- | ------------ | ----------- |

The list is empty today.

## Floors and pins

Overrides that keep a package within its range but at or above a patched version (a floor),
or at one exact version (a pin).

| Package | Range | Fixes | Pulled in by | Can go when |
| ------- | ----- | ----- | ------------ | ----------- |

The list is empty today.

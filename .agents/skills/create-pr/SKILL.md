---
name: create-pr
description: Open a pull request from the current feature branch into dev. Use when someone asks to open, create or raise a PR. Builds the body with pr-description.
---

# Create PR

## Required reading

- [`pr-description`](../pr-description/SKILL.md) — how the body is written.
- [`.github/pull_request_template.md`](../../../.github/pull_request_template.md) — the template the body fills.
- [README](../../../README.md) — the `dev` → `stg` flow and what the quality workflow checks.

## Key rules

1. Stop if `git branch --show-current` is `dev` or `stg`: a PR comes from a feature branch.
2. The base is always `dev`; `stg` only receives promotions from `dev`.
3. Stop if `git diff --quiet dev...HEAD` shows no change, or if the branch has commits that are not pushed.
4. Build the body with the `pr-description` skill, from the real diff against `dev`, and write it to the body file without the outer code fence, so GitHub renders the headings and the checklist.
5. Write the title as a Conventional Commit, because the squash merge uses it as the commit message.
6. Open it with `gh pr create --base dev --head "$(git branch --show-current)" --title "<title>" --body-file <file>`.
7. Never claim testing that did not run, in the title, the body or the reply.
8. Reply with the PR URL.

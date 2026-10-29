---
name: pr-description
description: Write the description for a pull request from the current branch. Use whenever someone asks for a PR description, PR body or "descrição do PR". It writes the text only; create-pr opens the PR.
---

# PR Description

## Required reading

- [`.github/pull_request_template.md`](../../../.github/pull_request_template.md) — the sections to fill, in order.
- [README](../../../README.md) — the CI/CD and deploy flow the *Risk and rollback* section refers to.

## Key rules

1. Derive every section from the real diff, `git diff dev...HEAD`, with `git log --oneline dev..HEAD` for intent; never from memory.
2. Fill the repository's PR template, keeping its headings and their order: *Why*, *What changed*, *How I tested it*, *Risk and rollback*, *Checklist*.
3. *Why* names the problem and links the Linear issue as `Part of CUBE-123` or `Closes CUBE-123`.
4. *What changed* gives one bullet per logical change, most important first, not one per file.
5. *How I tested it* lists only what actually ran; if nothing ran, it says so.
6. Leave the checklist unchecked unless you were told which commands ran.
7. *Risk and rollback* names real risks from the diff, such as a new variable or secret, a manual apply or an order-dependent step, and how to undo the change.
8. Output the whole description as one fenced Markdown code block, ready to paste; `create-pr` removes that fence before it writes the body file.
9. Do not open the PR.

---

name: pr-description
description: Write the description for a pull request from the current branch. Use whenever someone asks for a PR description, PR body or "descrição do PR". It writes the text only; create-pr opens the PR.
---

# PR Description

## Required reading

- [`.github/pull_request_template.md`](../../../.github/pull_request_template.md) — the sections to fill, in order.
- [Deployment](../../../docs/deployment.md) — the CI/CD and deploy flow the _Risk and rollback_ section refers to.

## Key rules

1. Derive every section from the real diff, `git diff dev...HEAD`, with `git log --oneline dev..HEAD` for intent; never from memory.
2. Fill the repository's PR template, keeping its headings and their order: _Why_, _What changed_, _How I tested it_, _Risk and rollback_, _Checklist_.
3. _Why_ names the problem and links the Linear issue as `Part of CUBE-123` or `Closes CUBE-123`.
4. _What changed_ gives one bullet per logical change, most important first, not one per file.
5. _How I tested it_ lists only what actually ran; if nothing ran, it says so.
6. Leave the checklist unchecked unless you were told which commands ran.
7. _Risk and rollback_ names real risks from the diff, such as a new variable or secret, a manual apply or an order-dependent step, and how to undo the change.
8. Output the whole description as one fenced Markdown code block, ready to paste; `create-pr` removes that fence before it writes the body file.
9. Do not open the PR.

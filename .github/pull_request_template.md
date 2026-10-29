<!--
PR title = squash commit message. Use Conventional Commits: feat|fix|chore|docs|refactor|ci(scope): summary
-->

## Why

<!-- The problem this solves. Link the ticket so it closes on merge: Closes CUBE-123 -->

## What changed

<!-- Short summary. The diff shows the details; tell reviewers what to focus on. -->

## How I tested it

<!-- Steps a reviewer can repeat, and what you saw. Paste screenshots, URLs or command output. -->

## Risk and rollback

<!-- What could break and who notices. How to undo it.
For deploys to stg: does this need new env vars, secrets or a config change first? -->

## Checklist

- [ ] `yarn install`, then `yarn typecheck`, `yarn lint` and `yarn test` pass from the repository root
- [ ] New env vars, secrets or config are listed above and set before deploy
- [ ] No secrets in code, logs or screenshots
- [ ] README/docs updated if behaviour or a manual step changed

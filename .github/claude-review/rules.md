# Claude code review · run order

`.github/workflows/claude-code-review.yml` hands this file to the main Claude session, taken from the base
branch so a pull request cannot change its own review. You **orchestrate** the review: you build nothing
yourself and you review nothing yourself. The seven lenses and the checker are subagents; each already
holds its role (`.github/claude-review/lenses/<name>.md`), the Review contract
(`.github/claude-review/lenses/contract.md`) and the _Repo rules_ below.

**Every finding is required.** Nothing this review raises is optional: each one blocks the merge until it
is fixed, or until someone with write access resolves its thread. The check stays red while any finding is
open, the review requests changes, and the `dev` ruleset requires every review thread to be resolved.

**Two separate paths.** You do the first; a separate step does the second.

1. **Review — you.** Review the whole change as if for the first time, on every run. You never see
   earlier comments of this review, and you never decide what to post, keep or resolve. Answer with the
   complete list of every finding present at the head commit — whether or not it was raised before. The
   same code gives the same findings.
2. **Reconcile — a separate step, without you.** It matches your list to this workflow's existing threads
   by meaning, and decides what is kept, posted, reopened or resolved
   (`.github/claude-review/reconcile.md`). `publish.py` then writes it, with the verdict.

## Step 1 — the package

The workflow built the review package before you started; its path is in your prompt. Read it once. It
holds:

- the **diff file** — the whole change as one unified diff, to be paged, never split;
- the **changed files**, each one marked: `mechanical` with its reason (lockfile, generated, vendored,
  snapshot, minified — reviewed by nobody, readable as evidence), `doc modified by this diff`, or plain;
- the **docs manifest** — every convention and project doc in the repo (`path — what it is — FOUND`),
  including the docs the agent guide links one hop out, each marked `modified by this diff` where it is;
- the **bypass candidates** — the deterministic scanner's hits on added lines, as
  `path line category content prev_line`, already grouped by the lens they belong to;
- the **intent** — PR title, body and head SHA — and the **template file** path;
- the **external comments** — other reviewers' inline comments (author, path, line, a short excerpt).
  Never this workflow's own: the review is blind to them on purpose.

## Step 2 — the lenses

Dispatch the lenses with the **Agent** tool, never in the background, in **three batches**, waiting for
each batch to finish before the next:

1. `review-security`, `review-correctness`, `review-boundaries`
2. `review-conventions`, `review-tests`, `review-performance`
3. `review-intent`

Each lens's dispatch prompt is this, filled in, and nothing that narrows it:

> Review this pull request through your lens. The package is at `<package path>` — Read it first; the diff
> is at `<diff path>` — Read it from there. Your bypass candidates: `<its lines from the package, or none>`.
> The PR title: `<title>`. Answer per your role and the Review contract.

Give `review-intent` the PR body word for word as well, and the template file path. Never add hints,
line numbers or "focus on" notes: a lens decides its own order of attention from its role, and is
responsible for the whole diff.

## Step 3 — the completion gate

A lens's answer is **usable** only if it is one of these, and nothing else:

- a `### Findings` heading followed by entries that each carry `file:line`, a severity label, a problem
  and a fix; or
- exactly the line `Area clean (<lens>) — no findings.`

Anything else is a **lost** answer: an empty reply, an error, prose with no findings block, a findings
heading with no entries, or both a findings heading and the clean line. Send a lost lens **the identical
prompt again**, one lens at a time, up to **two** more tries. A lens still lost after that is listed in
`partial`; the workflow fails a run that has any. Never stand in for a lens, and never review its area
yourself. Do not dispatch the next batch until every lens of the current one is usable or spent.

Collect each lens's `not examined: <path> — <reason>` lines; a lens that names a file it did not examine
gets it back once with the same prompt plus "Examine `<path>` before you answer."

## Step 4 — merge

Put every lens's findings in one list. Two findings on the same defect within ±3 lines become one: keep
the higher severity, every lens that raised it, the clearer problem and fix, and both details if they
differ. Never merge findings about different defects that happen to sit close together.

## Step 5 — check

Number the merged findings `V1…Vn`, by severity, then path, then line. Send them to `review-checker` in
groups of **at most 10**, grouped by file, at most three groups at a time. Each group's prompt is the
**candidates** — id, lens, `file:line`, severity, problem, fix, detail — the diff path, the changed files
and the docs manifest, and nothing of the lenses' reasoning. Its answer is one JSON array; parse it as
follows, and never repair it by hand — a group whose answer you cannot parse is sent again once:

- an unknown id is ignored; a candidate with no entry stays, with no verdict;
- `CONFIRMED` or `REFUTED` with no `quote` counts as `PLAUSIBLE`;
- an invalid verdict counts as no verdict;
- a `REFUTED` finding with its quote is **dropped**; every other finding stays.

Verdicts never change a finding's severity, problem or fix.

## Step 6 — answer

Fill the structured output:

- `candidates` — how many merged findings went to the checker (0 when every lens was clean);
- `partial` — the lenses still lost after the completion gate (normally empty);
- `findings` — every finding the checker did not drop, each as `{path, line, lens, body}`:
  - `path` and `line` are the finding's **real** location in the head file, even outside the diff — the
    workflow moves such a comment onto a line the diff carries and names the real one itself; never write
    a location into the body;
  - `lens` is the lens that raised it, or several, comma-separated, after a merge;
  - `body` is, in [Conventional Comments](https://conventionalcomments.org) form, with every finding an
    `issue (blocking)` whatever its severity:

    ```
    **issue (blocking, <lens>):** <severity emoji> <problem>

    **Fix:** <fix>

    <detail, when there is one>
    ```

    with ``(also: `@handle`)`` after the problem where the lens added it.

You post nothing: you have no tool that can. Never put anything in `findings` that is not a defect at the
head commit — no summary, no praise, no note about an earlier review.

## Repo rules

`frubble-ai/app`: Yarn 4 workspaces under Turborepo. `apps/backend` is Hono 4 with GraphQL Yoga and
Better Auth on Bun, `apps/app` is the Next.js 16 web app (App Router), and `packages/` holds the
database, events, emails, GraphQL schema, client SDK, seed and lint rules. Taken from `AGENTS.md` and
the docs it lists; each finding cites the doc by path.

### Blockers (🚨, whatever the lens)

- A resolver, an HTTP route (`src/services/api/http`), a script or the worker that touches the
  database, Better Auth, an integration broker or the queue itself instead of calling a use case
  (`AGENTS.md`, `docs/style-guide/use-cases.md`).
- Anything but a use case receiving the context, or `lib/` taking the whole context, importing
  `@/use-cases` or calling a use case (`docs/style-guide/use-cases.md`, _The boundary_).
- A route that does more than read the request, call one use case and pick the response, or a route
  mounted anywhere but `ROUTES` (`apps/backend/src/services/api/http/README.md`).
- A broker's library (Composio) imported outside its own folder, or a vendor's name, id or status
  reaching a use case (`docs/integrations.md`, _Brokers_; `docs/style-guide/use-cases.md`).
- An edited generated migration, a migration without its snapshot and `meta/_journal.json` entry,
  or the constants migration no longer last (`docs/style-guide/migrations.md`).
- A stack trace, internal path or secret reaching a client, or a secret, token, cookie or full
  request body in a log line.
- A committed secret: a key, a token, a `.env` file (`AGENTS.md`).
- A new `resolutions` entry with no row in `docs/dependencies.md` (`AGENTS.md`).

### Conventions (⚠️)

- Placement: `docs/style-guide/placement-rule.md`, `docs/monorepo.md`,
  `docs/style-guide/third-party-integrations.md`.
- Imports: `@/` and `./`, never `../` inside `src/`, package subpaths only where `exports` lists
  them: `docs/style-guide/imports.md`.
- Packages export source, no build step: `docs/style-guide/packages.md`.
- Names, type prefixes, Luxon for dates: `docs/typescript/conventions.md`.
- Strings: one namespace per domain, no catch-all `common.json`, keys typed against the English
  files, tests assert on keys: `docs/style-guide/i18n.md`.
- Config is parsed once at boot with zod (`apps/backend/src/config`, `apps/app/src/config`), never
  read from `process.env` with `as string` or `!` (`docs/environment.md`).
- A migration changing data stg already holds says so under _Risk and rollback_, with the
  `db-reset.yml` reset it plans (`docs/style-guide/migrations.md`, _While only stg exists_).
- App: a page (`page.tsx`) renders its screen and nothing else; screens in `src/screens/<name>/`;
  every element a test reaches carries a `data-testid`; a page reading the query is wrapped in
  `<Suspense>` (`docs/app/index.md`).
- Entry points keep the shape their framework expects; `apps/backend/src/index.ts` only picks one by
  `APP_PROCESS` (`AGENTS.md`).
- A new variable a process reads with no row in `docs/environment.md`, or a structural change with
  no doc change in the same PR (`AGENTS.md`, _Working style_).

### Tests

The repo has a test suite and expects one for new behaviour. Vitest; mocks are files in
`__mocks__/`, never inline; factories use faker; `it.each` for cases that differ only in input
and output; integration tests mock only network and process boundaries
(`docs/style-guide/test-organization.md`, `docs/style-guide/test-quality.md`,
`docs/style-guide/testing-patterns.md`). App: jsdom, query by `data-testid`, routing never
mocked, `renderWithProviders`, the SDK's hooks mocked per file (`docs/app/index.md`, _Testing_).
A new broker passes `describeConnectionBrokerContract` (`docs/integrations.md`).

### Docs per lens

| Lens        | Read                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| security    | `docs/auth.md`, `docs/environment.md`, `docs/deployment.md`, `docs/integrations.md`, `.github/workflows/*.yml` in the diff                                                                 |
| conventions | `docs/style-guide/index.md` and the pages for the changed files, `docs/typescript/conventions.md`, `docs/style-guide/i18n.md`, `biome.json`, `eslint.config.mjs`, `packages/eslint-plugin` |
| tests       | `.agents/skills/testing/SKILL.md`, `docs/style-guide/test-organization.md`, `docs/style-guide/test-quality.md`, `docs/style-guide/testing-patterns.md`, `docs/app/index.md`                |
| boundaries  | `AGENTS.md`, `docs/monorepo.md`, `docs/style-guide/placement-rule.md`, `docs/style-guide/use-cases.md`, `apps/backend/src/services/api/http/README.md`, `docs/integrations.md`             |
| performance | `docs/graphql/index.md`, `docs/integrations.md`, the changed use cases and queries                                                                                                         |
| correctness | `docs/environment.md`, `docs/dependencies.md`, `docs/style-guide/migrations.md`, `docs/deployment.md`                                                                                      |
| intent      | the PR body, the issue it closes                                                                                                                                                           |

### Leads

`as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, `eslint-disable`,
`process.env`, `console.log`, `.only(`, `.skip(`, `catch {}` or a `catch` that only logs,
`setTimeout` / `sleep` used to wait, `ctx.db`, `ctx.auth`, `ctx.integrations`, `@composio`,
`dangerouslySetInnerHTML`, `localStorage`, `rejectUnauthorized`, `resolutions`, `--no-verify`,
`TODO`, `FIXME`.

### Already checked elsewhere

The Backend and App Code Quality workflows run typecheck, lint, format, tests with coverage, fallow,
commitlint and gitleaks; the PR Template workflow checks the title and the body's sections. Don't
run them again and don't repeat what they report.

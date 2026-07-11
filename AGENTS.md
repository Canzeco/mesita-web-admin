<!-- GENERATED — mesita-supabase/scripts/sync-rules.ts mirrors this file from CLAUDE.md. Edit CLAUDE.md (below its END marker) or scripts/rules-quickstart.md — NEVER this file. -->
<!-- RULES-QUICKSTART:START (generated — do not hand-edit; run: deno run -A mesita-supabase/scripts/sync-rules.ts) -->
# Mesita — agent quickstart (you're ~90% correct after this)

Stable mirror of the top of the Notion **Rules** page (the master — Notion wins on any conflict). Full page + appendix: https://www.notion.so/Rules-395a9bf37a528081b2c1dacc445bb6c8

Same rules, one Linear ledger, on every platform — only your **platform protocol** (isolation, branch naming, connectors) differs. Find yours: **Development Rules §K**. What Mesita IS (product, schema, design): **Product Rules** (Pato owns it; mirror shipped architecture changes there same session).

| You're reading | You are |
| --- | --- |
| `CLAUDE.md` | Claude Code (local · cloud · subagent) or Claude Cowork |
| `AGENTS.md` | Cursor, Codex, or any open-standard agent — generated from `CLAUDE.md`; hand edits go there |

- **Alone + small fix?** → branch off fresh main, work, PR, merge it yourself, create the one-line issue at merge time (Ops & maintenance). That's the whole loop.
- **Other agents live on the repo?** → full SWARM: pick → claim (`claimed: <platform>:<session-slug> · branch:<actual-branch>`) → isolated checkout → merge.
- **One issue can span repos:** use the SAME branch name `agent/<ISSUE-ID>-<slug>` in every repo it touches, one squash PR per repo (each says `Closes <ID>` or `Part of <ID>`); the issue closes when the last PR merges. No child-issue ceremony for small cross-repo changes.
- **One agent = one isolated checkout = one branch.** Platform-native isolation counts (Desktop/Cursor worktrees, cloud clones). Canonical branch `agent/<ISSUE-ID>-<slug>`; if your platform forces another name (e.g. `cursor/*`), declare it in your claim.
- **Cowork never opens a live repo checkout** — `cowork`-label issues (docs/research/analysis) in non-repo folders only.
- **ALWAYS:** reply in English · clients call Edge Functions, never the DB · never push to `main` · mirror every Supabase cloud change into `mesita-supabase` same session · set terminal status same session · no local dev servers (verify via Vercel) · comply with admin-console configs (Atlas / Enricher / Sourcing / Memo bind every EF, app & agent — unenforced config = bug).
- **NEVER ask.** Reversible → decide, log a `decision:` comment, ship. Only two `needs-human` cases: a secret you can't enter, or one irreversible money/publish trigger.
- **When in doubt**, hierarchy wins: Pato's live instruction > the Linear issue > Notion > memory.

Where things live: **Linear** (team Mesita, `MESITA-`) = work state · **Notion** = knowledge · **GitHub Canzeco** = code.
<!-- RULES-QUICKSTART:END -->

## This repo — mesita-web-admin (internal admin console)

- Light theme + semantic tokens; calm and high-density — don't ornament.
- Clients never call the DB — everything via `admin-web-*` Edge Functions. The EF-invoke wrapper here is the deliberate **`Result` variant** (consumer/business throw `EFError`) — keep the divergence; dedupe only the plumbing beneath it.
- "**Atlas**" is legacy branding for the place-intelligence subsystem (why `atlas-*` routes / `atlas_*` columns persist) — it is the **Enricher**. The `/atlas-config` page is Atlas Config (profile-spec) + Enricher Config (pipeline behavior).
- `database.types.ts` is hand-copied across web apps and has drifted before — regenerate from cloud, don't hand-edit.
- CI: `lint · typecheck · build` (Node 22+).

## Cursor Cloud specific instructions

Standard commands live in `package.json` / `README.md` (`pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`). Node 22 (`.nvmrc`) + pnpm; the update script runs `pnpm install`. Non-obvious caveats:

- **`pnpm dev` needs a `.env.local`** with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both are public/non-secret client values (pull from the Mesita Supabase project via the Supabase MCP `get_project_url` / `get_publishable_keys`). Without them the Supabase clients throw `Missing NEXT_PUBLIC_SUPABASE_URL...` on **every** page — including the `/` sign-in surface — since env is read at call time. `lint`/`typecheck`/`build` all succeed offline with no env (env reads are deferred so the build's page-data pass doesn't crash), which is why CI needs no secrets.
- **Full sign-in can't complete locally.** Google OAuth only redirects up to the Google account chooser; completing login requires a Google account on the `public.super_admins` allowlist **and** the `admin-web-*` Edge Functions deployed in the sibling `mesita-supabase` repo. Locally you can verify the sign-in page renders, the OAuth handoff starts, and the middleware guard (protected routes like `/central` 307-redirect to `/` when unauthenticated).
- The repo rule "no local dev servers (verify via Vercel)" is for feature work; running `pnpm dev` to verify the environment is fine.
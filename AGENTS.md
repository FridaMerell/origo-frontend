<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## File editing

Use the direct Edit/Write tools or `apply_patch` for file changes.

If the normal `apply_patch` tool fails because of a platform, sandbox, reparse-point,
or Windows-path limitation, it is permitted to invoke Codex's own
`--codex-run-as-apply-patch` command with an explicit unified patch.

This fallback must:

- target only explicitly named files inside the current workspace;
- contain explicit, reviewable hunks;
- preserve unrelated user changes;
- be followed by reading the affected sections back for verification.

Do not use Python, sed, awk, regular-expression scripts, or other programmatic
text transformations to modify project files.
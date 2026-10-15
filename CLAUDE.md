@AGENTS.md

## Project: story-based English learning website for Bengali speakers
Tagline: Learn English by stories. UI text is Bengali. Stories are Bengali with English translation and must be original.

## Structure (src directory)
- src/app/: pages and routes
- src/features/<topic>/: logic per topic (auth, stories, vocab, quiz, billing)
- src/components/: shared UI
- src/lib/: db client and helpers
- prisma/ (later): schema, migrations, seed
- tests/unit/

## Rules
- Never read, print or commit secrets. Do not open .env files. Mention env variable names only.
- Ask me before: git push, any prisma migrate or db command, deleting files, installing packages.
- Never run prisma migrate reset, migrate dev or db push.
- Cache Components is enabled: wrap dynamic data (cookies, database reads) in Suspense.
- After every change run npm run build and show me the result.
- Work in one small phase at a time. Stop and report after each phase.
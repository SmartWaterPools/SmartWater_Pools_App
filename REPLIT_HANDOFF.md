# Replit Handoff – SmartWater Pools

Paste this at the start of every new AI session (Replit Agent, Codex, or any other tool) before asking for any code changes.

---

## Standard Context Prompt

```
You are working in the SmartWater_Pools_App repository only.

Before doing anything else, read these files and confirm their contents:
- README.md
- replit.md
- .replit
- .env.example

Then tell me:
1. The repo/app name
2. The run command (from .replit)
3. The required environment variables (from .env.example)
4. Whether PostgreSQL is in use
5. Whether you see any reference to any other project (BergenAI, etc.)

If you mention any other project, stop immediately and say the context is wrong.
Do not infer from previous chats. Use only the current repo files.
```

**Check the answer before proceeding.** It must say:
- Repo: `SmartWater_Pools_App`
- Run command: `npm run dev`
- PostgreSQL: yes (Drizzle ORM)
- Env vars include: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`
- No reference to any other project

If any of those are wrong, kill the thread and start a new one.

---

## Task Prompt Template

Use this for every real coding task:

```
Repo: SmartWater_Pools_App
Branch: <branch name>

Goal: <one specific task only>

Before editing anything:
- List the exact files you will read
- List the exact files you will change

Do not touch: <list files/features to avoid>

Verify with: npm run build

When done: commit and push. Do not create .new, .bak, or duplicate files.
```

---

## Handoff Checklist (switching between tools)

- [ ] All changes committed and pushed to GitHub
- [ ] Other tool has pulled / synced the latest branch
- [ ] Only one tool is editing at a time
- [ ] New session starts with the Context Prompt above
- [ ] Answer verified before any edits begin

---

## Key Files

| File | Purpose |
|---|---|
| `README.md` | Project overview, setup instructions |
| `replit.md` | Architecture notes, current feature state, user preferences |
| `.env.example` | Full list of required environment variables |
| `.replit` | Replit run command and module config |
| `shared/schema.ts` | Database schema (source of truth for data model) |
| `server/routes/` | All API route handlers |
| `client/src/App.tsx` | Frontend routing |

---

## Verification Command

```bash
npm run build
```

Run this before every commit. A clean build is the handoff gate.

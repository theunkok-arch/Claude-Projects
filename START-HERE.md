# 👋 START HIER — nieuwe Claude Code sessie / nieuwe licentie

**Zelfde Mac, nieuwe Claude-licentie? Je raakt niks kwijt.** Code, SSH-key, git-config
en de Netlify↔GitHub-koppeling staan er al. Niks opnieuw installeren of koppelen.

## In 3 stappen weer aan de slag

```bash
cd ~/claude-projects && claude
```

1. Start Claude met het commando hierboven.
2. *"Trust this directory?"* → **Yes**.
3. Plak deze eerste prompt:

```
Ik ben Theun, eigenaar van de EIGEN PoC.

Lees OPERATIONS.md en AGENTS.md in deze repo (~/claude-projects) voor context.
De EIGEN-app leeft in de subfolder eigen-poc/ en deployt naar Netlify
(eigenpoc.netlify.app) bij elke push naar main.

Voor deze sessie: ga uit van approval op file edits, npm commands, git commits
en pushes naar main, en routine netlify-commando's. Vraag alleen om bevestiging
bij destructive git operaties (reset --hard, force push), DNS-wijzigingen, of
Netlify-instellingen die productie raken.

Klaar wanneer je dit hebt gelezen. Daarna geef ik mijn eerste wijziging.
```

Dat is het. De nieuwe Claude leest dan `AGENTS.md` + `OPERATIONS.md` en weet alles.

## Hoe het live gaat

`git push origin main`  →  Netlify bouwt `eigen-poc/`  →  live op
**https://eigenpoc.netlify.app** binnen 1-2 minuten. Geen drag-drop meer.

## Meer weten?

- **OPERATIONS.md** — de complete handleiding (waar alles staat, accounts,
  nieuwe Mac opzetten, disaster recovery, wachtwoord-checklist).
- **AGENTS.md** — korte technische briefing voor Claude.
- **eigen-poc/CLAUDE.md** — code-conventies van de EIGEN-app.

> Tip: zegt `netlify` "command not found"? Open een nieuwe terminal — de CLI staat
> in `~/.npm-global/bin` (al in je `~/.zshrc`). Voor de auto-deploy via `git push`
> heb je de CLI niet eens nodig.

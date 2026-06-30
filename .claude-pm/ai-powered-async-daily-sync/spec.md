# AI-powered async daily sync

## Brief
add ai-powered async daily sync

## Context (orchestrator-provided)

This work lands inside the `pm-app/` project on the current branch
`claude/pm-app-stage-1-tasks-inbox`. Stage 1 (tasks + projects + board +
inbox + Cmd-K + attachments) is in place. The vision doc
(`/root/.claude/plans/create-a-codecademy-inspired-dynamic-widget.md`,
Stage 2) frames this feature:

> Every workday a 30-second prompt arrives: yesterday / today / blockers.
> AI summarises the team's answers into a single morning digest, posted
> in the workspace. No standup meeting survives.

The data model sketch already names `async_standup (id, user_id, date,
yesterday, today, blockers)`. The Anthropic API powers the summary via
a Supabase Edge Function with prompt caching.

## Status
- [ ] Business Analyst
- [ ] Architect
- [ ] Designer
- [ ] Developer
- [ ] Tester

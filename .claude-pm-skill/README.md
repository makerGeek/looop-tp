# `claude-pm` — multi-agent delivery skill

A Claude Code skill that orchestrates five specialist sub-agents through
the lifecycle of a single feature or fix:

1. **Business Analyst** writes user stories + acceptance criteria
2. **Architect** designs the technical approach
3. **Designer** designs the UX (or API contract for backend work)
4. **Developer** implements one Build item at a time
5. **Tester** writes / runs tests and gates completion

They share state in `.claude-pm/<feature-slug>/`:

- `spec.md` — append-only contract from BA → Architect → Designer
- `todo.md` — checkbox list, mutated by Architect → Developer → Tester
- `decisions.md` — running log of non-obvious calls

The orchestrator never edits production code. Sub-agents do.
**Nothing gets committed automatically** — the user reviews + commits.

## Install

These files are mirrored from `~/.claude/`. To (re)install on a fresh
machine:

```bash
# 1. The skill
mkdir -p ~/.claude/skills/claude-pm
cp .claude-pm-skill/skill/SKILL.md ~/.claude/skills/claude-pm/

# 2. The 5 sub-agents
mkdir -p ~/.claude/agents
cp .claude-pm-skill/agents/pm-*.md ~/.claude/agents/
```

That's it. Claude Code auto-discovers both `~/.claude/skills/` and
`~/.claude/agents/` on the next session.

## Usage

In any project, with Claude Code:

```
/claude-pm Add bulk delete to the inbox
```

…or any phrasing that implies "deliver this end-to-end". The
orchestrator will:

1. Create `.claude-pm/add-bulk-delete-to-inbox/`
2. Run BA → (Architect ∥ Designer) → synthesize Build items
3. Loop: spawn Developer per Build item, mark complete
4. Spawn Tester to verify acceptance criteria
5. Print a "ready to review" report

### Sub-commands

- `/claude-pm continue` — resume the most recent unfinished feature
- `/claude-pm status` — print spec status + open Build / Verify items
  without running any agents

## Why this exists

A small team can punch above its weight if the planning + design +
testing tax stops being one person's job. This skill splits the cognitive
load into roles, each with a sharp scope, while keeping you in the
review loop where it matters (architecture decisions, the final commit).

It's the same philosophy as the `pm-app` project — async, written,
inbox-driven — applied to how the AI builds software.

## Conventions the agents follow

- **No agent commits or pushes.** Working tree changes are left for you
  to `git diff` and decide on.
- **No auto-introduced dependencies.** Architect lists them, Developer
  refuses anything not listed.
- **Acceptance criteria are sacred.** Every Build item references one
  by ID; every Verify item maps to one.
- **One Build item per Developer invocation.** Resists silent scope
  creep.
- **🛑 markers** in `spec.md` and `decisions.md` flag anything that
  needs a human call. The orchestrator stops on `🛑 BLOCKER`.

## File layout

```
.claude-pm-skill/
├── README.md                       ← you are here
├── skill/
│   └── SKILL.md                    ← orchestrator
└── agents/
    ├── pm-business-analyst.md
    ├── pm-architect.md
    ├── pm-designer.md
    ├── pm-developer.md
    └── pm-tester.md
```

When installed, those files land in `~/.claude/skills/claude-pm/` and
`~/.claude/agents/pm-*.md` respectively. Claude Code discovers them
automatically.

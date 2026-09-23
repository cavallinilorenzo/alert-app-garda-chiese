# Domain Docs: Single-Context Layout

This repo uses a **single-context** layout for domain documentation:

- **`CONTEXT.md`** at the repo root: the shared domain model, terminology, and architectural overview
- **`docs/adr/`**: Architecture Decision Records explaining why key choices were made

## Reading order for agents

When working on this repo, agents should:

1. Read `CONTEXT.md` first to understand the project's domain, key concepts, and high-level architecture
2. Check `docs/adr/` for any decisions that might affect the task at hand

## Creating a CONTEXT.md

If `CONTEXT.md` doesn't exist yet, create it with:

- **Project overview**: what this project does and why
- **Key domain concepts**: the vocabulary and mental model
- **Architecture sketch**: high-level structure (components, layers, external services)
- **Conventions**: coding style, naming patterns, file organization
- **Known constraints**: performance, security, compliance, or team constraints

## Creating ADRs

For significant architectural decisions, create a record in `docs/adr/` following the [ADR format](https://adr.github.io/). Title format: `NNNN-short-title.md` (e.g., `0001-use-typescript.md`).

Include: decision title, context, decision, consequences, alternatives considered.

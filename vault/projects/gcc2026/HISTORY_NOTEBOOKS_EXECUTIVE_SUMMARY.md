# History Notebooks: Persistent Narrative for Human-AI Collaborative Science in Galaxy

## The Problem

Galaxy histories capture computation but not understanding. A history shows datasets and tool runs -- the *what* happened. It doesn't capture *why* one approach was chosen over another, which results matter, or the iterative reasoning that led to insights.

This gap is becoming critical. AI agents can already drive Galaxy analyses end-to-end -- running tools, inspecting outputs, chaining steps. But the evolving understanding that emerges from human-AI collaboration has nowhere to live. Chat transcripts evaporate. The agent's rationale disappears. We risk a world where agents democratize analysis but worsen the reproducibility crisis -- generating results without provenance, methods sections, or narrative context.

## What We Built

**History Notebooks** are Galaxy-flavored markdown documents attached to histories. They let users and AI agents co-author living analysis narratives alongside the data that produced them. Every history can have multiple notebooks. Each notebook supports an AI assistant that can read history contents and propose targeted edits.

The key architectural decision: History Notebooks are not a new model. They are regular Galaxy Pages (renamed Reports in the UI Here) with an optional `history_id` foreign key. This unified approach means history-attached and standalone pages share the same editor, revision system, AI chat, and API surface. The difference is contextual -- history notebooks gain access to history-aware AI tools and are accessed through the history panel.

### Three Modes, One Document

History Notebooks serve three distinct usage modes through the same infrastructure:

**Human solo in the UI.** A researcher running a ChIP-seq pipeline opens the history panel, clicks "Notebooks," and gets a markdown editor pre-titled with the history name. They type prose, drag datasets from the history panel into the editor (auto-inserting Galaxy markdown directives), and preview rendered content with live dataset embeds. This is the computational lab notebook -- no agent required. The researcher documents as they go, building a narrative tied to real artifacts with full revision history.

**Human + agent in the UI.** The same researcher toggles the chat panel and asks the AI: *"Summarize what's in this history and draft a Methods section."* The agent inspects the history -- listing datasets, reading metadata, peeking at content -- and proposes a section-level edit. The user sees a per-section diff with checkboxes, accepts the Methods section, rejects the Introduction rewrite. The accepted content creates a new immutable revision tagged `edit_source="agent"`. This is collaborative authoring: the agent drafts, the human curates.

**External agent via API.** An agent running outside Galaxy -- Claude Code connected via MCP, a custom script, a CI pipeline -- drives an analysis through Galaxy's API and writes to the history notebook programmatically via the same `/api/pages` endpoints. The notebook becomes the agent's structured output artifact: richer than a chat transcript, tied to real data, reviewable by humans after the fact. A user might prompt: *"Analyze these datasets like paper X, keep your results documented in a history notebook."* The agent runs tools, updates the notebook iteratively, and the user returns to find not just results but a documented narrative of how they were produced.

All three modes produce revisions in the same append-only log. `edit_source` on every revision tells you whether a human, an in-app agent, or an external agent wrote it -- provenance that matters for reproducibility and audit.

### What's Under the Hood

The implementation spans the full stack:

- **Data model**: `Page.history_id` (nullable FK), `PageRevision.edit_source` (user/agent/restore provenance), `ChatExchange.page_id` (page-scoped conversations)
- **AI agent**: 5 history-aware tools (list datasets, get metadata, peek content, inspect collections, resolve HIDs to directive arguments), structured output supporting full-document replacement, section-level patches, or conversational responses
- **Frontend**: Unified `PageEditorView` adapting to history vs. standalone context, resizable editor/chat split, revision browser with three diff modes, drag-and-drop from history panel, Window Manager integration
- **Content pipeline**: Dual-field API (`content` for rendering, `content_editor` for editing) avoiding round-trip encoding problems
- **Test coverage**: 148+ tests across Selenium E2E, API integration, agent unit, history tools, chat manager, and Vitest component tests

## What It Means

### The Computational Lab Notebook Galaxy Never Had

Before any agent enters the picture, History Notebooks fill a basic gap: Galaxy has never had a place to document *why* alongside *what*. Researchers have always been able to annotate individual datasets, but there was no way to write a coherent narrative connecting inputs to conclusions within the history itself. History Notebooks give every analysis a living document -- with embedded dataset views, interactive charts, and job parameter tables -- that persists and versions alongside the data.

### Agents Need Structured Output, Not Just Chat

When an AI agent analyzes data in Galaxy -- whether through the in-app chat or an external tool like Claude Code -- the valuable output isn't the chat transcript. It's a structured, versioned document with embedded references to real artifacts. History Notebooks give agents (internal and external) a place to build up understanding iteratively, with every revision tracked and attributable. The agent doesn't just answer questions; it maintains a living document accessible through the same UI the human uses.

### Reproducibility of Communication, Not Just Computation

Galaxy has long made *analyses* reproducible through workflows. History Notebooks make the *communication of analyses* reproducible. The narrative -- why parameters were chosen, which results matter, how to interpret the outputs -- persists alongside the data, versioned and shareable. This applies whether a human wrote the narrative by hand, co-authored it with the in-app agent, or received it from an external agent that documented its own work. The `edit_source` provenance on each revision makes attribution unambiguous.

### The Document-First Paradigm

We deliberately chose documents over Jupyter-style notebooks. Galaxy already handles reproducible, auditable execution. History Notebooks handle documentation and reasoning. Neither tries to be the other. This separation matters for clinical and regulatory settings where validated execution pipelines must be distinct from interactive exploration -- and where audit trails demand clear provenance of who (or what) wrote each revision.

### Foundation for Richer Agent Workflows

The unified API surface means any agent that can make HTTP requests can create and update history notebooks. The architecture positions History Notebooks as a common medium across all three usage modes -- human solo, human-AI collaborative, and fully agentic. The pattern scales naturally to richer scenarios: agents that maintain and update notebooks as analyses evolve, embed visualizations alongside prose, and eventually enable workflow extraction where the narrative becomes a reproducible report template.

## Current Status

The implementation is feature-complete on the `history_pages` branch (galaxyproject/galaxy#21475). The original plan proposed separate `HistoryNotebook` models and HID-based syntax; the final implementation is architecturally cleaner -- a unified Page model with contextual behavior, eliminating ~630 lines of HID resolution machinery in favor of agent-mediated translation. Remaining work includes streaming agent responses, CodeMirror 6 integration for inline diff, and orchestrator-level agent integration.

## The Bigger Picture

If agents aren't strongly encouraged to do science in a reproducible way, the democratization of data analysis will produce more tangles of bash scripts and more results without provenance. The tools we've built to encourage humans to do reproducible data analysis -- structured workflows, versioned artifacts, rich metadata -- are exactly the tools we need for agent-assisted science. History Notebooks are a concrete step: giving agents a structured, versioned, history-coupled medium to document their work, subject to human review, with every edit attributed and every revision preserved.

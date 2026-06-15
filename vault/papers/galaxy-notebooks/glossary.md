# Glossary

Shared vocabulary for the Galaxy Notebooks paper. Normalize manuscript, outline, figures, talks, and agent prompts against this file first.

## Canonical Usage Rules

- Use **Galaxy Notebook** for the user-facing, history-attached document.
- Use **notebook** as the short form after the first full mention in a paragraph or section.
- Use **Report** for a standalone Galaxy Page with no attached history.
- Use **Page** only for the backend model, API, or legacy implementation discussion.
- Avoid **History Notebook** in the manuscript except when quoting or contrasting older project language.
- Avoid using **page** as a generic synonym for notebook in user-facing prose.
- Avoid making chat the noun that carries the contribution. Chat and agents are authoring paths; the artifact is the notebook.
- Use **notebook-driven workflow extraction** for the workflow handoff pattern, and state that it is driven by explicit referenced artifacts or selections, not by parsing free text.
- Use **workflow report** for the narrative/report content that travels with an extracted Galaxy workflow.
- Use **vignette** for a worked extraction example in the manuscript (the three are numbered Vignette 1–3); avoid "use case" / "UC" in manuscript prose — those labels are reserved for the project's tracking docs.
- Use **Galaxy-flavored markdown** for markdown with Galaxy directives that can embed datasets, collections, visualizations, job details, and other Galaxy objects.

## Terms

**AI assistant** - The in-app page assistant that can read the current notebook, inspect the attached history through constrained tools, and propose conversational responses, full-document replacements, or section-level edits. Prefer this term for the built-in UI feature.

**Agent-authored revision** - A notebook revision whose `edit_source` indicates the accepted content came from an agent. The revision is still part of the same append-only notebook history and is reviewable by a human.

**Artifact reference** - A durable reference from notebook content to a Galaxy object such as a history dataset, collection, visualization, or job-derived display component. Artifact references are the machine-readable anchors that make the notebook more than prose.

**Backward provenance closure** - The subgraph recovered by walking backward from selected or referenced outputs through the Galaxy history provenance graph until the necessary inputs and producing steps are reached. This is the graph operation underlying notebook-driven workflow extraction.

**External agent** - An agent outside the Galaxy web client, such as a command-line coding agent, notebook automation, or service integration, that uses Galaxy APIs to run analyses and update notebooks. Prefer this term when distinguishing API-level automation from the in-app AI assistant.

**Galaxy-flavored markdown** - Markdown plus Galaxy directives, including embedded dataset and collection displays. It is the notebook content format and the bridge between narrative prose and computational artifacts.

**MCP server** - Galaxy's Model Context Protocol server, the external surface that exposes the shared operations layer (including the notebook Page operations) as agent-callable tools. Notebook edits made through it create revisions tagged `edit_source="agent"`; reverts are tagged `edit_source="restore"`. Use this term for external agent authoring; it is the same operations layer the in-app AI assistant and web client use, not a separate notebook API.

**Galaxy Notebook** - A history-attached Galaxy document. In the implementation, this is a `Page` with `history_id` set; in the manuscript, this implementation detail should not leak into the user-facing term.

**Galaxy Page** - The backend model and shared API substrate used for both Reports and Galaxy Notebooks. Use only when discussing implementation reuse.

**History** - Galaxy's durable analysis container: datasets, collections, jobs, parameters, metadata, and provenance produced during an analysis.

**History Graph** - The provenance graph view over the history. In the paper, it is relevant as the confirmation and selection surface for workflow extraction, not as a general-purpose graph editor.

**History Notebook** - Deprecated or legacy project wording for Galaxy Notebook. Do not use as the paper's term of record.

**Notebook-driven workflow extraction** - The extraction pattern in which a documented history, its referenced artifacts, and a graph confirmation surface guide the creation of a reusable Galaxy workflow and its report. This is not free-text workflow synthesis.

**Page** - The Galaxy backend model that stores Reports and Galaxy Notebooks. A Galaxy Notebook is a Page with `history_id` set; a Report is a Page with `history_id` null.

**Page revision** - An immutable saved version of a Page's content. In this work, revisions carry `edit_source` so manual, agent-authored, and restored content can be distinguished.

**Report** - A standalone Galaxy document not attached to a history. Reports and Galaxy Notebooks share editor, revision, API, and rendering infrastructure, but Reports do not inherit history context.

**Reproducible communication** - The paper's central framing: not only making computation reproducible, but making the explanation, interpretation, selected outputs, and report attached to that computation durable, versioned, and shareable.

**Section-level edit** - An AI assistant proposal that targets a markdown heading and can be accepted or rejected independently from other proposed changes.

**Workflow report** - Narrative content associated with a reusable Galaxy workflow, seeded from a Galaxy Notebook when workflow extraction is performed from a documented history.


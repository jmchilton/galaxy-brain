# Galaxy Notebooks: Reproducible Communication for Data-Intensive Analysis

## Abstract

Galaxy histories capture the computational record of an analysis: datasets, tools, parameters, metadata, and provenance. They do not fully capture the communicative record: why choices were made, which outputs matter, and how results should be interpreted. We introduce **Galaxy Notebooks**, history-attached Galaxy-flavored markdown documents that persist alongside datasets and tool runs, embed Galaxy artifacts directly into narrative text, and record human and agent-authored revisions with provenance. A Galaxy Notebook can be written by a researcher, co-authored with the in-app AI assistant, or updated by an external agent through the same Galaxy API. In each case, the narrative remains reviewable, shareable, and attributable inside the history context. Galaxy Notebooks also provide a path from documented outputs to reuse: notebook-referenced artifacts can seed graph-backed workflow extraction so that the documented analysis, provenance structure, and resulting workflow report remain connected. The implementation reuses Galaxy's existing Page model, editor, API, revision system, and markdown renderer while adding history context, history-aware assistant tools, and history-panel entry points for notebooks. Galaxy Notebooks reposition documentation as part of the reproducibility surface: not a post hoc supplement to computation, but a durable interface between histories, workflows, and scientific interpretation.

## Introduction

Reproducible bioinformatics has usually been framed around computation. A published analysis should identify its inputs, software, parameters, workflow, and execution environment well enough that another researcher can inspect or re-run it [Goecks 2010; Sandve 2013; Abueg 2024]. Galaxy was built around this premise. A Galaxy history records the datasets produced during an analysis, the tools that produced them, the parameters used for each job, and the provenance links among those jobs. A Galaxy workflow turns a successful analysis pattern into a reusable graph. These are strong answers to the question "what happened?"

They are weaker answers to the question "what did it mean?" A history can show that a user trimmed reads, mapped them, filtered alignments, and generated a table. It cannot reliably show why one branch was abandoned, which plots were persuasive, which parameters were chosen for biological rather than mechanical reasons, or which outputs belong in the final report. Some of this context may live in dataset annotations, a lab notebook, a paper draft, a chat transcript, or the memory of the analyst. None of those places is the history itself.

This gap matters even more as AI agents become capable of driving scientific software. An agent can call tools, inspect outputs, iterate through failed attempts, and produce plausible summaries. If the only durable record of that work is the final set of datasets, or a chat transcript disconnected from the data, then automation increases the volume of analyses faster than it increases trust in them. The failure mode is not that agents write too much text. The failure mode is that agents produce computational artifacts without a durable, inspectable, versioned account of why those artifacts exist and how they should be interpreted.

Computational notebooks have long offered one answer: put prose, code, and output in the same document [Knuth 1984; Kluyver 2016; Rule 2019]. That model is valuable, but it is not the model Galaxy needs to copy. Computational notebook studies also show that ordinary notebook artifacts can be difficult to re-run and maintain without strong discipline [Pimentel 2019; Samuel 2024]. Galaxy already has an execution system with explicit tool definitions, saved parameters, datasets, histories, workflows, permissions, and provenance. Recreating execution inside a notebook would weaken the distinction Galaxy has spent years making clear. The missing piece is not a new execution substrate; it is a narrative substrate coupled to the existing one.

Galaxy Notebooks provide that substrate. A Galaxy Notebook is a Galaxy-flavored markdown document attached to a history. It can describe the analysis as it unfolds, embed datasets and collections from the history, show rendered Galaxy components in preview, and persist as part of the same shareable analysis context. Every save creates an immutable revision. Each revision records whether its content came from a user, an AI assistant, or a restore operation. A notebook can be written entirely by a human, co-authored with the in-app assistant, or updated by an external agent through the same API.

The central claim of this paper is that Galaxy Notebooks make the communication of an analysis reproducible. They do this by treating narrative, selected outputs, provenance references, and report content as first-class analysis artifacts. The notebook is not an after-the-fact note and not merely a chat window. It is the document that connects the history a researcher produced, the explanation a reader needs, and the workflow a future user may re-run.

The remainder of the paper is organized as follows. We first describe the design goals behind Galaxy Notebooks and the terminology used throughout the system. We then describe the user model: human authoring, human-assistant co-authoring, and external agent authoring. We next describe notebook-driven workflow extraction, in which referenced artifacts and a provenance graph guide the creation of a reusable workflow and its report. We then summarize the implementation, including the unified Page model, revision and chat persistence, frontend architecture, API surface, and test coverage. We close with a discussion of related work, limits, and the evidence still required before submission.

## Design Goals

Galaxy Notebooks were designed around five goals.

**Preserve narrative next to computation.** A notebook should live where the analysis lives. Users should not have to export screenshots to a separate document or copy dataset identifiers into an external lab notebook. The history is the computational container; the notebook is the narrative layer attached to it.

**Reference artifacts, not just describe them.** Markdown prose alone is insufficient. The notebook must be able to embed or refer to Galaxy datasets, collections, visualizations, and job-derived displays using Galaxy's existing markdown directive machinery. These references are what let a document remain connected to the concrete objects it discusses.

**Separate execution from explanation.** Galaxy histories and workflows remain responsible for computation. Galaxy Notebooks document and communicate that computation. This separation matters for reproducibility, review, and regulated settings: the prose may change as interpretation improves, but the computational provenance remains inspectable through the history.

**Make authorship attributable.** Human and agent contributions should not collapse into an undifferentiated document. Every saved revision is append-only and records an `edit_source`: user, agent, or restore. This is a modest but important provenance signal. It lets reviewers distinguish manual writing from accepted agent proposals without treating either as outside the record.

**Let narrative seed reuse.** A documented history is often the best available description of what should become a reusable workflow. The notebook identifies outputs that matter and records the interpretive structure around them. Workflow extraction should use those references, together with the history provenance graph, to recover a workflow and seed its report.

These goals distinguish Galaxy Notebooks from two adjacent ideas. They are not standalone Reports: Reports use the same editor and model, but they are not attached to a history and do not inherit history-aware assistant tools. They are also not executable notebooks in the Jupyter sense: execution remains in Galaxy tools, histories, and workflows, while the notebook captures narrative and artifact references.

## System Concept

A Galaxy Notebook is implemented as a history-attached Galaxy Page. The backend distinction is deliberately small: `Page.history_id` is nullable. When set, the Page is a Galaxy Notebook; when null, the Page is a standalone Report. This implementation detail should not dominate the user-facing vocabulary, but it is central to the architecture. One model, one API surface, one editor, one revision system, and one markdown rendering pipeline serve both contexts.

The contexts differ in what surrounds the document. A Report is reached from the Reports grid or a direct editor URL. It has publishing and permissions controls and can be viewed through a slug-based published route. A Galaxy Notebook is reached through the history panel and inherits the history context. It can use history-aware assistant tools, drag datasets and collections from the history panel into the editor, and open in Galaxy's window manager as part of the history workspace.

This distinction keeps the product vocabulary precise:

- **Galaxy Notebook**: a history-attached document, user-facing.
- **Report**: a standalone document, user-facing.
- **Page**: the shared backend model and API implementation.
- **History Notebook**: older project language, avoided in the manuscript except when discussing prior drafts.

The notebook content is Galaxy-flavored markdown. In edit mode, users work with raw markdown and Galaxy directives. In preview or display mode, the API returns render-ready content with internal identifiers encoded in the form expected by existing Galaxy markdown components. The API also returns `content_editor`, the raw content that should be placed back into the editor. This dual-field pattern avoids the fragile round-trip that would occur if every edit cycle encoded and decoded directive identifiers.

## Authoring Modes

Galaxy Notebooks support three authoring modes through the same artifact.

### Human Authoring

The first mode is ordinary documentation. A researcher opens a history, clicks the Galaxy Notebooks entry point, and creates or selects a notebook associated with that history. The notebook can be titled, edited, previewed, saved, and reopened. The editor supports Galaxy markdown directives and drag-and-drop from the history panel. Dragging a dataset inserts the appropriate dataset display directive; dragging a collection inserts a collection display directive. The user can save a methods note, embed intermediate outputs, record why a parameter choice was made, or mark the result that should anchor a downstream workflow.

This mode is important because the paper should not depend on AI novelty. Galaxy has long supported histories, workflows, annotations, and Pages, but it has not provided a coherent history-attached document where narrative and embedded analysis artifacts persist together. A user who never opens the chat panel still receives the central benefit: the history now has a durable communication layer.

### Human-Assistant Co-Authoring

The second mode adds the in-app AI assistant. When a notebook is attached to a history, the assistant can inspect the history through constrained tools: list datasets, retrieve dataset metadata, read dataset peeks, inspect collection structure, and resolve user-visible history identifiers into the directive arguments needed by Galaxy markdown. The assistant receives the current notebook content as context and can return a conversational response, a full-document replacement, or a section-level patch.

Section-level patches are the most important authoring form. A user might ask the assistant to "summarize this history and draft a Methods section." The assistant can inspect the history and propose a replacement for `## Methods`. The frontend shows the proposed change as a diff that the user can accept or reject. If the user accepts it, the notebook content is saved as a new revision with `edit_source="agent"`. The assistant does not silently rewrite the document; it proposes changes that enter the notebook only through a reviewable save path.

This design treats AI as a co-authoring path, not as the object being published. The artifact remains the notebook, and the notebook's revision history records which content came from an agent.

### External Agent Authoring

The third mode is API-level authoring by external agents. Any agent that can call Galaxy APIs can create or update a notebook through the same Page endpoints used by the web client. This matters because agent-assisted science will not be confined to one chat panel. A command-line agent, a continuous-integration worker, or a domain-specific automation service may drive a Galaxy analysis through APIs and document its work as it goes.

In this mode, the notebook becomes the agent's structured output artifact. It is richer than a final chat answer because it embeds references to actual Galaxy objects. It is more durable than a chat transcript because it is saved as revisions on a Page. It is more reviewable than an unstructured log because a human can open it in Galaxy, inspect the history alongside it, compare revisions, and decide what to keep.

The same authorship rule applies: accepted content is revisioned and attributable. A future audit should be able to ask not only "which tool produced this dataset?" but also "who or what wrote this interpretation?"

## Notebook-Driven Workflow Extraction

Galaxy already supports extracting workflows from histories. The traditional extraction interface asks the user to select jobs or outputs from a history-oriented view and then constructs a workflow from the selected provenance. That mechanism is powerful, but the selection surface is not the same surface where the analyst explains the analysis. The user decides what mattered in one place and writes why it mattered somewhere else.

Galaxy Notebooks suggest a tighter path. A documented history contains explicit artifact references: the dataset displayed in the results section, the collection summarized in the methods, the visualization embedded in the interpretation. These references are not natural-language guesses. They are structured Galaxy markdown directives tied to concrete history artifacts. Given those anchors, Galaxy can walk backward through the history provenance graph to recover the computational closure needed to produce them.

The intended flow has four steps. First, the notebook identifies outputs that matter through embedded artifact references or an explicit saved selection. Second, Galaxy walks backward through the history graph from those artifacts, recovering the jobs, collections, and inputs required to reproduce them. Third, the user confirms or prunes the graph in a read-only, selectable graph view. Fourth, Galaxy extracts a reusable workflow and seeds its workflow report from the notebook narrative.

This is deliberately not free-text workflow synthesis. The notebook prose provides explanation; the artifact references and graph provide precision. The user remains in the loop at the graph confirmation step, and editing the workflow itself remains the job of the existing Workflow Editor. The graph view is a selection and confirmation surface, not a second workflow editor.

The implementation status of this path should be reported precisely. The notebook system provides the artifact references, revision model, and history context needed for the workflow handoff. The graph-backed extraction and report-continuity evidence should be presented as implemented behavior only once the end-to-end vignette has been captured from the current Galaxy branch; otherwise it should be framed as a prototype design path.

## Implementation

### Data Model

The implementation extends existing Galaxy models rather than introducing a separate notebook model.

The `Page` model gains a nullable `history_id` foreign key. A Page with `history_id` set is a Galaxy Notebook; a Page without it is a Report. Pages retain existing fields such as title, slug, publication state, sharing settings, source invocation, tags, annotations, ratings, and soft deletion.

The `PageRevision` model records immutable content revisions. In addition to page ID, title snapshot, content, format, and timestamps, revisions carry `edit_source`, with values for user-authored, agent-authored, and restored revisions. Title changes are page identity changes rather than content revisions, though revision records retain a title snapshot.

The `ChatExchange` model gains `page_id`, allowing chat conversations to be scoped to a notebook or report. This supports continuity across panel close/reopen and page refresh, and lets users browse prior conversations associated with a document.

The key migration adds `history_id` to Page, `edit_source` to PageRevision, and `page_id` to ChatExchange. All additions are nullable or backward-compatible with existing Pages behavior.

### API and Content Pipeline

All notebook and report operations use the unified `/api/pages` endpoints. Listing supports a `history_id` filter. Creation accepts an optional `history_id`. Update creates a new revision and records the edit source. Revision endpoints list, fetch, compare, and restore previous content. Report-specific sharing and publishing endpoints remain available only in the standalone context.

The API returns both rendered and editor content. `content_editor` is the raw markdown stored in the database and displayed in the editor. `content` is prepared for the markdown renderer, including identifier encoding and expanded directives expected by Galaxy's markdown components. This separation avoids corrupting raw markdown through repeated encode/decode cycles.

Chat uses the existing `/api/chat` surface with `page_id` and `agent_type="page_assistant"`. The backend looks up the page, determines whether it has history context, injects the current content, and provides history tools only when appropriate.

### Frontend

The frontend centers on a unified `PageEditorView`. The same component supports Reports and Galaxy Notebooks, with context-specific controls. In notebook mode, the editor uses the history route, hides report publishing controls, shows the history name, supports history-panel drag-and-drop, and exposes history-aware assistant behavior. In report mode, it uses the Reports list route, exposes permissions and publishing controls, and disables history tools.

`HistoryPageView` handles the history-context routing: list mode, display mode, and edit mode. `HistoryPageList` lets users select or create notebooks for a history. Display mode renders the notebook read-only and integrates with Galaxy's window manager. Edit mode delegates to `PageEditorView`.

The Pinia store tracks page list state, current page, editor content, dirty state, revisions, selected revision, revision view mode, chat panel state, and chat history. Local storage remembers the current notebook per history, the current chat exchange per page, and dismissed chat proposals.

The revision interface supports preview, diff against current content, and diff against the previous revision. Restore creates a new revision rather than mutating history. The chat and revision side panels are mutually exclusive to preserve usable editor space.

### Assistant

The page assistant is registered in Galaxy's agent framework. Its system prompt is assembled from static instructions, a generated directive reference, the current page content, and history context when available. The assistant works in user-visible history identifiers where possible and calls `resolve_hid` to obtain the internal directive arguments that Galaxy markdown expects.

The assistant has five history-aware tools: list history datasets, get dataset information, get dataset peeks, inspect collection structure, and resolve history identifiers. When the same assistant is used on a standalone Report, these history tools are unavailable; it can still discuss or edit the report content.

Structured output distinguishes full-document replacements, section-level patches, and plain conversational responses. This lets the UI route proposals into reviewable diff components rather than treating every assistant response as text to paste.

### Test Coverage

The architecture notes record tests across Selenium, API integration, agent unit tests, history tools, chat manager behavior, and Vitest frontend components. The high-level coverage includes notebook navigation, editing, drag-and-drop, window manager integration, revisions, rename, chat, permissions, CRUD, revision operations, page-scoped chat persistence, assistant tools, prompt behavior, store behavior, diff utilities, and UI components.

Before submission, these counts should be regenerated from the current Galaxy branch and reported from a script or CI artifact rather than copied from the architecture document. The current draft should treat the architecture numbers as implementation evidence to verify, not as final empirical results.

## Evaluation Plan

The evaluation should match the paper's claim. This is not primarily a benchmark paper. The evidence should show that Galaxy Notebooks create a durable communication artifact coupled to history provenance, and that this artifact can support workflow reuse.

The first evidence layer is implementation completeness: model migrations, API endpoints, frontend flows, assistant tools, revision behavior, and test coverage. This can be reported as a concise table with test counts by layer and the main behaviors covered.

The second evidence layer is a worked notebook vignette. A small but real Galaxy history should be documented with a notebook that embeds the key outputs, includes manual and agent-authored revisions, and shows preview/render behavior. The vignette should be specific enough that readers see why the notebook belongs in the history rather than in a separate document.

The third evidence layer is workflow handoff. From the same or a second history, the notebook should identify outputs that matter, the graph should recover the backward provenance closure, the user should confirm the extracted structure, and the resulting workflow should carry report content seeded from the notebook. This can be presented as a figure sequence rather than a quantitative benchmark.

The fourth evidence layer is agent authorship. A constrained demonstration should show an external or in-app agent updating a notebook, with the accepted content entering the revision log as agent-authored content. The point is not to evaluate model quality; it is to show that the notebook is a reviewable, attributable output medium for agent-assisted analysis.

## Related Work

Galaxy Notebooks sit between several established bodies of work.

First, they build on Galaxy's history and workflow model for accessible, reproducible analysis [Goecks 2010; Abueg 2024]. Galaxy's core contribution has always been that users can run sophisticated tools without writing shell scripts while retaining provenance and reusable workflows. Galaxy Notebooks extend that model to the communication layer.

Second, they relate to computational notebooks and literate programming [Knuth 1984; Kluyver 2016; Rule 2019]. Jupyter and related systems combine code, prose, and results in one interactive artifact. Galaxy Notebooks share the goal of bringing explanation close to computation, but not the execution model. Galaxy execution remains in histories and workflows; the notebook is a narrative and artifact-reference layer over that execution.

Third, they relate to reproducible research guidance and workflow systems [Sandve 2013; Wratten 2021; Amstutz 2022]. Those systems emphasize scripts, workflows, environments, version control, and shareable artifacts. Galaxy Notebooks add a complementary claim: reproducibility also requires preserving the interpretation and report that make a computation understandable.

Fourth, they relate to provenance, scientific workflow reporting, and research objects [Davidson and Freire 2008; Moreau and Missier 2013; Belhajjame 2015; Soiland-Reyes 2022]. A workflow graph can show dependencies, but a reader still needs to know which outputs were meaningful and why. By embedding artifact references in a durable narrative, Galaxy Notebooks give provenance a communication surface.

Fifth, they relate to tools that recover or package workflow structure from artifacts not originally authored as workflows. YesWorkflow recovers workflow information from structured annotations in scripts, while noWorkflow captures provenance from Python execution [McPhillips 2015; Pimentel 2017]. Galaxy Notebooks make a different tradeoff: Galaxy already captures execution provenance, so the notebook marks communicative intent and meaningful outputs while the history graph supplies the computational structure.

Finally, they relate to emerging work on AI agents for bioinformatics and scientific analysis [Boiko 2023; Mehandru 2025]. The durable contribution here is not a new agent benchmark. It is infrastructure that lets human and agent writing enter a shared, versioned, provenance-coupled document.

## Discussion

Galaxy Notebooks make a specific bet: the analysis document should be part of the analysis system. A researcher should be able to move from data, to computation, to interpretation, to reusable workflow without copying context across unrelated tools. The notebook does not replace histories or workflows. It gives them a narrative layer.

The most immediate benefit is human. Galaxy users need a place to write methods notes, embed outputs, and explain results while staying inside the history context. The versioned Page model supplies that place with relatively little new backend machinery.

The second benefit is review. Revision provenance makes document authorship inspectable. A reviewer can distinguish manual edits, agent-authored proposals accepted by a user, and restored content. This does not solve all authorship or accountability questions, but it gives Galaxy a concrete record rather than an invisible overwrite.

The third benefit is reuse. A notebook that identifies meaningful outputs is a better starting point for workflow extraction than an undifferentiated list of history jobs. The narrative says what matters; the artifact references and graph say what produced it. Keeping both in one system makes it plausible for a workflow report to travel with the extracted workflow.

There are important limits. The notebook cannot make an analysis scientifically correct. It can preserve the explanation given for an analysis, but a bad explanation remains bad. Embedded artifact references can become misleading if readers assume the referenced output is sufficient evidence for a claim that requires additional validation. Agent-authored text requires human review, and `edit_source` should be treated as provenance, not as quality control.

There is also an evidence boundary. The implemented notebook infrastructure is mature enough to draft around. The notebook-driven extraction story still needs a polished demonstration and, ideally, one real scientific vignette contributed by a domain researcher. Without that evidence, the paper should retreat to a narrower application-note framing. With it, the paper can make the stronger resource claim: Galaxy Notebooks turn a documented history into the communication and report surface for reusable analysis.

## Methods

Galaxy Notebooks are implemented in Galaxy's existing Pages, markdown, chat, and history infrastructure. The backend changes extend `Page`, `PageRevision`, and `ChatExchange`; expose unified Page CRUD, revision, restore, and chat-history endpoints; and reuse Galaxy markdown rendering utilities for directive preparation. The page assistant is implemented in Galaxy's agent framework with structured output models and history-aware tools.

The frontend is implemented in Vue 3 and Pinia. `PageEditorView` is the shared editor for Reports and Galaxy Notebooks. `HistoryPageView` provides notebook-context routing inside histories. Supporting components implement notebook lists, revision browsing, revision comparison, assistant chat, proposal diffs, section-level patches, and chat history browsing. Drag-and-drop uses Galaxy's existing history-panel drag infrastructure.

The implementation should be reported with the exact commit or pull request range used for the final manuscript. Test counts and file inventories in this draft are derived from the architecture document and must be regenerated before submission.

## Availability

Galaxy Notebooks are developed in the Galaxy codebase as part of the history-attached Pages work. The manuscript should cite the final merged pull request, release version, documentation page, and any demo deployment once available. Demo histories and scripts used for figures should be archived or committed with enough detail to reproduce the screenshots and workflow extraction sequence.

## References

Inline citations in this draft are placeholders keyed to `references.md`. The reference list needs a full verification pass before external circulation.

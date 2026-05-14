# Skills in AI: A Terminology and Landscape Survey

*Background document — neutral survey. Companion to [KNOWLEDGE_BASES_IN_AI.md](./KNOWLEDGE_BASES_IN_AI.md) and the opinionated synthesis [BRIDGING_KB_AND_SKILLS.md](./BRIDGING_KB_AND_SKILLS.md).*

## Preamble

The word "skill" is one of the most overloaded terms in contemporary AI systems. Depending on the system and the speaker, it may refer to a directory of markdown files, a JSON-schema-declared function, a fine-tuned model checkpoint, a voice-assistant interaction model, or a temporal abstraction in a reinforcement-learning policy. This document maps the landscape, grouping systems by what they actually mean when they use the word, then examines the problems skills solve, the shapes they take, how they are authored, where they break, how they are distributed, and how they are evaluated.

---

## 1. Terminology Landscape

### 1.1 Anthropic Claude Agent Skills

Introduced in late 2025 and published as an open standard at agentskills.io, Anthropic's **Agent Skills** are filesystem-based capability bundles. The atomic unit is a directory containing a `SKILL.md` file at its root, plus optional scripts and reference documents. `SKILL.md` opens with YAML frontmatter (`name`, `description`) followed by freeform markdown procedural instructions.

The architecture is built around **progressive disclosure**:

- **Level 1 (always loaded):** Only the frontmatter — approximately 100 tokens per skill — enters the system prompt at agent startup. Claude uses natural-language matching against these descriptions to determine if a skill is relevant; there is no separate intent classifier or embedding lookup.
- **Level 2 (on trigger):** Claude reads the full `SKILL.md` body into context via a bash command, typically under 5,000 tokens.
- **Level 3+ (on demand):** Additional linked files (`FORMS.md`, `REFERENCE.md`, scripts) are read or executed as needed. Executed scripts contribute only their output to context, not their source.

The design explicitly avoids embedding full tool definitions in the system prompt, which contrasts with approaches (such as early ChatGPT tooling) that consumed the majority of the token budget at startup. Skills run inside a virtual machine where Claude has filesystem and bash access; the practical token limit on aggregated skills metadata is around 15,000 characters.

Pre-built skills include handlers for PowerPoint, Excel, Word, and PDF. Anthropic also ships an open-source `claude-api` skill bundled with Claude Code. Custom skills can be uploaded via the API (workspace-scoped), configured in Claude Code (`~/.claude/skills/` or `.claude/skills/`), or uploaded as zip files to claude.ai (user-scoped only).

Official documentation: [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview); engineering blog: [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills); public repository: [github.com/anthropics/skills](https://github.com/anthropics/skills).

### 1.2 Claude Code Slash Commands and Subagents

Claude Code provides two related but distinct extension mechanisms.

**Slash commands** are markdown files placed in `.claude/commands/` (project-level) or `~/.claude/commands/` (personal). Invoking `/command-name` injects the markdown content into the session. This is the legacy format; Anthropic now recommends migrating to the `.claude/skills/` layout, which supports both manual slash-command invocation and autonomous invocation by Claude.

**Subagents** are defined in `.claude/agents/` with their own system-prompt configuration and can be delegated to by a parent agent or by a skill's instruction body. A skill can reference a subagent via the `agent:` field in its frontmatter to route task execution to a specialized agent configuration.

Documentation: [Slash Commands in the SDK](https://code.claude.com/docs/en/agent-sdk/slash-commands); community reference: [Claude Code customization guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/).

### 1.3 Tool-Use / Function-Calling APIs

Across the major model APIs — OpenAI, Anthropic, Google Gemini — **tools** or **functions** are the lowest-level extension primitive. The caller declares a JSON Schema for each tool (name, description, parameter types, required fields); the model emits a structured tool-call object at inference time, and the caller executes the corresponding code and returns the result.

OpenAI's function-calling API introduced "strict mode" to enforce schema adherence and tool-search support for large tool sets. OpenAI's guidance is to keep the active tool count at or below 10–20, because selection accuracy degrades beyond that range.

These APIs are the substrate on which all higher-level skill systems are built. A "skill" in most frameworks is ultimately serialized to the model as one or more tool declarations. Documentation: [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling).

### 1.4 Model Context Protocol (MCP)

Launched by Anthropic in November 2024 and now maintained as an open standard, **MCP** is a JSON-RPC protocol for AI applications to discover and invoke capabilities from MCP servers. MCP defines three primitives:

- **Tools:** Schema-declared executable functions, analogous to function-calling tools. Require explicit user approval; discovered via `tools/list`, invoked via `tools/call`.
- **Resources:** Read-only, URI-addressed data (documentation, schemas, reference files). Identified by MIME type; support URI templates for parameterized access. Do not trigger actions.
- **Prompts:** Versioned, parameterized instruction templates explicitly invoked by a user or client. Can dynamically reference available resources and tools.

MCP servers run as local processes (stdio transport) or remote services (Streamable HTTP). Specification: [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts); roadmap: [2026 MCP Roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/); server registry: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers); features guide: [WorkOS MCP features guide](https://workos.com/blog/mcp-features-guide).

### 1.5 OpenAI Custom GPTs and GPT Actions

**Custom GPTs** are configured ChatGPT instances with a custom system prompt, attached knowledge documents, and optionally **GPT Actions** — HTTP integrations described by an OpenAPI specification. GPT Actions translate natural-language requests into structured API calls via function-calling. As of early 2025, OpenAI deprecated the original Custom GPT Actions interface and is consolidating toward direct function calling, the Assistants API, and the Responses API in the newer Agents SDK.

The GPT Store provided a marketplace model but has not been succeeded by a comparable capability-sharing marketplace for the newer paradigms.

OpenAI announcement: [Introducing GPTs](https://openai.com/index/introducing-gpts/); actions documentation: [GPT Actions](https://platform.openai.com/docs/actions/introduction).

### 1.6 Plugins (Deprecated)

The **ChatGPT Plugins** system (2023) allowed third-party developers to expose API endpoints as browsable capabilities via an OpenAPI manifest and a plugin manifest JSON file. Plugins were deprecated in favor of Custom GPTs and GPT Actions within a year of launch, primarily because discovery friction was high and the trust model for arbitrary third-party code execution was difficult to manage at scale.

### 1.7 LangChain Chains, Agents, and Tools

LangChain distinguishes between **chains** (static, predefined execution sequences) and **agents** (dynamic, LLM-driven decision processes). In the agent model, **tools** are the callable primitives: any Python callable wrapped with a name, description, and optionally a JSON schema becomes a tool. The LangGraph runtime models agent execution as a directed graph of nodes (model calls, tool executions) and edges (conditional transitions). LangChain tools can wrap MCP servers natively in recent versions.

Documentation: [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents); [LangGraph overview](https://www.langchain.com/langgraph).

### 1.8 LlamaIndex Agent Tools and QueryEngines

LlamaIndex exposes tools through a minimal interface: `__call__` plus metadata (name, description, function schema). The primary tool types are `FunctionTool` (wraps any callable with auto-inferred schema) and `QueryEngineTool` (wraps a retrieval pipeline, exposing document corpora as a callable). Because `BaseAgent` inherits from `BaseQueryEngine`, agents can themselves be wrapped as tools, enabling recursive agent nesting.

Documentation: [LlamaIndex Tools](https://developers.llamaindex.ai/python/framework/module_guides/deploying/agents/tools/); [Agent with Query Engine Tools](https://docs.llamaindex.ai/en/stable/examples/agent/openai_agent_with_query_engine/).

### 1.9 AutoGen, CrewAI, smolagents

- **AutoGen / AG2** (Microsoft): Conversational multi-agent system. Agents communicate through group-chat-style message passing; the primary abstraction is the conversational turn, not the individual tool.
- **CrewAI**: Role-based agent teams ("crew members") with declared specializations, toolsets, and task delegation hierarchies. Focuses on structured workflows mapping to organizational metaphors. Added MCP tool loading and A2A protocol support in v1.10.
- **smolagents** (Hugging Face): Minimalist framework where the primary action mechanism is writing and executing Python code rather than calling predefined tool functions. Best suited for research prototypes.

Framework comparisons: [Langfuse framework comparison](https://langfuse.com/blog/2025-03-19-ai-agent-comparison); [AI Agent Frameworks in 2026](https://www.morphllm.com/ai-agent-framework).

### 1.10 Microsoft Semantic Kernel (now Microsoft Agent Framework)

Semantic Kernel (SK) is historically notable for explicitly naming its extension unit a **skill** — a collection of functions grouped under a shared namespace. In current documentation, SK has renamed this concept to **plugin**, aligning with broader tool-calling vocabulary, though the "skill" term persists in community writing.

An SK plugin is a class whose methods are annotated with `@kernel_function` (Python) or `[KernelFunction]` (C#), each with natural-language descriptions. The kernel dispatches to plugins via function-calling. Plugins can be imported three ways: native code, OpenAPI specification, or MCP server. As of 2025, SK has been rebranded **Microsoft Agent Framework (MAF)** at v1.0.

Documentation: [Semantic Kernel Plugins](https://learn.microsoft.com/en-us/semantic-kernel/concepts/plugins/); [Microsoft Agent Framework overview](https://learn.microsoft.com/en-us/semantic-kernel/overview/).

### 1.11 Alexa Skills (Voice Agent Reference Point)

Amazon's **Alexa Skills** are the canonical pre-LLM precedent. A skill is an independently deployed voice application invoked by a name ("Alexa, open Weather Buddy"). The skill's **interaction model** declares intents, slots (typed arguments), and sample utterances. Invocation requires explicit user phrasing of the skill's invocation name. Slot-filling dialogues manage multi-turn argument collection. Intent classification was done by a separate NLU component, not by the response model itself.

This explicit invocation-name requirement, the slot schema, and the per-skill NLU model are conceptual ancestors of the "name + description + input schema" pattern seen in all modern tool-calling systems.

Documentation: [Alexa Custom Skills](https://developer.amazon.com/en-US/docs/alexa/custom-skills/steps-to-build-a-custom-skill.html); skill selection at scale: [Scalable Neural Architecture for Alexa Skill Selection](https://www.amazon.science/blog/the-scalable-neural-architecture-behind-alexas-ability-to-select-skills).

### 1.12 Hierarchical RL: the Options Framework

In the hierarchical RL literature, a **skill** or **option** is a temporally extended action — a sub-policy that runs for multiple timesteps until a termination condition is met. An option consists of three components: an **initiation set** (states where the option can start), a **policy** (the behavior during execution), and a **termination condition** (when to hand control back to the higher-level policy). This structure — when to activate, how to execute, when to stop — maps onto modern skill description fields (description for activation, instruction body for execution, implicit task completion for termination).

Recent work couples LLMs with HRL to discover options automatically from task descriptions and prior trajectories. Survey: [Hierarchical RL Survey](https://www.mdpi.com/2504-4990/4/1/9); recent integration: [Option Discovery Using LLM-guided Semantic HRL](https://arxiv.org/html/2503.19007v1).

---

## 2. What Problems Do Skills Solve?

**Extending LLM capability beyond text.** A base model cannot read a PDF, call an API, or write a spreadsheet. Skills bridge the gap by bundling both the procedural instructions and the executable code that performs the action.

**Encoding repeatable procedures / SOPs.** Organizations have established workflows — expense report formats, code review checklists, deployment runbooks — that previously required a human to hold the procedure in memory or look it up. Skills encode that procedure once and make it reliably available on demand.

**Composition and reuse.** A skill for "read PDF" composes with a skill for "fill Excel template" to handle "extract table from PDF into spreadsheet" without requiring a new skill. The skill boundary is the unit of reuse.

**Permissioning and sandboxing.** Skills can gate which tools (network access, filesystem writes, external API calls) are available during their execution. Scope is attached to the skill, not to the global agent configuration.

**Reducing prompt-engineering surface for end users.** Once a skill is authored, a non-expert user invokes it by stating their intent in natural language. They do not write system prompts, craft few-shot examples, or manage context-window constraints.

**Bringing private or domain knowledge to a general model.** Enterprise teams have internal schemas, API references, style guides, and institutional conventions that public models do not know. Bundling that material as skill resources makes it available on demand without including it in every conversation.

---

## 3. Common Shapes of a Skill Artifact

Across systems, a skill tends to be some combination of these components:

| Component | Claude Skills | MCP | GPT Actions | Semantic Kernel |
|---|---|---|---|---|
| Procedural instruction body | `SKILL.md` markdown | — (server logic) | System prompt / instructions | `[Description]` annotations |
| Triggering metadata | YAML frontmatter `description` | Tool `description` string | GPT description field | Function description |
| Input/output schema | Implicit (in SKILL.md) | JSON Schema per tool | OpenAPI spec | Method signature + attributes |
| Bundled reference content | Resource files in skill dir | Resources primitive | Knowledge files (RAG) | Prompt template files |
| Executable code | Scripts in skill dir | Server-side handler | Action HTTP endpoint | Native `KernelFunction` methods |
| Permissions / scopes | Runtime environment constraints | User approval per-tool | OAuth scopes on actions | DI-injected services |

The cleanest abstraction is MCP's three-way split (tools = executable actions, resources = read-only data, prompts = reusable instruction templates), which separates concerns that other systems conflate. Claude Skills merge instruction body and bundled content into a single filesystem layout. Semantic Kernel focuses primarily on executable functions with natural-language descriptions, relying on the surrounding framework for retrieval.

---

## 4. Authoring Patterns

**Hand-written prompts.** The dominant approach. An expert writes `SKILL.md` (or equivalent) by specifying the workflow steps, gotchas, and expected outputs. Quality depends on the author's ability to write instructions the model can interpret reliably.

**Generated from OpenAPI / existing API specs.** Semantic Kernel's `AddFromOpenApiSpec`, MCP server scaffolding tools, and GPT Actions all consume an OpenAPI file and auto-generate the tool declarations, descriptions, and parameter schemas. This is currently the fastest path to wrapping an existing service.

**Distillation from runs.** Systems like **EvoSkill** and **Buffer of Thoughts** evolve skills by collecting agent trajectories, identifying which prompts and procedures led to successful outcomes, and distilling them into reusable templates. This treats run logs as training data for skill authoring.

**Inference-time distillation.** A teacher model generates step-by-step demonstrations at inference time to guide a cheaper student model through a task without weight updates.

**Fine-tuning a model into a skill.** For narrow, high-frequency tasks, fine-tuning a smaller model on task-specific data produces a model that embeds the skill in its weights rather than in an external prompt. Trade-off: deterministic improvement on the target task; loss of generality and update cost.

**Agentic self-improvement.** ADAS (Automated Design of Agentic Systems) and SICA (Self-Improving Coding Agent) demonstrate meta-agents that author new agent architectures or prompts autonomously by running experiments and scoring outcomes against benchmarks. These remain research-grade; production deployments rely on human-authored skills with structured review.

---

## 5. Failure Modes

**Prompt drift / specification drift.** An agent gradually reinterprets skill instructions in ways that diverge from the original intent. The instructions are still present in context, but the model's reading of them shifts over time or across contexts.

**Context rot / bloat.** When skill files grow too large or too many skills are loaded, instruction-following degrades even though all tokens are technically present. Anthropic's progressive disclosure design is a direct countermeasure; the 15,000-character cap on aggregated skill metadata is another. See [Context Rot in Claude Code Skills](https://www.mindstudio.ai/blog/context-rot-claude-code-skills-bloated-files).

**Skill discovery failures.** The description field is the primary signal for determining whether to activate a skill. Under-specified descriptions cause the skill not to trigger when it should; over-broad descriptions cause it to trigger when it should not. The correct scope of a description is a non-trivial authoring problem.

**Composition failures.** When a task spans multiple skills, sequencing errors, inconsistent output formats between skills, and ambiguity about which skill should handle a given substep all contribute to failures that would not appear in single-skill scenarios.

**Ambiguous tool sets.** OpenAI's function-calling guidance notes that selection accuracy degrades with more than 10–20 tools. If two tools have overlapping descriptions, the model cannot reliably choose between them.

**Version skew.** A skill authored against an older API version, a deprecated tool interface, or a previous model's instruction-following behavior may silently degrade when any of those change. Skills lack a formal dependency or compatibility declaration in most systems.

**Hallucinated tool arguments.** Models generate structurally valid but semantically wrong arguments (wrong IDs, wrong field names, plausible-but-nonexistent values). Strict JSON Schema mode and runtime schema validation reduce but do not eliminate this.

**Security: prompt injection via skill content.** Skills that fetch external content (URLs, user-provided documents) can carry instructions that override the skill's stated behavior. Anthropic's documentation explicitly warns against skills from untrusted sources and treats skill installation as analogous to installing software.

---

## 6. Distribution and Packaging

**Anthropic Skills format on disk.** A directory containing `SKILL.md` plus optional resources and scripts. Distributed as a zip file (for claude.ai upload), as a git repository (for Claude Code), or registered in the API (`/v1/skills` endpoints, workspace-scoped).

**MCP server packaging.** An MCP server is an independently deployed process exposed over stdio or HTTP. Distribution follows standard software packaging: npm packages (`npx @vendor/mcp-server`), Python packages (`uvx vendor-mcp`), or Docker images. Official registry: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers).

**Hugging Face Spaces as skills.** Gradio-based Spaces expose their functions as MCP tools via `huggingface_hub` MCP client support, turning any deployed Gradio app into a callable agent tool. Hugging Face also maintains a [skills repository](https://github.com/huggingface/skills) parallel to Anthropic's.

**Agent Package Manager (APM).** Microsoft's open-source APM applies a `package.json`-style manifest (`apm.yml`) to agent skill dependencies, resolving and installing skills in the same way npm handles JavaScript packages.

**GPT Marketplace.** OpenAI's GPT Store allowed browsing and installing Custom GPTs. With GPTs' evolution toward the Responses and Agents SDKs, the equivalent distribution channel for the newer paradigm is less clearly defined.

---

## 7. Evaluation

**Golden traces.** A golden trace is a task-environment pair with a known-correct execution trajectory and an automated verifier. Eval suites are built from collections of goldens, allowing regression testing across model versions, skill edits, and tool changes. The verifier checks final outputs, intermediate tool calls, or both.

**LLM-as-judge.** A strong model is prompted to score agent trajectories against a rubric. Widely used because it scales cheaply. Calibration against human annotations is required before relying on it; judge models introduce their own biases (position, length, sycophancy).

**Eval harnesses.** Frameworks such as DeepEval provide 50+ pre-built metrics including tool-use accuracy, trajectory faithfulness, and safety checks. OpenAI's developer blog describes [testing agent skills systematically with evals](https://developers.openai.com/blog/eval-skills). The eval flywheel pattern — online eval catches failures, human annotation labels them, new cases enter the offline golden set — is a current production best practice.

**Observation-based eval.** Rather than scoring outputs, instruments observe which tools were called, in what order, with what arguments, and whether side effects (file writes, API calls) were correct. Important for skills where the output is an action rather than text.

**Benchmarks.** Published benchmarks (SWE-Bench for coding, WebArena for browser tasks, ToolBench for tool selection) evaluate agent capabilities in aggregate but do not directly evaluate individual skills.

---

## Sources

- [Agent Skills overview — Anthropic API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Equipping agents for the real world with Agent Skills — Anthropic Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [anthropics/skills — GitHub](https://github.com/anthropics/skills)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Slash Commands in the SDK — Claude Code Docs](https://code.claude.com/docs/en/agent-sdk/slash-commands)
- [MCP specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts)
- [2026 MCP Roadmap — MCP Blog](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [MCP Features Guide — WorkOS](https://workos.com/blog/mcp-features-guide)
- [modelcontextprotocol/servers — GitHub](https://github.com/modelcontextprotocol/servers)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Introducing GPTs — OpenAI](https://openai.com/index/introducing-gpts/)
- [GPT Actions — OpenAI](https://platform.openai.com/docs/actions/introduction)
- [Plugins in Semantic Kernel — Microsoft Learn](https://learn.microsoft.com/en-us/semantic-kernel/concepts/plugins/)
- [LangChain Agents Documentation](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph overview — LangChain](https://www.langchain.com/langgraph)
- [LlamaIndex Tools](https://developers.llamaindex.ai/python/framework/module_guides/deploying/agents/tools/)
- [Alexa Custom Skills — Amazon Developer](https://developer.amazon.com/en-US/docs/alexa/custom-skills/steps-to-build-a-custom-skill.html)
- [Scalable Neural Architecture for Alexa Skill Selection — Amazon Science](https://www.amazon.science/blog/the-scalable-neural-architecture-behind-alexas-ability-to-select-skills)
- [Hierarchical RL Survey — MDPI MAKE](https://www.mdpi.com/2504-4990/4/1/9)
- [Option Discovery Using LLM-guided Semantic HRL — arXiv 2503.19007](https://arxiv.org/html/2503.19007v1)
- [Claude Agent Skills: A First Principles Deep Dive — Lee Hanchung](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Context Rot in Claude Code Skills — MindStudio](https://www.mindstudio.ai/blog/context-rot-claude-code-skills-bloated-files)
- [AI Agent Frameworks Compared 2026 — Langfuse](https://langfuse.com/blog/2025-03-19-ai-agent-comparison)
- [Testing Agent Skills Systematically with Evals — OpenAI Developers](https://developers.openai.com/blog/eval-skills)
- [DeepEval Documentation](https://deepeval.com/docs/introduction)
- [Hugging Face Skills Repository](https://github.com/huggingface/skills)

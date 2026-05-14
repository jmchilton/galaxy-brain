# Knowledge Bases in AI: A Landscape Survey

*Background document — neutral survey. Companion to [SKILLS_IN_AI.md](./SKILLS_IN_AI.md) and the opinionated synthesis [BRIDGING_KB_AND_SKILLS.md](./BRIDGING_KB_AND_SKILLS.md).*

## 1. Historical Arc

The use of structured external knowledge in AI predates neural networks by several decades. The dominant paradigm through the 1980s and 1990s was the **expert system**: manually curated rule sets and fact databases (frames, production rules) encoding domain knowledge explicitly. The canonical example is **Cyc**, begun at MCC in 1984, which aimed to encode millions of commonsense facts in formal logic; a scaled-down open version, OpenCyc, remains accessible today. Expert systems were brittle — they could not generalize beyond hand-coded rules and required expensive knowledge-engineering labor.

The **Semantic Web** movement of the late 1990s and 2000s proposed a more interoperable model. The W3C standardized **RDF** (Resource Description Framework) for representing graph triples (subject–predicate–object), **OWL** (Web Ontology Language) for formal ontological reasoning, and **SPARQL** as a query language. Projects like **DBpedia** (2007), which extracted structured data from Wikipedia infoboxes, demonstrated that web-scale knowledge bases were achievable without purely manual curation. These systems carried the Semantic Web's original vision of machine-readable linked data, though that vision of a universally interlinked web of facts never fully materialized in practice.

The term **knowledge graph** gained currency after Google announced its Knowledge Graph in 2012, feeding structured entity–relationship data into search results and voice assistants. Google's graph drew on DBpedia, Freebase, Wikidata (launched the same year by the Wikimedia Foundation), Schema.org markup, and Wikipedia. **Wikidata** has since grown into the largest open multilingual knowledge base, with hundreds of millions of statements and a public SPARQL endpoint. Commercial enterprise KGs followed in sectors like finance, pharma, and e-commerce, typically built on property graph databases (Neo4j, Amazon Neptune) rather than RDF stores, trading formal semantics for query performance.

The deep-learning era introduced a different kind of "knowledge": **dense embeddings**. Word2Vec (2013), GloVe (2014), and ELMo (2018) captured statistical regularities of language in continuous vector spaces. BERT (2018) extended this to contextual representations learned over billions of tokens. The implicit claim was that parametric weights encode factual knowledge — GPT-3 (Brown et al., 2020) pushed this further, demonstrating that a sufficiently large model can answer factual questions without an external KB at all, though with well-known hallucination tendencies.

The inadequacy of purely parametric knowledge — stale after training, opaque, and unable to cite sources — drove the modern **retrieval-augmented** turn. **REALM** (Guu et al., 2020; [arxiv.org/abs/2002.08909](https://arxiv.org/abs/2002.08909)) pioneered retrieval-augmented pre-training by learning to retrieve Wikipedia passages as a latent variable during masked language modeling, backpropagating through the retrieval step. **RAG** (Lewis et al., 2020; [arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)) generalized this to sequence-to-sequence generation, combining a dense retriever with a seq2seq generator in an end-to-end fine-tunable architecture and demonstrating markedly more factual and specific output than parametric-only baselines. **Atlas** (Izacard et al., 2022; [arxiv.org/abs/2208.03299](https://arxiv.org/abs/2208.03299)) extended retrieval-augmented training to few-shot settings, showing that an 11B-parameter retrieval-augmented model outperforms a 540B parametric model by ~3% on NaturalQuestions with only 64 training examples.

The current frontier is best described as **hybrid**: architectures combine parametric LLMs with graph-structured KBs, dense vector indexes, and structured document stores. **GraphRAG** (Edge et al., 2024; [arxiv.org/abs/2404.16130](https://arxiv.org/abs/2404.16130)) from Microsoft Research represents a notable synthesis — using LLMs to construct a knowledge graph from unstructured text, then applying community detection to generate hierarchical summaries for global sensemaking queries that flat vector retrieval cannot answer. Pan et al. (2024; [arxiv.org/abs/2306.08302](https://arxiv.org/abs/2306.08302)) in IEEE TKDE provide a systematic roadmap of three integration paradigms: KG-enhanced LLMs, LLM-augmented KGs, and synergized bidirectional frameworks.

---

## 2. Current Taxonomy of "Knowledge Base" in AI

The term "knowledge base" is used loosely enough to cover several architecturally distinct systems. The following taxonomy distinguishes them by their primary data model, query mechanism, and typical deployment context.

### 2.1 Symbolic Knowledge Graphs

RDF triple stores (Apache Jena, Virtuoso) and property graph databases (Neo4j, Amazon Neptune, TigerGraph) store explicitly labeled entities and relationships. Querying is via SPARQL (RDF) or graph traversal APIs (property graphs). Public instances: [Wikidata](https://www.wikidata.org/), [DBpedia](https://www.dbpedia.org/), [Schema.org](https://schema.org/). Enterprise KGs in regulated industries (pharma, finance) layer proprietary ontologies on these stores. Strengths: precise multi-hop traversal, transparent provenance, formal reasoning support. Weaknesses: brittle to natural-language queries; constructing and maintaining the graph requires significant engineering; the closed-world assumption can cause false negatives.

### 2.2 Document Stores and Vector Indexes

The dominant pattern in production LLM applications. Text is split into chunks, embedded via a neural encoder (e.g., OpenAI text-embedding-3, BGE, E5), and stored in a vector index supporting approximate nearest-neighbor search. Major managed offerings: [Pinecone](https://www.pinecone.io/), [Weaviate](https://weaviate.io/), [Qdrant](https://qdrant.tech/). Open-source/self-hosted paths: pgvector (PostgreSQL extension), FAISS (Meta), Chroma. The fundamental retrieval unit is the chunk, not the document; chunking strategy (size, overlap, semantic vs. fixed-window) directly affects retrieval quality and is a known failure surface.

### 2.3 Hybrid Retrieval (Sparse + Dense + Reranking)

Production retrieval pipelines typically combine **BM25** (or BM25+) for exact-keyword matching with dense vector ANN for semantic matching, fusing results via Reciprocal Rank Fusion (RRF) or learned alpha weighting. A cross-encoder reranker (ColBERT, BGE Reranker, Cohere Rerank) then reorders the top-N candidates before passing to the generator. BGE-M3 (released January 2024) unifies dense, sparse, and late-interaction retrieval in a single 550M-parameter checkpoint. The practical argument for hybrid retrieval is that neither sparse nor dense alone dominates across query types: keyword-heavy queries (exact product codes, names) favor BM25; semantic/paraphrase queries favor dense encoders. See: [Optimizing RAG with hybrid search and reranking](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking).

### 2.4 Structured-Document Knowledge Bases

An increasingly important category for agent systems: semi-structured corpora where documents carry metadata (title, tags, author, date, summary) and may contain wiki-style links or explicit ontological relationships. Tools in this space include Notion, Obsidian, Roam Research, and Confluence. These systems occupy a middle ground between flat document stores and formal knowledge graphs: they support structured queries against metadata while preserving the narrative richness of prose. When used as agent context, the metadata fields function as a lightweight structured index enabling selective retrieval before embedding.

### 2.5 Schema-Validated Content Collections

Static-site frameworks such as Astro, Hugo, and Jekyll treat content collections as first-class typed data: frontmatter is validated against a schema (often JSON Schema), slugs form stable identifiers, and link relationships are explicit. This creates a content KB with formal integrity constraints, predictable shape, and version control. The schema layer enables systematic tooling (linters, validators, drift detectors) that freeform document stores lack. The tradeoff is rigidity — adding a new field requires schema extension, not just editing a document.

### 2.6 Agent Memory Systems

Memory for AI agents is distinct from the retrieval-time KB: it is *updated* by agent behavior, not just queried. The field has converged on four memory categories, mapped loosely from cognitive science:

- **Working memory**: active context window content; transient.
- **Episodic memory**: records of past interactions and events, stored and retrieved by temporal or semantic similarity.
- **Semantic memory**: consolidated factual knowledge extracted from episodic memories; slower to accumulate but more broadly applicable.
- **Procedural memory**: learned workflows and behavior patterns.

**Mem0** ([mem0.ai](https://mem0.ai/)) provides a managed memory layer extracting and retrieving "memories" from interaction history; its April 2025 paper presented at ECAI 2025 provided a broad comparison of ten memory approaches on the LoCoMo benchmark ([arxiv.org/pdf/2504.19413](https://arxiv.org/pdf/2504.19413)). **Letta** (formerly MemGPT) treats memory as explicit editable state that the agent can read and write via tool calls, exposing memory blocks as first-class components rather than opaque retrieval targets ([State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)). **Zep** and **Graphiti** are additional production-focused systems in this space.

---

## 3. What KBs Are Used For in AI Systems Today

**Retrieval-augmented generation (RAG)** remains the most common production deployment: a query is embedded, nearest-neighbor chunks retrieved, and both query and chunks passed to an LLM. This pattern reduces hallucination by grounding generation in retrieved text. The NeurIPS 2020 RAG paper demonstrated large improvements in human-judged factuality over parametric-only generation on open-domain QA. The pattern has been extended to conversational RAG, multi-hop RAG (iterative retrieval over multiple steps), and agentic RAG where the agent decides when and what to retrieve.

**Factual grounding and hallucination reduction** are the motivating use cases. Retrieval provides a verifiable evidence chain: claims in the output can, in principle, be traced to specific source chunks. Evaluation of this property — called *groundedness* or *faithfulness* — is an active research and tooling area.

**Tool and skill dispatch** is an emerging use: KBs store descriptions of available tools or agent skills, and retrieval over the KB enables dynamic routing — an agent searches for the right capability rather than having all capabilities hard-coded in the system prompt. This pattern is especially relevant to agent orchestration where the skill registry can grow beyond what fits in a context window.

**Agent memory** (described in §2.6): KBs as persistent, queryable stores of prior agent interactions, enabling cross-session personalization and long-context behavior without unbounded context windows.

**Citation generation**: RAG-based systems can produce inline citations by attributing output sentences to source chunks, improving auditability for high-stakes applications (medical, legal, financial).

**Structured output schemas**: some KBs serve as schema registries, providing JSON Schema or OpenAPI definitions that constrain LLM output shapes — separating the knowledge of *what fields are valid* from the inference process.

---

## 4. Common Failure Modes and Quality Dimensions

**Staleness and drift.** Parametric knowledge is frozen at training cutoff; retrieval indexes require explicit re-ingestion pipelines to stay current. The gap between when a fact changes in the world and when it is reflected in the KB is the *staleness window*. For frequently updated enterprise data, nightly reindexing may still leave a 24-hour gap; for rapidly evolving regulatory content, this is a real quality risk. Evaluation results also drift as the underlying knowledge base evolves, making benchmark maintenance expensive ([RAG Evaluation: A Data Pipeline Performance Framework](https://unstructured.io/insights/rag-evaluation-a-data-pipeline-performance-framework)).

**Chunking artifacts.** Splitting documents at fixed token boundaries frequently cuts semantic units mid-sentence or separates a claim from its context. Semantic chunking attempts to group sentences by meaning rather than length, but introduces computational cost and is not uniformly effective. The "Lost in the Middle" phenomenon (Liu et al., 2023; [arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)) showed that retrieval recall saturates before generation performance does — even when the right chunks are retrieved, models fail to use information in the middle of long context windows, making chunk ordering a non-trivial design variable.

**Retrieval misses (recall gaps).** No retrieval system has perfect recall. Sparse retrievers miss paraphrases; dense retrievers miss exact-term queries. Both miss knowledge that is distributed across multiple chunks with no single chunk scoring highly on its own. Multi-hop queries requiring inference across multiple documents are a particular weak point for flat vector retrieval; GraphRAG's community-summarization approach addresses this at the cost of expensive index-time LLM processing.

**Hallucinated citations.** LLMs will fabricate plausible-looking citations when asked to produce them without explicit retrieval grounding. Even with RAG, models may generate a claim that sounds supported by the retrieved chunk but goes beyond what the chunk says — a form of "unfaithful" generation distinct from outright fabrication. Faithfulness scores (measuring whether each claim in the output is entailed by retrieved context) attempt to detect this ([RAG Evaluation Metrics](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)).

**Provenance gaps.** Informal document stores often lack structured metadata: no author, no date, no source URL. When a retrieval system can only say "this text came from a document," downstream auditability is limited. Schema-validated KBs and RDF-based stores have stronger provenance stories, but at the cost of stricter ingestion requirements.

**Evaluation difficulty.** Standard IR metrics (Recall@K, Precision@K, NDCG@K) measure retrieval quality when ground-truth relevance labels are available. For open-ended generation with RAG, the evaluation splits into retrieval evaluation, faithfulness evaluation, and answer-relevancy evaluation — each requiring different tooling. Production targets vary by system but common benchmarks suggest Faithfulness >0.9, Answer Relevancy >0.85, Context Precision >0.8 as thresholds for reliable deployment ([Patronus RAG Evaluation Metrics](https://www.patronus.ai/llm-testing/rag-evaluation-metrics)). LLM-as-judge approaches (using a second LLM to evaluate faithfulness) are widely adopted but introduce their own biases.

**Context-window pressure.** Retrieval-augmented systems inject retrieved content into the context window. As the number of retrieved chunks grows, two effects compound: the "lost in the middle" position bias degrades use of middle-context material, and inference cost grows linearly (or super-linearly for attention). Reranking reduces the number of chunks passed to the generator, but does not eliminate the fundamental tradeoff between retrieval recall and generation context size.

---

## 5. Standards and Infrastructure Worth Naming

**RDF / OWL / SPARQL**: W3C stack for formal knowledge representation and query, underlying Wikidata, DBpedia, and most biomedical KGs. OWL enables description-logic reasoning; SPARQL is the query standard for triple stores. Adoption outside research and regulated industries is limited by engineering complexity.

**Schema.org**: a shared vocabulary for structured data markup (JSON-LD, Microdata, RDFa) embedded in web pages, powering search-engine knowledge panels and enabling web-scale entity extraction. Provides a common ontological anchor for entity types across domains. [schema.org](https://schema.org/).

**JSON Schema**: the dominant schema language for validating structured documents in software engineering contexts. Widely used as the constraint layer for RAG-adjacent structured-output systems and content collections. [json-schema.org](https://json-schema.org/).

**JSON-LD**: JSON-based serialization of linked data, bridging web-developer ergonomics and semantic-web interoperability. Used in Schema.org markup, open knowledge graphs, and increasingly in LLM tool definitions.

**OpenAPI / Swagger**: REST API description standard. Functions as a KB of available operations for agent tool use; LLMs can be prompted with an OpenAPI spec to generate valid API calls. The overlap between API description and agent tool registry is explicit in several frameworks.

**Model Context Protocol (MCP)**: open standard introduced by Anthropic in November 2024 and subsequently adopted by OpenAI; donated to the Linux Foundation's Agentic AI Foundation in late 2025. MCP defines three primitives: **Tools** (executable functions), **Resources** (read-only data — the KB-adjacent primitive), and **Prompts** (reusable templates). Resources provide a standardized interface for exposing external data sources — files, database rows, API responses — to LLM applications. The protocol runs over JSON-RPC 2.0 with stateful connections and capability negotiation. Specification: [modelcontextprotocol.io/specification/2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25); announcement: [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol).

**LangChain**: modular framework for chaining LLM calls with tools, memory, and retrieval. Provides a large library of document loaders, vector store connectors, and retrieval abstractions. Best suited to fast prototyping and complex agentic workflows. [langchain.com](https://www.langchain.com/).

**LlamaIndex**: specializes in data ingestion, indexing, and structured RAG pipelines. Provides connectors for SharePoint, Notion, Slack, and other enterprise data sources; its node parser and index abstractions give fine-grained control over chunking and retrieval. [llamaindex.ai](https://www.llamaindex.ai/).

**Haystack** (deepset): production-focused NLP pipeline framework emphasizing hybrid search (BM25 + dense), composable component graphs, and explicit pipeline definitions favoring maintainability over prototyping speed. [haystack.deepset.ai](https://haystack.deepset.ai/).

See [LlamaIndex vs LangChain vs Haystack](https://kanerika.com/blogs/llamaindex-vs-langchain-vs-haystack/) for a recent framework comparison.

---

## 6. Notable Papers and Posts

- **REALM** — Guu et al., 2020. Retrieval-augmented pre-training with differentiable retrieval over Wikipedia. First demonstration of end-to-end retrieval training integrated with masked LM. [arxiv.org/abs/2002.08909](https://arxiv.org/abs/2002.08909)
- **RAG** — Lewis et al., 2020 (NeurIPS 2020). Foundational paper combining a learned dense retriever with a seq2seq generator. [arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)
- **Atlas** — Izacard et al., 2022 (JMLR 2023). Few-shot learning with retrieval-augmented language models. [arxiv.org/abs/2208.03299](https://arxiv.org/abs/2208.03299)
- **"Lost in the Middle"** — Liu et al., 2023 (TACL 2024). LLM performance degrades when relevant information is placed in the middle of long contexts. [arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
- **GraphRAG** — Edge et al., 2024 (Microsoft Research). Graph-based RAG for query-focused summarization over large corpora. [arxiv.org/abs/2404.16130](https://arxiv.org/abs/2404.16130); see also the [Microsoft Research blog post](https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-private-data/).
- **"Unifying LLMs and KGs: A Roadmap"** — Pan et al., 2024 (IEEE TKDE). Taxonomy of three integration paradigms: KG-enhanced LLMs, LLM-augmented KGs, and synergized systems. [arxiv.org/abs/2306.08302](https://arxiv.org/abs/2306.08302)
- **Evaluation of RAG: A Survey** — Yu et al., 2024. Covers retrieval quality, faithfulness, answer relevancy, and end-to-end benchmarks. [arxiv.org/html/2405.07437v2](https://arxiv.org/html/2405.07437v2)
- **Mem0 paper** — ECAI 2025. Head-to-head comparison of ten agent-memory approaches. [arxiv.org/pdf/2504.19413](https://arxiv.org/pdf/2504.19413)
- **LLM-Empowered KG Construction: A Survey** — 2025. How LLMs reshape ontology engineering → extraction → fusion. [arxiv.org/abs/2510.20345](https://arxiv.org/abs/2510.20345)
- **From Vectors to KGs: Comprehensive RAG Architecture Analysis** — 2026 (ScienceDirect). [sciencedirect.com/.../S1574013726000341](https://www.sciencedirect.com/science/article/abs/pii/S1574013726000341)

# Agent/MCP `get_tool_citations` reads attributes the citation objects don't have

- Area: lib/galaxy/agents/operations.py
- Found while: [[Component - Tool Citations and External Metadata Fetch]]
- Galaxy SHA: 65e6daff
- Severity: medium

## Problem

`AgentOperationsManager.get_tool_citations` (`agents/operations.py:693-719`) treats each entry of `tool.citations` as if it carried `type`, `doi`, `bibtex` and `url` attributes:

```python
citation_info = {"type": getattr(citation, "type", "unknown")}
if hasattr(citation, "doi"):
    citation_info["doi"] = citation.doi
if hasattr(citation, "bibtex"):
    citation_info["bibtex"] = citation.bibtex
```

`tool.citations` holds `BibtexCitation` / `DoiCitation` objects from `managers/citations.py:144-180`. Neither has `type`, `bibtex` or `url`. `DoiCitation.doi` is a method, so `citation_info["doi"]` becomes a bound method rather than a string. So:

- every citation reports `"type": "unknown"`;
- a BibTeX citation comes back as `{"type": "unknown"}`, with no content;
- a DOI citation carries a bound method, which a JSON encoder can't serialize.

The MCP tool that wraps it (`webapps/galaxy/api/mcp.py:842-854`) documents its output as "citation dicts with type and content", and the history agent (`agents/history.py:107-109`, prompt `agents/prompts/history_analyzer.md:23`) is told to call it.

## Evidence / repro

- Read in code. No test calls `get_tool_citations` (grep of `test/` and `lib/galaxy_test/`).

## Suggested fix

Build the dict from the objects' real API: `{"type": "doi", "doi": c.doi()}` for `DoiCitation` and `{"type": "bibtex", "content": c.to_bibtex()}` for `BibtexCitation`. Decide whether the agent should resolve DOIs to BibTeX, which costs an outbound fetch, or return the bare DOI. Add a unit test on a tool with one citation of each type.

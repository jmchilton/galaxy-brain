# Obsidian Plan Evaluation: structured_tool_state Branch Notes

Evaluating how well LIBRARY_OBSIDIAN_RESEARCH.md fits the 30 untracked markdown files in the `structured_tool_state` worktree.

---

## Note Inventory

30 root-level markdown files spanning two major feature areas:

### Workflow Extraction (16 notes)
- **Component research**: WORKFLOW_EXTRACTION_OVERVIEW, WORKFLOW_EXTRACTION_MODELS, WORKFLOW_EXTRACTION_LIMITATIONS
- **Issue analysis**: WORKFLOW_EXTRACTION_ISSUES (multi-issue roundup), WORKFLOW_EXTRACTION_MODERNIZATION_ISSUE (#17506 deep dive)
- **Bug research**: WORKFLOW_EXTRACTION_COPIED_DATASETS_FIX, ...PARTIAL_HISTORY_COPIES, WORKFLOW_EXTRACTION_HID_TO_ID_ISSUE, ...MULTIPLE_HISTORIES_RESEARCH, WORKFLOW_EXTRACTION_HID_VS_IDS, WORKFLOW_EXTRACTION_IMPLICIT_CONVERSION, ...IMPLICIT_CONVERSION_IN_WORKFLOWS_RESEARCH, IMPLICIT_CONVERSION_RESEARCH
- **Plans**: WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN
- **Plan sections/reviews**: WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN_PERFORMANCE, WORKFLOW_EXTRACT_SELENIUM

### YAML Tools / Structured Tool State (11 notes)
- **Component research**: YAML_TOOL_RUNTIME, USER_DEFINED_TOOLS, TOOL_TESTING_OVERVIEW, COLLECTION_TOOL_EXECUTION_SEMANTICS, TOOL_REQUEST_API
- **Plans**: YAML_TOOLS_COLLECTION_INPUTS_PLAN
- **Plan sections**: YAML_TOOLS_COLLECTION_INPUTS_PLAN_ELEMENT_METADATA, ...NESTED_ELEMENTS, ...SRC_FIELD_POPULATION, ...SUBCOLLECTION_MAPPING, ...FOLLOWUP
- **Research for plan**: YAML_TOOLS_COLLECTION_INPUTS_HARMONIZATION, YAML_TOOLS_COLLECTION_INPUTS_OTHER_COLLECTION_TYPES_RESEARCH

### Other
- **PR_18524_TOOL_STATE_RESEARCH** - contains only "test", placeholder/stub

---

## Taxonomy Mapping

| Research doc type | Notes that fit | Count |
|---|---|---|
| Research - Component (`#research/component`) | WORKFLOW_EXTRACTION_OVERVIEW, _MODELS, _LIMITATIONS, YAML_TOOL_RUNTIME, USER_DEFINED_TOOLS, TOOL_TESTING_OVERVIEW, COLLECTION_TOOL_EXECUTION_SEMANTICS, TOOL_REQUEST_API, IMPLICIT_CONVERSION_RESEARCH | 9 |
| Research - Issue (`#research/issue`) | WORKFLOW_EXTRACTION_MODERNIZATION_ISSUE (#17506) | 1 |
| Research - PR (`#research/pr`) | TOOL_REQUEST_API (PR #20935), USER_DEFINED_TOOLS (PR #19434) | 2 (dual-type) |
| Plan (`#plan`) | WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN, YAML_TOOLS_COLLECTION_INPUTS_PLAN | 2 |
| Plan Section (`#plan/section`) | WORKFLOW_EXTRACT_SELENIUM, WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN_PERFORMANCE, all YAML_TOOLS_COLLECTION_INPUTS_PLAN_* notes | 7 |
| **NOT COVERED** | See gaps below | ~9 |

### Types not in taxonomy

1. **Multi-issue roundup** - WORKFLOW_EXTRACTION_ISSUES summarizes ~8 GitHub issues in one note. Not a single-issue research note. Needs `#research/issue-roundup` or similar.
2. **Bug analysis / fix design** - WORKFLOW_EXTRACTION_COPIED_DATASETS_FIX, ...PARTIAL_HISTORY_COPIES, WORKFLOW_EXTRACTION_HID_TO_ID_ISSUE, ...MULTIPLE_HISTORIES_RESEARCH, WORKFLOW_EXTRACTION_HID_VS_IDS, WORKFLOW_EXTRACTION_IMPLICIT_CONVERSION, ...IMPLICIT_CONVERSION_IN_WORKFLOWS_RESEARCH. These are deep dives into specific bugs/design problems - they research a cross-cutting concern that spans multiple issues. Closest match is `#research/component` but that's imprecise. Could be `#research/bug` or `#research/design-problem`.
3. **Implementation follow-up / status tracker** - YAML_TOOLS_COLLECTION_INPUTS_PLAN_FOLLOWUP tracks plan vs implementation deviations and next steps. This is a "plan retrospective" or "implementation journal" - not anticipated in taxonomy.
4. **Harmonization / design spec** - YAML_TOOLS_COLLECTION_INPUTS_HARMONIZATION reads more like a design spec/RFC than pure research.

---

## Frontmatter Examples

### Example 1: WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN

```yaml
---
type: plan
tags:
  - plan
  - galaxy/api
  - galaxy/client
  - galaxy/workflows
title: "Workflow Extraction Vue Conversion"
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
related_issues:
  - "[[Issue 17506 - Convert Workflow Extraction to Vue]]"
related_prs: []
unresolved_questions: 0
parent_feature: "[[MOC - Workflow Extraction]]"
---
```

### Example 2: WORKFLOW_EXTRACTION_MODERNIZATION_ISSUE

```yaml
---
type: research
subtype: issue
tags:
  - research/issue
  - galaxy/client
  - galaxy/api
  - galaxy/workflows
github_issue: 17506
github_repo: galaxyproject/galaxy
component: "workflow extraction UI"
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
aliases:
  - "Issue 17506"
  - "Convert Workflow Extraction to Vue"
---
```

### Example 3: YAML_TOOLS_COLLECTION_INPUTS_PLAN_NESTED_ELEMENTS

```yaml
---
type: plan-section
tags:
  - plan/section
  - galaxy/tools
parent_plan: "[[YAML Tools Collection Inputs Plan]]"
section: "Nested collection elements structure"
status: draft
created: 2025-01-15
revised: 2025-01-15
revision: 1
ai_generated: true
resolves_question: 4
---
```

Note: `resolves_question` field not in original research doc but natural for plan sections that answer specific unresolved questions from the parent plan.

---

## Applicable Tags

### Type tags (from taxonomy)
- `#research/component` - most research notes
- `#research/issue` - WORKFLOW_EXTRACTION_MODERNIZATION_ISSUE
- `#plan` - the two main plans
- `#plan/section` - all supporting plan notes

### Galaxy area tags
- `#galaxy/workflows` - all WORKFLOW_EXTRACTION_* notes
- `#galaxy/tools` - all YAML_TOOLS_* notes, TOOL_REQUEST_API, TOOL_TESTING_OVERVIEW
- `#galaxy/api` - TOOL_REQUEST_API, WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN
- `#galaxy/client` - WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN, WORKFLOW_EXTRACT_SELENIUM
- `#galaxy/datasets` - COLLECTION_TOOL_EXECUTION_SEMANTICS, IMPLICIT_CONVERSION_RESEARCH
- `#galaxy/testing` - TOOL_TESTING_OVERVIEW, WORKFLOW_EXTRACT_SELENIUM

### Missing from tag vocabulary
- `#galaxy/collections` - heavily needed, 10+ notes about dataset collections
- `#galaxy/models` - WORKFLOW_EXTRACTION_MODELS is purely about ORM models
- `#galaxy/security` - USER_DEFINED_TOOLS has security model discussion

---

## Linking Strategy

### Natural link clusters

**Workflow Extraction cluster** (dense interconnection):
- WORKFLOW_EXTRACTION_OVERVIEW links to all other WF_EXTRACTION_* notes
- WORKFLOW_EXTRACTION_ISSUES links to specific bug analysis notes (COPIED_DATASETS_FIX, HID_TO_ID_ISSUE, etc.)
- WORKFLOW_EXTRACTION_VUE_CONVERSION_PLAN links to all plan sections (PERFORMANCE, SELENIUM)
- WORKFLOW_EXTRACTION_MODERNIZATION_ISSUE (#17506) links to the plan that addresses it

**YAML Tools cluster**:
- YAML_TOOLS_COLLECTION_INPUTS_PLAN links to all YAML_TOOLS_COLLECTION_INPUTS_PLAN_* sections
- YAML_TOOLS_COLLECTION_INPUTS_HARMONIZATION links to PLAN as problem statement
- YAML_TOOL_RUNTIME links to COLLECTION_TOOL_EXECUTION_SEMANTICS and PLAN

**Cross-cluster links**:
- IMPLICIT_CONVERSION_RESEARCH <-> WORKFLOW_EXTRACTION_IMPLICIT_CONVERSION (same concept, different feature context)
- TOOL_REQUEST_API <-> WORKFLOW_EXTRACTION_LIMITATIONS (ToolRequest mentioned as future solution to extraction limitations)
- USER_DEFINED_TOOLS <-> YAML_TOOL_RUNTIME (same tool type, different angles)

### Concept notes needed
- `[[Concept - Dataset Collections]]` - referenced by 10+ notes
- `[[Concept - Implicit Conversion]]` - referenced by 4+ notes
- `[[Concept - HID vs ID]]` - referenced by 5+ notes
- `[[Concept - Tool Request]]` - referenced by 2+ notes across clusters

---

## Useful MOCs

1. **MOC - Workflow Extraction** - hub for all 20 WF_EXTRACTION notes. Subdivide by:
   - Overview & Models (architecture)
   - Known Issues & Bug Analysis
   - Vue Conversion Plan & Sections
   - Testing

2. **MOC - YAML Tool State** - hub for all 11+ YAML tool notes. Subdivide by:
   - Runtime Architecture
   - Collection Inputs Plan & Sections
   - Follow-up & Status

3. **MOC - Galaxy Collections** - cross-cutting MOC linking collection-related notes from both clusters

4. **MOC - Active Plans** - links to both plans + their sections with status tracking

---

## Valuable Dataview/Bases Queries

```dataview
TABLE parent_plan, section, status
FROM #plan/section
WHERE parent_plan = "[[YAML Tools Collection Inputs Plan]]"
SORT file.name ASC
```
*Track all sections of a specific plan and their status.*

```dataview
TABLE status, revised, revision
FROM #research
WHERE contains(tags, "galaxy/workflows")
SORT revised DESC
```
*All workflow-related research sorted by last revision.*

```dataview
LIST
FROM #plan
WHERE status = "draft" OR status = "reviewed"
```
*Active plans needing attention.*

```dataview
TABLE github_issue, status
FROM #research/issue
SORT github_issue ASC
```
*Issue research index.*

```dataview
TABLE section, status
FROM #plan/section
WHERE status != "completed"
GROUP BY parent_plan
```
*Outstanding plan sections grouped by parent plan - useful for tracking progress.*

**Bases views**:
- "All Notes by Status" - simple status board across entire vault
- "Plan Progress" - filter to `#plan` + `#plan/section`, group by parent_plan
- "Stale Research" - filter `revised < date(today) - dur(90 days)`

---

## Gaps in the Obsidian Research Plan

### 1. Missing note types

| Gap | Example notes | Suggested type/tag |
|---|---|---|
| Multi-issue roundup | WORKFLOW_EXTRACTION_ISSUES | `#research/issue-roundup` |
| Bug/design-problem analysis | WORKFLOW_EXTRACTION_COPIED_DATASETS_FIX, HID_TO_ID_ISSUE | `#research/design-problem` or `#research/bug` |
| Implementation follow-up | YAML_TOOLS_COLLECTION_INPUTS_PLAN_FOLLOWUP | `#plan/followup` or `#plan/retrospective` |
| Design spec / RFC | YAML_TOOLS_COLLECTION_INPUTS_HARMONIZATION | `#research/design-spec` |


### 2. Missing frontmatter fields

- **`parent_plan`** - used by plan sections but also useful for research notes that were generated *because* of a plan (e.g., YAML_TOOLS_COLLECTION_INPUTS_OTHER_COLLECTION_TYPES_RESEARCH was created to answer a plan question)
- **`parent_feature`** or **`feature_area`** - to group notes under a feature umbrella without needing a MOC link in frontmatter. MOCs are great but queryable frontmatter is faster for Dataview.
- **`resolves_question`** - plan sections often exist to answer a specific unresolved question from the parent plan. Integer or string reference.
- **`related_prs`** - some notes relate to PRs but aren't PR research notes (e.g., TOOL_REQUEST_API is research *about* PR #20935)
- **`related_notes`** - explicit cross-references in frontmatter (beyond wiki links in body)
- **`branch`** or **`worktree`** - these notes live in a specific git worktree/branch. Tracking provenance of where notes were generated could help with staleness detection.
- **`github_issue` as list** - WORKFLOW_EXTRACTION_COPIED_DATASETS_FIX references #9161, #13823, #12236, possibly #21336. Current schema has single `github_issue` integer.

### 3. Dual-type notes not anticipated

TOOL_REQUEST_API is both component research AND PR research (PR #20935). USER_DEFINED_TOOLS is both component research AND PR research (PR #19434). Taxonomy assumes one type per note. Options:
- Allow `subtype: [component, pr]` as list
- Pick primary type, add secondary as tag
- Split into separate notes (worse - creates redundancy)

### 4. Hierarchical plan structure not fully modeled

The YAML_TOOLS_COLLECTION_INPUTS_PLAN has 6 plan-section children, plus a followup note, plus research notes spawned by unresolved questions. This is a 3-level hierarchy: Plan -> Sections -> Research spawned by sections. The research doc only models 2 levels (plan + plan section).

### 5. No "stale by branch merge" detection

These notes live in a feature branch worktree. When the branch merges to dev/main, many notes become stale or "completed" simultaneously. No mechanism in the research doc for batch staleness triggered by git events.

### 6. Galaxy area tags too coarse

`#galaxy/tools` covers YAML tool runtime, tool testing infrastructure, tool request API, user-defined tools, and collection execution semantics. These are very different concerns. Consider:
- `#galaxy/tools/runtime`
- `#galaxy/tools/testing`
- `#galaxy/tools/yaml`
- `#galaxy/tools/collections`

### 7. No code reference tracking

Most notes reference specific files and line numbers in the Galaxy codebase. These go stale fast. No frontmatter field or convention for tracking which source files a note depends on, which would enable automated staleness detection (git diff against referenced files).

---

## Unresolved Questions

- Allow multi-value `subtype` for dual-type notes, or enforce single primary type?
- `github_issue` as integer vs list of integers for multi-issue notes?
- Track source file references in frontmatter for staleness detection, or too noisy?
- Should plan-section research (notes spawned to answer plan questions) be `#plan/section` or `#research/*` with a `parent_plan` link?
- Branch/worktree provenance in frontmatter - useful or over-engineering?
- Batch staleness on branch merge - Dataview query checking `branch` field against merged branches, or manual?

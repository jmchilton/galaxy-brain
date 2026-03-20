---
type: research
subtype: pr
github_pr: 16612
github_repo: galaxyproject/galaxy
tags:
  - research/pr
  - galaxy/workflows
  - galaxy/client
  - galaxy/api
status: draft
created: 2026-03-16
revised: 2026-03-16
revision: 1
ai_generated: true
---

# PR #16612 Research Summary

## Pull Request Overview

**Title:** Workflow Comments 💬

**State:** MERGED (merged on 2023-10-31)

**Author:** ElectronicBlueberry

**Number:** 16612

**URL:** https://github.com/galaxyproject/galaxy/pull/16612

**Merge Commit:** 67cf270c799a73b5611fc7dfe4c36c71910758b5

**Statistics:**
- Additions: 4,133
- Deletions: 114
- Total files changed: 50

**Labels:** area/API, area/client, area/database, area/UI-UX, area/workflows, highlight, kind/feature

**Milestone:** 23.2

**Reviewers:** dannon (Approved), davelopez (Commented)

---

## PR Description

This PR introduces Workflow Comments, a comprehensive feature for the Galaxy Workflow Editor that allows users to visually explain and structure workflows with various comment types, including text, markdown, frames, and freehand drawings.

### Key Features Introduced

1. **Editor Toolbar** - New UI element allowing tool selection beyond just mouse pointer
   - Includes cursor, magnet (snapping), and comment tools
   - Toggleable snapping with configurable snap distance

2. **Comment Types**
   - **Text Comments**: Styled free-floating text with bold, italic, color, and size options
   - **Markdown Comments**: Rendered markdown with border and background, with scroll support
   - **Frame Comments**: Freehand-drawn boxes to visually group workflow steps and comments
   - **Freehand Comments**: Drawing tool with configurable smoothing and eraser

3. **Snapping Feature** - Aligns steps and comments to workflow grid

4. **Minimap Integration** - Comments and their colors rendered in the workflow minimap

---

## Changed Files Analysis

### Frontend Components (Client-side)

#### New Comment Components
All files exist and actively maintained. Last modifications range from 2023-10-31 to 2025-10-29.

- **TextComment.vue** (`client/src/components/Workflow/Editor/Comments/TextComment.vue`)
  - Last modified: 2025-10-29 (Convert DOMPurify to default import for ESM compatibility)
  - Status: ACTIVE

- **MarkdownComment.vue** (`client/src/components/Workflow/Editor/Comments/MarkdownComment.vue`)
  - Last modified: 2025-10-29 (Convert DOMPurify to default import for ESM compatibility)
  - Status: ACTIVE

- **FrameComment.vue** (`client/src/components/Workflow/Editor/Comments/FrameComment.vue`)
  - Part of active comment system
  - Status: ACTIVE

- **FreehandComment.vue** (`client/src/components/Workflow/Editor/Comments/FreehandComment.vue`)
  - Part of active comment system
  - Status: ACTIVE

- **ColourSelector.vue** (`client/src/components/Workflow/Editor/Comments/ColourSelector.vue`)
  - Color selection UI for comments
  - Status: ACTIVE

- **WorkflowComment.vue** (`client/src/components/Workflow/Editor/Comments/WorkflowComment.vue`)
  - Base comment component
  - Status: ACTIVE

#### Supporting Utilities
- **colours.ts** - Color definitions for comments
- **useResizable.ts** - Resizable comment hook
- **utilities.ts** - Comment utility functions
- **_buttonGroup.scss** - Button styling for comment tools

#### Tests
- **WorkflowComment.test.ts** - Component test suite
- **ColourSelector.test.js** - Color selector tests

#### Toolbar and Tools
- **ToolBar.vue** (`client/src/components/Workflow/Editor/Tools/ToolBar.vue`)
  - Last modified: 2025-08-25 (prettier formatting)
  - Status: ACTIVE - Enhanced with box select, improved highlight visibility, auto-layout

- **useToolLogic.ts** (`client/src/components/Workflow/Editor/Tools/useToolLogic.ts`)
  - Tool selection and logic handler
  - Status: ACTIVE

- **InputCatcher.vue** (`client/src/components/Workflow/Editor/Tools/InputCatcher.vue`)
  - Input handling for drawing tools
  - Status: ACTIVE

#### Stores (State Management)
- **workflowEditorCommentStore.ts** (`client/src/stores/workflowEditorCommentStore.ts`)
  - Last modified: 2025-08-25 (prettier formatting)
  - Subsequent commits (35+ modifications since PR merge) added: multi-select, selection highlighting, comment action names, scope-based store wrapper
  - Status: ACTIVE

- **workflowEditorToolbarStore.ts** (`client/src/stores/workflowEditorToolbarStore.ts`)
  - Toolbar state management
  - Status: ACTIVE

#### Editor Core Components
- **Draggable.vue** - Comment dragging functionality
- **DraggablePan.vue** - Pan functionality
- **WorkflowEdges.vue** - Edge rendering
- **WorkflowGraph.vue** - Graph visualization
- **WorkflowMinimap.vue** - Minimap with comment rendering
- **ZoomControl.vue** - Zoom controls
- **Index.vue** - Main editor component

#### Canvas and Geometry Modules
- **canvasDraw.ts** - Canvas drawing utilities for freehand comments
- **geometry.ts** - Geometry calculations for comment positioning
- **model.ts** - Data models for workflow editor state
- **services.js** - Workflow services

#### Markdown Composable
- **markdown.ts** (`client/src/composables/markdown.ts`)
  - Converted from markdown.js
  - Last modified: 2025-10-29
  - Status: ACTIVE

#### Icons
- **textLarger.duotone.svg** - Icon for text size increase
- **textSmaller.duotone.svg** - Icon for text size decrease

#### Configuration
- **.eslintrc.js** - ESLint configuration updates for comment components
- **navigation.yml** - Navigation configuration
- **utils.ts** - General utilities

#### Package Management
- **package.json** - Dependencies updated
- **yarn.lock** - Dependency lock file

---

### Backend Components (Python/API)

#### Database Model
- **lib/galaxy/model/__init__.py**
  - Last modified: 2026-02-04 (add a version param to refactor workflow payload)
  - Original PR added WorkflowComment class with mapping to "workflow_comment" table
  - Current status: ACTIVE with updated SQLAlchemy 2.0 style annotations
  - Status: ACTIVE

**WorkflowComment Class Details:**
- Original PR added: Basic columns (id, order_index, workflow_id, position, size, type, colour, data, parent_comment_id)
- Current implementation maintains same structure with `colour` renamed to `color` (W3C naming standard)
- Relationships: workflow, parent_comment, child_comments, child_steps
- Key change since PR: Migration to SQLAlchemy 2.0+ `Mapped` annotations and type hints

#### Database Migration
- **lib/galaxy/model/migrations/alembic/versions_gxy/ddbdbc40bdc1_add_workflow_comment_table.py**
  - Adds workflow_comment table with proper foreign keys
  - Status: EXISTS

#### Schema Models
- **lib/galaxy/schema/workflow/comments.py**
  - Last modified: 2026-01-05 (Drop support for Python 3.9)
  - Original PR added Pydantic schemas for all comment types
  - Current status: ACTIVE with significant modernization:
    - Changed from `Tuple/List` to `tuple/list` (Python 3.10+ syntax)
    - Updated Pydantic field syntax (explicit `default=None`)
    - Changed from `colour` to `color` (W3C naming standard)
    - Migrated from `__root__` pattern to modern `RootModel` with `discriminator`
  - Status: ACTIVE

**Schema Classes:**
- BaseComment, TextComment, MarkdownComment, FrameComment, FreehandComment
- WorkflowCommentModel (union type for all comment types)

#### Managers/APIs
- **lib/galaxy/managers/workflows.py**
  - Last modified: 2026-02-20 (Upgrade gxformat2 to 0.22.0, remove format2 workarounds)
  - Added comment handling in workflow management
  - Status: ACTIVE

- **lib/galaxy/webapps/galaxy/api/workflows.py**
  - Last modified: multiple times since PR (most recent 2025+ commits)
  - Added comment exposure via API endpoints
  - Status: ACTIVE

#### Workflow Steps
- **lib/galaxy/workflow/steps.py**
  - Modified to handle comment relationships
  - Status: ACTIVE

#### Testing
- **lib/galaxy/selenium/navigates_galaxy.py**
  - Added workflow editor navigation methods
  - Status: ACTIVE

- **lib/galaxy_test/selenium/test_workflow_editor.py**
  - Added Selenium tests for comment functionality (snapping, placement, removal)
  - Later migrations: Tests moved to Playwright framework
  - Status: ACTIVE

---

## Dependencies

### Frontend Dependencies (package.json)

| Dependency | Version | Used For | Current Status |
|---|---|---|---|
| hsluv | ^1.0.1 | Color space conversion for comments | ✓ ACTIVE |
| markdown-it | ^14.1.1 | Markdown rendering in MarkdownComment | ✓ ACTIVE |
| markdown-it-regexp | ^0.4.0 | Markdown parsing enhancement | ✓ ACTIVE |
| dompurify | ^3.0.6 | Sanitizing HTML in markdown comments | ✓ ACTIVE |

All dependencies are still actively used and have been updated since the PR was merged.

### Python Dependencies

No new backend dependencies were introduced by this PR. Uses existing:
- pydantic (for schema models)
- sqlalchemy (for database model)
- typing_extensions (for Literal type hints)

---

## File Path Validation

All 50 files mentioned in the PR still exist and are actively maintained. Key paths verified:

**Frontend:**
- ✓ `client/src/components/Workflow/Editor/Comments/` - Full directory with all comment types
- ✓ `client/src/components/Workflow/Editor/Tools/` - Toolbar and tool files
- ✓ `client/src/stores/workflowEditor*Store.ts` - Comment and toolbar state stores
- ✓ `client/src/composables/markdown.ts` - Markdown composable (migrated from .js)
- ✓ `client/src/icons/galaxy/text*.svg` - Text sizing icons

**Backend:**
- ✓ `lib/galaxy/model/__init__.py` - WorkflowComment model
- ✓ `lib/galaxy/schema/workflow/comments.py` - Comment schemas
- ✓ `lib/galaxy/managers/workflows.py` - Workflow manager
- ✓ `lib/galaxy/webapps/galaxy/api/workflows.py` - API endpoints
- ✓ Database migration file in alembic versions

---

## Subsequent Evolution (Since PR Merge)

### Code Quality & Modernization
- **2025-10-29**: DOMPurify converted to default import for ESM compatibility
- **2026-01-05**: Python 3.9 support dropped; Pydantic modernization
- **2026-02-04**: SQLAlchemy 2.0 migration with updated type annotations
- **2026-02-20**: Gxformat2 upgraded to 0.22.0

### Feature Enhancements
- **Toolbar Evolution** (35+ commits):
  - Box select UI elements and logic
  - Multi-select highlighting for comments
  - Selection toolbar with display of selected count
  - Selection operations (copy, paste, delete)
  - Auto-layout as toolbar tool
  - Improved highlight visibility
  - Pressed state improvements

- **Comment System Enhancements**:
  - Frame comment hierarchy improvements
  - Comment action names made more descriptive
  - Better integration with selection system
  - Freehand comment rendering optimization
  - Performance improvements for drag and draw

### Testing Framework Migration
- Selenium tests for comments migrated to Playwright
- Tests separated into dedicated packages
- Expanded UI testing for undo/redo operations

### Naming Standardization
- `colour` renamed to `color` throughout (W3C naming standard)
- Applied consistently in schema, model, and client code

---

## Integration Status

The Workflow Comments feature is deeply integrated into Galaxy:

1. **Backward Compatible**: Comments are optional; workflows without comments function identically
2. **Database Persistent**: Comments stored in `workflow_comment` table with proper foreign key relationships
3. **API Accessible**: Comment CRUD operations available through Galaxy API
4. **UI Fully Featured**: Complete editing experience with multiple comment types and tools
5. **Well Tested**: Comprehensive test coverage across unit, component, and integration levels

---

## Known Limitations (from PR description)

Comments may be lost when importing workflows to software other than the newest Galaxy version, as they are decorative and not part of core workflow definition.

---

## Current Code Quality

The codebase has been modernized significantly since initial PR merge:
- SQLAlchemy 2.0+ compatible
- Pydantic v2 compatible
- Python 3.10+ syntax (tuple/list, modern imports)
- ESM module format compatible
- Comprehensive type hints throughout

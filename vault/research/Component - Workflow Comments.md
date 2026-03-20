---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/client
  - galaxy/api
status: draft
created: 2026-03-16
revised: 2026-03-16
revision: 1
ai_generated: true
component: Workflow Comments
galaxy_areas: [workflows, client, api]
related_notes:
  - "[[PR 16612 - Workflow Comments]]"
---

# Workflow Comments: Architecture White Paper

## Executive Summary

Workflow Comments is a visual annotation system for Galaxy's Workflow Editor that enables users to document, explain, and structure workflows through text, markdown, geometric framing, and freehand drawing. Comments are optional and non-destructive—they don't affect workflow execution but enhance human understanding.

---

## 1. System Overview

### 1.1 Purpose and Goals

Workflow Comments addresses a usability gap: workflows can be complex and difficult to understand at a glance, especially when shared. The system provides multiple visual annotation tools:

- **Document workflow logic** through text and markdown comments
- **Visually group workflow steps** using frame comments
- **Create freehand diagrams** for custom visual annotation
- **Maintain workflow aesthetics** without modifying workflow execution semantics

### 1.2 Design Philosophy

1. **Non-destructive**: Comments are orthogonal to workflow execution
2. **Type-driven**: Each comment type has its own data structure, Pydantic schema class, and Vue component
3. **Persistent**: Comments are stored in the Galaxy database and serialized in `.ga` workflow exports
4. **Interactive**: Comments are fully editable in-place with rich UI affordances

### 1.3 Scope

- One-to-many relationship with workflows
- Optional parent-child hierarchy (frames can contain steps and other comments)
- Persisted server-side in `workflow_comment` database table
- Serialized as part of the workflow payload (no dedicated REST endpoints)

---

## 2. Architecture Overview

### 2.1 Layered Design

```
┌─────────────────────────────────────────┐
│  User Interface Layer                   │
│  (Vue Components, Pinia Stores)         │
├─────────────────────────────────────────┤
│  API / Serialization Layer              │
│  (Workflow API, Pydantic schemas)       │
├─────────────────────────────────────────┤
│  Persistence Layer                      │
│  (SQLAlchemy model, Database)           │
└─────────────────────────────────────────┘
```

### 2.2 Component Interactions

```
WorkflowGraph.vue (renders all comments)
├── WorkflowComment.vue (routes to correct type component)
│   ├── TextComment.vue
│   ├── MarkdownComment.vue
│   ├── FrameComment.vue
│   └── FreehandComment.vue
├── ToolBar.vue (tool selection, comment options)
│   └── InputCatcher.vue (intercepts canvas pointer events)
├── workflowEditorCommentStore (Pinia, scoped per-workflow)
└── workflowEditorToolbarStore (Pinia, tool state)
```

---

## 3. Data Model

### 3.1 Database Schema

**Table:** `workflow_comment`

**SQLAlchemy model:** `WorkflowComment` in `lib/galaxy/model/__init__.py`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `Mapped[int]` (PK) | Auto-incremented primary key |
| `order_index` | `Mapped[Optional[int]]` | Rendering/serialization order |
| `workflow_id` | `Mapped[int]` (FK → `workflow.id`) | Parent workflow (indexed) |
| `position` | `MutableJSONType` | `[x, y]` coordinates stored as JSON |
| `size` | `JSONType` | `[width, height]` stored as JSON |
| `type` | `String(16)` | `text`, `markdown`, `frame`, or `freehand` |
| `color` | `String(16)` | Color name (e.g., `"none"`, `"blue"`, `"red"`) |
| `data` | `JSONType` | Type-specific payload (text content, line coords, etc.) |
| `parent_comment_id` | `Mapped[Optional[int]]` (FK → `workflow_comment.id`) | For frame hierarchies (indexed) |

**Relationships:**
- `workflow` → `Workflow.comments` (back_populates)
- `child_steps` → `WorkflowStep` (steps contained in this frame)
- `parent_comment` / `child_comments` → self-referential (frame nesting)

**Key Design Decisions:**
- **JSON `data` column**: Allows type-specific fields without schema explosion
- **`order_index`**: Explicitly tracks ordering; serialized as `"id"` in workflow export (not the database PK)
- **Color as string name**: Decouples persistence from presentation hex values

### 3.2 Pydantic Schema Layer

**File:** `lib/galaxy/schema/workflow/comments.py`

```python
class BaseComment(BaseModel):
    id: int
    color: Literal["none", "black", "blue", "turquoise", "green",
                    "lime", "orange", "yellow", "red", "pink"]
    position: tuple[float, float]
    size: tuple[float, float]

class TextCommentData(BaseModel):
    text: str
    size: int                       # 1-5 relative scale
    bold: Optional[bool] = None
    italic: Optional[bool] = None

class MarkdownCommentData(BaseModel):
    text: str

class FrameCommentData(BaseModel):
    title: str

class FreehandCommentData(BaseModel):
    thickness: float
    line: list[tuple[float, float]]  # ordered [x, y] coordinate pairs

class TextComment(BaseComment):
    type: Literal["text"]
    data: TextCommentData

class FrameComment(BaseComment):
    type: Literal["frame"]
    data: FrameCommentData
    child_comments: Optional[list[int]] = None
    child_steps: Optional[list[int]] = None

# Similar for Markdown, Freehand

class WorkflowCommentModel(RootModel):
    root: Union[TextComment, MarkdownComment, FrameComment, FreehandComment]
    # discriminator="type" routes deserialization automatically
```

**Pattern: Discriminated Union** — Pydantic's `discriminator="type"` automatically selects the correct subtype based on the `type` field. No explicit routing code needed.

---

## 4. Comment Types

### 4.1 Text Comments

**Purpose**: Simple, styled text annotations

**Data**: `text`, `size` (1-5), optional `bold`/`italic` flags

**Rendering**:
- Contenteditable `<span>` for in-place editing
- Dynamic font-size via CSS variable
- Color applied as `--font-color` CSS variable
- Auto-removal if empty when unfocused

**Interaction**:
- Click to edit; toolbar provides bold/italic toggles, font size ±, color picker, delete
- Uses `DraggablePan` for repositioning, `useResizable` composable for resize

### 4.2 Markdown Comments

**Purpose**: Rich text documentation using Markdown syntax

**Data**: `text` (raw Markdown source)

**Rendering**:
- Uses `useMarkdown` composable (wraps `markdown-it` library)
- Heading levels incremented by 1 (`increaseHeadingLevelBy: 1`)
- Links open in new page
- Bordered container with overflow scroll
- Focus toggles between rendered view and raw `<textarea>` editor

**Editing Workflow**:
1. Click/focus → rendered markdown hides, textarea becomes visible
2. Edit raw markdown in textarea
3. Blur → textarea hides, rendered output reappears
4. Changes emitted via `"change"` event

**DOMPurify**: Used in FrameComment title sanitization, not directly in MarkdownComment rendering.

### 4.3 Frame Comments

**Purpose**: Visual grouping of workflow steps and other comments

**Data**: `title` (frame label)

**Relationships** (computed dynamically by the store, not persisted directly):
- `child_comments`: IDs of comments spatially within the frame
- `child_steps`: IDs of steps spatially within the frame

**Semantics**:
- Frames define inclusive bounds; contained items are computed via `resolveCommentsInFrames()` and `resolveStepsInFrames()` store actions
- **Frames CAN contain other frames** — the store processes frames in reverse order, and a frame can appear in another frame's `child_comments`
- Title sanitized with DOMPurify (`ALLOWED_TAGS: []`)

**Rendering**:
- HTML div with CSS border and background color (using `brighterColors` for fill, `darkenedColors` for border)
- Contenteditable title at top
- Resizable and draggable; can snap children when moved

### 4.4 Freehand Comments

**Purpose**: Custom diagramming and visual annotation

**Data**: `line` (ordered `[x, y]` coordinate pairs), `thickness` (stroke width)

**Rendering**:
- **SVG `<path>` element** (not HTML5 Canvas)
- Uses d3's `curveCatmullRom` for spline smoothing on completed strokes
- Uses `curveLinear` while actively drawing (just-created)
- Fixed z-index of 1600 (renders above other comment types)
- Strokes stored as raw coordinates (resolution-independent)

**Erasing**:
- `freehandEraser` tool enables click/mouseover to delete individual freehand strokes
- `deleteFreehandComments()` store action removes all freehand comments at once

---

## 5. State Management

### 5.1 Pinia Store: `workflowEditorCommentStore`

**File:** `client/src/stores/workflowEditorCommentStore.ts`

Uses `defineScopedStore("workflowCommentStore", ...)` — each workflow gets an isolated store instance.

```typescript
const commentStore = useWorkflowCommentStore(workflowId)
```

**State:**
- `commentsRecord`: `Record<number, WorkflowComment>` — all comments indexed by ID
- `localCommentsMetadata`: `Record<number, CommentsMetadata>` — transient UI state:
  - `multiSelected`: highlighted for batch operations
  - `justCreated`: triggers auto-focus

**Key Actions:**
- `createComment(comment)` / `deleteComment(id)` — CRUD
- `addComments(array, defaultPosition?, select?)` — bulk add with offset
- `changePosition(id, position)` — update position
- `changeSize(id, size)` — update dimensions
- `changeData(id, data)` — update type-specific data
- `changeColor(id, color)` — update color
- `addPoint(id, point)` — append coordinate to freehand stroke
- `resolveCommentsInFrames()` — compute which comments are inside which frames
- `resolveStepsInFrames()` — compute which steps are inside which frames
- `setCommentMultiSelected(id, selected)` / `toggleCommentMultiSelected(id)` / `clearMultiSelectedComments()` — selection management
- `markJustCreated(id)` / `clearJustCreated(id)` — creation state
- `deleteFreehandComments()` — bulk freehand removal

**Computed Properties:**
- `comments`: ordered array of all comments
- `highestCommentId`: maximum ID for allocation
- `multiSelectedCommentIds`: IDs of selected comments
- `isJustCreated(id)` / `getComment(id)` / `getCommentMultiSelected(id)`: lookups
- `allCommentBounds()`: `AxisAlignedBoundingBox` of all comments

### 5.2 Toolbar Store: `workflowEditorToolbarStore`

**File:** `client/src/stores/workflowEditorToolbarStore.ts`

```typescript
type CommentTool = "textComment" | "markdownComment" | "frameComment"
                 | "freehandComment" | "freehandEraser"

type EditorTool = "pointer" | "boxSelect" | CommentTool
```

**Comment Options** (reactive defaults for new comments):
- `bold: false`, `italic: false`
- `color: "none"` (`WorkflowCommentColor`)
- `textSize: 2`
- `lineThickness: 5`
- `smoothing: 2`

**Key State:**
- `currentTool`: active `EditorTool`
- `inputCatcherActive` / `inputCatcherEnabled` / `inputCatcherPressed`: canvas input state
- Snap settings for grid alignment

### 5.3 Server Synchronization

Comments are part of the standard workflow payload — no dedicated comment endpoints.

**Save**: Debounced `PUT /api/workflows/{id}` sends the full workflow payload including all comments.

**Load**: `GET /api/workflows/{id}` returns workflow object with `comments` array; store hydrates from this.

**Serialization Detail**: The `to_dict()` method on `WorkflowComment` serializes `order_index` as `"id"` (not the database primary key). Child relationships reference `order_index` values.

**Error Handling**: Last-write-wins. Failed saves keep changes in local store; user can retry via save button.

---

## 6. UI/UX Component Architecture

### 6.1 Component Hierarchy

```
WorkflowGraph.vue
├── WorkflowComment.vue (v-for over comments)
│   ├── TextComment.vue
│   │   ├── DraggablePan (drag handler)
│   │   ├── Contenteditable <span>
│   │   ├── Style toolbar (bold/italic/size/color/delete)
│   │   └── ColorSelector.vue
│   ├── MarkdownComment.vue
│   │   ├── DraggablePan
│   │   ├── <textarea> (edit mode)
│   │   ├── Rendered markdown <div> (display mode)
│   │   └── Color/delete buttons
│   ├── FrameComment.vue
│   │   ├── DraggablePan
│   │   ├── Contenteditable title
│   │   ├── Fit-to-content / select-children buttons
│   │   └── ColorSelector.vue
│   └── FreehandComment.vue
│       └── SVG <path> with d3 curve
└── ToolBar.vue
    └── InputCatcher.vue (pointer event routing)
```

### 6.2 Input Handling

**InputCatcher.vue** (`client/src/components/Workflow/Editor/Tools/InputCatcher.vue`):
- Intercepts pointer events (pointerdown, pointerup, pointermove, pointerleave) on canvas
- Transforms viewport coordinates to workflow canvas space using `Transform` geometry
- Broadcasts events via `toolbarStore.emitInputCatcherEvent()`
- Tool-specific handlers register via `toolbarStore.onInputCatcherEvent()`

**Comment Creation Flow**:
1. User selects comment tool type from toolbar (e.g., `"textComment"`)
2. `currentTool` state updates
3. Click/drag on canvas defines position and initial size
4. Comment created in store; `markJustCreated` triggers auto-focus
5. For text/markdown: auto-selects text for immediate editing

**Individual Comment Interaction**:
- Each component handles drag (via `DraggablePan`), resize (via `useResizable`), editing
- Emits structured events: `change`, `move`, `resize`, `remove`, `set-color`, `pan-by`
- Parent `WorkflowComment.vue` relays events to store actions

### 6.3 Resizing

**Composable:** `useResizable.ts`

```typescript
export function useResizable(
    target: Ref<HTMLElement | undefined | null>,
    sizeControl: Ref<[number, number]>,
    onResized: (size: [number, number]) => void,
): void
```

- Watches external size changes and applies to DOM
- Listens for mouseup to detect CSS-resize completion
- Applies snap behavior from toolbar if enabled
- Used by TextComment, MarkdownComment, FrameComment
- FreehandComment is not resizable (fixed bounding box from line coordinates)

### 6.4 Color System

**File:** `client/src/components/Workflow/Editor/Comments/colors.ts`

**Base colors** (9 named colors + `"none"`):
```typescript
export const colors = {
    black:     "#000",
    blue:      "#004cec",
    turquoise: "#00bbd9",
    green:     "#319400",
    lime:      "#68c000",
    orange:    "#f48400",
    yellow:    "#fdbd0b",
    red:       "#e31920",
    pink:      "#fb00a6",
} as const;
```

**Derived color sets** (computed at module load using HSLUV color space):
- `brightColors`: 50% lightness interpolation toward white
- `brighterColors`: 95% lightness interpolation toward white (used for frame backgrounds)
- `darkenedColors`: manually overridden variants for markdown/frame borders:
  - turquoise → `#00a6c0`, lime → `#5eae00`, yellow → `#e9ad00`
  - Other colors use the base values

**Design Benefits:**
- Persistence stores color names, not hex values — easy to retheme
- HSLUV-based derivation produces perceptually uniform brightness variants
- `ColorSelector.vue` component provides the picker UI

---

## 7. API Integration

### 7.1 Workflow Payload

Comments are embedded in the workflow JSON — **there are no dedicated comment REST endpoints**. All operations go through the workflow API:

```
GET /api/workflows/{id}    # Returns workflow with "comments" array
PUT /api/workflows/{id}    # Updates workflow including comments
```

### 7.2 Comment JSON Format

```json
{
  "comments": [
    {
      "id": 0,
      "type": "text",
      "color": "blue",
      "position": [100, 200],
      "size": [200, 50],
      "data": {
        "text": "This step is important",
        "size": 2,
        "bold": true
      }
    },
    {
      "id": 1,
      "type": "frame",
      "color": "green",
      "position": [50, 50],
      "size": [500, 400],
      "data": { "title": "Preprocessing" },
      "child_steps": [0, 1, 2],
      "child_comments": [0]
    }
  ]
}
```

Note: The `"id"` field in JSON is the `order_index`, not the database primary key.

### 7.3 Export/Import Format Support

- **GA format** (`.ga` files): Comments **ARE** included. This is the native Galaxy format and preserves full workflow state. Backward compatible with pre-comment workflows.

- **gxformat2 YAML** (`.gxwf.yml`): Comments **NOT** included. The `from_galaxy_native()` conversion in gxformat2 does not handle comments. This is a known limitation.

- **CWL exports** (`.abstract.cwl`): Comments not applicable — external format for CWL engines.

- **Import behavior**: Workflows without comments load normally; no compatibility issues.

---

## 8. Geometry and Rendering

### 8.1 Coordinate System

Comments use **workflow canvas coordinates** (not viewport coordinates):

```
Canvas space: Top-left is [0, 0]
    position: [x, y] — top-left corner of comment
    size: [width, height] — dimensions in canvas units
```

Zoom/pan transforms applied at render time, not stored.

### 8.2 ID Allocation

- Comment IDs are immutable and unique per workflow
- Allocated sequentially: `highestCommentId + 1`
- Deleted IDs are never reused (gap-tolerant)

### 8.3 Z-Ordering

- Freehand comments render at a fixed CSS z-index of 1600 (above all other elements)
- Frame comments use z-index 50 on their resize container
- Other comment types use standard workflow element ordering

### 8.4 Snapping

Optional grid snapping when moving/resizing comments:
- Snap distance configurable via toolbar
- `Math.round(coord / snapDistance) * snapDistance`

---

## 9. Key Design Patterns

### 9.1 Type-Driven Architecture

Each comment type is self-contained:
- Pydantic schema class (backend validation)
- Vue component (frontend rendering)
- TypeScript interface (frontend typing)
- Type-specific data payload

Adding a new comment type requires:
1. Add Pydantic schema class + data model
2. Add Vue component
3. Update discriminated union
4. Add `CommentTool` variant in toolbar store
5. Register in toolbar UI

### 9.2 Scoped Stores (Pinia)

```typescript
export const useWorkflowCommentStore = defineScopedStore(
    "workflowCommentStore",
    (workflowId) => { /* store logic */ }
)
```

Each workflow gets an isolated store instance. Prevents cross-workflow state leakage.

### 9.3 Event Emitters

Comments emit structured events, never directly mutate the store:

```typescript
emit("change", newData)
emit("move", newPosition)
emit("resize", newSize)
emit("remove")
emit("set-color", color)
emit("pan-by", delta)
```

`WorkflowComment.vue` receives these and calls the appropriate store action (`changeData`, `changePosition`, `changeSize`, `deleteComment`, `changeColor`).

### 9.4 Spatial Resolution

Frame child relationships are computed dynamically, not stored in the database:
- `resolveCommentsInFrames()` checks which comments fall within each frame's bounding box
- `resolveStepsInFrames()` does the same for workflow steps
- Uses `AxisAlignedBoundingBox.contains()` for hit testing
- Results written into `child_comments` / `child_steps` arrays on the frame objects

---

## 10. Testing

### 10.1 Frontend Tests

**Location:** `client/src/components/Workflow/Editor/Comments/__tests__/`

- `WorkflowComment.test.ts` — component rendering, event forwarding, type routing
- `ColorSelector.test.js` — color picker behavior

**Store tests:** `client/src/stores/workflowEditorCommentStore.test.ts`
- CRUD operations, multi-selection, frame resolution, reset

### 10.2 Backend Tests

- Pydantic schema validation for all comment types
- `to_dict()` / `from_dict()` serialization roundtrip
- Cascading deletes: workflow deletion removes associated comments
- Backward compatibility: workflows without comments load correctly

---

## 11. Migration History

### 11.1 Database Migrations

**Initial table creation:** `ddbdbc40bdc1_add_workflow_comment_table.py` (2023-08-14)
- Creates `workflow_comment` table with all columns
- Adds `parent_comment_id` column to `workflow_step` table

**Index addition:** `2dc3386d091f_add_indexes_for_workflow_comment_.py` (2024-03-13)
- Indexes on `workflow_step(parent_comment_id)`, `workflow_comment(workflow_id)`, `workflow_comment(parent_comment_id)`

### 11.2 Framework Modernization

- SQLAlchemy 2.0: Updated to `Mapped` annotations for type safety
- Pydantic v2: `RootModel` pattern for union types, modernized `Field` syntax
- Python 3.10+ syntax: `tuple[int, int]` instead of `Tuple[int, int]`
- Frontend: ESM modules, Vue 3 Composition API, JS → TS conversion

---

## 12. Future Extensions

### 12.1 Potential Enhancements

1. **gxformat2 support**: Include comments in YAML workflow exports
2. **Comment versioning**: Track edit history
3. **Connectors**: Visual links between comments and steps
4. **Viewport culling**: Only render comments visible in the current viewport

### 12.2 Architectural Flexibility

System designed to accommodate:
- Additional comment types (add Pydantic class + Vue component + toolbar entry)
- Different persistence backends (replace SQLAlchemy model)
- Alternative rendering engines (replace Vue components)

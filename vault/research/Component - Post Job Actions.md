---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/api
status: draft
created: 2026-03-16
revised: 2026-03-16
revision: 1
ai_generated: true
component: Post Job Actions
galaxy_areas: [workflows, api]
summary: "Declarative post-processing operations on job outputs, transformations without explicit tools"
---

# Post Job Actions (PJA) - Component Architecture & Design

## Overview

Post Job Actions (PJA) are a core Galaxy component that enable automatic transformations and operations to be performed on job outputs after job execution or workflow step completion. PJAs provide a declarative, extensible mechanism for post-processing datasets and managing workflow intermediate outputs without requiring explicit tool definitions.

Originally designed for workflows, PJA support has been extended to standalone jobs in recent versions.

## Architecture

### Core Model Layer

**Location:** `lib/galaxy/model/__init__.py`

#### PostJobAction
The primary data model for defining an action to be performed on outputs:

```python
class PostJobAction(Base, RepresentById):
    __tablename__ = "post_job_action"

    id: Mapped[int]
    workflow_step_id: Mapped[Optional[int]]  # FK to WorkflowStep
    action_type: Mapped[str]
    output_name: Mapped[Optional[str]]
    _action_arguments: Mapped[Optional[dict[str, Any]]]
```

**Key properties:**
- `action_type`: String identifier for the action class (e.g., "RenameDatasetAction")
- `output_name`: Target output name, empty string = all outputs
- `action_arguments`: Dict of action-specific parameters (e.g., `{"newname": "result.txt"}`)

#### PostJobActionAssociation
Join table linking PJAs to jobs when executed:

```python
class PostJobActionAssociation(Base, RepresentById):
    __tablename__ = "post_job_action_association"

    id: Mapped[int]
    job_id: Mapped[int]  # FK to Job
    post_job_action_id: Mapped[int]  # FK to PostJobAction
```

This table exists because:
1. PJAs defined on workflow steps are reused across all invocations
2. Some PJAs are created/added dynamically at job creation time
3. Allows tracking which PJAs were actually executed for a job

#### Job Integration
The Job model maintains relationships with PJAs:

```python
class Job:
    post_job_actions: Mapped[list["PostJobActionAssociation"]]
```

Methods:
- `add_post_job_action(pja)` - Create PostJobActionAssociation
- `get_post_job_actions()` - Retrieve associated PJAs
- `set_post_job_actions(post_job_actions)` - Bulk set

### Execution Layer

**Location:** `lib/galaxy/job_execution/actions/post.py`

#### ActionBox Registry
Central dispatcher for all PJA execution. Only registered actions can be executed:

```python
class ActionBox:
    actions: dict[str, type[DefaultJobAction]] = {
        "RenameDatasetAction": RenameDatasetAction,
        "HideDatasetAction": HideDatasetAction,
        "ChangeDatatypeAction": ChangeDatatypeAction,
        "ColumnSetAction": ColumnSetAction,
        "EmailAction": EmailAction,
        "DeleteIntermediatesAction": DeleteIntermediatesAction,
        "TagDatasetAction": TagDatasetAction,
        "RemoveTagDatasetAction": RemoveTagDatasetAction,
    }

    public_actions: list[str]  # Explicitly exposed to users
    immediate_actions: list[str]  # Applied during workflow scheduling
    mapped_over_output_actions: list[str]  # Applied to collection outputs
```

**Important:** Actions defined as classes but NOT in the `actions` registry cannot be executed:
- `ValidateOutputsAction` - class exists but not registered
- `SetMetadataAction` - class exists but not registered
- `DeleteDatasetAction` - class exists but not registered (disabled due to breaking downstream dependencies)

#### Default Job Action Base Class

```python
class DefaultJobAction:
    @classmethod
    def execute(cls, app, sa_session, action, job,
                replacement_dict=None, final_job_state=None):
        """Execute on standalone jobs or post-completion"""
        pass

    @classmethod
    def execute_on_mapped_over(cls, trans, sa_session, action,
                               step_inputs, step_outputs,
                               replacement_dict, final_job_state=None):
        """Execute during workflow step processing with mapped inputs"""
        pass

    @classmethod
    def get_short_str(cls, pja) -> str:
        """Human-readable description for UI"""
        pass
```

### Built-in Action Types

**Note:** Only 8 of the 11 action classes defined in the codebase are registered in `ActionBox.actions` and can be executed. See "Unregistered Actions" section below.

#### 1. RenameDatasetAction
- **Purpose:** Rename output datasets
- **Timing:** Immediate (during workflow scheduling) + separate mapped_over handling for collections
- **Immediate Execution:** Called via `job_callback` after outputs recorded but before job queued
- **Mapped Collections:** Executed separately via `execute_on_mapped_over()` when workflow step processes collections
- **Parameters:** `newname` - supports template syntax
- **Template Features:**
  - `#{variable_name}` - substitute input name
  - `#{variable|basename}` - filename without extension
  - `#{variable|upper}` - uppercase
  - `#{variable|lower}` - lowercase
  - `${replacement_key}` - runtime replacement parameters
- **Scope:** Can target specific outputs or apply to all (empty `output_name`)

#### 2. ChangeDatatypeAction
- **Purpose:** Convert output datatype post-execution
- **Timing:** Immediate (ahead of job) + job completion for collections
- **Parameters:** `newtype` - target Galaxy datatype
- **Special Behavior:** For dynamic collections, creates PostJobActionAssociation for later execution
- **Constraints:** Skipped if job state is SKIPPED

#### 3. HideDatasetAction
- **Purpose:** Hide outputs from history visibility
- **Timing:** Job completion only
- **Mapped Collections:** Supported via `execute_on_mapped_over()`
- **Execution:** Skipped on job ERROR state
- **Scope:** Targets specific output or all outputs
- **Note:** Registered in `ActionBox.actions` but NOT in `public_actions` list (internal use)

#### 4. ColumnSetAction
- **Purpose:** Set tabular metadata (BED file column assignments)
- **Timing:** Job completion only
- **Parameters:** `chromCol`, `startCol`, `endCol`, `strandCol`, `nameCol`
- **Conversion:** Automatically converts "cX" format to integer

#### 5. EmailAction
- **Purpose:** Notify user of job completion via email
- **Timing:** Always executes (even on failure)
- **Content:** Includes dataset names, history link, workflow invocation link (if applicable)
- **Parameters:** `host` (optional) - server to link from
- **Error Handling:** Gracefully fails with logging, doesn't block job completion

#### 6. DeleteIntermediatesAction
- **Purpose:** Clean up intermediate datasets created during workflow execution
- **Timing:** Job completion only (after entire workflow)
- **Conditions:**
  - Only applies to workflow invocations with output definitions
  - Targets non-output steps that are not marked as outputs
  - Skips deletion if dependent jobs are in non-terminal states
  - Aborts if workflow invocation still active
- **Complexity:** Extensive safety checks to avoid deleting needed intermediates
- **Performance:** No optimization yet - full scan approach

#### 7. TagDatasetAction / RemoveTagDatasetAction
- **Purpose:** Add or remove tags from outputs
- **Timing:** Immediate (during workflow) + job completion
- **Mapped Collections:** Supported via `execute_on_mapped_over()`
- **Parameters:** `tags` - comma-separated tag list
- **Tag Formats:**
  - `#name:value` - name:value tags
  - `regular_tag` - untyped tags
- **Supports:** Both datasets and dataset collections

### Unregistered Actions

The following action classes are defined in the codebase but **not registered in `ActionBox.actions`** and therefore **cannot be executed**:

#### DeleteDatasetAction
- **Purpose:** Mark datasets as deleted
- **Status:** NOT REGISTERED (class exists but disabled)
- **Reason:** Disabled because deleting datasets in the middle of a workflow causes errors for subsequent steps that depend on that data
- **Code Location:** `lib/galaxy/job_execution/actions/post.py` lines 304-326
- **Note:** To use dataset deletion, must be done at workflow end or after all dependent steps complete

#### SetMetadataAction
- **Purpose:** Apply custom metadata to outputs
- **Status:** NOT REGISTERED (class exists but broken/incomplete)
- **Code Comment:** "DBTODO Setting of Metadata is currently broken and disabled. It should not be used (yet)."
- **Code Location:** `lib/galaxy/job_execution/actions/post.py` lines 351-359
- **Note:** Full implementation required before registration

#### ValidateOutputsAction
- **Purpose:** Validate produced outputs against expected datatype
- **Status:** NOT REGISTERED (class exists but incomplete)
- **Implementation Note:** "no-op: needs to inject metadata handling parameters ahead of time."
- **Code Location:** `lib/galaxy/job_execution/actions/post.py` lines 88-104
- **Note:** Metadata validation infrastructure needed before this can be activated

### Action Registration Categories

**ActionBox** maintains four lists for organizing actions:

1. **actions**: The active registry - only actions here can be executed
   - 8 registered actions (see Built-in Action Types above)
   - 3 unregistered but defined (see Unregistered Actions above)

2. **public_actions**: Actions exposed to workflow designers via UI
   - 7 actions (all except HideDatasetAction, which is internal)

3. **immediate_actions**: Actions executed during workflow scheduling (before job runs)
   - `ChangeDatatypeAction`, `RenameDatasetAction`, `TagDatasetAction`, `RemoveTagDatasetAction`
   - Execute after outputs recorded but before job queued
   - Can affect job setup/metadata

4. **mapped_over_output_actions**: Actions supporting collection mapping
   - `RenameDatasetAction`, `HideDatasetAction`, `TagDatasetAction`, `RemoveTagDatasetAction`
   - Called via `execute_on_mapped_over()` when workflow steps have mapped inputs
   - Operate on implicit collection outputs

### Workflow Integration

**Location:** `lib/galaxy/workflow/modules.py`

#### Step-Level PJA Management
```python
class ToolModule:
    def get_post_job_actions(self, incoming):
        """Parse incoming workflow form data for PJA definitions"""
        # Translates form input like "pja__output__ActionType__param"
        # into structured PostJobAction objects
```

#### Execution During Workflow
```python
# Immediate actions execute during workflow scheduling
if pja.action_type in ActionBox.immediate_actions:
    ActionBox.execute(trans.app, trans.sa_session, pja, current_job,
                     replacement_dict)

# Mapped-over actions execute separately for collection steps
if pja.action_type in ActionBox.mapped_over_output_actions:
    ActionBox.execute_on_mapped_over(trans, trans.sa_session, pja,
                                    step_inputs, step_outputs,
                                    replacement_dict)

# Non-immediate actions stored as PostJobActionAssociation
# and executed on job completion
```

#### Mapped Over Collection Handling
When workflow steps process collections (mapped over):
- `execute_on_mapped_over()` is called with step inputs/outputs
- Different execution path than immediate actions
- Allows actions to operate on collection semantics
- Supports per-element operations on implicit collections

### Job Execution & Completion

**Location:** `lib/galaxy/jobs/__init__.py`

#### Execution Flow

1. **Job Startup (setup phase)**
   - Immediate PJAs are executed during job creation/scheduling
   - Allows setting datatypes/names before job runs

2. **Job Success Path**
   ```python
   for pja in job.post_job_actions:
       if pja.post_job_action.action_type not in ActionBox.immediate_actions:
           ActionBox.execute(self.app, self.sa_session,
                           pja.post_job_action, job,
                           final_job_state=final_job_state)
   ```

3. **Job Failure Path**
   - Only EmailAction is executed (user notification)
   - Other PJAs are skipped
   - Error state prevents HideDatasetAction execution

4. **Parameters Passed to Actions**
   - `app` - Galaxy application instance
   - `sa_session` - SQLAlchemy session for persistence
   - `action` - PostJobAction object
   - `job` - Job instance (with access to outputs, inputs, user, history)
   - `replacement_dict` - Runtime workflow parameters for templating
   - `final_job_state` - Job terminal state (ok, error, deleted, etc.)

### Frontend Integration

**Location:** `client/src/`

#### Type Definitions
**File:** `stores/workflowStepStore.ts`

```typescript
export interface PostJobAction {
    action_type: string;
    output_name: string;
    action_arguments: {
        [index: string]: string;
    };
}

export interface PostJobActions {
    [index: string]: PostJobAction;
}
```

**Storage Format:** `PostJobActions` is a dictionary indexed by concatenated `action_type + output_name`

**Examples:**
- `"ChangeDatatypeAction__out_file1"` = ChangeDatatypeAction targeting "out_file1"
- `"RenameDatasetAction__out_file1"` = RenameDatasetAction targeting "out_file1"
- `"TagDatasetAction__"` = TagDatasetAction targeting all outputs (empty output_name)

Each key maps to a `PostJobAction` object with the action details.

#### UI Components

**File:** `components/Workflow/Editor/Forms/FormTool.vue`
- Hosts FormSection component for PJA editing
- Receives and emits PJA updates

**File:** `components/Workflow/Editor/Forms/FormOutput.vue`
- Per-output PJA configuration interface
- Displays changeable actions:
  - Rename dataset
  - Change datatype
  - Add/remove tags
  - Assign columns (tabular metadata)
- Handles form field generation from action definitions

**File:** `components/Workflow/Editor/Forms/FormSection.vue`
- Parent container for FormOutput components
- Manages collection of outputs and their PJAs
- Coordinates state updates with parent FormTool

#### Form Data Handling

Actions are serialized to form fields with naming convention:
- Format: `pja__[output_name]__[action_type]__[parameter]`
- Example: `pja__out_file__RenameDatasetAction__newname`

ActionBox.handle_incoming() parses HTTP form data back into structured objects:
```python
{
    "action_type": "RenameDatasetAction",
    "output_name": "out_file",
    "action_arguments": {"newname": "result.txt"}
}
```

### API & Serialization

**Location:** `lib/galaxy/managers/workflows.py`

When returning workflow step details:
```python
step_model["post_job_actions"] = [
    {
        "short_str": ActionBox.get_short_str(pja),
        "action_type": pja.action_type,
        "output_name": pja.output_name,
        "action_arguments": pja.action_arguments,
    }
    for pja in step.post_job_actions
]
```

Key design: Always includes `short_str` for UI display without further processing.

## Execution Timeline

### Workflow Invocation Scenario

```
1. Workflow Scheduling Phase
   - Workflow steps are initialized
   - Immediate PJAs execute (ChangeDatatypeAction, RenameDatasetAction, etc.)
   - Jobs are created and enqueued

2. Job Execution Phase
   - Tool runs
   - Outputs created

3. Job Completion Phase
   - Non-immediate PJAs execute
   - Post-job action associations processed
   - cleanup scheduled

4. Workflow Completion
   - DeleteIntermediatesAction evaluates safety
   - Intermediate files cleaned up
```

### Standalone Job Scenario

```
1. Job Creation
   - PJAs can be attached via API/UI
   - Immediate actions executed

2. Job Execution
   - Tool runs

3. Completion
   - All non-immediate PJAs execute
```

## Key Design Patterns

### 1. Polymorphic Action Dispatch
- Base class `DefaultJobAction` defines interface
- ActionBox registry holds mapping of action types to classes
- `execute()` and `execute_on_mapped_over()` are optional (implement only needed ones)

### 2. Output Targeting
- Empty `output_name` = apply to all outputs
- Specific name = targeted to one output
- Supports both datasets and dataset collections

### 3. Template Substitution
- Input-based: `#{variable_name}` with operators (basename, upper, lower)
- Parameter-based: `${parameter_key}` for runtime workflow parameters
- Allows dynamic naming based on inputs/workflow context

### 4. Dual Execution Paths for Scheduling-Time Actions
- **Immediate (regular):** Called via `job_callback` after outputs recorded for non-mapped steps
  - Executes: `execute(app, sa_session, action, job, replacement_dict)`

- **Immediate (mapped-over):** Called separately for steps with mapped inputs
  - Executes: `execute_on_mapped_over(trans, sa_session, action, step_inputs, step_outputs, replacement_dict)`
  - Operates on collection semantics, not individual datasets

- **Deferred (completion):** Called after job finishes
  - Executes: `execute(app, sa_session, action, job, replacement_dict, final_job_state)`
  - All non-immediate actions follow this path
  - Has access to final job state (error, ok, etc.)

### 5. Error Resilience
- EmailAction always executes (even on job failure)
- Most other actions skip on ERROR job state
- HideDatasetAction explicitly skips on ERROR state
- Graceful degradation (log errors, don't propagate to break job completion)

### 6. Workflow-Aware Operations
- DeleteIntermediatesAction understands workflow DAG structure
- Can access workflow_invocation context via `job.workflow_invocation_step`
- Extensive safety checks prevent deletion of required intermediate data
- Aborts if workflow still actively scheduling

## Performance Considerations

### Current Limitations

1. **DeleteIntermediatesAction**
   - Full table scan approach
   - Expensive for large workflows
   - No optimization for identifying candidates

2. **Execution Timing**
   - Actions executed synchronously in job completion handler
   - Email actions can block if mail service is slow
   - No parallelization

3. **Immediate Actions**
   - Run during workflow scheduling
   - Can delay workflow startup for many steps
   - No batch optimization

### Async Challenges
- DeleteIntermediatesAction logs "PJA Async Issues" when dataset/job relationships incomplete
- Happens under concurrent job completion conditions
- Refresh operations used as workaround

## Extension Points

### Adding Custom Actions

1. Create class extending DefaultJobAction
2. Implement `execute()` and/or `execute_on_mapped_over()`
3. Implement `get_short_str()` for UI
4. Register in ActionBox.actions dictionary
5. Add to appropriate lists (public_actions, immediate_actions, mapped_over_output_actions)

### Requirements

- Idempotent execution (may retry on failure)
- Handle missing/skipped outputs gracefully
- Access outputs via job model relationships
- Use provided sa_session for persistence

### Integration Points

- Frontend: Add UI component to FormOutput.vue
- Serialization: ActionBox.handle_incoming() handles parsing
- Execution: ActionBox.execute() dispatches
- API: Managers serialize to JSON via get_short_str()

## Recent Changes

### Standalone Job Support
- PostJobActionAssociation now linkable directly to jobs (not just via workflow steps)
- Allows non-workflow tools to use PJAs
- Same execution paths as workflow-based PJAs

### Validation Improvements
- ChangeDatatypeAction now validates datatype availability
- ValidateOutputsAction available but not auto-executed

## Known Issues & Limitations

1. **SetMetadataAction & ValidateOutputsAction**: Currently disabled/broken
2. **DeleteDatasetAction**: Disabled due to breaking downstream dependencies
3. **DeleteIntermediatesAction**: Performance issues on large workflows
4. **Tag Operations**: Flush=False used, requires outer commit
5. **Dynamic Collections**: ChangeDatatypeAction deferred for dynamic outputs
6. **Async Races**: Async dataset relationship issues in DeleteIntermediatesAction

## Database Schema

```sql
-- Post job action definitions (workflow-step-level)
CREATE TABLE post_job_action (
    id INTEGER PRIMARY KEY,
    workflow_step_id INTEGER REFERENCES workflow_step(id),
    action_type VARCHAR(255),
    output_name VARCHAR(255),
    action_arguments JSON  -- MutableJSONType (database-agnostic)
);

-- Association of PJAs to actual jobs (for tracking execution)
CREATE TABLE post_job_action_association (
    id INTEGER PRIMARY KEY,
    job_id INTEGER REFERENCES job(id),
    post_job_action_id INTEGER REFERENCES post_job_action(id)
);
```

**Note:** `action_arguments` uses SQLAlchemy's `MutableJSONType` which provides change tracking and automatic persistence for nested dictionaries. This allows safe mutation of action parameters.

## Related Components

- **Workflow Modules** (`lib/galaxy/workflow/modules.py`) - PJA parsing & execution context
- **Job Handlers** (`lib/galaxy/jobs/__init__.py`) - Completion flow
- **Tool Actions** (`lib/galaxy/tools/actions/__init__.py`) - Job creation hooks
- **Workflow Managers** (`lib/galaxy/managers/workflows.py`) - API layer
- **Workflow Editor Frontend** (`client/src/components/Workflow/Editor/`) - UI layer

## Summary

Post Job Actions provide a declarative, extensible framework for automating post-execution transformations on Galaxy job outputs. The design separates action definitions (database models) from execution logic (ActionBox registry), enabling clean extension while maintaining compatibility with both workflow-based and standalone job execution models.

The two-phase execution model (immediate during scheduling, deferred on completion) balances workflow optimization with access to final job state. While powerful, the current implementation has performance concerns and some disabled actions that would benefit from refactoring in high-throughput scenarios.

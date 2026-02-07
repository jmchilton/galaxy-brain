---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools/yaml
  - galaxy/tools
  - galaxy/api
  - galaxy/client
github_pr: 19434
github_repo: galaxyproject/galaxy
component: User-Defined Tools
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# User-Defined Tools (Beta)

**PR**: [#19434](https://github.com/galaxyproject/galaxy/pull/19434)
**Author**: Marius van den Beek ([@mvdbeek](https://github.com/mvdbeek))
**Target Release**: Galaxy 25.0

## Overview

User-Defined Tools allows regular Galaxy users to create their own tools without requiring administrator privileges. These tools are:
- Written in YAML format
- Defined through the Galaxy user interface
- Stored in the database
- Executed inside containers

## Key Differences from Standard Galaxy Tools

| Aspect | Standard XML Tools | User-Defined YAML Tools |
|--------|-------------------|------------------------|
| Format | XML | YAML |
| Template Language | Cheetah (full Python access) | Sandboxed JavaScript expressions |
| Database Access | Full access during templating | None |
| Filesystem Access | Full access during templating | None |
| Container | Optional | Required |
| Installation | Admin only | Any authorized user |

### Security Model

Standard XML tools have broad access to Galaxy's internals via Cheetah:

```xml
<command><![CDATA[
    #from pathlib import Path
    #user_id = $__app__.model.session().query($__app__.model.User.id).one()
    #open(f"{Path.home()}/a_file", "w").write("Hello!")
]]></command>
```

User-defined tools use sandboxed JavaScript expressions that cannot access the database or filesystem:

```yaml
class: GalaxyUserTool
id: cat_user_defined
version: "0.1"
name: Concatenate Files
description: tail-to-head
container: busybox
shell_command: |
  cat $(inputs.datasets.map((input) => input.path).join(' ')) > output.txt
inputs:
  - name: datasets
    multiple: true
    type: data
outputs:
  - name: output1
    type: data
    format_source: datasets
    from_work_dir: output.txt
```

## Tool Source Models

The PR introduces two tool source classes:

### UserToolSource (`class: GalaxyUserTool`)
- For regular users with the Custom Tool Execution role
- Strict sandboxed execution
- Container required

### AdminToolSource (`class: GalaxyTool`)
- For admin-created dynamic tools
- More flexible command templating
- Uses `command` key instead of `shell_command`

## Command Styles

### shell_command Style
Best for shell scripts with embedded JavaScript:

```yaml
shell_command: cat '$(inputs.input.path)' > output.fastq
```

### base_command + arguments Style
Builds an escaped argv list:

```yaml
base_command: cat
arguments:
  - $(inputs.input.path)
  - '>'
  - output.fastq
```

## Enabling User-Defined Tools

1. Set in `galaxy.yml`:
   ```yaml
   enable_beta_tool_formats: true
   ```

2. Create a role of type "Custom Tool Execution" in admin UI

3. Assign users/groups to this role

## API Endpoints

New endpoints added:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/unprivileged_tools` | GET | List user's tools |
| `/api/unprivileged_tools` | POST | Create new tool |
| `/api/unprivileged_tools/{uuid}` | GET | Get tool by UUID |
| `/api/unprivileged_tools/{uuid}` | DELETE | Deactivate tool |
| `/api/unprivileged_tools/build` | POST | Preview tool form |
| `/api/unprivileged_tools/runtime_model` | POST | Get runtime model for editor |
| `/api/dynamic_tools` | GET/POST/DELETE | Admin dynamic tools |

## Client-Side Features

### Monaco Editor Integration
- Full YAML schema validation
- JavaScript intellisense for embedded `$()` expressions
- Syntax highlighting for mixed YAML/JS content
- Real-time diagnostics

### User Tool Panel
- New panel in sidebar for user's custom tools
- Run tools directly or embed in workflows

### Key Components Added
- `UserToolPanel.vue` - List/manage user tools
- `UserToolEditor.vue` - Monaco-based tool editor
- `yaml-with-js.ts` - Language config for YAML+JS syntax
- `ScrollList.vue` - Reusable scroll list component

## Database Changes

New migration adds `user_dynamic_tool_association` table linking:
- `user_id` - Tool creator
- `dynamic_tool_id` - The dynamic tool record

## Sharing Tools

- Tools are private to creators by default
- When a tool is embedded in a workflow, importing the workflow creates a copy for the new user
- Tools can be exported to disk and loaded as regular tools for instance-wide availability

## Current Limitations

1. No `configfiles` support
2. No reference data access
3. No metadata/metadata files access (e.g., BAM indexes)
4. No `extra_files` directory access
5. JavaScript environment locked to ES2017

## Security Considerations

User-defined tools share similar security risks as interactive tools. While in beta:
- Only grant Custom Tool Execution role to trusted users
- Tools must run in containers for isolation
- See [Galaxy IT security docs](https://training.galaxyproject.org/training-material/topics/admin/tutorials/interactive-tools/tutorial.html#securing-interactive-tools)

## Technical Implementation Details

### JavaScript Expression Evaluation
- Expressions in `$()` are evaluated at job creation time
- The `inputs` object contains file metadata (path, name, extension, etc.)
- Runtime model is generated from tool inputs for intellisense

### Tool UUID Flow
- Each user tool gets a UUID
- UUID passed through tool form and workflow editor
- Allows tool lookup without global toolbox registration

## Files Changed (Major)

**Backend:**
- `lib/galaxy/tool_util/models.py` - UserToolSource/AdminToolSource models
- `lib/galaxy/webapps/galaxy/api/unprivileged_tools.py` - New API
- `lib/galaxy/webapps/galaxy/api/dynamic_tools.py` - Updated admin API
- `lib/galaxy/managers/unprivileged_tools.py` - Tool management
- `lib/galaxy/tools/evaluation.py` - Expression evaluation

**Frontend:**
- `client/src/components/UserToolPanel/*` - Tool panel UI
- `client/src/components/Tool/Editor/*` - Monaco editor
- `client/src/composables/useMonaco.ts` - Monaco setup
- `client/src/utils/yaml-with-js.ts` - Mixed language support

## TODO (from PR)

- [ ] More tests, especially Selenium
- [ ] Parse into separate `tool_type` for easier job_conf.yml/TPV addressing
- [ ] Usage documentation
- [ ] Publish UserToolSource schema

## Example Tools

### Simple File Concatenation
```yaml
class: GalaxyUserTool
id: cat_user_defined
version: "0.1"
name: Concatenate Files
description: tail-to-head
container: busybox
shell_command: |
  cat $(inputs.datasets.map((input) => input.path).join(' ')) > output.txt
inputs:
  - name: datasets
    multiple: true
    type: data
outputs:
  - name: output1
    type: data
    format_source: datasets
    from_work_dir: output.txt
```

### Tool with Select Parameter
```yaml
class: GalaxyUserTool
id: grep_tool
version: "1.0"
name: Grep Lines
container: busybox
shell_command: |
  grep $(inputs.invert ? '-v' : '') '$(inputs.pattern)' '$(inputs.input.path)' > output.txt
inputs:
  - name: input
    type: data
  - name: pattern
    type: text
  - name: invert
    type: boolean
    label: Invert match
outputs:
  - name: output
    type: data
    from_work_dir: output.txt
```

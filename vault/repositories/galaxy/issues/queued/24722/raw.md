# Raw idea

Upstream Galaxy half of [galaxyproject/foundry#591](https://github.com/galaxyproject/foundry/issues/591) (scottcain, AI-assisted, 2026-09-18): "`download?style=ga` emits unversioned `tool_id`s, producing workflows that save but cannot be invoked."

Foundry record: [`foundry/issues/needs_decision/591`](../../../../foundry/issues/needs_decision/591/index.md). Its Next asks for the Galaxy issue to be filed.

Report: a workflow step with an unversioned Tool Shed `tool_id` (`…/repos/devteam/text_processing/tp_cat`) plus `tool_version: 9.11+galaxy0` saves, shows `errors: null`, but `POST /api/workflows/{id}/invocations` returns 400 "required tools are not installed: …/tp_cat (version 9.11+galaxy0)". Changing only `tool_id` to the versioned guid makes it invoke.

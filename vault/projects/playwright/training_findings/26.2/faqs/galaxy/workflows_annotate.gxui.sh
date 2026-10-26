#!/bin/sh
# Replay of faqs/galaxy/workflows_annotate.md against the `faq_server.sh main` Galaxy, from a gxui
# session started with `gxui start --headless`.
set -e
N=wf-annot-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ annotate"
gxui note "step 1: open the workflow editor"
gxui workflow-edit "FAQ annotate"
gxui note "steps 2-3: Edit Attributes (26.2: the Attributes panel, open by default); Annotation is Short Description"
gxui call workflow_editor_set_annotation "What this workflow does"
gxui workflow-save
gxui note "step 4: add a tag (Tags > Add Tags; saved at once)"
gxui workflow-tag "faq"
gxui call workflow_index_open
gxui call workflow_index_tags

#!/bin/sh
# Replay of faqs/galaxy/collections_force_mapping_over.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`. fastp, collection_column_join and metaspades aren't on that server;
# Sort collection (a stock tool taking a list) stands in to show the map over.
set -e
N=forcemap-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "force mapping faq"
gxui upload-paste ">a
ACGT" --ext fasta --name s1.fasta
gxui upload-paste ">b
TTGA" --ext fasta --name s2.fasta
gxui collection-build list 1,2 --name samples
gxui note "Nest collection: input the list; output is a list:list"
gxui tool-open __NEST__
gxui tool-fill '{"input": 5}'
gxui tool-run
gxui history-wait 8
gxui note "Apply rules: select the list, Edit"
gxui tool-open __APPLY_RULES__
gxui tool-fill '{"input": 5}'
gxui call tool_parameter_edit_rules
gxui note "Column > Basename of Path of URL, from column A, Apply"
gxui call rule_builder_add_column_basename A
gxui note "Rules > Add / Modify Column Definitions > Add Definition > List Identifier(s): A, then B; Apply"
gxui call rule_builder_set_mapping list-identifiers '["A","B"]'
gxui note "Save, Run Tool"
gxui component rule_builder.main_button_ok click
gxui screenshot apply_rules_form_saved
gxui tool-run
gxui history-wait 11
gxui history-items
gxui note "a tool taking a list now maps over the list:list"
gxui tool-open __SORTLIST__
gxui tool-fill '{"input": 11}'
gxui component 'tool_form.parameter_batch_info(parameter=input)' text
gxui tool-run
gxui history-wait 12
gxui history-items

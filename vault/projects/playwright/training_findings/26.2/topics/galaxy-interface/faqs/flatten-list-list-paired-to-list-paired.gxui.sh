#!/bin/sh
# Replay of topics/galaxy-interface/faqs/flatten-list-list-paired-to-list-paired.md against the
# `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=flatten-$$
gxui logout || true
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "flatten faq"
gxui note "setup, not in the FAQ: a list:paired, then Apply Rules (JSON source) nests it under batch1 to make a list:list:paired"
for n in a_1 a_2 b_1 b_2; do gxui upload-paste "$n" --ext txt --name "$n.txt"; done
gxui collection-build list:paired 1,2,3,4 --name pairs
gxui tool-open __APPLY_RULES__
gxui tool-fill '{"input": 9}'
gxui call tool_parameter_edit_rules
# leading space keeps gxui call from parsing the JSON into a dict
gxui call rule_builder_set_source ' {"rules":[{"type":"add_column_metadata","value":"identifier0"},{"type":"add_column_metadata","value":"identifier1"},{"type":"add_column_value","value":"batch1"}],"mapping":[{"type":"list_identifiers","columns":[2,0]},{"type":"paired_identifier","columns":[1]}]}'
gxui component rule_builder.main_button_ok click
gxui tool-run
gxui collection-peek 14
gxui note "steps 1-3: open Apply rules, select the list:list:paired, Edit; columns A (outer list), B (inner list), C (paired)"
gxui tool-open __APPLY_RULES__
gxui tool-fill '{"input": 14}'
gxui call tool_parameter_edit_rules
gxui note "step 1: Column > Concatenate Columns, A and B"
gxui call rule_builder_concatenate_columns A B
gxui note "step 2: Rules > Add / Modify Column Definitions: Paired-end Indicator C, List Identifier(s) D, Apply"
gxui call rule_builder_set_mapping paired-identifier C
gxui call rule_builder_set_mapping list-identifiers D
gxui note "steps 3-4: Save, Run Tool"
gxui component rule_builder.main_button_ok click
gxui tool-run
gxui note "check: a list:paired with identifiers batch1a, batch1b"
gxui collection-peek 19

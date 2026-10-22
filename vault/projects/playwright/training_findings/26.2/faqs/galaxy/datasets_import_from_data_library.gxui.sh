#!/bin/sh
# Replay of faqs/galaxy/datasets_import_from_data_library.md against the `faq_server.sh main` Galaxy
# (faq-admin@example.org is an admin; test-data is library_import_dir), from `gxui start --headless`.
set -e
L="GTN - Material $$"
N=library-$$
gxui note "setup, not in the FAQ: an admin makes the library. A new 26.2 account's datasets are private by default, and library imports take the importer's defaults, so turn that off first or trainees see an empty folder"
gxui register faq-admin@example.org --password faqpass123 --username faq-admin || gxui login faq-admin@example.org --password faqpass123
gxui preferences-new-datasets-private --off
gxui library-new "$L"
gxui library-import-dir "$L" 1.bed 2.bed
gxui logout
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "library faq"
gxui note "steps 1-6: Libraries > the library > tick the files > Add to History > as Datasets > Select history > Import (it becomes current; the list defaults to the newest history)"
gxui library-add-to-history "$L" 1.bed 2.bed --history "library faq"
gxui history-wait
gxui history-items
gxui note "astype 'as a Collection': Collection type List > Continue > Name > Create list (the FAQ says Create collection)"
gxui call libraries_open_with_name "$L"
gxui call libraries_folder_select_datasets '["1.bed", "2.bed"]'
gxui component libraries.folder.add_to_history click
gxui component libraries.folder.add_to_history_collection click
gxui component libraries.folder.add_to_history_as_collection click
gxui call collection_builder_set_name "library list"
gxui call collection_builder_create
gxui note "the list is hid 5, after hidden copies 3 and 4"
gxui history-wait 5
gxui history-items

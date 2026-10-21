# faqs/galaxy/analysis_cut.md — 26.2, text review

GTN `45d4932d33`. Checked against `galaxy_ui_driver` `e64d932e12e` (`tools/filters/cutWrapper.xml`)
and usegalaxy.org's tool API.

No breakage. `Cut1` still shows as **Cut** "columns from a table" and is in the sample
`tool_conf.xml`. **Advanced Cut** keeps its name. The FAQ pins `9.5+galaxy0`; usegalaxy.org
defaults to `9.11+galaxy0` but still serves 9.5.

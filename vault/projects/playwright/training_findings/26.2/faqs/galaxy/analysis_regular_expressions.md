# faqs/galaxy/analysis_regular_expressions.md — 26.2, text review

GTN `e2d1765205`. No Galaxy UI content.

- **Replacing breaks in Python-`re` tools.** "use `&`" for the whole match and `\U`/`\L` are sed/Perl.
  **Regex Find and Replace** (`galaxyp/regex_find_replace` `regex1`/`regexColumn1`) runs Python
  `re.sub`: `&` is literal and `\U` fails ("bad escape"). That tool is the one used by
  data-manipulation-olympics, Manage_AB1_Sanger and neoantigen-fusion-database-generation. Suggest:
  "`&`, `\U`, `\L` work in sed-based tools (e.g. **Text reformatting with sed**); in Regex Find and
  Replace use `\g<0>` for the whole match, and there is no case conversion."
- Table renders fine (the `|` in `(abc|def)` stays in its cell).

# Polish debrief: issue_24411_job_cache_identifier_25.1

Head `fac15b1bfa9` unchanged. No branch commits; polish only touched the description, titles and tags.

## CI (fork, `fac15b1bfa9`)
Red: Converter, Selenium, Integration Selenium, Integration. Each red is unrelated:
- Converter: `CONVERTER_bedgraph_to_bigwig` fails. Converter tests are also red on `release_25.1`.
- Selenium: `test_delete_and_undelete_history` fails on element not interactable, and `test_float_parameter_maximum_validation` on a float validation message.
- Integration Selenium: `test_admin_containers_display` times out.
- Integration: singularity/mulled container tests fail (`test_build_mulled`, `test_mulled_explicit_invalid_case`, embedded pulsar `test_mulled_simple`). Integration is also red on `release_25.1`.

The API, unit, tool and workflow framework jobs, which cover the change, are green.

## Checklist
GENERAL + WORKFLOW_RELATED: all pass, and the human-read item is left unchecked. The one soft flag was `fac15b1bfa9` moving `test_model_attributes_sanitization` to the fresh-user helper. John requested that change (implementation debrief), and the description explains it, so it stays.

## Strengthening
The subagent found nothing to add for scope. Fixes applied:
- the `is None` assertion wording;
- the row 1 label format;
- a new bold sentence on why 25.1 and where the UDT half goes.

I didn't re-run the red/green suggestion: since `108d662a5ef`, `jobs.py` only got a pure move, and the only test that changed is the rename test, which was re-verified at `fac15b1bfa9`.

## Questions for John
- Split `consumes_names` into name/identifier flags on `dev` to win back identifier-only hits after a rename?
- File an issue for stale collection-name hits in the CTE builder?

# Debrief: collection count 0 ignored

Source: foundry#712 docs-bot claim that `element_count: 0` passes on any collection.
Verified: `verify_collection` (interactor.py) uses truthiness for count/min/max; reproduced count=0 and max=0 passing on a 1-element list via local Galaxy .venv. No duplicate found on GitHub.
Subagent review step skipped: claim directly reproduced, user asked to publish.

# Polish debrief

Polished at `6b375cf`. I wrote the PR description, then ran one strengthening round. The subagent found nothing needing more development.

Applied:
- I corrected the description's `main` column, checked against `b81cb14`.
  - `directory_uri` raised a `ValidationError` on `main`. It was never read as a data input.
  - Dict-form inputs only fail at conversion, so the table rows now say "→ native".
  - Dropped the risk claim about newly rejected inputs. Every such input already failed on `main`.
- Added a highlighted sentence answering #202's open questions (directory_uri stays a scalar URI string, not a `Directory` shape).

Questions for John (each widens scope):
- Land a galaxy-tool-util-ts companion branch alongside? Fixture sync goes red until TS gains the models and conversion.
- Add a Galaxy-side workflow API test? The native `.ga` fixture is hand-written, and Galaxy dev has no color or directory_uri workflow fixture.
- Open a follow-up issue to merge the four copies of the input discriminator map (from the thermo-nuclear review)?

Note: the message of commit `5b6f370` says directory_uri was "treated as a data input". It actually failed validation. Fix this if the branch gets squashed.

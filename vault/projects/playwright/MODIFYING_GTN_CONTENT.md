Style rules for editing GTN (training-material) content, learned from maintainer review. Keep each point short; add new ones as reviews teach us.

## Wording

- Write UI navigation as one direct bold path: `**Top bar -> *your username* -> Preferences -> Manage Information**`. No "(click your username in the top bar)" asides. Same form in every FAQ (shiltemann, #7181).
## Links

- Link every GTN-internal target with `{% link path/to/file.ext %}` - pages, FAQs, and images. Not `https://training.galaxyproject.org/...`, not `{{site.baseurl}}/...`. Broken `{% link %}`s fail the build instead of a later lint (shiltemann, #7181).
- Fix these on any file you touch, even if you didn't introduce them; maintainers welcome the polish.

## Version drift

- Not every server runs the latest Galaxy. Removing instructions for a slightly older UI is OK when clearly obsolete, but lean towards keeping them for a while; FAQs aren't versioned yet (shiltemann, #7181).

## Known lint noise

- GTN:011 (`target="_blank"`) warnings on `galaxy-intro-rdm/tutorial.md` are pre-existing; reviewdog flags them on any PR touching that file.

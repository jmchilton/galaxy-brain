from pathlib import Path
import subprocess, shutil
source=Path('/Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y')
target=Path('/private/tmp/galaxy-a11y-validation')
# Overlay dev production changes, preserving the frozen migration story fixtures.
paths=subprocess.check_output(['git','diff','--name-only','vitest_story_a11y','HEAD','--','client'],cwd=source,text=True).splitlines()
paths+=subprocess.check_output(['git','diff','--name-only','HEAD','--','client'],cwd=source,text=True).splitlines()
for path in sorted(set(paths)):
 p=source/path
 if not p.is_file(): continue
 if path.startswith('client/packages/ui/src/') or (path.startswith('client/src/') and '.test.' not in path and '.stories.' not in path and '__mocks__' not in path and not any(x in p.name.lower() for x in ['test','fixture','mock','play'])):
  shutil.copy2(p,target/path)
for p in (target/'client/src').rglob('*.stories.ts'):
 s=p.read_text().replace('a11y: { test: "todo" }','a11y: { test: "error" }')
 p.write_text(s)
print('Synced dev production repairs; audit exceptions set to error in disposable harness.')

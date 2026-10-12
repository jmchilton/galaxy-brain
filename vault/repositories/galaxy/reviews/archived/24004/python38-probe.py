"""Execute the exact PR callback aliases on Python 3.8 without installing Galaxy dependencies.

Run from the PR worktree: python3.8 /path/to/python38-probe.py
The actual package-import failure is independently present in the Pulsar CI log.
"""
import ast
from pathlib import Path
from typing import Any, Callable, List, Optional
source_path = Path('lib/galaxy/tool_util/parameters/convert.py')
source = source_path.read_text()
for node in ast.parse(source).body:
    if not isinstance(node, ast.Assign):
        continue
    names = [t.id for t in node.targets if isinstance(t, ast.Name)]
    if not any(name in ('DatasetToRuntimeJson', 'CollectionToRuntimeJson') for name in names):
        continue
    namespace = dict(Any=Any, Callable=Callable, List=List, Optional=Optional,
                     DataJobInternalT=Any, DataInternalJson=Any, DataCollectionRequestInternal=Any)
    definition = ast.get_source_segment(source, node)
    print(definition)
    try:
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(source_path), 'exec'), namespace)
    except TypeError as exc:
        assert 'not subscriptable' in str(exc)
        print('Current alias: FAIL:', exc)
    else:
        raise AssertionError('This probe must be run with Python 3.8')
    exec(definition.replace('list[str]', 'List[str]'), namespace)
    print('typing.List replacement: PASS')

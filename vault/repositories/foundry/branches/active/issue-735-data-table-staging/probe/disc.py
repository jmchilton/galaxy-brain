"""Call planemo's discovery on a workflow runnable, per layout."""
import os, sys
from planemo.galaxy.config import _find_test_data, _find_tool_data_table
from planemo.runnable import RunnableType, for_path
for layout in sys.argv[1:]:
    r = for_path(os.path.join(layout, "wf.gxwf.yml"))
    assert r.type == RunnableType.galaxy_workflow, r.type
    td = _find_test_data([r])
    print(os.path.basename(layout), "test_data=", os.path.basename(td or ""), "tables=", _find_tool_data_table([r], test_data_dir=td))

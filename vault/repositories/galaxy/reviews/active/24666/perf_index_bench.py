"""Time ToolIndex.model_validate on a synthetic 10k-entry payload and a panel-collapse-like pass."""
import time
from galaxy.tools.source_store.index import ToolIndex, ToolIndexEntry, ToolPanelItem
from galaxy.tool_util.version import parse_tool_version
from galaxy.util.tool_version import remove_version_from_guid

N = 10000
entries = {}
items = []
for i in range(N):
    tid = f"toolshed.g2.bx.psu.edu/repos/o/r{i}/t{i}/1.{i % 7}.0"
    entries[tid] = ToolIndexEntry(id=tid, version=f"1.{i % 7}.0", name=f"T{i}", description="d" * 60,
        help_text="h" * 2000, panel_section_id=f"s{i % 50}", labels=["a"], edam_operations=["operation_0004"],
        source_hash=f"{i:064x}", source_path=f"/cvmfs/x/{i}.xml")
    items.append(ToolPanelItem.model_construct(tool_id=tid, section_id=f"s{i % 50}"))
idx = ToolIndex(entries=entries, panel_items=items)
payload = idx.model_dump(mode="json")
t = time.perf_counter(); ToolIndex.model_validate(payload); print("model_validate 10k:", round(time.perf_counter() - t, 3), "s")
t = time.perf_counter()
for e in entries.values():
    remove_version_from_guid(e.id); parse_tool_version(e.version)
print("collapse-like pass 10k:", round(time.perf_counter() - t, 3), "s")

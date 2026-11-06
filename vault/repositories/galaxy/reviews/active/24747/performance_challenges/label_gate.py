"""Compare config quota_source_labels with sources /usages lists when a labeled source has quota disabled."""
from galaxy.objectstore import QuotaSourceMap

root = QuotaSourceMap()
root.backends["default"] = QuotaSourceMap()
root.backends["scratch"] = QuotaSourceMap(source="scratch", enabled=False)
print("config labels:", sorted(root.get_quota_source_labels()))
print("usages labels:", list(root.ids_per_quota_source()))

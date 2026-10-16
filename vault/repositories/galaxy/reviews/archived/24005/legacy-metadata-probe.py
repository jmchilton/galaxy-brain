from pathlib import Path
import tempfile
from galaxy.datatypes.registry import example_datatype_registry_for_sample
from galaxy.model import HistoryDatasetAssociation,set_datatypes_registry
from galaxy.metadata.set_metadata import set_meta_with_tool_provided
from galaxy.tools.wrappers import DatasetFilenameWrapper
registry=example_datatype_registry_for_sample();set_datatypes_registry(registry)
with tempfile.TemporaryDirectory(prefix='pr24005-legacy-') as directory:
    root=Path(directory)/'extra'; store=root/'wrapped.zarr';store.mkdir(parents=True)
    (store/'.zgroup').write_text('{"zarr_format": 2}')
    primary=Path(directory)/'dataset.dat';primary.write_text('')
    hda=HistoryDatasetAssociation(create_dataset=True,flush=False,name='old dataset',extension='zarr')
    hda.id=1;hda.dataset.external_filename=str(primary);hda.dataset.external_extra_files_path=str(root)
    hda._metadata={'store_root':'wrapped.zarr','zarr_format':2,'dbkey':['?']}
    def published_path():
        wrapper=DatasetFilenameWrapper(hda,datatypes_registry=registry)
        return Path(str(wrapper.extra_files_path))/str(wrapper.metadata.store_root)
    before=published_path();print('Before reset:',before.relative_to(root),before.is_dir())
    set_meta_with_tool_provided(hda,{},dict(overwrite=True),registry,0)
    # Same serializer/loader used for portable metadata. Unknown old keys stay in the existing HDA.
    metadata=hda.metadata.to_JSON_dict();hda.metadata.from_JSON_dict(json_dict=metadata)
    after=published_path();print('After reset:',after.relative_to(root),after.is_dir())
    print('Metadata:',hda._metadata,'Extra files:',sorted(p.name for p in root.iterdir()))
    assert before.is_dir() is False  # Old wrapper was removed.
    assert (root/'.zgroup').exists()
    assert after.is_dir(), 'Published store_root wrapper still points at removed wrapper folder after reset'

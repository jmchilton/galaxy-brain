import json,tempfile,warnings
from pathlib import Path
from urllib.parse import quote
import numpy as np
import pytest
import zarr
from galaxy.files.sources.http import HTTPFilesSource
from galaxy.files.unittest_utils import stock_file_sources_allowing_loopback
from galaxy.util.unittest_utils.test_http_server import serve_directory
from unit.data.test_dataset_materialization import _deferred_hda_with_extension, _unattached_materializer
warnings.filterwarnings('ignore', category=UserWarning)
for name in ['a b','a#b','a?b','a%20b']:
 for encode in [False, True]:
  with tempfile.TemporaryDirectory() as d, pytest.MonkeyPatch.context() as mp:
   root=Path(d); src=root/'served'/'store.zarr'
   g=zarr.open_group(str(src),mode='w',zarr_format=3)
   g.create_array(name,data=np.array([1,2,3],dtype='uint8'),chunks=(2,))
   zarr.consolidate_metadata(str(src))
   with serve_directory(root/'served') as base:
    prefix=base+'/store.zarr/'
    if encode:
     original=HTTPFilesSource._realize_to
     def encoded(self, source_path, native_path, context):
      if source_path.startswith(prefix):
       source_path=prefix+quote(source_path[len(prefix):],safe='/')
      return original(self,source_path,native_path,context)
     mp.setattr(HTTPFilesSource,'_realize_to',encoded)
    _,hda=_deferred_hda_with_extension(mp,base+'/store.zarr','zarr')
    materializer=_unattached_materializer(root/'materialized',stock_file_sources_allowing_loopback())
    result=materializer.ensure_materialized(hda)
    summary={'name':name,'encoded_control':encode,'state':result.state,'info':result.info}
    if result.state=='ok':
     summary['values']=zarr.open_group(result.extra_files_path,mode='r')[name][:].tolist()
    else:
     summary['partial_files_exist']=Path(materializer._transient_path_mapper.transient_paths_for(hda.dataset).external_extra_files_path).exists()
    print(json.dumps(summary))

import json,tempfile,warnings
from pathlib import Path
import numpy as np
import zarr
from galaxy.datatypes.data import ZarrDirectory
from galaxy.files.uris import UriDirectoryReader
from galaxy.files.unittest_utils import stock_file_sources_allowing_loopback
from galaxy.util.unittest_utils.test_http_server import serve_directory
warnings.filterwarnings('ignore', category=UserWarning)
for fmt,name,shards in [(2,'a/b',None),(3,'a/b',None),(3,'a/b',(4,)),(3,'a b',None),(3,'a#b',None),(3,'a%b',None)]:
 with tempfile.TemporaryDirectory() as d:
  root=Path(d); src=root/'served'/'store.zarr'; out=root/'output'; out.mkdir()
  g=zarr.open_group(str(src),mode='w',zarr_format=fmt)
  kw={} if shards is None else {'shards':shards}
  g.create_array(name,data=np.array([1,2,3,4,0,0],dtype='uint8'),chunks=(2,),**kw)
  zarr.consolidate_metadata(str(src))
  with serve_directory(root/'served') as base:
   reader=UriDirectoryReader(base+'/store.zarr',file_sources=stock_file_sources_allowing_loopback())
   try:
    ZarrDirectory().materialize_extra_files(reader,str(out))
    result=zarr.open_group(str(out),mode='r')[name][:].tolist()
    print(json.dumps({'format':fmt,'name':name,'shards':shards,'result':result,'files':sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file())}))
   except Exception as e:
    print(json.dumps({'format':fmt,'name':name,'shards':shards,'error':str(e)}))

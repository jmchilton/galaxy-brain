import sys,pathlib,subprocess,logging,json
logging.disable(logging.CRITICAL)
from galaxy.datatypes.registry import Registry
from galaxy.util.bunch import Bunch
from galaxy.managers.datatypes import get_preferred_visualization
from galaxy.visualization.plugins.config_parser import PluginConfigParser
from galaxy.visualization.plugins.datasource_testing import is_object_applicable
from galaxy.model import HistoryDatasetAssociation, Dataset, set_datatypes_registry
from types import SimpleNamespace
root=pathlib.Path('/Users/jxc755/projects/worktrees/galaxy/pr/23869');path='lib/galaxy/config/sample/datatypes_conf.xml.sample';old=pathlib.Path('/private/tmp/pr23869-parent.xml');old.write_bytes(subprocess.check_output(['git','show','HEAD^:'+path],cwd=root))
def reg(path):
 r=Registry(Bunch(sniff_compressed_dynamic_datatypes_default=True));r.load_datatypes(root_dir=str(root),config=str(path));return r
parent=reg(old);head=reg(root/path);set_datatypes_registry(head)
configs={p.parent.parent.name:PluginConfigParser().parse_file(str(p)) for p in pathlib.Path('/private/tmp/pr23869-plugins').glob('*/static/*.xml')}
trans=SimpleNamespace(app=SimpleNamespace(datatypes_registry=head));changes={};mismatch=[]
for ext in head.datatypes_by_extension:
 a,b=get_preferred_visualization(parent,ext),get_preferred_visualization(head,ext)
 if a!=b:
  changes[ext]={'before':a,'after':b}
  p=b['visualization'] if b else None
  if p in configs:
   hda=HistoryDatasetAssociation(extension=ext, dataset=Dataset());hda.dataset.state='ok';hda.dataset.datatypes_registry=head
   if not any(is_object_applicable(trans,hda,d['tests']) for d in configs[p]['data_sources']):mismatch.append((ext,p))
print('MAPPING CHANGES:',json.dumps(changes,indent=2));print('DATASOURCE MISMATCH:',mismatch);print('COUNTS:',len(changes),len(configs));pathlib.Path('/private/tmp/pr23869-probe-results.json').write_text(json.dumps({'changes':changes,'mismatch':mismatch},indent=2))

import asyncio
from galaxy.visualization.plugins.registry import VisualizationsRegistry
from galaxy.webapps.galaxy.api.datatypes import FastAPIDatatypes
class App:
 pass
app=App();app.config=SimpleNamespace(root=str(root),galaxy_url_prefix='')
app.visualizations_registry=VisualizationsRegistry(app,directories_setting='/private/tmp/pr23869-plugins',skip_bad_plugins=False)
async def api_results():
 results={}
 for label,r in [('parent',parent),('head',head)]:
  api=FastAPIDatatypes(datatypes_registry=r,app=app)
  results[label]={ext:(await api.show(ext)).get('preferred_visualization') for ext in ['tar','hep.root','bai','fasta.gz','fasta.bz2','fits','geojson','nii1']}
 print('ACTUAL API HANDLER:',json.dumps(results,indent=2))
 pathlib.Path('/private/tmp/pr23869-api-results.json').write_text(json.dumps(results,indent=2))
asyncio.run(api_results())

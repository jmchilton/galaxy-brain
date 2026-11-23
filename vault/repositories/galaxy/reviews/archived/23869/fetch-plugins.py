import pathlib, xml.etree.ElementTree as E, subprocess, urllib.request, tarfile, io, concurrent.futures, json
root=pathlib.Path('/Users/jxc755/projects/worktrees/galaxy/pr/23869');path='lib/galaxy/config/sample/datatypes_conf.xml.sample'
a=E.fromstring(subprocess.check_output(['git','show','HEAD^:'+path],cwd=root));b=E.parse(root/path).getroot()
def maps(r):return {d.get('extension'):[v.get('plugin') for v in d.findall('visualization')] for d in r.findall('./registration/datatype')}
m0,m1=maps(a),maps(b);changes={k:v for k,v in m1.items() if v!=m0[k]};print(json.dumps(changes,indent=2));out=pathlib.Path('/private/tmp/pr23869-plugins');out.mkdir(exist_ok=True)
import yaml
manifest=yaml.safe_load((root/'client/visualizations.yml').read_text())
def fetch(p):
 v=manifest[p]['version'];url=f'https://registry.npmjs.org/@galaxyproject/{p}/-/{p}-{v}.tgz';data=urllib.request.urlopen(url,timeout=60).read();t=tarfile.open(fileobj=io.BytesIO(data),mode='r:gz');target=out/p;target.mkdir(exist_ok=True)
 for m in t.getmembers():
  if m.isfile() and (m.name.endswith(('.xml','package.json','.html','.js'))):
   dest=target/pathlib.PurePosixPath(m.name).relative_to('package');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(t.extractfile(m).read())
 print(p,v,len(data))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(fetch,sorted({p for ps in changes.values() for p in ps})))
(out/'changes.json').write_text(json.dumps(changes,indent=2))

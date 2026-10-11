import pathlib,json,html,gzip,asyncio,re
from playwright.async_api import async_playwright
plugins=pathlib.Path('/private/tmp/pr23869-plugins')
from galaxy.datatypes.sequence import Fasta
from galaxy.datatypes.binary import GzDynamicCompressedArchive, Bz2DynamicCompressedArchive
from types import SimpleNamespace
def display_bytes(data,ext):
 file=pathlib.Path('/private/tmp/pr23869-display.'+ext);file.write_bytes(data)
 compressed=GzDynamicCompressedArchive if ext=='fasta.gz' else Bz2DynamicCompressedArchive
 dt=type('FastaCompressed',(Fasta,compressed),{})()
 dataset=SimpleNamespace(id=1,hid=1,name='probe',extension=ext,datatype=dt,dataset=SimpleNamespace(file_size=len(data)),get_file_name=lambda **kw:str(file),get_mime=lambda:'application/octet-stream')
 trans=SimpleNamespace(user=None,app=SimpleNamespace(config=SimpleNamespace(sanitize_all_html=False)),log_event=lambda msg:None)
 value,headers=dt.display_data(trans,dataset)
 content=value.read();value.close();assert content==data;assert 'Content-Encoding' not in headers
 return content
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True)
  results=[]
  fasta=b'>short\nACGT\n>long\nACGTACGTACGT\n';aligned=b'>a\nACGT\n>b\nAC-T\n'
  for plugin,kind,data in [('alignment','aligned',aligned),('alignment','unaligned',fasta),('alignment','gzip',display_bytes(gzip.compress(aligned),'fasta.gz')),('alignment','bzip2',display_bytes(__import__('bz2').compress(aligned),'fasta.bz2'))]:
   page=await browser.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));entry='index.js'
   incoming={'root':'https://probe.invalid/','visualization_config':{'dataset_id':'d1'}}
   body=f'<html><div id="app" data-incoming="{html.escape(json.dumps(incoming),quote=True)}"></div><script type="module" src="/{plugin}/static/{entry}"></script></html>'
   async def route(r):
    path=__import__('urllib.parse',fromlist=['urlparse']).urlparse(r.request.url).path
    if path=='/':await r.fulfill(body=body,content_type='text/html')
    elif path.endswith('/display'):await r.fulfill(body=data,content_type='application/octet-stream')
    else:
     f=plugins/path.lstrip('/')
     if f.is_file():await r.fulfill(body=f.read_bytes(),content_type='text/javascript' if f.suffix=='.js' else 'text/plain')
     else:await r.fulfill(status=404,body='')
   await page.route('**/*',route);await page.goto('https://probe.invalid/');await page.wait_for_timeout(1300)
   results.append({'plugin':plugin,'kind':kind,'pageerrors':errs,'body':await page.locator('body').inner_text(),'viewer':await page.locator('#viewer').inner_text()})
   await page.close()
  print(json.dumps(results,indent=2));await browser.close()
asyncio.run(main())

import json, os, subprocess, time
from sqlalchemy import event, text
from galaxy import model
from galaxy.managers.job_connections import JobConnectionsManager
from galaxy.model.unittest_utils import GalaxyDataTestApp
ns={}
exec(subprocess.check_output(['git','show','8ef56943b78:lib/galaxy/managers/job_connections.py'],text=True),ns)
Base=ns['JobConnectionsManager']
before_ns={}
exec(subprocess.check_output(['git','show','f9b57ed5793:lib/galaxy/managers/job_connections.py'],text=True),before_ns)
Before=before_ns['JobConnectionsManager']
app=GalaxyDataTestApp(database_connection=os.environ['GALAXY_REVIEW_DBURI'])
s=app.model.session;e=s.get_bind()
h=model.History();a=model.HistoryDatasetAssociation(sa_session=s,history=h,hid=1,create_dataset=True);b=model.HistoryDatasetAssociation(sa_session=s,history=h,hid=2,create_dataset=True)
c=model.DatasetCollection(collection_type='list'); j=model.Job();j.add_input_dataset('i',a);j.add_output_dataset('o',b)
s.add_all([h,a,b,c,j]);s.flush();history_id=h.id;dataset_id=a.dataset_id;collection_id=c.id;s.commit()
last=0
results=[]
for size in (2000,20000,100000,500000):
 s.execute(text("INSERT INTO history_dataset_association (history_id,hid,dataset_id,validated_state) SELECT :history, value+2, :dataset, 'unvalidated' FROM generate_series(CAST(:first AS INTEGER),CAST(:last AS INTEGER)) value"),{'history':history_id,'dataset':dataset_id,'first':last+1,'last':size})
 s.execute(text('INSERT INTO history_dataset_collection_association (history_id,hid,collection_id) SELECT :history, value+:size+2, :collection FROM generate_series(CAST(:first AS INTEGER),CAST(:last AS INTEGER)) value'),{'history':history_id,'collection':collection_id,'first':last+1,'last':size,'size':1000000})
 late_hid=9000000+size
 la=model.HistoryDatasetAssociation(sa_session=s,history=h,hid=late_hid,create_dataset=True);lb=model.HistoryDatasetAssociation(sa_session=s,history=h,hid=late_hid+1,create_dataset=True)
 lj=model.Job();lj.add_input_dataset('i',la);lj.add_output_dataset('o',lb);s.add_all([la,lb,lj])
 s.commit();s.execute(text('ANALYZE'));s.commit();last=size
 captured=[]
 def cap(conn,cursor,statement,parameters,context,executemany):captured.append((statement,parameters))
 event.listen(e,'before_cursor_execute',cap)
 try: assert sorted(JobConnectionsManager(s).get_related_hids(history_id,1))==[1,2]
 finally:event.remove(e,'before_cursor_execute',cap)
 with e.connect() as conn:
  plans=[conn.exec_driver_sql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+stmt,params).scalar()[0] for stmt,params in captured]
 def flatten(node):
  yield node
  for sub in node.get('Plans',[]):yield from flatten(sub)
 scans=[{k:n[k] for k in ('Node Type','Relation Name','Index Name','Actual Total Time','Actual Rows','Rows Removed by Filter','Index Cond','Filter') if k in n} for n in flatten(plans[0]['Plan']) if n.get('Relation Name')]
 times={}
 for name,manager in [('base',Base(s)),('review_revision',Before(s)),('consolidated',JobConnectionsManager(s))]:
  vals=[]
  for repeat in range(5):
   t=time.perf_counter();assert sorted(manager.get_related_hids(history_id,1))==[1,2];vals.append((time.perf_counter()-t)*1000)
  times[name]=round(sorted(vals)[2],3)
 result={'unrelated_datasets':size,'unrelated_collections':size,'metadata_ms':plans[0]['Execution Time'],'graph_ms':plans[1]['Execution Time'],'five_runs_median_wall_ms':times,'metadata_scans':scans}
 late_times={}
 for name,manager in [('base',Base(s)),('review_revision',Before(s)),('consolidated',JobConnectionsManager(s))]:
  vals=[]
  for repeat in range(5):
   t=time.perf_counter();assert sorted(manager.get_related_hids(history_id,late_hid))==[late_hid,late_hid+1];vals.append((time.perf_counter()-t)*1000)
  late_times[name]=round(sorted(vals)[2],3)
 result['late_clicked_median_wall_ms']=late_times
 results.append(result);print(json.dumps(result),flush=True)
path=os.environ.get('GALAXY_REVIEW_RESULTS','/tmp/24106-pass2-metadata-results.json');open(path,'w').write(json.dumps(results,indent=2));print(path,flush=True)

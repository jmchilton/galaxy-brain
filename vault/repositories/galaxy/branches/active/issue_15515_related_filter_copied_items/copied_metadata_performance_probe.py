import json, os, subprocess, time, statistics
from sqlalchemy import text, event
from galaxy import model
from galaxy.managers.job_connections import JobConnectionsManager
from galaxy.model.unittest_utils import GalaxyDataTestApp
ns={};exec(subprocess.check_output(['git','show','f9b57ed5793:lib/galaxy/managers/job_connections.py'],text=True),ns)
app=GalaxyDataTestApp(database_connection=os.environ['GALAXY_REVIEW_DBURI']);s=app.model.session;e=s.get_bind()
source=model.History();target=model.History();a=model.HistoryDatasetAssociation(sa_session=s,history=source,hid=1,create_dataset=True);b=model.HistoryDatasetAssociation(sa_session=s,history=source,hid=2,create_dataset=True);c=model.DatasetCollection(collection_type='list');hc=model.HistoryDatasetCollectionAssociation(history=source,hid=3,collection=c);j=model.Job();j.add_input_dataset('i',a);j.add_output_dataset('o',b);s.add_all([source,target,a,b,c,hc,j]);s.flush();sid=source.id;tid=target.id;did=a.dataset_id;cid=c.id;aid=a.id;bid=b.id;hcid=hc.id;s.commit()
last=0;results=[]
for size in (2000,20000):
 s.execute(text("INSERT INTO history_dataset_association(history_id,hid,dataset_id,validated_state) SELECT :sid,value+10,:did,'unvalidated' FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) value"),dict(sid=sid,did=did,first=last+1,last=size))
 s.execute(text('INSERT INTO history_dataset_collection_association(history_id,hid,collection_id) SELECT :sid,value+100000,:cid FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) value'),dict(sid=sid,cid=cid,first=last+1,last=size))
 late=900000+size;la=model.HistoryDatasetAssociation(sa_session=s,history=source,hid=late,create_dataset=True);lb=model.HistoryDatasetAssociation(sa_session=s,history=source,hid=late+1,create_dataset=True);lj=model.Job();lj.add_input_dataset('i',la);lj.add_output_dataset('o',lb);s.add_all([la,lb,lj]);s.flush()
 s.execute(text('DELETE FROM history_dataset_association WHERE history_id=:tid'),dict(tid=tid));s.execute(text('DELETE FROM history_dataset_collection_association WHERE history_id=:tid'),dict(tid=tid))
 s.execute(text("INSERT INTO history_dataset_association(history_id,hid,dataset_id,validated_state,copied_from_history_dataset_association_id) SELECT :tid,hid,dataset_id,'unvalidated',id FROM history_dataset_association WHERE history_id=:sid"),dict(tid=tid,sid=sid))
 s.execute(text('INSERT INTO history_dataset_collection_association(history_id,hid,collection_id,copied_from_history_dataset_collection_association_id) SELECT :tid,hid,collection_id,id FROM history_dataset_collection_association WHERE history_id=:sid'),dict(tid=tid,sid=sid));s.commit();s.execute(text('ANALYZE'));s.commit();last=size
 result={'unrelated_copied_datasets':size,'unrelated_copied_collections':size}
 managers=[('review_revision',ns['JobConnectionsManager'](s)),('consolidated',JobConnectionsManager(s))]
 for label,hid in [('early',1),('late',late)]:
  samples={name:[] for name,_ in managers}
  for repeat in range(9):
   for name,manager in managers:
    start=time.perf_counter();actual=sorted(manager.get_related_hids(tid,hid));assert actual==[hid,hid+1],actual
    if repeat>=2:samples[name].append((time.perf_counter()-start)*1000)
  result[label+'_median_wall_ms']={name:round(statistics.median(vals),3) for name,vals in samples.items()}
 captured=[]
 def capture(conn,cursor,statement,parameters,context,executemany):captured.append((statement,parameters))
 event.listen(e,'before_cursor_execute',capture)
 try:assert sorted(JobConnectionsManager(s).get_related_hids(tid,1))==[1,2]
 finally:event.remove(e,'before_cursor_execute',capture)
 assert len(captured)==2,len(captured)
 with e.connect() as conn:plans=[conn.exec_driver_sql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+stmt,params).scalar()[0] for stmt,params in captured]
 result['metadata_ms']=plans[0]['Execution Time'];result['graph_ms']=plans[1]['Execution Time'];results.append(result);print(json.dumps(result),flush=True)
open('/tmp/24106-pass2-copied-results.json','w').write(json.dumps(results,indent=2))

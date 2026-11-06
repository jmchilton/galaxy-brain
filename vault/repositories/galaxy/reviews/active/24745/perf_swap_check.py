"""Does _delete_metadata_files purge a live output's metadata files during copy_from?"""
import sys, tempfile
sys.argv = ["x"]
src_text = open("perf_full_delete_harness.py").read().split("def build(")[0]
exec(src_text)
from sqlalchemy.orm import sessionmaker
def trial(name, impl, autoflush):
    model.Dataset._delete_metadata_files = impl
    Sess = sessionmaker(bind=engine, autoflush=autoflush, expire_on_commit=False)
    s = Sess()
    h = model.History(name="c"); s.add(h)
    old = model.Dataset(); new = model.Dataset(); s.add_all([old, new])
    out = model.HistoryDatasetAssociation(extension="txt", dataset=old, history=h, sa_session=s, create_dataset=False)
    src = model.HistoryDatasetAssociation(extension="txt", dataset=new, history=h, sa_session=s, create_dataset=False)
    s.add_all([out, src]); s.flush()
    mine = model.MetadataFile(dataset=out, name="bai"); s.add(mine)
    other = model.HistoryDatasetAssociation(extension="txt", dataset=old, history=h, sa_session=s, create_dataset=False); s.add(other)
    other_mf = model.MetadataFile(dataset=other, name="bai"); s.add(other_mf)
    s.commit()
    out_mf_id, other_mf_id = mine.id, other_mf.id
    out.dataset = new  # the swap copy_from performs
    old.full_delete()
    s.flush(); s.commit()
    a = s.get(model.MetadataFile, out_mf_id); b = s.get(model.MetadataFile, other_mf_id)
    print(f"{name:9s} autoflush={autoflush!s:5s} live_out_mf.purged={a.purged!s:5s} old_copy_mf.purged={b.purged}")
    s.close()
for af in (True, False):
    trial("PR", PR, af)
    trial("subquery", alt, af)

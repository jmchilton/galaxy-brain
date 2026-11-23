"""Time a late cache hit swap and a plain UPDATE on one output while History.copy runs."""
import sys, threading, time, uuid

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

from galaxy import model
from galaxy.datatypes.registry import Registry
from galaxy.objectstore import QuotaSourceMap

HDA = model.HistoryDatasetAssociation
Q, OK = model.Dataset.states.QUEUED, model.Dataset.states.OK


class Store:
    def __init__(self):
        self._quota_source_map = QuotaSourceMap()
    def get_store_by(self, *a, **k):
        return "id"
    def exists(self, *a, **k):
        return False
    def delete(self, *a, **k):
        return True
    def size(self, *a, **k):
        return 0
    def is_private(self, *a, **k):
        return False


def main(url, n):
    engine = create_engine(url, pool_size=8)
    model.mapper_registry.metadata.create_all(engine)
    model.setup_global_object_store_for_models(Store())
    r = Registry(); r.load_datatypes(); model.set_datatypes_registry(r)
    sm = sessionmaker(bind=engine, autoflush=False)
    with sm() as s:
        u = model.User(email=f"{uuid.uuid4().hex}@x.org", password="x", username=uuid.uuid4().hex)
        h = model.History(name="h", user=u); s.add_all([u, h]); s.flush()
        hdas = []
        for i in range(n + 1):
            hda = HDA(history=h, extension="txt", create_dataset=True, sa_session=s, flush=False, hid=i + 1, name=f"d{i}")
            hda.dataset.state = Q; s.add(hda); hdas.append(hda)
        cached = HDA(history=h, extension="txt", create_dataset=True, sa_session=s, flush=False, hid=n + 2, name="c")
        cached.dataset.state = OK; s.add(cached)
        s.commit()
        hid, uid, target, cached_id = h.id, u.id, hdas[0].id, cached.id
    res = {}

    def copier():
        with sm() as s:
            h = s.get(model.History, hid); t = time.perf_counter()
            h.copy(target_user=s.get(model.User, uid))
            res["history_copy_sec"] = round(time.perf_counter() - t, 3)

    def swap():
        with sm() as s:
            o, c = s.get(HDA, target), s.get(HDA, cached_id); t = time.perf_counter()
            o.copy_from(c, include_metadata=True); s.commit()
            res["swap_sec"] = round(time.perf_counter() - t, 3)

    def update():
        with engine.begin() as c:
            t = time.perf_counter()
            c.execute(text("update history_dataset_association set name='r' where id=:i"), {"i": target})
            res["update_sec"] = round(time.perf_counter() - t, 3)

    a = threading.Thread(target=copier); a.start()
    # let the loop get past the first source (ids load, then per-HDA copies)
    time.sleep(float(sys.argv[3]))
    b = threading.Thread(target=swap); b.start()
    time.sleep(0.3)
    c = threading.Thread(target=update); c.start()
    with engine.connect() as conn:
        rows = conn.execute(text("select wait_event_type, wait_event, left(query, 70) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")).all()
    res["waiting_at_t"] = [tuple(x) for x in rows]
    for t in (a, b, c):
        t.join(600)
    print(res)


if __name__ == "__main__":
    print(model.__file__)
    main(sys.argv[1], int(sys.argv[2]))

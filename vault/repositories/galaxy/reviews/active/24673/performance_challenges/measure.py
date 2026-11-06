"""Statement counts and wall time of HDA copy / copy_from paths on real Postgres."""
import json, os, sys, time, uuid

from sqlalchemy import create_engine, event, select, text
from sqlalchemy.orm import sessionmaker

from galaxy import model
from galaxy.datatypes.registry import Registry
from galaxy.objectstore import QuotaSourceMap

HDA = model.HistoryDatasetAssociation
Q, OK = model.Dataset.states.QUEUED, model.Dataset.states.OK


class Store:
    def __init__(self):
        self._quota_source_map = QuotaSourceMap()
    def get_quota_source_map(self):
        return self._quota_source_map
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
    def get_concrete_store_name(self, *a, **k):
        return "x"
    def get_concrete_store_badges(self, *a, **k):
        return []


class Counter:
    def __init__(self, engine):
        self.n = 0; self.locks = 0; self.selects = 0
        event.listen(engine, "before_cursor_execute", self._on)
    def _on(self, conn, cur, stmt, params, ctx, many):
        self.n += 1
        s = stmt.lstrip().upper()
        if "FOR KEY SHARE" in s or "FOR UPDATE" in s:
            self.locks += 1
        if s.startswith("SELECT"):
            self.selects += 1
    def reset(self):
        self.n = self.locks = self.selects = 0


def seed(sm, n, state, hid_start=1, user=None):
    with sm() as s:
        h = model.History(name="h", user=user)
        s.add(h); s.flush()
        hdas = []
        for i in range(n):
            hda = HDA(history=h, extension="txt", create_dataset=True, sa_session=s, flush=False, hid=hid_start + i, name=f"d{i}")
            hda.dataset.state = state
            s.add(hda); hdas.append(hda)
        s.commit()
        return h.id, [x.id for x in hdas]


def timed(cnt, fn, session):
    cnt.reset(); t = time.perf_counter(); r = fn(); session.commit(); dt = time.perf_counter() - t
    return dict(stmts=cnt.n, locks=cnt.locks, selects=cnt.selects, sec=round(dt, 3), ms_per=None), r


def wal(session):
    return session.execute(text("select pg_current_wal_insert_lsn() - '0/0'::pg_lsn")).scalar()


def run(url, sizes):
    engine = create_engine(url, pool_size=5)
    model.mapper_registry.metadata.create_all(engine)
    model.setup_global_object_store_for_models(Store())
    r = Registry(); r.load_datatypes(); model.set_datatypes_registry(r)
    sm = sessionmaker(bind=engine, autoflush=False)
    cnt = Counter(engine)
    out = {}
    with sm() as s:
        u = model.User(email=f"{uuid.uuid4().hex}@x.org", password="x", username=uuid.uuid4().hex); s.add(u); s.commit(); uid = u.id

    def rec(name, n, stats):
        stats["n"] = n
        out[f"{name}/{n}"] = stats
        print(name, n, stats, flush=True)

    for n in sizes:
        # S1 model-op shape: one copy per in-flight element
        for label, state in (("S1_copy_each_queued", Q), ("S3_copy_each_ok_control", OK)):
            _, ids = seed(sm, n, state)
            with sm() as s:
                srcs = list(s.scalars(select(HDA).where(HDA.id.in_(ids))).unique())
                w0 = wal(s); s.commit()
                st, _ = timed(cnt, lambda: [x.copy(copy_tags=x.tags, flush=False) for x in srcs], s)
                st["wal_bytes"] = int(wal(s) - w0); s.commit()
            rec(label, n, st)

        # S2 cross product shape: side x side copies of 2*side sources
        side = int(n ** 0.5)
        _, ids = seed(sm, side * 2, Q)
        with sm() as s:
            srcs = list(s.scalars(select(HDA).where(HDA.id.in_(ids))).unique())
            a, b = srcs[:side], srcs[side:]
            def cross():
                for x in a:
                    for y in b:
                        x.copy(copy_tags=x.tags, flush=False); y.copy(copy_tags=y.tags, flush=False)
            st, _ = timed(cnt, cross, s)
        st["copies"] = 2 * side * side; st["sources"] = 2 * side
        rec("S2_cross_product_queued", n, st)

        # S4 History.copy of an all-in-flight history
        hid, ids = seed(sm, n, Q, user=None)
        with sm() as s:
            h = s.get(model.History, hid); user = s.get(model.User, uid); h.user = user; s.commit()
            st, _ = timed(cnt, lambda: h.copy(target_user=user), s)
        rec("S4_history_copy_queued", n, st)

        # S5 HDCA copy to another history with queued elements
        hid, ids = seed(sm, n, Q)
        with sm() as s:
            h = s.get(model.History, hid)
            c = model.DatasetCollection(collection_type="list", populated=True)
            for i, id_ in enumerate(ids):
                model.DatasetCollectionElement(collection=c, element=s.get(HDA, id_), element_index=i, element_identifier=f"e{i}")
            c.element_count = n
            hdca = model.HistoryDatasetCollectionAssociation(collection=c, history=h, name="c", hid=n + 1)
            s.add(hdca); s.commit(); hdca_id = hdca.id
        with sm() as s:
            hdca = s.get(model.HistoryDatasetCollectionAssociation, hdca_id)
            dest = model.History(name="dest"); s.add(dest); s.commit()
            st, _ = timed(cnt, lambda: hdca.copy(element_destination=dest, flush=False), s)
        rec("S5_hdca_copy_queued", n, st)

        # S6 late cache hit on an N element output collection
        hid, targets = seed(sm, n, Q)
        _, repls = seed(sm, n, OK)
        with sm() as s:
            pairs = [(s.get(HDA, a), s.get(HDA, b)) for a, b in zip(targets, repls)]
            st, _ = timed(cnt, lambda: [t.copy_from(r, include_metadata=True) for t, r in pairs], s)
        rec("S6_copy_from_each_element", n, st)

        # S7 late cache hit on one output with N in-flight copies
        hid, (src, repl) = seed(sm, 2, Q)
        with sm() as s:
            o = s.get(HDA, src); o2 = s.get(HDA, repl); o2.dataset.state = OK
            for _i in range(n):
                o.copy(flush=False)
            s.commit()
        with sm() as s:
            o, o2 = s.get(HDA, src), s.get(HDA, repl)
            st, _ = timed(cnt, lambda: o.copy_from(o2, include_metadata=True), s)
        rec("S7_copy_from_with_n_copies", n, st)
    engine.dispose()
    return out


if __name__ == "__main__":
    url, label, outp = sys.argv[1], sys.argv[2], sys.argv[3]
    sizes = [int(x) for x in sys.argv[4].split(",")]
    print(model.__file__)
    res = run(url, sizes)
    with open(outp, "w") as f:
        json.dump(res, f, indent=1)

"""N processes call populate_once on one SQLite store; populate=3s, check=CHECK s."""
import multiprocessing as mp, sys, time, os
from galaxy.tools.source_store.sqlalchemy import SqlAlchemyToolSourceStore
from galaxy.tools.source_store.coordination import populate_once

DB = sys.argv[1]; N = int(sys.argv[2]); CHECK = float(sys.argv[3])
FLAG = DB + ".populated"

def worker(q):
    store = SqlAlchemyToolSourceStore(f"sqlite:///{DB}")
    lease = store.populate_lease()
    t0 = time.monotonic(); checks = [0]; held = []
    def needs():
        checks[0] += 1; time.sleep(CHECK); return not os.path.exists(FLAG)
    def populate():
        time.sleep(3); open(FLAG, "w").close()
    ran = populate_once(lease, needs, populate)
    q.put((os.getpid(), ran, checks[0], round(time.monotonic() - t0, 2)))

if __name__ == "__main__":
    for p in (DB, FLAG):
        if os.path.exists(p): os.remove(p)
    SqlAlchemyToolSourceStore(f"sqlite:///{DB}")
    q = mp.Queue(); ps = [mp.Process(target=worker, args=(q,)) for _ in range(N)]
    t = time.monotonic(); [p.start() for p in ps]; [p.join() for p in ps]
    res = sorted((q.get() for _ in range(N)), key=lambda r: r[3])
    for r in res: print(r)
    print("populates:", sum(r[1] for r in res), "wall:", round(time.monotonic() - t, 2))

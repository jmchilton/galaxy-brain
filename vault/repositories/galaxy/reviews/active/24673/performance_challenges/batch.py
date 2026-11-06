import sys, time, psycopg2
c = psycopg2.connect(host="127.0.0.1", port=int(sys.argv[1]), user="postgres", dbname="plan")
k = c.cursor()
ids = list(range(100000, 110000))
for rep in range(3):
    t = time.perf_counter()
    for i in ids:
        k.execute("SELECT dataset_id FROM history_dataset_association WHERE id = %s FOR KEY SHARE", (i,)); k.fetchone()
    a = time.perf_counter() - t; c.rollback()
    t = time.perf_counter()
    k.execute("SELECT id, dataset_id FROM history_dataset_association WHERE id = ANY(%s) ORDER BY id FOR KEY SHARE", (ids,)); k.fetchall()
    b = time.perf_counter() - t; c.rollback()
    print(f"10k per-row {a:.3f}s, one batch {b:.3f}s")

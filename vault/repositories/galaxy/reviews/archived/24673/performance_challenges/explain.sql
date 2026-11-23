\timing off
-- 2M hda rows: 1M uniquely owned datasets, 1 popular dataset with 1M rows
INSERT INTO dataset (state, deleted, purged, purgable) SELECT 'ok', false, false, false FROM generate_series(1,1000001);
INSERT INTO history (name, hid_counter, deleted, purged, importing) VALUES ('h', 1, false, false, false);
INSERT INTO history_dataset_association (history_id, dataset_id, hid, name, deleted, visible, purged, validated_state)
  SELECT (select min(id) from history), g, g, 'x', false, true, false, 'unknown' FROM generate_series(1,1000000) g;
INSERT INTO history_dataset_association (history_id, dataset_id, hid, name, deleted, visible, purged, validated_state, copied_from_history_dataset_association_id)
  SELECT (select min(id) from history), 1000001, g, 'x', false, true, false, 'unknown', 1000001 FROM generate_series(1,1000000) g;
ANALYZE history_dataset_association; ANALYZE dataset;
\echo --- lock row
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id FROM history_dataset_association WHERE id = 500000 FOR UPDATE;
\echo --- lock outputs in id order
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id FROM history_dataset_association WHERE id IN (500000, 500001, 500002) ORDER BY id FOR UPDATE;
\echo --- committed copies, in-flight dataset
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT * FROM history_dataset_association h LEFT OUTER JOIN dataset d ON d.id = h.dataset_id WHERE h.copied_from_history_dataset_association_id = 500000 AND h.dataset_id = 500000;
\echo --- committed copies, popular dataset (worst case; not expected for in-flight output)
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT * FROM history_dataset_association h LEFT OUTER JOIN dataset d ON d.id = h.dataset_id WHERE h.copied_from_history_dataset_association_id = 500000 AND h.dataset_id = 1000001;
\echo --- key share
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT dataset_id FROM history_dataset_association WHERE id = 500000 FOR KEY SHARE;

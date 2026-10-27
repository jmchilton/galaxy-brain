# topics/visualisation/faqs/visualizations_igv_add_genome.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `cdbfecd0b71`. Replay: `visualizations_igv_add_genome.gxui.sh` (passes fresh).

- `igv-display-on-visualize-tab` applies: FASTA and GFF3 both show **display with IGV** > **local** on the Visualize tab, not the expanded dataset (with a dbkey, also the build link).
- Not checked: clicking **local** (needs IGV desktop), so the "Dataset status ok" / "ERROR Parameter file" lines are unverified.
- Source numbering is 1,1,2,2,3,4,5,2,3,5; renders fine as one list.

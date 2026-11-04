"""Crop the stage screenshots for the invocation-graph outputs deck.

Every invocation frame from the three stages is 1280x1000 with the same panels,
so one box cuts the invocation header and graph canvas out of each of them and
the flip pairs keep lining up. The crops drop Galaxy's activity bar, masthead
(random test user names, storage meter) and history panel (test-tool dataset
names), which differ between stages and pull the eye away from the graph.

Needs Pillow; run it with any Python that has it, for example the stage 3
worktree's virtualenv:

    ~/projects/worktrees/galaxy/branch/invocation_graph_embedded_outputs/.venv/bin/python \
        make_slide_crops.py

Writes to ../screenshots/presentation/slides/ (gitignored).
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ACTIVE = os.path.normpath(os.path.join(HERE, "..", ".."))
S1 = os.path.join(ACTIVE, "invocation_graph_output_previews", "screenshots")
S2 = os.path.join(ACTIVE, "invocation_graph_embedded_workflow_outputs", "screenshots")
S3 = os.path.join(ACTIVE, "invocation_graph_embedded_outputs", "screenshots")
SPIKE = os.path.normpath(
    os.path.join(ACTIVE, "..", "..", "..", "..", "projects", "invocation_graph_embedded_outputs", "screenshots")
)
OUT = os.path.join(HERE, "..", "screenshots", "presentation", "slides")

# Invocation header bar (y 56) to the bottom of the graph canvas (y 913), canvas x 105..963.
FRAME = (105, 56, 964, 914)
# The same, cut just under the running step and its card (for side-by-side pairs).
FRAME_TOP = (105, 56, 964, 640)
# The ChIP-seq middle region around Bowtie2, filter MAPQ30 and Call Peaks (stage 2 vs 3).
CHIP_REGION = (105, 260, 800, 700)
# Workflow editor canvas, right of the Attributes panel.
EDITOR = (384, 40, 1280, 760)
# Spike frames are 1600x1000; their invocation header and canvas.
SPIKE_FRAME = (405, 56, 1284, 824)

CROPS = [
    # name, source dir, file, box
    ("s1_01_default", S1, "01_default_graph.png", FRAME),
    ("s1_02_hover_table", S1, "02_hover_table.png", FRAME),
    ("s1_03_hover_image_pop", S1, "03_hover_image.png", (330, 275, 900, 670)),
    ("s1_04_hover_collection_pop", S1, "04_hover_collection.png", (330, 550, 800, 710)),
    ("s1_05_hover_multiple_pop", S1, "05_hover_multiple_outputs.png", (550, 550, 1005, 710)),
    ("s2_01_before", S2, "01_output_previews_before_embedding.png", FRAME),
    ("s2_02_embedded", S2, "02_output_previews_embedded.png", FRAME),
    ("s2_03_closeup", S2, "03_output_previews_embedded_closeup.png", FRAME),
    ("s2_06_chip_before", S2, "06_chipseq_before_embedding_50pct.png", FRAME),
    ("s2_07_chip_embedded", S2, "07_chipseq_embedded_50pct.png", FRAME),
    ("s2_07_chip_region", S2, "07_chipseq_embedded_50pct.png", CHIP_REGION),
    ("s2_08_macs2_stack", S2, "08_chipseq_embedded_macs2_stack_80pct.png", FRAME),
    ("s2_09_atac_before", S2, "09_atacseq_before_embedding_50pct.png", FRAME),
    ("s2_10_atac_embedded", S2, "10_atacseq_embedded_50pct.png", FRAME),
    ("s2_13_running_top", S2, "13_running_embedded_closeup_90pct.png", FRAME_TOP),
    ("s2_14_finished_top", S2, "14_running_finished_closeup_90pct.png", FRAME_TOP),
    ("s3_02_editor", S3, "02_editor_star_output_previews_a.png", EDITOR),
    ("s3_03_tooltip", S3, "03_editor_star_tooltip_hovered.png", (580, 350, 905, 460)),
    ("s3_06_closeup", S3, "06_output_previews_a_embedded_closeup.png", FRAME),
    ("s3_09_image_150", S3, "09_output_previews_b_copy_image_150pct.png", FRAME),
    ("s3_11_chip_region", S3, "11_chipseq_typical_embedded_50pct.png", CHIP_REGION),
    ("s3_12_macs2_stack", S3, "12_chipseq_typical_embedded_80pct.png", FRAME),
    ("s3_13_atac", S3, "13_atacseq_typical_embedded_50pct.png", FRAME),
    ("s3_16_running_top", S3, "16_running_embedded_closeup_90pct.png", FRAME_TOP),
    ("s3_17_finished_top", S3, "17_running_finished_closeup_90pct.png", FRAME_TOP),
    ("s3_18_stage2_closeup", S3, "18_stage2_output_previews_embedded_closeup_live.png", FRAME),
    ("spike_07_down", SPIKE, "07_embed_down.png", SPIKE_FRAME),
    ("spike_08_preferred_right", SPIKE, "08_embed_right_preferred_outputs.png", SPIKE_FRAME),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, src_dir, fname, box in CROPS:
        im = Image.open(os.path.join(src_dir, fname)).convert("RGB")
        crop = im.crop(box)
        path = os.path.join(OUT, f"{name}.png")
        crop.save(path, optimize=True)
        print(f"{name}.png {crop.size[0]}x{crop.size[1]}")


if __name__ == "__main__":
    main()

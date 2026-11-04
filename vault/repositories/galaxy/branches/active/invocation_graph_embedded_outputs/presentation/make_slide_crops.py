"""Crop the deck-polish captures for the invocation-graph outputs deck.

The frames are the deck-polish recapture (see capture_debrief.md), copied into
../screenshots/presentation/frames/ (gitignored), plus the spike's frames. Every
1280x1000 invocation frame has the same panels, so one box cuts the invocation
header and graph canvas out of each of them and the flip pairs keep lining up.
The fit views are 1600x1000, so their canvas is wider (P7). The crops drop
Galaxy's activity bar, masthead and history panel.

Needs Pillow; run it with any Python that has it, for example the stage 3
worktree's virtualenv:

    ~/projects/worktrees/galaxy/branch/invocation_graph_embedded_outputs/.venv/bin/python \
        make_slide_crops.py

Writes to ../screenshots/presentation/slides/ (gitignored).
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HERE, "..", "screenshots", "presentation", "frames")
SPIKE = os.path.normpath(
    os.path.join(HERE, "..", "..", "..", "..", "..", "..", "projects", "invocation_graph_embedded_outputs", "screenshots")
)
OUT = os.path.join(HERE, "..", "screenshots", "presentation", "slides")

# Invocation header bar (y 56) to the bottom of the graph canvas (y 913), canvas x 105..963.
FRAME = (105, 56, 964, 914)
# The same in a 1600px-wide window: the canvas runs to x 1284.
FRAME_WIDE = (105, 56, 1285, 914)
# The band of the running close-ups holding head_cat, summary and final (for side-by-side pairs).
RUN_BAND = (105, 380, 964, 700)
# The ChIP-seq middle region around Bowtie2, filter MAPQ30 and Call Peaks (stage 2 vs 3).
CHIP_REGION = (105, 260, 800, 700)
# The workflow editor's graph, with the Attributes panel closed.
EDITOR = (180, 262, 1190, 812)
# Spike frames are 1600x1000; their invocation header and canvas.
SPIKE_FRAME = (405, 56, 1284, 824)

CROPS = [
    # name, source dir, file, box
    ("s1_01_default", FRAMES, "s1_default.png", FRAME),
    ("s1_02_hover_table", FRAMES, "s1_hover_table.png", FRAME),
    ("s1_03_hover_image_pop", FRAMES, "s1_hover_image.png", (330, 300, 1050, 640)),
    ("s1_04_hover_collection_pop", FRAMES, "s1_hover_collection.png", (330, 480, 880, 712)),
    ("s1_05_hover_multiple_pop", FRAMES, "s1_hover_multiple.png", (550, 555, 1000, 705)),
    ("s2_chip_fit_before", FRAMES, "s2_chip_fit_before.png", FRAME_WIDE),
    ("s2_chip_fit_embedded", FRAMES, "s2_chip_fit_embedded.png", FRAME_WIDE),
    ("s2_chip_fit_restored", FRAMES, "s2_chip_fit_restored.png", FRAME_WIDE),
    ("s3_chip_fit_embedded", FRAMES, "s3_chip_fit_embedded.png", FRAME_WIDE),
    ("s2_chip50_before", FRAMES, "s2_chip50_before_zoomed.png", FRAME),
    ("s2_chip50", FRAMES, "s2_chip50_zoomed.png", FRAME),
    ("s2_chip50_region", FRAMES, "s2_chip50_zoomed.png", CHIP_REGION),
    ("s3_chip50_region", FRAMES, "s3_chip50_zoomed.png", CHIP_REGION),
    ("s2_chip80", FRAMES, "s2_chip80_zoomed.png", FRAME),
    ("s3_chip80", FRAMES, "s3_chip80_zoomed.png", FRAME),
    ("s2_atac50_before", FRAMES, "s2_atac50_before_zoomed.png", FRAME),
    ("s2_atac50", FRAMES, "s2_atac50_zoomed.png", FRAME),
    ("s3_atac50", FRAMES, "s3_atac50_zoomed.png", FRAME),
    ("s2_op_close", FRAMES, "s2_op_close_zoomed.png", FRAME),
    ("s3_op_a_close", FRAMES, "s3_op_a_close_zoomed.png", FRAME),
    ("s3_op_b_img", FRAMES, "s3_op_b_img_zoomed.png", FRAME),
    ("s3_op_clicked", FRAMES, "s3_op_fit_clicked.png", (105, 222, 1285, 984)),
    ("s2_run_top", FRAMES, "s2_run_zoomed.png", RUN_BAND),
    ("s2_done_top", FRAMES, "s2_run_finished.png", RUN_BAND),
    ("s3_run_top", FRAMES, "s3_run_zoomed.png", RUN_BAND),
    ("s3_done_top", FRAMES, "s3_run_finished.png", RUN_BAND),
    ("s3_editor", FRAMES, "s3_editor_star.png", EDITOR),
    ("s3_tooltip", FRAMES, "s3_editor_star_tooltip.png", (280, 505, 700, 610)),
    ("spike_07_down", SPIKE, "07_embed_down.png", SPIKE_FRAME),
    ("spike_08_preferred_right", SPIKE, "08_embed_right_preferred_outputs.png", SPIKE_FRAME),
]


# Guide lines drawn on the ChIP-seq region crops (P9): filter MAPQ30's authored left edge, which stage 3 keeps,
# at x 333 on screen in both frames (crop x 228); stage 2 pushes it to 358 (crop x 253).
GUIDES = {"s2_chip50_region": 228, "s3_chip50_region": 228}


def draw_guide(crop, x):
    draw = ImageDraw.Draw(crop)
    for y in range(0, crop.size[1], 12):
        draw.line([(x, y), (x, min(y + 7, crop.size[1]))], fill=(214, 110, 20), width=3)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, src_dir, fname, box in CROPS:
        im = Image.open(os.path.join(src_dir, fname)).convert("RGB")
        crop = im.crop(box)
        if name in GUIDES:
            draw_guide(crop, GUIDES[name])
        path = os.path.join(OUT, f"{name}.png")
        crop.save(path, optimize=True)
        print(f"{name}.png {crop.size[0]}x{crop.size[1]}")


if __name__ == "__main__":
    main()

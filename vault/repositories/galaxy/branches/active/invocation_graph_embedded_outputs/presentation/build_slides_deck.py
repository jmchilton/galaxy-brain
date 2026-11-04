"""Generate Slides-type deck files for the invocation-graph outputs deck.

Adapted from compare_runs/presentation/build_slides_deck.py. The source of the
text is slides.md next to this file; speaker notes here omit its [Sources] lines.

Images are the crops from make_slide_crops.py, uploaded to the artifact as
assets; IMG maps each crop to its /_blob/ url. Run with DECK_ROOT set to a
scratch folder (default: ./deck), then publish DECK_ROOT/project/deck.json and
DECK_ROOT/project/slides/*.html to the artifact with publish_files, mode patch.

Published deck: https://claude.ai/artifact/MkMtfLBNXquaSYhGfXyxMz
(slug a804a131-a8d0-4c9a-9288-6e4f422b5c9d).
"""
import html
import json
import os
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("DECK_ROOT", os.path.join(HERE, "deck"))
SLIDES = os.path.join(ROOT, "project", "slides")
os.makedirs(SLIDES, exist_ok=True)

DARK = "#1f2a3d"
LIGHT = "#f7f6f2"
BG2 = "#ebe9e3"
BLUE = "#25537b"
MUTED = "#4a5363"
YELLOW = "#f2c94c"
RULE = "#cfccc3"
CARD_BG = "#fdfcf9"
GRAD = "linear-gradient(135deg, #2c3143 0%, #25537b 100%)"
SERIF = "'Source Serif 4', Georgia, serif"
SANS = "'IBM Plex Sans', Arial, sans-serif"
MONO = "'IBM Plex Mono', 'Courier New', monospace"

# Uploaded crops (make_slide_crops.py), name -> asset url.
IMG = {
    "s1_01": "/_blob/d37d2fbc23f3b4eeec69df39314c2017",
    "s1_02": "/_blob/df010696e070bb3f3c839cce0936af0d",
    "s1_03pop": "/_blob/d0119c38ab6c1362cf07041fb52952f2",
    "s1_04pop": "/_blob/416b93d23ee23fb8d8552e9004835b77",
    "s1_05pop": "/_blob/8783288e9e38d7116fb710e0cd343bed",
    "s2_01": "/_blob/e694b7ac3469180b3f13b4cad26bdeb7",
    "s2_02": "/_blob/fb8e6a4364cbde60bc81bbb098379137",
    "s2_03": "/_blob/f4e4de312821b134b6586f323bf4d776",
    "s2_06": "/_blob/a8f3bb0c3f602ee8123e977efb7eda3d",
    "s2_07": "/_blob/bae2aa80bd325b86501057b8014a67c8",
    "s2_07region": "/_blob/1031ea80077c3d8061dc86c9f9c426d8",
    "s2_08": "/_blob/dc59fc2c4e00232104611a79794adb59",
    "s2_09": "/_blob/b99790baf029f999142bc156d91fa871",
    "s2_10": "/_blob/92907dd97a1f8be301a9a15099e3e05b",
    "s2_13top": "/_blob/57cf77268e8800cee0d1c69b8474e1f0",
    "s2_14top": "/_blob/501fc17924aa27232e3c6b258ae6d113",
    "s3_02editor": "/_blob/386909e7c9dc02b2d1227fd8ab04e0f5",
    "s3_03tooltip": "/_blob/0ec5521463bf1ca792b63fea296a8683",
    "s3_06": "/_blob/a126df755ef092b62c9f2d459265a3fd",
    "s3_09": "/_blob/209084c36dcf97ed7e8f14f2a5c89064",
    "s3_11region": "/_blob/8da81f3abfec338930c682557903a524",
    "s3_12": "/_blob/84cddfeb2dfd874b6b2d377382c7a1a1",
    "s3_13": "/_blob/56dc0ecf34ab9f31eceda2a62144e7b6",
    "s3_16top": "/_blob/bfacb44a045ea4e32dfd2cc789ed4aec",
    "s3_17top": "/_blob/8d0b4282af0193652a0471f634f1b319",
    "s3_18": "/_blob/16be923c5068129291bd69a7b3ddc990",
    "spike_07": "/_blob/0511dba7041270249868565f26fd23ee",
    "spike_08": "/_blob/706593ae1160d85382daea2719050bae",
}

# Every invocation frame crop is 859x858 (header bar to canvas bottom), shown 1:1.
FRAME_W, FRAME_H = 859, 858
FLIP_PAD_Y = (1080 - FRAME_H) // 2  # 111

SECTION_LIGHT = (
    f"color:{DARK};font-family:{SANS};padding:64px 96px 56px;"
    "display:flex;flex-direction:column;gap:24px"
)
IMG_STYLE = (
    "object-fit:contain;border:1px solid " + RULE + ";border-radius:10px;"
    "box-shadow:0 12px 40px rgba(31,42,61,0.18)"
)

order = []


def esc(text):
    return html.escape(text, quote=True)


def write(slide_id, markup):
    order.append(slide_id)
    with open(os.path.join(SLIDES, f"{slide_id}.html"), "w") as f:
        f.write(markup.strip() + "\n")


def aside(notes):
    return f"<aside>{html.escape(notes, quote=False)}</aside>"


def header(eyebrow, title, subs, title_size=56):
    sub_html = "".join(
        f'<p style="font-size:30px;line-height:1.35;color:{MUTED}">{s}</p>' for s in subs
    )
    return (
        '<div style="display:flex;flex-direction:column;gap:12px">'
        f'<p style="font-size:24px;line-height:1.3;font-weight:600;letter-spacing:2px;'
        f'text-transform:uppercase;color:{BLUE}">{eyebrow}</p>'
        f'<h2 style="font-family:{SERIF};font-size:{title_size}px;font-weight:600;line-height:1.1;color:{DARK}">{title}</h2>'
        f"{sub_html}</div>"
    )


def look(text):
    return (
        f'<p style="font-size:26px;line-height:1.4;color:{MUTED}">'
        f'<b><span style="color:{BLUE}">Look for</span></b> &#160;{text}</p>'
    )


def img(key, w, h, alt):
    return f'<img src="{IMG[key]}" alt="{esc(alt)}" style="width:{w}px;height:{h}px;{IMG_STYLE}">'


def flip(slide_id, eyebrow, title, subs, key, alt, look_text, notes, w=FRAME_W, h=FRAME_H, extra=""):
    """A frame on the left at a fixed place, text on the right.

    Consecutive flip slides keep the image at exactly the same position, so a
    before/after pair swaps in place.
    """
    write(
        slide_id,
        f"""
<section id="{slide_id}" data-transition="fade" style="background:{BG2};color:{DARK};font-family:{SANS};padding:{FLIP_PAD_Y}px 96px;display:flex;flex-direction:row;align-items:start;gap:56px">
{img(key, w, h, alt)}
<div style="flex:1;height:{FRAME_H}px;display:flex;flex-direction:column;justify-content:space-between;gap:32px">
{header(eyebrow, title, subs, title_size=52)}
{extra}
{look(look_text)}
</div>
{aside(notes)}
</section>
""",
    )


LABEL = f"font-size:26px;line-height:1.3;font-weight:600;color:{BLUE}"


def figure(label, key, w, h, alt):
    return (
        '<div style="display:flex;flex-direction:column;gap:12px">'
        f'<p style="{LABEL}">{label}</p>'
        f"{img(key, w, h, alt)}</div>"
    )


def pair(slide_id, eyebrow, title, subs, figures, look_text, notes):
    figs = "".join(figure(*f) for f in figures)
    write(
        slide_id,
        f"""
<section id="{slide_id}" data-transition="fade" style="background:{BG2};{SECTION_LIGHT}">
{header(eyebrow, title, subs)}
<div style="flex:1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:48px">
{figs}
</div>
{look(look_text)}
{aside(notes)}
</section>
""",
    )


def text_slide(slide_id, eyebrow, title, subs, body, notes):
    write(
        slide_id,
        f"""
<section id="{slide_id}" data-transition="fade" style="background:{LIGHT};{SECTION_LIGHT}">
{header(eyebrow, title, subs)}
{body}
{aside(notes)}
</section>
""",
    )


def bullets(items, size=30):
    lis = "".join(f"<li>{i}</li>" for i in items)
    return (
        f'<ul style="font-size:{size}px;line-height:1.45;color:{DARK};padding:8px 0 0 36px;'
        f'display:flex;flex-direction:column;gap:18px">{lis}</ul>'
    )


S1 = "Stage 1 · Hover previews"
S2 = "Stage 2 · Embedded workflow outputs"
S2N = "Stage 2 · Nudge, never re-layout"
S3 = "Stage 3 · Preferred outputs"

# 1 cover
write(
    "cover",
    f"""
<section id="cover" data-transition="fade" style="background:{GRAD};color:{LIGHT};font-family:{SANS};padding:128px;display:flex;flex-direction:column;justify-content:center;gap:28px">
<p style="font-size:26px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{YELLOW}">Galaxy · feature preview</p>
<h1 style="font-family:{SERIF};font-size:112px;font-weight:600;line-height:1.05;color:{LIGHT}">Outputs inside the invocation graph</h1>
<p style="font-size:44px;line-height:1.3;color:#e3e8f0;width:1400px">What did each step of this run produce?</p>
<p style="font-size:30px;line-height:1.4;color:#c3cddb;width:1400px">Hover a step, embed the workflow’s outputs, and draw a step as its key output.</p>
<p style="position:absolute;left:128px;bottom:96px;width:800px;font-size:28px;font-weight:600;color:{LIGHT}">John Chilton</p>
{aside("This is about one Galaxy page, the graph of a workflow run, and making it show data instead of only state. It comes in three stages, each a branch built on the one before. I’ll walk through them on a small test workflow and on the layouts of two real IWC workflows, including a run that’s still going, and then be clear about where it stands: built and polished, but not yet submitted to Galaxy.")}
</section>
""",
)

# 2 problem
flip(
    "problem",
    "The problem",
    "A finished run, and no data in sight",
    ["The graph shows the run’s shape and each step’s state, but not one table or plot."],
    "s1_01",
    "The invocation graph for Output previews, version 1: 10 of 10 steps scheduled, 7 of 7 jobs complete. Three inputs, measurements, quality plot and two lines, feed seven tool steps: head_table, cat_table, head_cat, final, copy_image, split_text and numbers. Every tool step reads 1 job successful. Zoom 84%, with a minimap at the bottom right.",
    "the green “1 job successful” line on every tool step. It says the step ran, not what it made.",
    "This is Galaxy’s invocation graph for a finished run of a small test workflow. It shows the workflow as its author drew it, and each step’s state. To see the table head_table made, or the plot from copy_image, you leave the graph for the Outputs tab or the history and find the matching dataset there. The three stages bring those outputs into the graph.",
)

# 3 hover table (flip with 2)
flip(
    "hover-table",
    S1,
    "Hover a step to see what it made",
    ["Point at a step’s output and a popover previews it: here head_table’s <b>top_rows</b> table."],
    "s1_02",
    "The same graph with a popover titled top_rows hanging from head_table’s output: a table with columns 0, 1 and 2 and five rows (1 68 4.1, 2 71 4.6, 3 62 3.8, 4 75 4.4, 5 58 3.2) above a pager on page 1. The popover covers the final and head_cat steps.",
    "the popover’s title, top_rows, which is the workflow output’s label, and the five-row table under it. Flip back: everything else is the previous slide.",
    "Stage 1 adds one thing. Hover a step’s output and a popover previews every output the step produced. Tables, images, text and collections go through the displays Galaxy already uses in Pages and reports, so there are no new renderers. A preview loads on the first hover and stays loaded, and it reloads when the step’s state changes, so a dataset first seen mid-run doesn’t stay stale. It is client-only: no API or database change.",
)

# 4 other kinds
write(
    "hover-kinds",
    f"""
<section id="hover-kinds" data-transition="fade" style="background:{BG2};{SECTION_LIGHT}">
{header(S1, "Images, collections and several outputs", ["One popover per step, with each output labelled."])}
<div style="flex:1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:56px">
{figure("An image", "s1_03pop", 684, 474, "copy_image’s popover, titled plot: the quality boxplot, boxplot of quality scores, drawn at full size beside the copy_image step.")}
<div style="display:flex;flex-direction:column;gap:40px">
{figure("A collection", "s1_04pop", 564, 192, "split_text’s popover, titled lines: Galaxy’s collection display, Dataset Collection: lines, with download buttons and its elements 1 and 2.")}
{figure("A step with two outputs", "s1_05pop", 546, 192, "The numbers step’s popover lists two outputs: output_a with the text 3, and numbers_b with the text 4.")}
</div>
</div>
{look("the labels. plot, lines and numbers_b are workflow output labels; output_a is the tool’s own output name, because it isn’t a workflow output.")}
{aside("An image shows as the image, a collection as Galaxy’s collection display with its elements, and a step with two outputs lists both. Each output is labelled by its workflow output label, or by the tool’s output name if it has none. Hover shows one step at a time, which is the limit the next stage removes.")}
</section>
""",
)

# 5 embed off
flip(
    "embed-off",
    S2,
    "One switch: Embed Outputs",
    ["A new button under the graph. It starts off, so the default view is the author’s layout, untouched."],
    "s2_01",
    "The same Output previews graph at 84% with an Embed Outputs button beside the zoom controls at the bottom left, not pressed. The steps are where the author placed them.",
    "the Embed Outputs button beside the 84% zoom control.",
    "Hovering answers what did this step make, one step at a time. To read a whole run, its tables and plots beside the steps that made them, stage 2 adds one button. It starts off. Nothing loads until it’s on, and the workflow’s stored positions never change.",
)

# 6 embed on (flip with 5)
flip(
    "embed-on",
    S2,
    "Every workflow output, beside its step",
    ["Six cards appear: three tables, a plot, a collection and a text file. Steps shrink, and only the steps in a card’s way move right."],
    "s2_02",
    "The same run with Embed Outputs pressed, refit to 53%. Dark blue cards sit right of their steps, joined by short dashed connectors: top_rows beside head_table, plot beside copy_image, lines beside split_text, summary beside head_cat, numbers_b beside numbers and final_table beside final. The inputs and the first column of tool steps keep their places; head_cat, final and numbers moved right. The graph fills the top two thirds of the canvas.",
    "the inputs and the first tool column, which don’t move; then head_cat and final, pushed right past the top_rows card.",
    "Flip back and forth with the previous slide: the zoom changes, because the graph refits, but the shape is the same. Each labelled workflow output becomes a card pinned to the right of its step. Steps shrink to make room, then one left-to-right pass pushes each step just far enough to clear the cards. Steps keep their rows, never move up, down or left, and turning the switch off puts every step back exactly. Three of ten steps moved here, the furthest by 368 pixels.",
)

# 7 close-up
flip(
    "cards-closeup",
    S2,
    "Cards are snapshots you can read",
    ["At 100%: a table, the quality plot and a collection summary. Cards are static, so drags and zooms pass through them."],
    "s2_03",
    "A close-up of the embedded graph at 100%. head_table has a top_rows card showing the table header and two rows. copy_image has a plot card with a small boxplot. split_text has a lines card reading lines, a list with 2 data datasets, then 1 and 2. head_cat has a summary card cut off by the right edge, and numbers has a numbers_b card reading 4, partly covered by the minimap. An edge from head_table runs out from under the top_rows card toward final.",
    "the three kinds of card: table, image and collection summary. Then the edge that comes out from under top_rows: edges keep their routes and pass under cards.",
    "Up close the cards are readable. A card has a fixed size, 260 by 170 pixels, or 120 tall for a collection, and holds a static snapshot. You can’t page a table inside it, and dragging over it pans the graph. The interactive preview is still one hover away. A collection card shows a summary and its first two elements instead of loading every element: four 500-element lists went from 2.5 MB to 7 KB.",
)

# 8 ChIP before
flip(
    "chip-before",
    S2N,
    "A real layout: IWC ChIP-seq, before",
    ["The middle of a replica of IWC’s ChIP-seq paired-end layout at 50%, Embed Outputs off."],
    "s2_06",
    "The IWC ChIP-seq PE layout replica at 50%, Embed Outputs off. Bowtie2 map on reference at the left; filter MAPQ30 concordant pairs below and right of it; Call Peaks with MACS2 above; summary of MACS2 and Bigwig from MACS2 to the right of Call Peaks; MultiQC at the lower right. Long curved edges join them.",
    "where filter MAPQ30, Call Peaks with MACS2 and MultiQC sit. They move on the next slide.",
    "The test workflow is tiny, so here is a real layout. This is a replica of IWC’s ChIP-seq paired-end workflow: its real positions, labels, edges and workflow outputs, with test tools standing in for the real ones. That keeps it runnable on a laptop, but it means the outputs hold placeholder text and small test tables, not ChIP-seq results.",
)

# 9 ChIP after (flip with 8)
flip(
    "chip-after",
    S2N,
    "After: the steps past Bowtie2 move 49 pixels",
    ["Bowtie2 and everything left of it stay put. Every step after its card shifts right by the same 49 pixels."],
    "s2_07",
    "The same view with Embed Outputs on, at the same zoom and pan. Bowtie2 map on reference is in the same place, now with a mapping stats card beside it. filter MAPQ30 has a filtered BAM card; Call Peaks with MACS2 has three stacked cards, MACS2 peaks, narrowPeak and summits; summary of MACS2 has a MACS2 report card and Bigwig from MACS2 a coverage card. Most cards are white boxes holding the word test or a small test table.",
    "Bowtie2, which doesn’t move; then filter MAPQ30 and Call Peaks with MACS2, shifted right. The cards read “test”: placeholder content from the replica’s test tools.",
    "Same zoom, same pan. Bowtie2 stays put, and the steps after it move right by 49 pixels, the room its card needs. That is the rule set for this work: nudge locally and never re-run the auto-layout, because people who know a workflow carry its shape in their heads. On the five layouts measured, the test workflow and four IWC workflows, no card ends up detached from its step. The worst case, ATAC-seq, moves 21 of its 42 steps by up to 527 pixels; it’s in the extra slides.",
)

# 10 running
pair(
    "running",
    S2,
    "A running invocation fills in place",
    ["Turn it on mid-run: final_table waits with a placeholder, then fills in when its step finishes. Nothing moves."],
    [
        ("Running · 6 of 7 jobs", "s2_13top", 773, 526, "Running, at 90%: the header reads 6 of 7 jobs complete. The final step is orange with 1 job running, and its final_table card reads: This output isn’t ready yet: the step is running. The summary card beside head_cat already holds its table."),
        ("Finished · 7 of 7 jobs", "s2_14top", 773, 526, "Finished: the same page after final’s job ended. 7 of 7 jobs complete, final is green, and final_table shows its table. Every step and card is where it was."),
    ],
    "the final_table card: the not-ready message on the left, the table on the right, in the same spot.",
    "Embedding works on a run that’s still going. A workflow output’s dataset exists as soon as its step is scheduled, so the layout is placed once and doesn’t jump. A card whose step is still running says so, and fills in when the job finishes. The capture compared every step’s and card’s position before and after: nothing moved.",
)

# 11 editor star
TOOLTIP = (
    '<div style="display:flex;flex-direction:column;gap:12px">'
    f'<p style="{LABEL}">Its tooltip</p>'
    + img("s3_03tooltip", 423, 143, "The tooltip over copy_image’s star: Display this step as this output in invocation graphs with embedded outputs.")
    + "</div>"
)
flip(
    "editor-star",
    S3,
    "Star the output that matters",
    ["In the workflow editor, each tool output gets a star. One per step: the output the step is for."],
    "s3_02editor",
    "The workflow editor for Output previews (preferred a) at 100%. Each tool output row has a checkbox, a star and an eye icon. head_table’s top_rows and cat_table’s out_file1 have filled stars; every other output has an outline star. Output types read (input) because the test tools declare that format. The final step is cut off at the right edge.",
    "the two filled stars, on head_table’s top_rows and on cat_table’s out_file1. out_file1 isn’t a workflow output: its checkbox is clear.",
    "Stage 3 adds the one new piece of workflow metadata in this work. A step whose whole point is one table or plot, such as a MultiQC report, a MACS2 summary or mapping statistics, can name that output as its preferred output. The author stars it in the editor. It’s undoable and saved with the workflow, and it needn’t be a workflow output. It’s stored in an existing JSON column on the step, so there’s no database migration, and a .ga export writes it only when it’s set.",
    w=896,
    h=720,
    extra=TOOLTIP,
)

# 12 stage 2 close-up (live), flip into 13
flip(
    "stage2-recall",
    S3,
    "Stage 2: a step and its card",
    ["Back to stage 2 at 100%: head_table is a plain step, and its table sits in a separate card."],
    "s3_18",
    "Stage 2’s embedded close-up at 100%, retaken on the stage 3 server: head_table is a small step with a top_rows card beside it; cat_table is a small step below; head_cat has a summary card; copy_image has its plot card, split_text its lines card and numbers its numbers_b card.",
    "head_table and its top_rows card, two boxes for one table; and cat_table, a plain step with nothing to show.",
    "This is stage 2’s view, retaken on the same server so that the next slide lines up with it pixel for pixel. head_table exists to make its table, yet stage 2 draws two boxes for it: a step that says 1 job successful, and a card. cat_table’s output isn’t a workflow output, so stage 2 shows nothing for it at all.",
)

# 13 stage 3 close-up
flip(
    "stage3-step-as-output",
    S3,
    "Stage 3: the step is drawn as its output",
    ["head_table becomes its top_rows table, where the step and card were. cat_table shows its table too, and moves right to make room."],
    "s3_06",
    "The same view with stage 3 and the two stars. head_table is one 260-pixel-wide box with the step’s green header and checkmark, holding the top_rows table; there is no separate top_rows card. cat_table is also drawn as its table and sits further right; head_cat is pushed to the right edge. copy_image, plot, split_text, lines, numbers and numbers_b are unchanged.",
    "head_table: one box where there were two, keeping the step’s green header and checkmark. Then cat_table, pushed right.",
    "With Embed Outputs on, a starred step is drawn as that output: as wide as a card, with a static snapshot where its job-state text was. Because top_rows is also a workflow output, it gets no card of its own; the step stands in for it. The step keeps its state colour, and clicking it opens the step’s details with the interactive output. On this dense test workflow there’s a cost: cat_table grows into the next row, so it and the steps after it are pushed further than in stage 2.",
)

# 14 ChIP stage 2 vs 3
pair(
    "chip-stage3",
    S3,
    "On ChIP-seq, stage 3 pushes less",
    ["Bowtie2 drawn as its mapping stats replaces a step plus a card, so the steps after it sit further left than in stage 2."],
    [
        ("Stage 2 · step plus card", "s2_07region", 799, 506, "Stage 2 at 50%: Bowtie2 map on reference as a small step with a separate mapping stats card; filter MAPQ30 with its filtered BAM card; Call Peaks with MACS2 with three stacked cards."),
        ("Stage 3 · the step is the table", "s3_11region", 799, 506, "Stage 3 at the same zoom and pan: Bowtie2 is one wide box holding its mapping stats table, with no separate card. filter MAPQ30, filtered BAM, Call Peaks with MACS2 and its three cards sit a little further left."),
    ],
    "Bowtie2’s mapping stats, beside the step on the left and inside it on the right; then filter MAPQ30, 25 screen pixels further left.",
    "On the real IWC layouts, stage 3 is neutral or better than stage 2, because a grown step takes the place of the card beside it. On ChIP-seq, one step moves 34 pixels instead of four moving 49. dada2 doesn’t move at all, and ATAC-seq moves no further than in stage 2. Only the dense test workflow pushes more. The two frames line up exactly; the extra slides flip ATAC-seq and the MACS2 stack the same way.",
)

# 15 where it stands
CARD = (
    f"background:{CARD_BG};border:1px solid {RULE};border-radius:16px;padding:32px 36px;"
    "display:flex;flex-direction:column;gap:14px"
)
status_table = (
    f'<table style="font-family:{SANS};font-size:26px;color:{DARK}">'
    '<tr style="background:#e4e1d8"><th style="width:28%">Stage</th><th style="width:47%">What it adds</th><th style="width:25%">State</th></tr>'
    "<tr><td>1 · Hover previews</td><td>A popover on each step’s outputs. Client-only.</td><td>Polished, no PR</td></tr>"
    "<tr><td>2 · Embed Outputs</td><td>Workflow outputs as cards, nudge-only layout. Client-only.</td><td>Polished, no PR</td></tr>"
    "<tr><td>3 · Preferred outputs</td><td>A star in the editor, a new step field, steps drawn as their output.</td><td>Polished, no PR</td></tr>"
    "</table>"
)
limits_card = (
    f'<div style="{CARD}">'
    f'<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{BLUE}">Known limits</p>'
    + bullets(
        [
            "Steps are drawn as their output only with Embed Outputs on; a grown step loses its job-count line.",
            "gxformat2 doesn’t know preferred_output yet, so IWC workflows shouldn’t star outputs until it does.",
            "Edges pass under cards, and cards aren’t drawn in the minimap.",
            "Large graphs fit at the 25% minimum zoom, so their cards are thumbnails until you zoom in.",
        ],
        size=25,
    )
    + "</div>"
)
ask = (
    f'<div style="background:{DARK};border-radius:16px;padding:28px 36px;display:flex;flex-direction:row;gap:28px;align-items:center">'
    f'<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{YELLOW}">Ask</p>'
    f'<p style="font-size:28px;line-height:1.4;color:{LIGHT}">Try it on a workflow you know well. Does the embedded layout still look like yours?</p>'
    "</div>"
)
text_slide(
    "status",
    "Status and limits",
    "Where it stands",
    ["Three stacked branches, all polished and waiting for a final read-through. None is a pull request yet."],
    '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start">'
    + status_table
    + limits_card
    + "</div>"
    + ask,
    "All three stages are built, hardened and polished on stacked branches, and are waiting for a final read-through. None has been opened as a pull request, so nothing is merged or released. Stages 1 and 2 are client-only. Stage 3 adds a field that becomes part of the workflow file format, so it’s the one decision that is hard to undo, and it needs a matching change in gxformat2. The demos use a test workflow and layout replicas with placeholder content; I’d like to hear how it looks on real workflows and real data.",
)

# divider
write(
    "extras",
    f"""
<section id="extras" data-transition="fade" style="background:{GRAD};color:{LIGHT};font-family:{SANS};padding:128px;display:flex;flex-direction:column;justify-content:center;gap:24px">
<p style="font-size:26px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{YELLOW}">Appendix</p>
<h2 style="font-family:{SERIF};font-size:96px;font-weight:600;line-height:1.1;color:{LIGHT}">Extra slides</h2>
<p style="font-size:32px;line-height:1.4;color:#c3cddb">For questions: the dense ATAC-seq layout, the MACS2 stack, stage 3 mid-run, the spike, the measurements and the new field.</p>
{aside("Supporting material for questions; not part of the main talk.")}
</section>
""",
)

flip(
    "e1-atac-before",
    "Extra · Stage 2",
    "ATAC-seq, the dense case: before",
    ["The upper left of a 42-step IWC ATAC-seq layout replica at 50%, Embed Outputs off."],
    "s2_09",
    "The IWC ATAC-seq layout replica at 50%, Embed Outputs off: dozens of steps joined by many crossing edges. Bowtie2 map on reference at the left, filter MAPQ30 and remove PCR duplicates above, Call Peak with MACS2 at the top right, Compute fragment length histogram and remove comments lines in the middle, ATACseqQC TSSE and Take TSSE score lower down.",
    "remove PCR duplicates, Compute fragment length histogram and remove comments lines. All three change on the next two slides.",
    "ATAC-seq is the hardest layout measured: 42 steps, 14 workflow outputs, and an author who stacked some downstream steps below and to the left. The whole graph doesn’t fit even at the 25% minimum zoom, so these frames show a region.",
)
flip(
    "e2-atac-stage2",
    "Extra · Stage 2",
    "ATAC-seq with stage 2",
    ["Cards beside Bowtie2, the duplicate removal step and the fragment histogram. Downstream steps shift right; the left column stays."],
    "s2_10",
    "The same view with stage 2’s Embed Outputs on: a mapping stats card beside Bowtie2, MarkDuplicates metrics and BAM filtered rmDup cards stacked beside remove PCR duplicates, a histogram of fragment length card beside Compute fragment length histogram, and a TSS Enrichment Score card at the bottom. Call Peak with MACS2 moved to the right edge. Many edges pass under the cards.",
    "the left column, unmoved; Call Peak with MACS2, pushed to the right edge; and the edges running under the cards.",
    "Live, 21 of the 42 steps move, the furthest by 527 pixels. The layout stays recognizable, but this is where it gets busy: the original edges keep their routes, so several run under the opaque cards.",
)
flip(
    "e3-atac-stage3",
    "Extra · Stage 3",
    "ATAC-seq with stage 3",
    ["The fragment length histogram step is drawn as its output, and remove comments lines sits 164 pixels left of where stage 2 put it."],
    "s3_13",
    "The same view with stage 3: Compute fragment length histogram is one wide box whose body holds only the word test, with no separate histogram card; remove comments lines sits right next to it, further left than on the previous slide. The rest matches stage 2.",
    "Compute fragment length histogram, now one box. It shows “test” because the replica’s tool writes placeholder text, not a histogram.",
    "The histogram card is gone, so remove comments lines has 164 pixels more room. In the real workflow this step makes a PNG histogram, which is exactly the kind of output the star is for. Here the replica’s test tool writes the word test, so the box is mostly empty.",
)
flip(
    "e4-macs2-stage2",
    "Extra · Stage 2",
    "The MACS2 stack, stage 2",
    ["Call Peaks with MACS2 has three outputs, so three cards stack beside it."],
    "s2_08",
    "ChIP-seq PE at 80% with stage 2: Call Peaks with MACS2 with three stacked cards, MACS2 peaks, narrowPeak and summits, joined by dashed connectors; summary of MACS2 with a MACS2 report card above; Bigwig from MACS2 with a coverage from MACS2 card to the right; MultiQC at the bottom, its card cut off by the minimap.",
    "the three stacked cards and their dashed connectors, then summary of MACS2 and its MACS2 report card.",
    "Several outputs of one step stack downwards beside it. At 80% the cards are legible, but on the replica they hold test and single-column test tables, so most of each card is white.",
)
flip(
    "e5-macs2-stage3",
    "Extra · Stage 3",
    "The MACS2 stack, stage 3",
    ["summary of MACS2 is drawn as its report; Call Peaks and Bigwig sit about 40 pixels left of their stage 2 places."],
    "s3_12",
    "The same view with stage 3: summary of MACS2 is one wide box holding its report, the word test, with no separate MACS2 report card. Call Peaks with MACS2, its three cards and Bigwig from MACS2 sit a little further left than on the previous slide. MultiQC at the bottom is drawn as its output too.",
    "summary of MACS2, now one box; then Call Peaks with MACS2, shifted left.",
    "Same zoom and pan as the previous slide. The three MACS2 output cards are unchanged, because Call Peaks has no preferred output here; summary of MACS2 does.",
)
pair(
    "e6-running-stage3",
    "Extra · Stage 3",
    "Stage 3 on a running invocation",
    ["The starred final step grows once it’s scheduled, says it isn’t ready, then fills in place."],
    [
        ("Running · 6 of 7 jobs", "s3_16top", 773, 526, "Running, at 90%: final is drawn grown, with an orange header and the message This output isn’t ready yet: the step is running inside it; 6 of 7 jobs complete."),
        ("Finished · 7 of 7 jobs", "s3_17top", 773, 526, "Finished: final has a green header and its table inside it; 7 of 7 jobs complete. Nothing moved."),
    ],
    "the final step: the not-ready message inside it, then its table in the same box. There’s no separate final_table card.",
    "A starred step grows once, when it’s scheduled and its output exists. Until the job finishes it shows the not-ready message inside itself; its size doesn’t change when the table arrives, so nothing moves.",
)
flip(
    "e7-plot-150",
    "Extra · Stage 3",
    "A plot drawn in its step, at 150%",
    ["copy_image starred: its plot is readable, title and axes included."],
    "s3_09",
    "copy_image drawn as its plot at 150%: the green step header 7: copy_image with a checkmark above the boxplot of quality scores. The plot fills about two thirds of the box’s width.",
    "the plot title and axis labels; and the white space to the plot’s right.",
    "This is the second test scenario, where cat_table and copy_image are starred. At 150% the plot reads well. It doesn’t stretch to the box’s width, which leaves a white margin on the right.",
)
pair(
    "e8-spike",
    "Extra · History",
    "What the spike tried",
    ["The first prototype could push down as well as right, and re-ran its push until nothing overlapped."],
    [
        ("Spike · push down", "spike_07", 633, 553, "The spike pushing down: the Output previews workflow becomes a tall column, with the plot, lines and numbers_b cards strung down the canvas below their steps."),
        ("Spike · push right, preferred outputs", "spike_08", 633, 553, "The spike pushing right with preferred outputs: head_table and cat_table grown, and copy_image pushed far to the right edge of the graph, away from its column."),
    ],
    "the tall column on the left, and copy_image stranded at the right edge on the right.",
    "The spike showed why the rules are what they are. Pushing down turned a left-to-right workflow into a tall column, so down mode was dropped. Its push loop cascaded: on one IWC layout it moved steps up to 4467 pixels. Stage 2 replaced it with a single left-to-right pass over fixed constraints, and pins each card to its step.",
)

measure_table = (
    f'<table style="font-family:{SANS};font-size:28px;color:{DARK};width:1728px;font-variant-numeric:tabular-nums">'
    '<tr style="background:#e4e1d8"><th style="width:34%">Workflow</th><th style="width:10%">Steps</th>'
    '<th style="width:20%">Stage 2: moved · largest</th><th style="width:20%">Stage 3: moved · largest</th><th style="width:16%">Fit zoom, stage 2</th></tr>'
    "<tr><td>Output previews (test), live</td><td>10</td><td>3 · 368</td><td>4 · 648</td><td>84% → 53%</td></tr>"
    "<tr><td>IWC ChIP-seq PE, live</td><td>12</td><td>4 · 49</td><td>1 · 34</td><td>36% → 33%</td></tr>"
    "<tr><td>IWC CUT&amp;RUN, offline</td><td>15</td><td>5 · 603</td><td>5 · 767</td><td>41% → 29%</td></tr>"
    "<tr><td>IWC dada2 paired, offline</td><td>19</td><td>0 · 0</td><td>0 · 0</td><td>31% → 28%</td></tr>"
    "<tr><td>IWC ATAC-seq, live</td><td>42</td><td>21 · 527</td><td>21 · 527</td><td>25% → 25%</td></tr>"
    "</table>"
)
text_slide(
    "e9-measurements",
    "Extra · Measurements",
    "Measured on five layouts",
    ["Moves in workflow pixels. No scenario creates an overlap, and no step moves up, down or left."],
    measure_table,
    "Stage 3 here is the typical choice of two or three starred steps per workflow: reports, tables and images you’d want to see in place of the step. On the IWC layouts it’s neutral or better than stage 2, except one step on CUT&RUN offline. The test workflow is the outlier because its steps sit 110 to 120 pixels apart in one column.",
)
text_slide(
    "e10-nudge",
    "Extra · Design",
    "How the nudge works",
    ["Positions are computed, never stored, so turning it off restores the author’s layout."],
    bullets(
        [
            "Steps shrink to 9rem, and cards are a fixed 260×170 (collections 260×120), so the layout doesn’t wait for data.",
            "Steps never change rows, so each rule is a lower bound on a step’s x against a step placed before it, and one sorted left-to-right pass satisfies them all.",
            "It runs at most once per animation frame: turning on Embed Outputs on ATAC-seq went from 43 layout runs to 2. Polling a running invocation causes none.",
            "A grown step tells the layout what size it grew from, so the gap the author left is kept; a step that grows into another row keeps the full gap.",
            "A 20,000-layout fuzz found no overlaps and no leftward or vertical moves.",
        ],
        size=28,
    ),
    "This is why the layout can’t run away the way the spike’s did, and why toggling off restores the author’s layout exactly.",
)
text_slide(
    "e11-field",
    "Extra · Design",
    "The preferred_output field",
    ["The one change that becomes part of the workflow format."],
    bullets(
        [
            "Stored in the step’s existing <b>config</b> JSON column: no migration, and no extra SQL to read it.",
            "The editor dict always carries it; a .ga export writes it only when set, so existing exports are byte-for-byte unchanged.",
            "Tool steps only. Import and update reject a non-string, or a name on a non-tool step. A stale name after a tool upgrade just draws the step as usual.",
            "Each workflow version keeps its own value; the graph uses the invoked version.",
            "gxformat2 has no such field yet: Format 2 drops it, and its strict schema rejects a .ga that has it. That’s a gxformat2 follow-up.",
        ],
        size=28,
    ),
    "This is the one change that’s hard to undo: once workflows are saved with the key, Galaxy has to keep reading it, and gxformat2 has to match its name and meaning.",
)
text_slide(
    "e12-questions",
    "Extra · Open questions",
    "Open questions",
    ["Decisions still open on the branches."],
    bullets(
        [
            "<b>How to ship it:</b> three stacked PRs, or the backend and star on dev first; and whether stage 3’s four leading test and refactor commits move down into stage 2.",
            "<b>Dense columns:</b> on the test workflow a grown cat_table is pushed 444 pixels further than in stage 2. Easing that means changing stage 2’s grew-into-a-row rule.",
            "<b>Subworkflow steps</b> can’t name a preferred output; that would need a second preview path.",
            "<b>Mapped-over steps whose jobs are all pending</b> already read as ok on dev, so their cards can load early. Dropped for now.",
        ],
        size=28,
    ),
    "None of these blocks a demo. The first is about review, not what users see.",
)

deck = {
    "v": 4,
    "createdOnFiles": {"v": 1, "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
    "lists": "css",
    "title": "Outputs inside the invocation graph",
    "order": order,
    "sections": {
        "s1": {"description": "The problem: a run's graph shows state, not data", "start": "cover"},
        "s2": {"description": "Stage 1: hover a step to preview its outputs", "start": "hover-table"},
        "s3": {"description": "Stage 2: embed workflow outputs beside their steps, nudging right only", "start": "embed-off"},
        "s4": {"description": "Stage 3: star a preferred output and draw the step as it", "start": "editor-star"},
        "s5": {"description": "Status, limits and the ask", "start": "status"},
        "s6": {"description": "Extra slides for questions", "start": "extras"},
    },
    "cover": "cover",
    "faces": {
        "source-serif-4": {"family": "Source Serif 4", "href": "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400..700&display=swap"},
        "ibm-plex-sans": {"family": "IBM Plex Sans", "href": "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap"},
        "ibm-plex-mono": {"family": "IBM Plex Mono", "href": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap"},
    },
    "designSystems": [],
}
with open(os.path.join(ROOT, "project", "deck.json"), "w") as f:
    json.dump(deck, f, ensure_ascii=False, indent=1)
print(len(order), order)

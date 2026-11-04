"""Generate the invocation-graph outputs deck: the Slides-type files and slides.md.

One definition per slide (below) produces both the artifact's slide files and
slides.md, so the two can't drift. Speaker notes in the artifact omit the
[Sources] lines that slides.md keeps.

Images are the crops from make_slide_crops.py, uploaded to the artifact as
assets; deck_assets.json maps each crop to its /_blob/ url. Run with DECK_ROOT
set to a scratch folder (default: ./deck), then publish
DECK_ROOT/project/deck.json and DECK_ROOT/project/slides/*.html to the artifact
with publish_files, mode patch. slides.md is written next to this file.

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

# Uploaded crops (make_slide_crops.py), name -> asset url, written after upload_asset.
IMG = json.load(open(os.path.join(HERE, "deck_assets.json")))

# Crop sizes (make_slide_crops.py)
FRAME = (859, 858)
WIDE = (1180, 858)

SECTION_LIGHT = f"color:{DARK};font-family:{SANS};padding:64px 96px 56px;display:flex;flex-direction:column;gap:24px"
# the same, clear of a pinned footer at bottom 36px
SECTION_FOOT = f"color:{DARK};font-family:{SANS};padding:56px 96px 92px;display:flex;flex-direction:column;gap:20px"
IMG_STYLE = f"object-fit:contain;border:1px solid {RULE};border-radius:10px;box-shadow:0 12px 40px rgba(31,42,61,0.18)"
LABEL = f"font-size:26px;line-height:1.3;font-weight:600;color:{BLUE}"
REPLICA = "IWC layout replica: real positions, labels, edges and workflow outputs; prepared demo files stand in for tool results."
TESTWF = "Demo workflow: the E2E test workflow’s layout and outputs, with prepared demo files."

order = []
md = []


def esc(text):
    return html.escape(text, quote=True)


def write(slide_id, markup):
    order.append(slide_id)
    with open(os.path.join(SLIDES, f"{slide_id}.html"), "w") as f:
        f.write(markup.strip() + "\n")


def aside(notes):
    return f"<aside>{html.escape(notes, quote=False)}</aside>"


def header(eyebrow, title, subs, title_size=56):
    sub_html = "".join(f'<p style="font-size:30px;line-height:1.35;color:{MUTED}">{s}</p>' for s in subs)
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


def footer(text):
    if not text:
        return ""
    return (
        f'<p style="position:absolute;left:96px;bottom:36px;width:1728px;font-size:24px;line-height:1.3;color:{MUTED}">'
        f"{text}</p>"
    )


def img(key, w, h, alt):
    return f'<img src="{IMG[key]}" alt="{esc(alt)}" style="width:{w}px;height:{h}px;{IMG_STYLE}">'


def figure(label, key, w, h, alt, caption=""):
    cap = f'<p style="font-size:24px;line-height:1.3;color:{MUTED}">{caption}</p>' if caption else ""
    return (
        '<div style="display:flex;flex-direction:column;gap:12px">'
        f'<p style="{LABEL}">{label}</p>'
        f"{img(key, w, h, alt)}{cap}</div>"
    )


def plain(text):
    """Slide markup to slides.md text"""
    text = text.replace("<b>", "**").replace("</b>", "**").replace("<i>", "*").replace("</i>", "*")
    return html.unescape(text)


def md_slide(number, title, eyebrow, subs, images, look_text, notes, sources, extra_md=""):
    lines = [f"## {number}. {plain(title)}", ""]
    if eyebrow:
        lines += [f"*{eyebrow}.* " + " ".join(plain(s) for s in subs), ""]
    for key, alt in images:
        lines += [f"![{alt}](../screenshots/presentation/slides/{key}.png)", ""]
    if extra_md:
        lines += [extra_md, ""]
    if look_text:
        lines += [f"**Focus:** {plain(look_text)}", ""]
    lines += [f"> Notes: {notes}", ">", f"> [Sources] {sources}", "", "---", ""]
    md.append("\n".join(lines))


def flip(n, slide_id, eyebrow, title, subs, key, size, alt, look_text, notes, sources, foot="", extra="", extra_md=""):
    """A frame on the left at a fixed place, text on the right; consecutive flips of one size swap in place."""
    w, h = size
    pad_y = (1080 - h) // 2
    write(
        slide_id,
        f"""
<section id="{slide_id}" data-transition="fade" style="background:{BG2};color:{DARK};font-family:{SANS};padding:{pad_y}px 96px;display:flex;flex-direction:row;align-items:start;gap:48px">
{img(key, w, h, alt)}
<div style="flex:1;height:{h}px;display:flex;flex-direction:column;justify-content:space-between;gap:28px">
{header(eyebrow, title, subs, title_size=52 if w < 1000 else 44)}
{extra}
{look(look_text)}
</div>
{footer(foot)}
{aside(notes)}
</section>
""",
    )
    md_slide(n, title, eyebrow, subs, [(key, alt)], look_text, notes, sources, extra_md)


def pair(n, slide_id, eyebrow, title, subs, figures, look_text, notes, sources, foot=""):
    figs = "".join(figure(*f) for f in figures)
    write(
        slide_id,
        f"""
<section id="{slide_id}" data-transition="fade" style="background:{BG2};{SECTION_FOOT if foot else SECTION_LIGHT}">
{header(eyebrow, title, subs)}
<div style="flex:1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:48px">
{figs}
</div>
{look(look_text)}
{footer(foot)}
{aside(notes)}
</section>
""",
    )
    md_slide(n, title, eyebrow, subs, [(f[1], f[4]) for f in figures], look_text, notes, sources)


def text_slide(n, slide_id, eyebrow, title, subs, body, notes, sources, body_md):
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
    md_slide(n, title, eyebrow, subs, [], "", notes, sources, body_md)


def bullets(items, size=30):
    lis = "".join(f"<li>{i}</li>" for i in items)
    return (
        f'<ul style="font-size:{size}px;line-height:1.45;color:{DARK};padding:8px 0 0 36px;'
        f'display:flex;flex-direction:column;gap:18px">{lis}</ul>'
    )


def bullets_md(items):
    return "\n".join(f"- {plain(i)}" for i in items)


S1 = "Stage 1 · Hover previews"
S2 = "Stage 2 · Embedded workflow outputs"
S2N = "Stage 2 · Nudge, never re-layout"
S3 = "Stage 3 · Preferred outputs"
BR = "../.."  # branch records, relative to presentation/

# 1 cover
COVER_NOTES = "This is about one Galaxy page, the graph of a workflow run, and making it show data instead of only state. It comes in three stages, each a branch built on the one before. I’ll show them on the layout of a real IWC ChIP-seq workflow and on a small demo workflow, and then be clear about where it stands: built and polished, but not yet submitted to Galaxy. The workflows are layout replicas filled with prepared demo files, so nothing you see is a real tool result."
write(
    "cover",
    f"""
<section id="cover" data-transition="fade" style="background:{GRAD};color:{LIGHT};font-family:{SANS};padding:128px;display:flex;flex-direction:column;justify-content:center;gap:28px">
<p style="font-size:26px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{YELLOW}">Galaxy · feature preview</p>
<h1 style="font-family:{SERIF};font-size:112px;font-weight:600;line-height:1.05;color:{LIGHT}">Outputs inside the invocation graph</h1>
<p style="font-size:44px;line-height:1.3;color:#e3e8f0;width:1400px">What did each step of this run produce?</p>
<p style="font-size:30px;line-height:1.4;color:#c3cddb;width:1400px">Hover a step, embed the workflow’s outputs, and draw a step as its key output.</p>
<p style="position:absolute;left:128px;bottom:96px;width:800px;font-size:28px;font-weight:600;color:{LIGHT}">John Chilton</p>
{aside(COVER_NOTES)}
</section>
""",
)
md.append(
    "## 1. Outputs inside the invocation graph\n\nWhat did each step of this run produce?\n\nHover a step, embed the workflow’s outputs, and draw a step as its key output.\n\nJohn Chilton\n\n"
    f"> Notes: {COVER_NOTES}\n>\n> [Sources] Stages and status: `{BR}/invocation_graph_output_previews/index.md`, `{BR}/invocation_graph_embedded_workflow_outputs/index.md`, `../index.md`. Standing record: `vault/agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md`. Demo content: `capture_debrief.md`.\n\n---\n"
)

flip(
    2, "problem", "The problem", "A finished run, and no data in sight",
    ["The graph of an IWC ChIP-seq run shows its shape and each step’s state, but not one table, peak or report."],
    "s2_chip_fit_before", WIDE,
    "The invocation graph of IWC ChIP-seq PE layout (demo content), version 1, fit to a 1600 pixel wide window at 50%: 12 of 12 steps scheduled, 7 of 7 jobs complete. Five inputs on the left feed Fastp, Bowtie2 map on reference, filter MAPQ30 concordant pairs, Call Peaks with MACS2, summary of MACS2, Bigwig from MACS2 and MultiQC. Every tool step reads 1 job successful.",
    "the green “1 job successful” on every tool step. It says the step ran, not what it made.",
    "This is Galaxy’s invocation graph for a finished run of the ChIP-seq paired-end workflow from IWC. It shows the workflow as its author drew it, and each step’s state. To see Bowtie2’s mapping statistics, the MACS2 peaks or the MultiQC report, you leave the graph for the Outputs tab or the history and find the matching dataset. The three stages bring those outputs into the graph. A note on the demo: this is a layout replica, with IWC’s real positions, labels, edges and workflow outputs, where every step writes a prepared demo file instead of running the real tool.",
    "Problem statement: `../../invocation_graph_output_previews/pr_description.md` (opening paragraphs); `raw.md` (\"Goal\"). Replica and demo content: `capture_debrief.md` (frame `s2_chip_fit_before.png`, Vite 5182, stage 2 client, before embedding; 1600×1000 window, P7).",
    foot=REPLICA,
)

flip(
    3, "hover-table", S1, "Hover a step to see what it made",
    ["Point at a step’s output and a popover previews it: here head_table’s <b>top_rows</b> table."],
    "s1_02_hover_table", FRAME,
    "A small demo workflow, Output previews (demo content), at 84%. The pointer is on head_table’s output terminal, and a popover titled top_rows hangs from it: a table with columns sample, reads, mapped and duplicates and five rows, S01 to S05, above a pager on page 1.",
    "the pointer on head_table’s output, and the popover’s title, top_rows, the workflow output’s label.",
    "Stage 1 adds one thing. Hover a step’s output and a popover previews every output the step produced. Tables, images, text and collections go through the displays Galaxy already uses in Pages and reports, so there are no new renderers. A preview loads on the first hover and stays loaded, and it reloads when the step’s state changes, so a dataset first seen mid-run doesn’t stay stale. It is client-only: no API or database change.",
    "Behaviour: `../../invocation_graph_output_previews/pr_description.md` (\"How it behaves\", client-only note). Re-hovering a 500-element list: no requests, about 0.5 s instead of 621 KB and 2.5 s (same file, performance check). Frame: `capture_debrief.md` (`s1_hover_table.png`, stage 1 client on Vite 5183; the pointer is drawn into the capture, P12).",
    foot=TESTWF,
)

# 4 other kinds
HK_ALTS = [
    "copy_image’s popover, titled plot: a bar chart, Reads per sample, with eight bars S01 to S08, marked synthetic demo data; the pointer is on copy_image’s output.",
    "split_text’s popover, titled lines: Galaxy’s collection display, Dataset Collection: sample sheet (list), with its elements S01 and S02.",
    "The numbers step’s popover lists two outputs: out_file1, 7 of 8 samples passed QC, and numbers_b, 1 sample failed QC: S08.",
]
HK_LOOK = "the labels. plot, lines and numbers_b are workflow output labels; out_file1 is the tool’s own output name, because it isn’t a workflow output."
HK_NOTES = "An image shows as the image, a collection as Galaxy’s collection display with its elements, and a step with two outputs lists both. Each output is labelled by its workflow output label, or by the tool’s output name if it has none. Hover shows one step at a time, which is the limit the next stage removes."
write(
    "hover-kinds",
    f"""
<section id="hover-kinds" data-transition="fade" style="background:{BG2};{SECTION_FOOT}">
{header(S1, "Images, collections and several outputs", ["One popover per step, with each output labelled."])}
<div style="flex:1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:56px">
{figure("An image", "s1_03_hover_image_pop", 720, 340, HK_ALTS[0])}
<div style="display:flex;flex-direction:column;gap:40px">
{figure("A collection", "s1_04_hover_collection_pop", 550, 232, HK_ALTS[1])}
{figure("A step with two outputs", "s1_05_hover_multiple_pop", 450, 150, HK_ALTS[2])}
</div>
</div>
{look(HK_LOOK)}
{footer(TESTWF)}
{aside(HK_NOTES)}
</section>
""",
)
md_slide(
    4, "Images, collections and several outputs", S1, ["One popover per step, with each output labelled."],
    [("s1_03_hover_image_pop", HK_ALTS[0]), ("s1_04_hover_collection_pop", HK_ALTS[1]), ("s1_05_hover_multiple_pop", HK_ALTS[2])],
    HK_LOOK, HK_NOTES,
    "`../../invocation_graph_output_previews/pr_description.md` (\"How it behaves\": labels, one popover per step). Frames: `capture_debrief.md` (`s1_hover_image.png`, `s1_hover_collection.png`, `s1_hover_multiple.png`; crops of each popover with its step).",
)

flip(
    5, "embed-on", S2, "One switch: every workflow output, beside its step",
    ["Embed Outputs puts each labelled workflow output on the graph as a card. Steps shrink, and only steps in a card’s way move right."],
    "s2_chip_fit_embedded", WIDE,
    "The same ChIP-seq run with Embed Outputs pressed, refit. Dark blue cards sit right of their steps, joined by dashed connectors: mapping stats beside Bowtie2, filtered BAM beside filter MAPQ30, three stacked MACS2 cards (peaks, narrowPeak, summits) beside Call Peaks, MACS2 report beside summary of MACS2, coverage from MACS2 beside Bigwig, and MultiQC’s webpage and stats. The inputs and Fastp keep their places.",
    "the Embed Outputs button, pressed, beside the zoom controls; then the MACS2 peak tables and the MultiQC stats.",
    "Hovering answers what did this step make one step at a time. To read a whole run, stage 2 adds one button. It starts off, nothing loads until it’s on, and the workflow’s stored positions never change. Each labelled workflow output becomes a card pinned to the right of its step. Steps shrink, then one left-to-right pass pushes each step just far enough to clear the cards. The filtered BAM and coverage cards say No content found: that is what Galaxy shows for a binary BAM or bigWig file.",
    "Behaviour: stage 2 `pr_description.md` (opening; \"How it behaves\": Cards, Layout). Frame: `capture_debrief.md` (`s2_chip_fit_embedded.png`, stage 2 client, refit after embedding). Binary cards: the demo BAM and bigWig are `test-data/1.bam` and `test-data/1.bigwig`, and Galaxy's text preview has no content for them.",
    foot=REPLICA,
)

flip(
    6, "embed-restored", S2, "Turn it off, and the author’s layout is back",
    ["Positions are computed, never stored. Toggling off puts every step back where the author placed it."],
    "s2_chip_fit_restored", WIDE,
    "The same run after turning Embed Outputs off again: the cards are gone and every step is back at its authored place, at the same 50% fit as the first slide.",
    "flip back to the problem slide: the same picture. Every step’s position matched the author’s exactly.",
    "Flip back and forth with the previous slide, then compare this one with the problem slide. The capture recorded every step’s position after toggling off: each equals the authored position. The two frames line up at zero shift; the only differences are a few thousand antialiased pixels from the refit.",
    "Frame and check: `capture_debrief.md` (`s2_chip_fit_restored.png` against `s2_chip_fit_before.png`: positions equal; 2,106 of 1.6 million pixels differ, best match at zero shift; P8). Rule: stage 2 `pr_description.md` (\"Toggling off puts every step back\").",
    foot=REPLICA,
)

flip(
    7, "chip-before", S2N, "Up close: the middle of ChIP-seq, before",
    ["Bowtie2, filter MAPQ30, Call Peaks and their neighbours at 50%, Embed Outputs off."],
    "s2_chip50_before", FRAME,
    "The ChIP-seq replica at 50%, Embed Outputs off. Bowtie2 map on reference at the left; filter MAPQ30 concordant pairs below and to its right; Call Peaks with MACS2 above that; summary of MACS2 and Bigwig from MACS2 to the right of Call Peaks; MultiQC at the lower right. Long curved edges join them.",
    "where filter MAPQ30 and Call Peaks with MACS2 sit. They move on the next slide.",
    "Now up close, so the cards are readable. Bowtie2 is on the left; everything downstream is to its right.",
    "Frame: `capture_debrief.md` (`s2_chip50_before_zoomed.png`, pinned on Bowtie2; flip with the next slide).",
    foot=REPLICA,
)

flip(
    8, "chip-after", S2N, "After: the steps past Bowtie2 move 49 pixels",
    ["Bowtie2 and everything left of it stay put. Four steps after its card shift right by the same 49 pixels."],
    "s2_chip50", FRAME,
    "The same view with Embed Outputs on, same zoom and pan. Bowtie2 is in the same place, with a mapping stats card beside it showing Bowtie2’s alignment summary. filter MAPQ30 has a filtered BAM card; Call Peaks with MACS2 has three stacked cards, MACS2 peaks, narrowPeak and summits, each showing peak rows on chr1 and chr2; summary of MACS2 and Bigwig from MACS2 have their cards on the right.",
    "Bowtie2, which doesn’t move; then filter MAPQ30 and Call Peaks, shifted right; then the peak tables and the alignment summary in the cards.",
    "Same zoom, same pan. Bowtie2 stays put, and the steps after it move right by 49 pixels, the room its card needs. That is the rule for this work: nudge locally and never re-run the auto-layout, because people who know a workflow carry its shape in their heads. On the five layouts measured, no card ends up detached from its step. The worst case, ATAC-seq, moves 21 of its 42 steps by up to 527 pixels; it’s in the extra slides.",
    "The rule: `raw.md` (\"Hard requirement: no full re-layout\"); stage 2 `index.md` (Decisions, John 2026-10-20). 49 px and four steps: `capture_debrief.md` (node positions in `s2_chip50.log`: filter MAPQ30, Call Peaks, summary of MACS2 and Bigwig each 24.5 screen px right at 50%; MultiQC unmoved); matches stage 2 `earlier_drafts/1/implementation_debrief.md` (\"Layout measurements\": ChIP-seq live 4 moved, each by 49; ATAC-seq 21 moved, max 527).",
    foot=REPLICA,
)

pair(
    9, "running", S2, "A running invocation fills in place",
    ["Turn it on mid-run: final_table waits with a placeholder, then fills in when its step finishes. Nothing moves."],
    [
        ("Running · 6 of 7 jobs", "s2_run_top", 830, 309, "Running, at 90%: the header reads 6 of 7 jobs complete. The final step is orange with 1 job running, and its final_table card reads: This output isn’t ready yet: the step is running. The summary card beside head_cat already holds its table of metrics."),
        ("Finished · 7 of 7 jobs", "s2_done_top", 830, 309, "Finished: the same page after final’s job ended. 7 of 7 jobs complete, final is green, and final_table shows its table of flagged samples. Every step and card is where it was."),
    ],
    "the final_table card: the not-ready message on the left, the table on the right, in the same spot.",
    "Embedding works on a run that’s still going. A workflow output’s dataset exists as soon as its step is scheduled, so the layout is placed once and doesn’t jump. A card whose step is still running says so, and fills in when the job finishes. The capture compared every step’s and card’s position before and after: nothing moved.",
    "Stage 2 `pr_description.md` (\"Running invocations\"). Frames: `capture_debrief.md` (`s2_run_zoomed.png`, `s2_run_finished.png`: `final` waits 240 s; the driver compared bounding boxes, unchanged). Crops: the band of each frame holding head_cat, summary and final (y 380–700), side by side.",
    foot=TESTWF,
)

flip(
    10, "stage2-recall", S2, "Cards up close: snapshots you can read",
    ["At 100%: tables, a plot and a collection summary. Cards are static, so drags and zooms pass through them."],
    "s2_op_close", FRAME,
    "Stage 2’s embedded close-up of the demo workflow at 100%. head_table is a small step with a top_rows card beside it showing five rows of sample, reads, mapped and duplicates; copy_image has a plot card with a Reads per sample bar chart; split_text has a lines card summarizing the sample sheet list, S01 and S02; head_cat has a summary card of metrics; numbers has a numbers_b card under the minimap.",
    "head_table and its top_rows card: two boxes for one table. Remember the spot; it changes on the next slide.",
    "Up close the cards are readable. A card has a fixed size, 260 by 170 pixels, or 120 tall for a collection, and holds a static snapshot: tables drop their sort and page controls and tighten their rows, so a card shows five rows, and an image fills the card. You can’t page a table inside it, and dragging over it pans the graph; the interactive preview is one hover away. A white halo round each card shows that the edges it covers pass underneath. A collection card shows a summary and its first two elements instead of loading every element. Note head_table: a step that says 1 job successful, and a card beside it for its one table.",
    "Cards: stage 2 `pr_description.md` (\"How it behaves\": Cards, Static); compact tables, image sizing and halo: stage 2 `implementation_debrief.md` (deck polish). Frame: `capture_debrief.md` (`s2_op_close_zoomed.png`, stage 2 client, pinned on the table input; flips with the next slide). Collections 2.49 MB and 5.85 s to 7.4 KB and 0.41 s: stage 2 `earlier_drafts/1/implementation_debrief.md`.",
    foot=TESTWF,
)

flip(
    11, "stage3-step-as-output", S3, "Stage 3: the step is drawn as its output",
    ["Star a step’s key output and, with Embed Outputs on, the step becomes that output, labelled as its card was."],
    "s3_op_a_close", FRAME,
    "The same view with stage 3 and two starred steps. head_table is one 260-pixel-wide box with the step’s green header and checkmark, then the label top_rows, then its table; there is no separate top_rows card. cat_table is also drawn as its table, labelled out_file1, and sits further right; head_cat is pushed to the right edge. copy_image, plot, split_text, lines, numbers and numbers_b are unchanged.",
    "head_table: one box where there were two, with the step’s state in its header and the output’s label, top_rows, above the table.",
    "With Embed Outputs on, a starred step is drawn as that output: as wide as a card, with a static snapshot where its job-state text was, and the output’s label above it, the workflow output label if it has one. Because top_rows is also a workflow output, it gets no card of its own; the step stands in for it. The step keeps its state colour. On this dense demo workflow there’s a cost: cat_table grows into the next row, so it and the steps after it are pushed further than in stage 2.",
    "Stage 3 `pr_description.md` (\"How it behaves\": Graph, Dedup; the label is the deck-polish change, `implementation_debrief.md`). Frame: `capture_debrief.md` (`s3_op_a_close_zoomed.png`, stage 3 client, same invocation and pin as the previous slide). Push: `layout_measurements.md` (\"Live results\": scenario a, cat_table +444 against stage 2).",
    foot=TESTWF,
)

flip(
    12, "step-details", S3, "Click it for the full output",
    ["A grown step is still a step: clicking it opens its details below the graph, with the dataset itself."],
    "s3_op_clicked", (1180, 762),
    "The demo workflow at 1600 pixels wide after clicking head_table: the graph centres head_table, still drawn as its top_rows table, and the step details open below, on the Outputs tab, showing the out_file1 dataset, top samples, expanded: 5 lines, 4 columns, format tabular, its action icons and its rows S01 to S04.",
    "head_table, still drawn as its table above; below it, the same dataset with Galaxy’s usual actions.",
    "The snapshot on the graph is static, so a click goes to the step, as it does for any step. Its details open below the graph, and the Outputs tab lists the dataset with everything Galaxy offers for it: the full content, download, rerun and so on.",
    "Frame: `capture_debrief.md` (`s3_op_fit_clicked.png`, stage 3 client, 1600×1000; P8). Static snapshots: stage 3 `pr_description.md` (\"How it behaves\": Graph).",
    foot=TESTWF,
)

TOOLTIP = (
    '<div style="display:flex;flex-direction:column;gap:12px">'
    f'<p style="{LABEL}">Its tooltip</p>'
    + img("s3_tooltip", 504, 126, "The tooltip over copy_image’s star: Display this step as this output in invocation graphs with embedded outputs.")
    + "</div>"
)
flip(
    13, "editor-star", S3, "Star the output that matters",
    ["In the workflow editor, each tool output gets a star. One per step: the output the step is for."],
    "s3_editor", (1010, 550),
    "The workflow editor for the Output previews test workflow at 100%, with the Attributes panel closed. Each tool output row has a checkbox, a star and an eye. head_table’s top_rows (tabular) and cat_table’s out_file1 (tabular) have filled stars; every other output, such as copy_image’s plot (png), head_cat’s summary (tabular) and numbers’ two text outputs, has an outline star.",
    "the two filled stars, on head_table’s top_rows and on cat_table’s out_file1. out_file1 isn’t a workflow output: its checkbox is clear.",
    "Stage 3 adds the one new piece of workflow metadata in this work. A step whose whole point is one table or plot, such as a MultiQC report, a MACS2 summary or mapping statistics, can name that output as its preferred output. The author stars it in the editor. It’s undoable and saved with the workflow, and it needn’t be a workflow output. It’s stored in an existing JSON column on the step, so there’s no database migration, and a .ga export writes it only when it’s set. Whether the outline stars should show only on hover is an open question.",
    "Stage 3 `pr_description.md` (\"How it behaves\": Editor; \"The field: storage, serialization and versions\"). Frames: `capture_debrief.md` (`s3_editor_star.png`, `s3_editor_star_tooltip.png`: the E2E test workflow with change-datatype actions, so outputs show real formats, and an annotation, creator, license and readme, so Best Practices has nothing to flag; P6).",
    extra=TOOLTIP,
    extra_md="![The tooltip over copy_image’s star: Display this step as this output in invocation graphs with embedded outputs.](../screenshots/presentation/slides/s3_tooltip.png)",
)

pair(
    14, "chip-stage3", S3, "On ChIP-seq, stage 3 pushes less",
    ["Bowtie2 drawn as its mapping stats replaces a step plus a card, so the steps after it stay where the author put them."],
    [
        ("Stage 2 · step plus card", "s2_chip50_region", 730, 462, "Stage 2 at 50%: Bowtie2 map on reference as a small step with a separate mapping stats card; filter MAPQ30 with its filtered BAM card, starting just right of an orange dashed guide line; Call Peaks with MACS2 with three stacked cards.", "The orange line is filter MAPQ30’s authored left edge. 4 steps moved 49 px."),
        ("Stage 3 · the step is the table", "s3_chip50_region", 730, 462, "Stage 3 at the same zoom and pan: Bowtie2 is one wide box labelled mapping stats, holding its alignment summary, with no separate card. filter MAPQ30 starts on the orange dashed guide line, where the author put it; Call Peaks and its three cards sit further left than in stage 2.", "filter MAPQ30 sits on the line. 1 step moved, by 34 px."),
    ],
    "filter MAPQ30 against the orange line: right of it in stage 2, on it in stage 3.",
    "On the real IWC layouts, stage 3 is neutral or better than stage 2, because a grown step takes the place of the card beside it. On ChIP-seq, one step, summary of MACS2, moves 34 pixels, instead of four moving 49. dada2 doesn’t move at all, and ATAC-seq moves no further than in stage 2. Only the dense demo workflow pushes more. The two frames line up exactly; the extra slides flip ATAC-seq and the MACS2 stack the same way.",
    "Frames: `capture_debrief.md` (`s2_chip50_zoomed.png`, `s3_chip50_zoomed.png`, same invocation and pin; filter MAPQ30 at screen x 358 against 333; the guide is drawn at 333 by `make_slide_crops.py`, P9). Numbers: `layout_measurements.md` (\"Live results\": ChIP typical 1 moved, 34; stage 2 4 moved, 49; ATAC 21 moved, 527 in both; \"Offline results\": dada2 0); the new frames agree (summary of MACS2 17.5 screen px, so 35 workflow px, right of its authored place). Crops: x 105–800, y 260–700.",
    foot=REPLICA,
)

flip(
    15, "payoff", S3, "The same run, with its results in the graph",
    ["Bowtie2, summary of MACS2 and MultiQC starred: each is drawn as its output; every other workflow output is a card."],
    "s3_chip_fit_embedded", WIDE,
    "The ChIP-seq run from the problem slide with stage 3’s Embed Outputs on, refit to 43%. Bowtie2 is drawn as its mapping stats, summary of MACS2 as its MACS2 report and MultiQC as its webpage, beside a MultiQC stats card. The MACS2 peaks, narrowPeak and summits cards stack beside Call Peaks, and filtered BAM and coverage cards sit beside their steps.",
    "Bowtie2, summary of MACS2 and MultiQC, each one box holding its output; then compare with the problem slide.",
    "This is where it adds up: the same run as the problem slide, read from the graph. Three steps exist to make one report each, so they are drawn as those reports; every other workflow output sits beside its step; and the shape is still the author’s. Remember that these are prepared demo files on a layout replica: I’d like to see it on real runs.",
    "Frame: `capture_debrief.md` (`s3_chip_fit_embedded.png`, stage 3 client, 1600×1000; preferred outputs Bowtie2 `out_file1`, summary of MACS2 `out_file1`, MultiQC `out_file2`, the webpage, as in `layout_measurements.md`'s \"typical\" scenario).",
    foot=REPLICA,
)

# 16 where it stands
CARD = f"background:{CARD_BG};border:1px solid {RULE};border-radius:16px;padding:28px 32px;display:flex;flex-direction:column;gap:12px"
STATUS_ROWS = [
    ("1 · Hover previews", "A popover on each step’s outputs. Client-only.", "Polished, no PR"),
    ("2 · Embed Outputs", "Workflow outputs as cards, nudge-only layout. Client-only.", "Polished, revised for this deck, no PR"),
    ("3 · Preferred outputs", "A star in the editor, a new step field, steps drawn as their output.", "Polished, revised for this deck, no PR"),
]
LIMITS = [
    "Steps are drawn as their output only with Embed Outputs on; a grown step loses its job-count line.",
    "gxformat2 doesn’t know preferred_output yet, so IWC workflows shouldn’t star outputs until it does.",
    "Edges keep their routes under cards, and cards aren’t drawn in the minimap.",
    "Large graphs fit at the 25% minimum zoom, so their cards are thumbnails until you zoom in.",
]
status_table = (
    f'<table style="font-family:{SANS};font-size:25px;color:{DARK}">'
    '<tr style="background:#e4e1d8"><th style="width:28%">Stage</th><th style="width:44%">What it adds</th><th style="width:28%">State</th></tr>'
    + "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in STATUS_ROWS)
    + "</table>"
)
limits_card = (
    f'<div style="{CARD}">'
    f'<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{BLUE}">Known limits</p>'
    + bullets(LIMITS, size=24)
    + "</div>"
)
ASK_USERS = "Try it on a workflow you know well. Does the embedded layout still look like yours?"
ASK_REVIEWERS = "For reviewers: the ship order, the preferred_output name, and whether stars show only on hover."
ask = (
    f'<div style="background:{DARK};border-radius:16px;padding:24px 36px;display:flex;flex-direction:row;gap:28px;align-items:center">'
    f'<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{YELLOW}">Ask</p>'
    f'<div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:28px;line-height:1.35;color:{LIGHT}">{ASK_USERS}</p>'
    f'<p style="font-size:24px;line-height:1.35;color:#c3cddb">{ASK_REVIEWERS}</p></div>'
    "</div>"
)
STATUS_NOTES = "All three stages are built, hardened and polished on stacked branches, and stages 2 and 3 were revised after this deck’s review: compact tables, images that fill their card, a halo round each card, and a label on grown steps. They’re waiting for a final read-through. None has been opened as a pull request, so nothing is merged or released. Stages 1 and 2 are client-only. Stage 3 adds a field that becomes part of the workflow file format, so it’s the one decision that is hard to undo, and it needs a matching change in gxformat2. The demos use layout replicas with prepared demo files; I’d like to hear how it looks on real workflows and real data."
text_slide(
    16, "status", "Status and limits", "Where it stands",
    ["Three stacked branches, polished and waiting for a final read-through. None is a pull request yet."],
    '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start">' + status_table + limits_card + "</div>" + ask,
    STATUS_NOTES,
    "Status: `../../invocation_graph_output_previews/index.md`, `../../invocation_graph_embedded_workflow_outputs/index.md`, `../index.md` (Status: code changed after polish for deck polish). Limits: stage 2 `pr_description.md` (\"What it doesn't do\"), stage 3 `pr_description.md` (\"What it doesn't do\"; Risks: the one-way door is the `preferred_output` key). The reviewer ask: `deck_review.md` (P19); star visibility is P11, left for John.",
    "| Stage | What it adds | State |\n| --- | --- | --- |\n"
    + "\n".join(f"| {a} | {b} | {c} |" for a, b, c in STATUS_ROWS)
    + "\n\n**Known limits:**\n\n" + bullets_md(LIMITS) + f"\n\n**Ask:** {ASK_USERS} {ASK_REVIEWERS}",
)

# divider
write(
    "extras",
    f"""
<section id="extras" data-transition="fade" style="background:{GRAD};color:{LIGHT};font-family:{SANS};padding:128px;display:flex;flex-direction:column;justify-content:center;gap:24px">
<p style="font-size:26px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{YELLOW}">Appendix</p>
<h2 style="font-family:{SERIF};font-size:96px;font-weight:600;line-height:1.1;color:{LIGHT}">Extra slides</h2>
<p style="font-size:32px;line-height:1.4;color:#c3cddb">For questions: the dense ATAC-seq layout, the MACS2 stack, stage 3 mid-run, a plot in its step, the spike, the measurements and the new field.</p>
{aside("Supporting material for questions; not part of the main talk.")}
</section>
""",
)
md.append("# Extra Slides\n\n---\n")

flip(
    "E1", "e1-atac-before", "Extra · Stage 2", "ATAC-seq, the dense case: before",
    ["The upper left of a 42-step IWC ATAC-seq layout replica at 50%, Embed Outputs off."],
    "s2_atac50_before", FRAME,
    "The IWC ATAC-seq replica at 50%, Embed Outputs off: dozens of steps joined by many crossing edges. Bowtie2 map on reference at the left, filter MAPQ30 and remove PCR duplicates above, Call Peak with MACS2 at the top right, Compute fragment length histogram and remove comments lines in the middle.",
    "remove PCR duplicates, Compute fragment length histogram and remove comments lines. All three change on the next two slides.",
    "ATAC-seq is the hardest layout measured: 42 steps, 14 workflow outputs, and an author who stacked some downstream steps below and to the left. The whole graph doesn’t fit even at the 25% minimum zoom, so these frames show a region.",
    "Frame: `capture_debrief.md` (`s2_atac50_before_zoomed.png`, pinned on Bowtie2). `layout_measurements.md` (Q3: 7 backward edges in the authored layout).",
    foot=REPLICA,
)
flip(
    "E2", "e2-atac-stage2", "Extra · Stage 2", "ATAC-seq with stage 2",
    ["Cards beside Bowtie2, the duplicate removal step and the fragment histogram. Downstream steps shift right; the left column stays."],
    "s2_atac50", FRAME,
    "The same view with stage 2’s Embed Outputs on: a mapping stats card beside Bowtie2, MarkDuplicates metrics and BAM filtered rmDup cards stacked beside remove PCR duplicates, a histogram of fragment length card showing the fragment length plot beside Compute fragment length histogram, and more cards lower down. Call Peak with MACS2 moved right. Edges pass under the cards, ending at their halos.",
    "the left column, unmoved; the fragment length plot in its card; and the edges passing under the cards.",
    "Live, 21 of the 42 steps move, the furthest by 527 pixels. The layout stays recognizable, but this is where it gets busy: the original edges keep their routes, so several run under the opaque cards. The white halo round each card makes them read as passing underneath.",
    "Stage 2 `earlier_drafts/1/implementation_debrief.md` (\"Layout measurements\": ATAC-seq live 21 moved, max 527). Frame: `capture_debrief.md` (`s2_atac50_zoomed.png`).",
    foot=REPLICA,
)
flip(
    "E3", "e3-atac-stage3", "Extra · Stage 3", "ATAC-seq with stage 3",
    ["The fragment length histogram step is drawn as its plot, and remove comments lines sits 164 pixels left of where stage 2 put it."],
    "s3_atac50", FRAME,
    "The same view with stage 3: Compute fragment length histogram is one wide box labelled histogram of fragment length, holding the plot, with no separate card; remove comments lines sits right next to it, further left than on the previous slide. The rest matches stage 2.",
    "Compute fragment length histogram, now one box with its plot.",
    "The histogram card is gone, so remove comments lines has 164 pixels more room. In the real workflow this step makes a PNG histogram, which is exactly the kind of output the star is for; here it is a prepared demo plot.",
    "Frame: `capture_debrief.md` (`s3_atac50_zoomed.png`; remove comments lines at screen x 888 against 970, 82 px at 50%, so 164 workflow px). `layout_measurements.md` (live: remove comments lines −164).",
    foot=REPLICA,
)
flip(
    "E4", "e4-macs2-stage2", "Extra · Stage 2", "The MACS2 stack, stage 2",
    ["Call Peaks with MACS2 has three outputs, so three cards stack beside it."],
    "s2_chip80", FRAME,
    "ChIP-seq at 80% with stage 2: Call Peaks with MACS2 with three stacked cards, MACS2 peaks, narrowPeak and summits, each a table of peaks; summary of MACS2 with a MACS2 report card; Bigwig from MACS2 with a coverage card; MultiQC at the bottom.",
    "the three stacked cards and their dashed connectors, then summary of MACS2 and its MACS2 report card.",
    "Several outputs of one step stack downwards beside it. At 80% the tables are legible: the peaks file’s own header row, then coordinates on chr1 and chr2.",
    "Stage 2 `pr_description.md` (\"How it behaves\": several outputs of one step stack downwards). Frame: `capture_debrief.md` (`s2_chip80_zoomed.png`).",
    foot=REPLICA,
)
flip(
    "E5", "e5-macs2-stage3", "Extra · Stage 3", "The MACS2 stack, stage 3",
    ["summary of MACS2 is drawn as its report; Call Peaks and Bigwig sit about 40 pixels left of their stage 2 places."],
    "s3_chip80", FRAME,
    "The same view with stage 3: summary of MACS2 is one wide box labelled MACS2 report, holding the report text, with no separate card. Call Peaks with MACS2, its three cards and Bigwig from MACS2 sit further left than on the previous slide. MultiQC at the bottom is drawn as its webpage.",
    "summary of MACS2, now one box; then Call Peaks with MACS2, shifted left.",
    "Same zoom and pan as the previous slide. The three MACS2 output cards are unchanged, because Call Peaks has no preferred output here; summary of MACS2 does.",
    "Frame: `capture_debrief.md` (`s3_chip80_zoomed.png`; Call Peaks at screen x 162 against 201 and Bigwig 539 against 579, about 40 px; summary of MACS2 12 px).",
    foot=REPLICA,
)
pair(
    "E6", "e6-running-stage3", "Extra · Stage 3", "Stage 3 on a running invocation",
    ["The starred final step grows once it’s scheduled, says it isn’t ready, then fills in place."],
    [
        ("Running · 6 of 7 jobs", "s3_run_top", 830, 309, "Running, at 90%: final is drawn grown, with an orange header, the label final_table and the message This output isn’t ready yet: the step is running; 6 of 7 jobs complete."),
        ("Finished · 7 of 7 jobs", "s3_done_top", 830, 309, "Finished: final has a green header and its table of flagged samples inside it; 7 of 7 jobs complete. Nothing moved."),
    ],
    "the final step: the not-ready message inside it, then its table in the same box. There’s no separate final_table card.",
    "A starred step grows once, when it’s scheduled and its output exists. Until the job finishes it shows the not-ready message inside itself; its size doesn’t change when the table arrives, so nothing moves.",
    "Stage 3 `pr_description.md` (\"How it behaves\": Running invocations). Frames: `capture_debrief.md` (`s3_run_zoomed.png`, `s3_run_finished.png`; bounding boxes unchanged).",
    foot=TESTWF,
)
flip(
    "E7", "e7-plot-150", "Extra · Stage 3", "A plot drawn in its step, at 150%",
    ["copy_image starred: its plot fills the step’s box, title and axes readable."],
    "s3_op_b_img", FRAME,
    "copy_image drawn as its plot at 150%: the green step header 7: copy_image with a checkmark, the label plot, and the Reads per sample bar chart filling the box’s width.",
    "the plot title and axis labels; the plot now spans the box.",
    "This is the second demo scenario, where cat_table and copy_image are starred. An image snapshot is sized to the box, so a plot fills it as far as its shape allows.",
    "Frame: `capture_debrief.md` (`s3_op_b_img_zoomed.png`; scenario b in `layout_measurements.md`). Image sizing: stage 2 `implementation_debrief.md` (deck polish, P4).",
    foot=TESTWF,
)
pair(
    "E8", "e8-spike", "Extra · History", "What the spike tried",
    ["The first prototype could push down as well as right, and re-ran its push until nothing overlapped."],
    [
        ("Spike · push down", "spike_07_down", 633, 553, "The spike pushing down: the Output previews workflow becomes a tall column, with the plot, lines and numbers_b cards strung down the canvas below their steps."),
        ("Spike · push right, preferred outputs", "spike_08_preferred_right", 633, 553, "The spike pushing right with preferred outputs: head_table and cat_table grown, and copy_image pushed far to the right edge of the graph, away from its column."),
    ],
    "the tall column on the left, and copy_image stranded at the right edge on the right.",
    "The spike showed why the rules are what they are. Pushing down turned a left-to-right workflow into a tall column, so down mode was dropped. Its push loop cascaded: on one IWC layout it moved steps up to 4467 pixels. Stage 2 replaced it with a single left-to-right pass over fixed constraints, and pins each card to its step.",
    "`raw.md` (\"What the spike learned\"). Stage 2 `earlier_drafts/1/implementation_debrief.md` (decision 1; CUT&RUN up to 4467px). Spike frames: `vault/projects/invocation_graph_embedded_outputs/screenshots/` (1600×1000; crop x 405–1283, y 56–823), not retaken.",
)

MEASURE_ROWS = [
    ("Output previews (test), live", "10", "3 · 368", "4 · 648", "84% → 53%"),
    ("IWC ChIP-seq PE, live", "12", "4 · 49", "1 · 34", "36% → 33%"),
    ("IWC CUT&amp;RUN, offline", "15", "5 · 603", "5 · 767", "41% → 29%"),
    ("IWC dada2 paired, offline", "19", "0 · 0", "0 · 0", "31% → 28%"),
    ("IWC ATAC-seq, live", "42", "21 · 527", "21 · 527", "25% → 25%"),
]
measure_table = (
    f'<table style="font-family:{SANS};font-size:28px;color:{DARK};width:1728px;font-variant-numeric:tabular-nums">'
    '<tr style="background:#e4e1d8"><th style="width:34%">Workflow</th><th style="width:10%">Steps</th>'
    '<th style="width:20%">Stage 2: moved · largest</th><th style="width:20%">Stage 3: moved · largest</th><th style="width:16%">Fit zoom, stage 2</th></tr>'
    + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in MEASURE_ROWS)
    + "</table>"
)
text_slide(
    "E9", "e9-measurements", "Extra · Measurements", "Measured on five layouts",
    ["Moves in workflow pixels. No scenario creates an overlap, and no step moves up, down or left."],
    measure_table,
    "Stage 3 here is the typical choice of two or three starred steps per workflow: reports, tables and images you’d want to see in place of the step. On the IWC layouts it’s neutral or better than stage 2, except one step on CUT&RUN offline. The test workflow is the outlier because its steps sit 110 to 120 pixels apart in one column. The deck-polish changes kept every card and grown-step size, so these numbers still hold; the new frames agree on ChIP-seq and ATAC-seq.",
    "`layout_measurements.md` (\"Live results\", \"Offline results\"; scenario a for the test workflow; fit zooms measured with the history panel open). Recheck on the new frames: `capture_debrief.md`.",
    "| Workflow | Steps | Stage 2: moved · largest | Stage 3: moved · largest | Fit zoom, stage 2 |\n| --- | --- | --- | --- | --- |\n"
    + "\n".join("| " + " | ".join(html.unescape(c) for c in r) + " |" for r in MEASURE_ROWS),
)
NUDGE = [
    "Steps shrink to 9rem, and cards are a fixed 260×170 (collections 260×120), so the layout doesn’t wait for data.",
    "Steps never change rows, so each rule is a lower bound on a step’s x against a step placed before it, and one sorted left-to-right pass satisfies them all.",
    "It runs at most once per animation frame: turning on Embed Outputs on ATAC-seq went from 43 layout runs to 2. Polling a running invocation causes none.",
    "A grown step tells the layout what size it grew from, so the gap the author left is kept; a step that grows into another row keeps the full gap.",
    "A 20,000-layout fuzz found no overlaps and no leftward or vertical moves.",
]
text_slide(
    "E10", "e10-nudge", "Extra · Design", "How the nudge works",
    ["Positions are computed, never stored, so turning it off restores the author’s layout."],
    bullets(NUDGE, size=28),
    "This is why the layout can’t run away the way the spike’s did, and why toggling off restores the author’s layout exactly.",
    "Stage 2 `earlier_drafts/1/implementation_debrief.md` (decision 5; performance: 43 runs to 2; fuzz); `pr_description.md` (\"Risk Review Advice\"). Stage 3 `pr_description.md` (\"How it behaves\": Layout; `grewFrom`).",
    bullets_md(NUDGE),
)
FIELD = [
    "Stored in the step’s existing <b>config</b> JSON column: no migration, and no extra SQL to read it.",
    "The editor dict always carries it; a .ga export writes it only when set, so existing exports are byte-for-byte unchanged.",
    "Tool steps only. Import and update reject a non-string, or a name on a non-tool step. A stale name after a tool upgrade just draws the step as usual.",
    "Each workflow version keeps its own value; the graph uses the invoked version.",
    "gxformat2 has no such field yet: Format 2 drops it, and its strict schema rejects a .ga that has it. That’s a gxformat2 follow-up.",
]
text_slide(
    "E11", "e11-field", "Extra · Design", "The preferred_output field",
    ["The one change that becomes part of the workflow format."],
    bullets(FIELD, size=28),
    "This is the one change that’s hard to undo: once workflows are saved with the key, Galaxy has to keep reading it, and gxformat2 has to match its name and meaning.",
    "Stage 3 `pr_description.md` (\"The field: storage, serialization and versions\"; Risks); `index.md` (Decisions: gxformat2 is a follow-up).",
    bullets_md(FIELD),
)
QUESTIONS = [
    "<b>How to ship it:</b> three stacked PRs, or the backend and star on dev first; and whether stage 3’s leading test and refactor commits move down into stage 2.",
    "<b>Star visibility:</b> every tool output in every editor now shows an outline star. Show it only on the hovered output or the selected step, and keep filled stars?",
    "<b>Dense columns:</b> on the test workflow a grown cat_table is pushed 444 pixels further than in stage 2. Easing that means changing stage 2’s grew-into-a-row rule.",
    "<b>Subworkflow steps</b> can’t name a preferred output; that would need a second preview path.",
]
text_slide(
    "E12", "e12-questions", "Extra · Open questions", "Open questions",
    ["Decisions still open on the branches."],
    bullets(QUESTIONS, size=28),
    "None of these blocks a demo. The first is about review, the second is a design call for the editor.",
    "Stage 3 `implementation_debrief.md` (\"Open questions\"); `scope_evaluation.md`. Star visibility: `deck_review.md` (P11, left for John).",
    bullets_md(QUESTIONS),
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
        "s3": {"description": "Stage 2: embed workflow outputs beside their steps, nudging right only", "start": "embed-on"},
        "s4": {"description": "Stage 3: star a preferred output and draw the step as it", "start": "stage3-step-as-output"},
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

PREAMBLE = """# Outputs inside the invocation graph

Generated by [build_slides_deck.py](build_slides_deck.py), which also writes the published deck's slide files: edit the script, not this file.

- **Audience:** Galaxy users who run and author workflows, and the Galaxy developers who will review the three pull requests.
- **Length:** 16 main slides, about 15 minutes. Extra slides follow the divider and aren't part of the time budget.
- **Takeaway:** from the invocation graph alone you can now see what a run produced. Hover a step to preview its outputs, turn on Embed Outputs to put every workflow output beside its step without losing the author's layout, and star a step's key output so the step is drawn as that output.
- **The three stages:** each is a branch stacked on the one before. Stage 1 `invocation_graph_output_previews` (hover previews), stage 2 `invocation_graph_embedded_workflow_outputs` (Embed Outputs), stage 3 `invocation_graph_embedded_outputs` (preferred outputs; also the standing branch). All three are polished, stages 2 and 3 revised for this deck, and wait for John's final review. None has a PR.
- **Demo data:** layout replicas of two IWC workflows, ChIP-seq paired-end (12 steps) and ATAC-seq (42 steps), and a demo version of the E2E test workflow "Output previews". They keep the real positions, labels, edges and workflow outputs; every tool step runs a demo tool that copies a prepared file, synthetic but shaped like the real output (a Bowtie2 summary, MACS2 peaks, a fragment length plot, a MultiQC page). No frame shows a real tool result, and every replica slide says so in its footer. The editor frames use the E2E test workflow itself. See [capture_debrief.md](capture_debrief.md).
- **Stages on one server:** all live frames come from one Galaxy (stage 3's backend) and one invocation per workflow, viewed through each stage's own client: stage 1 on Vite 5183, stage 2 on 5182, stage 3 on 5181. Stage 2's client ignores `preferred_output`, so a stage 2 and a stage 3 frame of the same view differ only in what each stage draws.
- **Flips:** slide pairs 5→6 (and back to 2), 7→8 and 10→11, and extras E1→E2→E3 and E4→E5, use frames with the same zoom and pan, so the image swaps in place. Slide 14 puts a stage 2 and a stage 3 frame of the same view side by side, with a guide line at filter MAPQ30's authored edge.
- **Images:** links are relative to this file. Crops are in `../screenshots/presentation/slides/`, made by [make_slide_crops.py](make_slide_crops.py) from the frames in `../screenshots/presentation/frames/`. All screenshots are gitignored, so they render in Obsidian on this machine but not on GitHub.
- **Published deck:** [Outputs inside the invocation graph](https://claude.ai/artifact/MkMtfLBNXquaSYhGfXyxMz) (private Slides artifact, images uploaded). Speaker notes there omit the `[Sources]` lines kept here.

---

"""
with open(os.path.join(HERE, "slides.md"), "w") as f:
    f.write(PREAMBLE + "\n".join(md))
print(len(order), order)

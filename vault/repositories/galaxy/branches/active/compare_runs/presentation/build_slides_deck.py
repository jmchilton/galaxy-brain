"""Generate Slides-type deck files for the compare_runs client deck."""
import json
import os
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deck")
SLIDES = os.path.join(ROOT, "project", "slides")
os.makedirs(SLIDES, exist_ok=True)

DARK = "#1f2a3d"
LIGHT = "#f7f6f2"
BG2 = "#ebe9e3"
BLUE = "#25537b"
MUTED = "#4a5363"
YELLOW = "#f2c94c"
RULE = "#cfccc3"
GRAD = "linear-gradient(135deg, #2c3143 0%, #25537b 100%)"
SERIF = "'Source Serif 4', Georgia, serif"
SANS = "'IBM Plex Sans', Arial, sans-serif"
MONO = "'IBM Plex Mono', 'Courier New', monospace"

IMG = {
    "01": "/_blob/7cd4589706bb97e7eb613450a4806fe2",
    "02": "/_blob/a8cba41a0f719ad5cfc166654feaba6c",
    "03crop": "/_blob/cfd3117b7b160743cee88bd8c0404004",
    "04": "/_blob/8c0cde5cf8d8234c0abe1787edd2304c",
    "05": "/_blob/01ab1a4150406edd0f38e5e179922bd9",
    "06": "/_blob/d92a285eab6c4bea816fe9a4cfe57fdb",
    "07": "/_blob/13588bc2bb8b5cf5cf0beb71c235b178",
    "08": "/_blob/792b96bdeb1e1f169b85a0fc8c0acba9",
    "09": "/_blob/03feced751a5755deb18a2a3dace2dae",
    "10": "/_blob/4dce36d1986a64fe4cd4a23544fe3a55",
    "11crop": "/_blob/372c77a6c02b285549eec133314b8854",
    "12": "/_blob/5946aa8a98a16cc82c8f53618b68f365",
    "13crop": "/_blob/2982d83de33fbece447d97095d4e8c2b",
    "14crop": "/_blob/4c2dbb4dd7b02c76abdaf39d7fbf6e24",
    "15": "/_blob/98de97c76dbedac89bc899b0c048d477",
}

SECTION_LIGHT = (
    f"color:{DARK};font-family:{SANS};padding:64px 96px 56px;"
    "display:flex;flex-direction:column;gap:24px"
)
IMG_STYLE = (
    "object-fit:contain;border:1px solid " + RULE + ";border-radius:10px;"
    "box-shadow:0 12px 40px rgba(31,42,61,0.18)"
)

order = []


def write(slide_id, html):
    order.append(slide_id)
    with open(os.path.join(SLIDES, f"{slide_id}.html"), "w") as f:
        f.write(html.strip() + "\n")


def header(eyebrow, title, subs):
    sub_html = "".join(
        f'<p style="font-size:30px;line-height:1.35;color:{MUTED}">{s}</p>' for s in subs
    )
    return (
        '<div style="display:flex;flex-direction:column;gap:10px">'
        f'<p style="font-size:24px;line-height:1.3;font-weight:600;letter-spacing:2px;'
        f'text-transform:uppercase;color:{BLUE}">{eyebrow}</p>'
        f'<h2 style="font-family:{SERIF};font-size:56px;font-weight:600;line-height:1.1;color:{DARK}">{title}</h2>'
        f"{sub_html}</div>"
    )


def look(text):
    return (
        f'<p style="font-size:26px;line-height:1.4;color:{MUTED}">'
        f'<b><span style="color:{BLUE}">Look for</span></b> &#160;{text}</p>'
    )


def shot(slide_id, eyebrow, title, subs, img, w, h, alt, look_text, notes, transition="fade"):
    write(
        slide_id,
        f"""
<section id="{slide_id}" data-transition="{transition}" style="background:{BG2};{SECTION_LIGHT}">
{header(eyebrow, title, subs)}
<div style="flex:1;display:flex;align-items:center;justify-content:center">
<img src="{IMG[img]}" alt="{alt}" style="width:{w}px;height:{h}px;{IMG_STYLE}">
</div>
{look(look_text)}
<aside>{notes}</aside>
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
<aside>{notes}</aside>
</section>
""",
    )


def bullets(items, size=30):
    lis = "".join(f"<li>{i}</li>" for i in items)
    return (
        f'<ul style="font-size:{size}px;line-height:1.45;color:{DARK};padding:8px 0 0 36px;'
        f'display:flex;flex-direction:column;gap:18px">{lis}</ul>'
    )


# 1 cover
write(
    "cover",
    f"""
<section id="cover" data-transition="fade" style="background:{GRAD};color:{LIGHT};font-family:{SANS};padding:128px;display:flex;flex-direction:column;justify-content:center;gap:28px">
<p style="font-size:26px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{YELLOW}">Galaxy · feature preview</p>
<h1 style="font-family:{SERIF};font-size:112px;font-weight:600;line-height:1.05;color:{LIGHT}">Compare runs in Galaxy</h1>
<p style="font-size:44px;line-height:1.3;color:#e3e8f0;width:1400px">Which runs differ, and why did this output change?</p>
<p style="font-size:30px;line-height:1.4;color:#c3cddb;width:1400px">Every run of a workflow step, a workflow’s outputs, or a tool, side by side.</p>
<p style="position:absolute;left:128px;bottom:96px;width:800px;font-size:28px;font-weight:600;color:{LIGHT}">John Chilton</p>
<aside>Today’s subject is a Galaxy feature for people who run the same analysis many times: across workflow versions, across samples, across months. I’ll show it on a small, real example and then be clear about where it stands. It is built but not yet merged into Galaxy.</aside>
</section>
""",
)

# 2 problem
shot(
    "problem",
    "The question",
    "Five runs that look the same",
    ["Five runs of the same workflow. Which ones differ, and how?"],
    "06", 1728, 500,
    "Galaxy’s list of runs for the workflow Exon selection: five rows with the same history, state completed, and times 14 to 15 minutes ago. Nothing tells the runs apart. A Compare outputs button sits at the top right.",
    "five identical-looking rows: same history, same state, no version and no results.",
    "This is the list of runs Galaxy keeps for a workflow. These five runs used three versions of the workflow on two input files and produced different results, yet every row looks the same. Today, finding out which run changed what means opening the runs one at a time and clicking through to their datasets, and for a single tool Galaxy has no list of past runs at all. The button at the top right is part of the new feature; we’ll come back to it.",
)

# 3 mode 1 entry
shot(
    "step-all-runs",
    "Mode 1 · One step across versions",
    "One step, every run",
    ["Pick a step in any run and open <b>All runs</b>."],
    "01", 1152, 720,
    "A run of Exon selection, version 3, with its five-step graph. Step Keep long exons is selected and its All runs tab lists five runs from v1 to v3. The newest is tagged this run. Cells that differ from this run are highlighted yellow.",
    "the “this run” badge on the first row, then the yellow cells: different inputs and different output line counts.",
    "Click a step in any workflow run, here Keep long exons, and the new All runs tab lists every run of that step, across every version of the workflow that has it. Yellow marks what differs from the starred run, the one you’re viewing. Two rows differ because they used the RefSeq file; the bottom row used the same CCDS file and still kept 22 lines instead of 42, so something else changed. Runs are matched by the step’s label, so a step keeps its identity as the workflow is edited.",
)

# 4 why
shot(
    "why-changed",
    "Mode 1 · One step across versions",
    "Why a result changed",
    [
        "Expand the v1 run that kept 22 lines, and Galaxy names the parameter that changed.",
        "In the detail, <b>This run</b> is the expanded v1 row; <b>Run you are viewing</b> is the starred v3 run.",
    ],
    "03crop", 1728, 579,
    "The All runs table with the oldest v1 run expanded. Parameters against the run you are viewing reports 1 of 3 parameters differ and highlights With following condition: c3-c2&gt;=200 in this run against c3-c2&gt;=100 in the run you are viewing.",
    f"the yellow “With following condition” row: <span style=\"color:{BLUE}\">c3-c2&gt;=200</span> in v1 against <span style=\"color:{BLUE}\">c3-c2&gt;=100</span> in v3.",
    "Expand the v1 row that kept only 22 lines. Its detail compares its job parameters with the run we started from, and only one of three differs: the filter went from exons of at least 200 bases to at least 100. The headings are easy to misread, since This run here means the row you expanded, not the starred run, so read them as v1 and v3. That is the answer to why did this output change, found without leaving the page.",
)

# 5 two runs
shot(
    "two-runs",
    "Mode 1 · One step across versions",
    "Two runs, only the differences",
    ["Tick any two runs; <b>Compare selected</b> shows just what differs."],
    "04", 1411, 720,
    "The Runs of step Keep long exons page with two runs ticked, v3 on CCDS and v1 on RefSeq. Selected runs with Only differences on reports 3 of 5 fields differ: version, input and out_file1. Job parameters: 2 of 3 parameters differ.",
    "the yellow rows under “Selected runs” and the two yellow job-parameter rows.",
    "You don’t have to start from a particular run. Tick any two rows and compare them directly; with Only differences on, everything that matches is hidden. Here the version, the input file and the output size differ, and two of three job parameters. Use it to hold today’s run against an old one you trust.",
)

# 6 editor
shot(
    "editor",
    "Mode 1 · One step across versions",
    "One step’s runs, from the editor",
    ["While you edit a step, <b>Compare runs of this step</b> shows what it produced before."],
    "12", 1152, 720,
    "The workflow editor for Exon selection. Step 2, Keep long exons, is selected, and the step panel starts with a Compare runs of this step button above the Filter tool form.",
    "the “Compare runs of this step” button at the top of the step panel, beside the selected node.",
    "The same step comparison is there while you design the workflow. Before you touch this filter condition again, one click shows what every past version of the step produced. This answers a request on Galaxy’s issue tracker, #10039, to see a step’s outputs from previous runs in the editor.",
)

# 7 outputs
shot(
    "outputs",
    "Mode 2 · A workflow’s outputs",
    "A workflow’s outputs, across versions",
    ["<b>Compare outputs</b> puts every labelled output of every run side by side."],
    "07", 1728, 519,
    "The Compare outputs page for Exon selection. Five runs, v1 to v3, with the input exons and three output columns of line counts: long exons, top exons and exon report.",
    "the three OUT columns: v2 roughly doubles long exons; v3 halves top exons and shortens the report.",
    "Back to the run list from the start: the Compare outputs button opens this. Each row is a run and each column one of the workflow’s labelled outputs, here as line counts. You can read the workflow’s history off the table: v2 roughly doubled the long exons, and v3 halved the top exons and shortened the report while leaving long exons alone.",
)

# 8 tool entry, two-up stacked
LABEL = f"font-size:26px;line-height:1.3;font-weight:600;color:{BLUE};width:300px"
write(
    "tool-entry",
    f"""
<section id="tool-entry" data-transition="fade" style="background:{BG2};{SECTION_LIGHT}">
{header("Mode 3 · A tool across workflows", "A tool’s runs, from any job or dataset", ["<b>Other runs of this tool</b> is on every job page and every dataset’s details."])}
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:24px">
<div style="display:flex;align-items:center;gap:40px;justify-content:center">
<p style="{LABEL}">Job page</p>
<img src="{IMG['09']}" alt="The job page for a Filter job: tool Filter1, version 1.1.1, its standard output, and an Other runs of this tool link at the bottom right of the job card." style="width:1128px;height:419px;{IMG_STYLE}">
</div>
<div style="display:flex;align-items:center;gap:40px;justify-content:center">
<p style="{LABEL}">Dataset details</p>
<img src="{IMG['11crop']}" alt="The details of dataset 19: Long exons; a dashed band marks a cut, then an Other runs of this tool link beside Rerun at the bottom right." style="width:1128px;height:272px;{IMG_STYLE}">
</div>
</div>
{look("“Other runs of this tool” at the bottom right of each page.")}
<aside>Sometimes the question is about a tool rather than a workflow: how did this tool behave every time I used it? From any job’s page, or from the details of any dataset, one link opens every run of that tool. These are pages people already visit when they inspect a result, so the comparison is one click away. The dashed band in the lower image marks where the middle of the page was cut out.</aside>
</section>
""",
)

# 9 tool runs
shot(
    "tool-runs",
    "Mode 3 · A tool across workflows",
    "Every run of a tool",
    ["One table for a tool across workflows and histories, with batches and reused jobs marked."],
    "10", 1546, 720,
    "The Runs of Filter page: every submission of Filter1 across tool versions, a mapped-over batch as one row. Eight runs from three workflows, one batch badged reused, and an Include runs inside workflows switch turned on.",
    "the “reused” badge on a batch row, and the “Include runs inside workflows” switch.",
    "This is the tool-wide view, so it’s busier by design: one row per submission of the Filter tool, whichever workflow or history it came from. A batch run over a list of files is one row, and a run that reused earlier results from Galaxy’s job cache is marked reused. Switch off runs inside workflows to see only the times you ran the tool by hand, or filter by tool version after a tool upgrade.",
)

# 10 batches
shot(
    "batches",
    "Scale",
    "Batches and reused jobs",
    ["A step run over a whole collection is one row, and reused results say where they came from."],
    "13crop", 1600, 720,
    "Runs of step Keep long exons in Exon selection (batch). The first row, mapped over 2 jobs, is badged reused and expanded: its output is a list of 2 bed datasets, and a Batch of 2 jobs panel has a job pager, another reused badge and job details including Copied from Job API ID.",
    "the “reused” badges, the “Batch of 2 jobs” pager, and “Copied from Job API ID” in the job details.",
    "Real analyses run over collections of samples. A step mapped over a list stays one row, with a pager to step through its individual jobs. When Galaxy’s job cache reused earlier results instead of recomputing them, the row says so and the job details name the job it was copied from, so you can tell a fresh result from a reused one.",
)

# 11 export
shot(
    "export",
    "Take it with you",
    "A page to bookmark and export",
    ["<b>View all in a page</b> gives any comparison its own link; <b>Export</b> saves it as CSV or TSV."],
    "15", 1728, 520,
    "The full-page Runs of step Keep long exons, with the Export menu open offering CSV and TSV, above five runs with version, state, history, input file and output line counts.",
    "the open Export menu at the top right, and the State and Workflow version filters at the top left.",
    "Every comparison opens as a page of its own that you can bookmark, and its filters, by state and by workflow version, travel with the link. Each person sees only their own runs, so a link you send a colleague shows them their runs, not yours. Export saves what the table shows as CSV or TSV, for a spreadsheet, a notebook or a lab record.",
)

# 12 gaps
CARD = (
    "background:#fdfcf9;border:1px solid " + RULE + ";border-radius:16px;padding:40px;"
    "display:flex;flex-direction:column;gap:12px"
)


def card(title, body):
    return (
        f'<div style="{CARD}">'
        f'<h3 style="font-family:{SANS};font-size:34px;font-weight:600;line-height:1.2;color:{DARK}">{title}</h3>'
        f'<p style="font-size:28px;line-height:1.4;color:{MUTED}">{body}</p></div>'
    )


text_slide(
    "gaps",
    "Limits",
    "Known gaps",
    ["What it doesn’t do yet."],
    '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:28px">'
    + card("Steps inside a subworkflow", "Can’t be compared across runs yet. Their All runs tab is disabled, with a tooltip that says why.")
    + card("Unlabelled steps and outputs", "Can’t be compared, because labels are how runs are matched across versions.")
    + card("Output datasets", "Compared by their metadata, such as line counts, not by their contents.")
    + card("The tool form", "Has no “previous runs” panel yet. Start from a job or a dataset instead.")
    + "</div>",
    "Here is what it doesn’t do yet. The subworkflow case is disabled on purpose, rather than showing a table that would mislead. The practical advice is to label the steps and outputs you care about and keep those labels stable. I’d like to hear which of these gaps would get in your way.",
)

# 13 summary
table = (
    f'<table style="font-family:{SANS};font-size:30px;color:{DARK};width:1728px">'
    '<tr style="background:#e4e1d8"><th style="width:30%">Compare</th><th style="width:70%">Start from</th></tr>'
    "<tr><td>One step, across versions</td><td>All runs on a step of any workflow run · Compare runs of this step in the editor</td></tr>"
    "<tr><td>A workflow’s outputs</td><td>Compare outputs on the workflow’s list of runs</td></tr>"
    "<tr><td>A tool, across workflows</td><td>Other runs of this tool on a job page or a dataset’s details</td></tr>"
    "</table>"
)
status = (
    '<div style="display:flex;gap:28px">'
    f'<div style="flex:1;background:#fdfcf9;border:1px solid {RULE};border-radius:16px;padding:36px;display:flex;flex-direction:column;gap:10px">'
    f'<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{BLUE}">Status</p>'
    f'<p style="font-size:30px;line-height:1.4;color:{DARK}">Built and tested on a branch of Galaxy. Not yet submitted to Galaxy, not merged, not in a release.</p></div>'
    f'<div style="flex:1;background:{DARK};border-radius:16px;padding:36px;display:flex;flex-direction:column;gap:10px">'
    f'<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{YELLOW}">Ask</p>'
    f'<p style="font-size:30px;line-height:1.4;color:{LIGHT}">Tell us which comparisons you’d use, and which of the gaps matter most to your work.</p></div>'
    "</div>"
)
text_slide(
    "summary",
    "Summary",
    "Three ways in, and where it stands",
    ["Each comparison starts from a page you already use."],
    table + '<div style="flex:1"></div>' + status,
    "Three questions, each starting from a page you already use. The work is complete on a development branch, has been through three rounds of review and hardening, and has API, unit and browser tests. It hasn’t been proposed to the Galaxy project yet and will likely be split into several smaller pull requests, so a release date isn’t set. What would help most is hearing which of these you’d use, and whether gaps like subworkflow steps or a tool-form panel matter for your work.",
)

# divider
write(
    "extras",
    f"""
<section id="extras" data-transition="fade" style="background:{GRAD};color:{LIGHT};font-family:{SANS};padding:128px;display:flex;flex-direction:column;justify-content:center;gap:24px">
<p style="font-size:26px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{YELLOW}">Appendix</p>
<h2 style="font-family:{SERIF};font-size:96px;font-weight:600;line-height:1.1;color:{LIGHT}">Extra slides</h2>
<p style="font-size:32px;line-height:1.4;color:#c3cddb">Detail for questions: more views, the API, export, matching and open questions.</p>
<aside>Supporting material for questions; not part of the main talk.</aside>
</section>
""",
)

shot(
    "e1-step-page",
    "Extra · Mode 1",
    "Every run of a step, as a page",
    ["The step comparison opens full width, with nothing else on screen."],
    "02", 1728, 520,
    "The full-page Runs of step Keep long exons: five runs with versions v3, v2, v2, v1, v1, their input files, and out_file1 line counts 42, 48, 42, 26, 22.",
    "the Version column beside the out_file1 line counts: 42 and 48 under v2 and v3, against 22 and 26 under v1.",
    "View all in a page from the All runs tab opens this. The full page has no this-run marker or yellow highlights, because it isn’t tied to one run; the tab carries those. Use it when the step has many runs, or to bookmark the comparison.",
)

shot(
    "e2-transpose",
    "Extra · Mode 1",
    "Runs as columns",
    ["<b>Transpose</b> turns runs into columns, for a few runs across many fields."],
    "05", 1728, 531,
    "The same five runs transposed: runs are columns headed by relative times, and the rows are Version, State, History, input and out_file1.",
    "the out_file1 row read across: 42, 48, 42, 26, 22.",
    "Workflows with many outputs make wide tables. Transposing reads better when you compare a handful of runs across many outputs. The column headings are relative times; the Version row underneath tells the runs apart.",
)

shot(
    "e3-filters",
    "Extra · Filters",
    "Filters by version and state",
    ["Tick a workflow version to narrow the table; here, v1 only."],
    "08", 1728, 415,
    "The Runs of step Keep long exons page with State: successful selected and only v1 ticked. Two v1 rows remain, with 26 and 22 lines. The footer reads Showing 1–2 of 2, newest first, your runs only.",
    "the ticked v1 box and the two remaining v1 rows. Every demo run succeeded, so the state filter removes nothing here.",
    "Once a workflow has many runs, you want a subset: one version, or only the failures. Every demo run succeeded, so the state filter has nothing to remove here and the version filter does the work. Tool comparisons filter by tool version instead.",
)


def endpoint(path, desc):
    return (
        '<div style="display:flex;flex-direction:column;gap:4px">'
        f'<p style="font-family:{MONO};font-size:28px;line-height:1.35;color:{BLUE}">{path}</p>'
        f'<p style="font-size:26px;line-height:1.4;color:{MUTED}">{desc}</p></div>'
    )


text_slide(
    "e4-api",
    "Extra · API",
    "The API behind it",
    ["Three read-only GET endpoints, one shared table format."],
    '<div style="display:flex;flex-direction:column;gap:22px">'
    + endpoint("GET /api/workflows/{workflow_id}/step_runs?step_label=…", "Every run of one labelled step (mode 1). Optional versions, 0-based and repeated for several.")
    + endpoint("GET /api/workflows/{workflow_id}/output_runs", "Labelled inputs and outputs of every run (mode 2). Optional output_labels and versions.")
    + endpoint("GET /api/tool_runs?tool_id=…", "Every submission of a tool, across versions (mode 3). Optional tool_versions, history_id and include_workflow_jobs (on by default).")
    + endpoint("All three", "limit (default 25), offset, sort_by and sort_desc (newest first), states and metadata_elements. The total comes back in a total_matches header.")
    + endpoint("/comparisons?kind=step_runs|output_runs|tool_runs&amp;…", "The page takes the same keys, so every entry point links to a pre-filled page.")
    + "</div>",
    "All three return the same table: columns for inputs and outputs, one row per run, restricted to the caller’s own runs. workflow_id is the workflow’s id, or a single version’s id with instance=true. Because they are plain GET requests, the same comparisons can be scripted with any HTTP client. No database migration is needed.",
)

text_slide(
    "e5-export",
    "Extra · Export",
    "What the export contains",
    ["Built in the browser from what the table displays, so it matches the screen."],
    bullets([
        "The current page, as CSV or TSV, with the columns you’ve chosen, transposed if the table is.",
        "Datasets as “hid: name”, values as one-line JSON, metadata such as line counts as its value, missing cells as their text, such as “not run yet”.",
        "Spreadsheet-safe: cells that start with =, +, - or @ get a leading apostrophe, so Excel doesn’t run them as formulas.",
        "CSV starts with a UTF-8 byte-order mark, so Excel reads non-ASCII names.",
    ]),
    "The export is built in the browser from what the table displays, so it matches the screen.",
)

text_slide(
    "e6-matching",
    "Extra · Design",
    "How runs are matched across versions",
    ["Label the steps and outputs you care about, and keep the labels stable."],
    bullets([
        "<b>Steps</b> are matched by their label. An unlabelled step can’t be compared, and renaming a label starts a new history for that step.",
        "<b>Workflow inputs and outputs</b> are matched by label. Columns only older versions have are placed last.",
        "<b>Tool runs</b> span tool versions, with a version column and filter.",
        "Labels were chosen over internal step ids because ids change on edits and imports, while labels are visible and under your control.",
    ]),
    "This is the design choice most likely to affect users: label the steps and outputs you care about, and keep the labels stable.",
)

write(
    "e7-limits",
    f"""
<section id="e7-limits" data-transition="fade" style="background:{LIGHT};{SECTION_LIGHT}">
{header("Extra · Limits", "Known limits", ["The subworkflow case: “All runs” is greyed, and its reason is a hover tooltip."])}
<img src="{IMG['14crop']}" alt="Two strips from a run of the nested workflow Select long exons: its header bar, then, after a dashed band, the step card for Keep long exons with tabs Job, Outputs, Step Config and a greyed All runs." style="width:1728px;height:177px;{IMG_STYLE}">
{bullets([
    "Steps inside subworkflows can’t be compared yet; the tab above is disabled, with the tooltip “Steps inside a subworkflow can’t be compared across runs yet.”",
    "Unlabelled steps and outputs can’t be compared.",
    "Output links are never highlighted as different, because every run makes new datasets; compare line counts or other metadata instead.",
    "Row links open the run; jumping straight to the same step needs a separate Galaxy change, #24173.",
    "Wide tables scroll sideways on a 1280 px screen, and a row’s parameter diff is readable but tall.",
], size=28)}
<aside>None of these blocks the main use, but they are worth knowing before a demo on your own data. The disabled tab is a subtle grey; its explanation only appears on hover.</aside>
</section>
""",
)

text_slide(
    "e8-questions",
    "Extra · Open questions",
    "Open questions",
    ["Decisions still open on the branch."],
    bullets([
        "<b>How to split it into pull requests:</b> from six small preparation PRs plus three feature PRs, to one large feature PR.",
        "<b>Tool comparisons:</b> one row per job or batch, and runs inside workflows included by default. Both chosen, awaiting confirmation.",
        "<b>A “previous runs” panel on the tool form:</b> deferred.",
        "<b>Runs you can no longer access</b>, such as inputs from another user’s history, show as “inaccessible” cells.",
        "<b>The state filter</b> merges “error” and “failed” into one “failed” option.",
    ]),
    "These are the decisions still open on the branch. The first is about how the work is reviewed, not what users see; the rest change behaviour slightly and would benefit from user input.",
)

deck = {
    "v": 4,
    "createdOnFiles": {"v": 1, "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
    "lists": "css",
    "title": "Compare runs in Galaxy",
    "order": order,
    "sections": {
        "s1": {"description": "The question: which runs differ, and why", "start": "cover"},
        "s2": {"description": "Mode 1: one step across workflow versions", "start": "step-all-runs"},
        "s3": {"description": "Mode 2: a workflow’s outputs across versions", "start": "outputs"},
        "s4": {"description": "Mode 3: a tool across workflows, batches and export", "start": "tool-entry"},
        "s5": {"description": "Gaps, status and the ask", "start": "gaps"},
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

// gxwf-draft-format: the Galaxy Workflow Draft format and the loop that burns it down, with one real run as the worked example. 44in x 44in.
// Receipt numbers come from receipt.json (extract.py); the route and the draft graph come from route.json (extract_route.py).
// Excluded-from-word-count copy (title, subtitle, refs) lives in meta.json.
// sys.inputs: bleed=1 adds 0.125in bleed; gates=0 skips layout gates for draft previews.

#let d = json("receipt.json")
#let rt = json("route.json")
#let m = json("meta.json")
#let gates = sys.inputs.at("gates", default: "1") == "1"
#let bleed = if sys.inputs.at("bleed", default: "0") == "1" { 0.125in } else { 0pt }
#let denv = d.series.denv
#let bac = d.series.bacass

// ---------- Galaxy style tokens (STYLE_GALAXY.md; opaque except the masthead grid) ----------
#let paper        = rgb("#edf4fa")   // gx-page
#let grid-minor   = rgb("#daecf8")
#let grid-major   = rgb("#aecce7")
#let slip         = rgb("#ffffff")
#let tint         = rgb("#f1f9fe")
#let ink          = rgb("#2c3143")   // gx-dark
#let ink-deep     = rgb("#1a1f2e")
#let ink-soft     = rgb("#58585a")   // gx-grey
#let pen          = rgb("#25537b")   // gx-primary
#let info         = rgb("#197cd2")
#let gold         = rgb("#ffd700")
#let gold-dark    = rgb("#d19e00")
#let hl-col       = rgb("#fff489")
#let tape-col     = rgb("#cde0f0")
#let tape-edge    = rgb("#aecce7")
#let rule-col     = rgb("#dee2e6")
#let shadow-col   = rgb("#c9d6e3")
#let stamp-ink    = rgb("#e31a1e")   // FAIL / REFUSED
#let stamp-ok     = rgb("#006f50")   // PASS / VALIDATED / PROMOTED
#let ochre        = gold-dark
#let empty-sq     = grid-major
#let dot-col      = ink-soft         // gx-rule leaders vanish on white
#let mast-grad    = gradient.linear(ink, pen, angle: 45deg)
#let mast-grid    = rgb(255, 255, 255, 8)

// IBM Plex Mono is the glyph fallback for the arrow, which Atkinson and Kalam lack
#let sans    = ("Atkinson Hyperlegible", "IBM Plex Mono")
#let display = sans
#let mono    = ("Atkinson Hyperlegible Mono", "IBM Plex Mono")
#let hand    = ("Kalam", "IBM Plex Mono")

#let r-card  = 0.25in
#let r-small = 0.08in

// ---------- geometry (inches from the trim) ----------
#let W = 44in
#let lx = 1.15in
#let cwl = 10.15in
#let rx = 12.25in
#let rw = 19.5in
#let sx = rx + rw + 0.8in
#let cwr = 42.85in - sx
#let hy = 4.45in // thesis strip top
#let strip-h = 5.25in
#let by = hy + strip-h + 0.5in // route band top
#let spine-y = by + 2.75in
#let ry = spine-y + 2.45in // receipt top
#let rb = 42.55in // receipt bottom (before torn edge)
#let mast-h = 3.95in // masthead band bottom (gold bar below it)
#let foot-y = 43.1in // footer band top

#set page(width: W + 2 * bleed, height: W + 2 * bleed, margin: bleed, fill: paper,
  background: {
    for i in range(-1, 178) {
      let p = bleed + i * 0.25in
      let st = if calc.rem(i, 4) == 0 { 1.6pt + grid-major } else { 0.8pt + grid-minor }
      place(top + left, line(start: (p, 0pt), end: (p, W + 2 * bleed), stroke: st))
      place(top + left, line(start: (0pt, p), end: (W + 2 * bleed, p), stroke: st))
    }
    // masthead: 135deg gx-dark -> gx-primary, 0.5in white grid at 3%, gold bar
    place(top + left, rect(width: W + 2 * bleed, height: bleed + mast-h, fill: mast-grad))
    for i in range(0, 90) {
      let p = bleed + i * 0.5in
      place(top + left, line(start: (p, 0pt), end: (p, bleed + mast-h), stroke: 1pt + mast-grid))
      if i * 0.5in < mast-h { place(top + left, line(start: (0pt, p), end: (W + 2 * bleed, p), stroke: 1pt + mast-grid)) }
    }
    place(top + left, dy: bleed + mast-h, rect(width: W + 2 * bleed, height: 0.25in, fill: gold))
    place(top + left, dy: bleed + foot-y, rect(width: W + 2 * bleed, height: W - foot-y + bleed, fill: ink-deep))
  })
#set text(font: sans, size: 30pt, fill: ink, lang: "en", hyphenate: false)
#set par(leading: 0.42em, spacing: 0.5em)
#show raw: set text(font: mono, size: 1.25em)

// ---------- helpers ----------
#let dots = box(width: 1fr, repeat(gap: 0.18em)[#text(fill: dot-col)[.]])
#let row(l, r) = block(width: 100%, above: 0.4em, below: 0.4em)[#l#h(0.3em)#dots#h(0.3em)#r]
#let rule(dash: "dashed", col: ink) = block(above: 0.5em, below: 0.5em, line(length: 100%, stroke: (paint: col, thickness: 2.5pt, dash: dash)))
#let sect(l, r: none) = block(above: 0.45em, below: 0.4em, width: 100%)[
  #text(weight: "bold", size: 40pt, tracking: 0.06em, l)#if r != none [#h(1fr)#text(size: 28pt, fill: ink-soft, r)]]
#let anchor(name) = [#metadata(name)#label(name)]
// highlighter starts at x-height so it never covers the descenders of the line above; cap-height only on the hero
#let hl(body) = highlight(fill: hl-col, extent: 3pt, top-edge: "x-height", bottom-edge: -0.12em, body)
#let hl-hero(body) = highlight(fill: hl-col, extent: 3pt, top-edge: "cap-height", bottom-edge: -0.1em, body)
#let at(name) = locate(label(name)).position().y - bleed
#let atx(name) = locate(label(name)).position().x - bleed

#let badge(n, r: 0.42in) = box(baseline: 22%, circle(radius: r, fill: pen, inset: 0pt,
  align(center + horizon, text(font: sans, weight: "bold", size: 50pt, fill: slip, str(n)))))

#let arrow-head(tx, ty, a, st, size: 32) = for s in (150deg, -150deg) {
  let b = a + s
  place(top + left, curve(stroke: st, curve.move((tx * 1pt, ty * 1pt)),
    curve.line(((tx + size * calc.cos(b)) * 1pt, (ty + size * calc.sin(b)) * 1pt))))
}
#let draw-arrow(x0, y0, x1, y1, bend: 0.12, col: pen, thick: 4.5pt, head: 30) = {
  let (fx, fy, tx, ty) = (x0.pt(), y0.pt(), x1.pt(), y1.pt())
  let (mx, my) = (fx + (tx - fx) / 2 - (ty - fy) * bend, fy + (ty - fy) / 2 + (tx - fx) * bend)
  let st = (paint: col, thickness: thick, cap: "round", join: "round")
  place(top + left, curve(stroke: st, curve.move((fx * 1pt, fy * 1pt)),
    curve.quad((mx * 1pt, my * 1pt), (tx * 1pt, ty * 1pt))))
  arrow-head(tx, ty, calc.atan2(tx - mx, ty - my), st, size: head)
}

// Margin note: Kalam head + a few Kalam lines.
#let note-body(w, n, head, body) = block(width: w)[
  #set text(font: hand, size: 42pt, fill: pen)
  #set par(leading: 0.26em, spacing: 0.4em)
  #block(below: 0.45em)[#set par(leading: 0.16em)
    #if n != none [#badge(n)#h(0.25em)]#text(weight: "bold", size: 72pt, head)]
  #body
]

// Notes and other margin blocks sit at fixed column slots and are overlap-checked below; note arrows land on receipt anchors.
#let notes = state("notes", ())
#let note(name, side, y, n: none, head: none, tdy: 0.3in, ady: 0.55in, bend: 0.1, body) = context {
  let (x, w) = if side == "left" { (lx, cwl) } else { (sx, cwr) }
  let b = note-body(w, n, head, body)
  place(top + left, dx: x, dy: y, b)
  let bh = measure(b).height
  notes.update(a => a + ((side: side, y: y, h: bh, n: n),))
  let ay = at(name)
  let x0 = if side == "left" { x + w - 0.6in } else { x + 0.3in }
  let x1 = if side == "left" { rx + 0.45in } else { rx + rw - 0.45in }
  let y0 = y + ady
  if side == "left" { draw-arrow(x0 + 0.5in, y0, x1, ay + tdy, bend: bend) } else { draw-arrow(x0 - 0.5in, y0, x1, ay + tdy, bend: -bend) }
}
#let fixed(side, y, n, b) = {
  let x = if side == "left" { lx } else { sx }
  place(top + left, dx: x, dy: y, b)
  context { let bh = measure(b).height; notes.update(a => a + ((side: side, y: y, h: bh, n: n),)) }
}

#let stamp(angle: -8deg, w: 7.4in, size: 66pt, col: stamp-ok, body, sub) = rotate(angle, reflow: false, block(
  width: w, inset: 0.09in, radius: 12pt, stroke: (paint: col, thickness: 7pt), fill: slip,
  block(width: 100%, inset: (x: 0.16in, y: 0.08in), radius: 6pt, stroke: (paint: col, thickness: 2.5pt))[
    #set align(center + horizon)
    #text(font: display, weight: "bold", size: size, fill: col, tracking: 0.04em, body)
    #if sub != none [#linebreak()#text(font: mono, weight: "bold", size: 30pt, fill: col, sub)]
  ]))

#let tape(x, y, angle, w: 3.6in, h: 1.05in, teeth: 4, d: 0.09in) = {
  let k = 2 * teeth
  let pts = ((0pt, 0pt), (w, 0pt))
  for i in range(1, k + 1) { pts.push((w - if calc.odd(i) { d } else { 0pt }, h * i / k)) }
  pts.push((0pt, h))
  for i in range(k - 1, 0, step: -1) { pts.push((if calc.odd(i) { d } else { 0pt }, h * i / k)) }
  place(top + left, dx: x, dy: y, rotate(angle, reflow: false,
    polygon(fill: tape-col, stroke: (paint: tape-edge, thickness: 1.2pt, join: "miter"), ..pts)))
}

// a taped slip with a drop shadow, for clippings
#let clipping(x, y, w, angle: 0deg, tape-at: none, side: none, featured: false, ix: 0.4in, body) = {
  let b = block(width: w, fill: slip, radius: r-card, clip: true, inset: (x: ix, y: 0.35in),
    if featured { place(top + left, dx: -ix, dy: -0.35in, rect(width: 0.12in, height: 40in, fill: gold)) } + body)
  context {
    let h = measure(b).height
    let top-pad = if tape-at != none { 0.55in } else { 0.05in }
    if side != none { notes.update(a => a + ((side: side, y: y - top-pad, h: h + top-pad + 0.15in, n: "clip"),)) }
    place(top + left, dx: x + 0.08in, dy: y + 0.08in, rotate(angle, reflow: false, rect(width: w, height: h, radius: r-card, fill: shadow-col)))
    place(top + left, dx: x, dy: y, rotate(angle, reflow: false, b))
  }
  if tape-at != none { tape(x + tape-at, y - 0.85in, 8deg, w: 2.0in) }
}

// ---------- header ----------
// the format's name is the title; "Draft Format" carries the gold mark
#let title-words = m.title.split(" ")
#place(top + left, dx: lx, dy: 0.86in, rect(width: 0.16in, height: 2.3in, fill: gold))
#place(top + left, dx: lx + 0.5in, dy: 0.62in, block(width: 37in)[
  #set par(leading: 0.2em)
  #text(font: display, weight: "bold", size: 124pt, tracking: -0.02em, fill: slip)[#title-words.slice(0, -2).join(" ") #text(fill: gold, title-words.slice(-2).join(" "))]
  #v(0.15em)
  #let (cls, ..rest) = m.subtitle.split(" · ")
  #text(size: 44pt, weight: "bold", fill: tape-col)[#text(font: mono, cls) · #rest.join(" · ")]
])
#place(top + left, dx: 42.85in - 4.08in, dy: 0.9in, image("assets/galaxy_logo_white.svg", height: 1.3in))

// ---------- thesis strip: the hero plus what a draft is ----------
#place(top + left, dx: 1.0in + 0.08in, dy: hy + 0.08in, rect(width: 42in, height: strip-h, radius: r-card, fill: shadow-col))
#place(top + left, dx: 1.0in, dy: hy, rect(width: 42in, height: strip-h, radius: r-card, fill: gold))
#place(top + left, dx: 1.12in, dy: hy, block(width: 42in - 0.12in, height: strip-h, fill: slip,
  radius: (right: r-card), inset: (x: 0.68in, top: 0.42in))[
  #block(below: 0.32in)[
    #set par(leading: 0.18em)
    #set text(font: display, weight: "bold", size: 124pt, tracking: -0.02em)
    Make #hl-hero[“I don't know yet”] a typed, \ checkable state. Then burn it down.
  ]
  #block(width: 40in)[
    #set text(size: 36pt)
    #set par(leading: 0.32em)
    A *Galaxy Workflow Draft* is gxformat2 with named holes. Inputs, outputs, steps and every edge are concrete from the start; tool ids, versions and port names may wait as typed #raw("TODO_*") sentinels, with #raw("_plan_*") notes holding the intent. #raw("gxwf") checks what is concrete, picks what to resolve next, and promotes the finished draft to plain gxformat2. Only the boxes are incomplete, never the wiring.
  ]
])
#place(top + left, dx: 36.4in, dy: hy + 0.5in, rotate(-6deg, reflow: false,
  text(font: hand, weight: "bold", size: 96pt, fill: pen)[31 #text(font: mono, weight: "bold")[#sym.arrow] 0]))
#tape(0.3in, hy - 0.32in, -16deg, w: 2.4in)
#tape(41.2in, hy - 0.32in, 14deg, w: 2.4in)

// ---------- route band: both runs, station by station ----------
#let st-x0 = 14.45in
#let st-dx = 2.8in
#let st-x(n) = st-x0 + (n - 1) * st-dx
#let gate-st = ("5": [draft-validate], "9": [gxwf], "10": [Planemo])
#let st-label = ([interface], [data flow], [compare to IWC], [write draft], [draft loop], [find test data],
  [test plan], [write test], [validate], [run test], [debug])
#let track = (paint: pen, thickness: 8pt, cap: "round")
#let lane-track = (paint: info, thickness: 7pt, cap: "round")
#let gate-mark(s) = rect(width: s, height: s, radius: r-small, fill: ink, stroke: 5pt + gold, inset: 0pt)
#let dot(x, y, n, gate: false, r: 0.34in) = {
  let body = align(center + horizon, text(font: sans, weight: "bold", size: 36pt, fill: if gate { slip } else { pen }, str(n)))
  if gate {
    place(top + left, dx: x - r, dy: y - r, rect(width: 2 * r, height: 2 * r, radius: r-small, fill: ink, stroke: 6pt + gold, inset: 0pt, body))
  } else {
    place(top + left, dx: x - r, dy: y - r, circle(radius: r, fill: slip, stroke: 5pt + pen, inset: 0pt, body))
  }
}
#let lbl(x, y, w, body, al: center) = place(top + left, dx: x - w / 2, dy: y, block(width: w, align(al, body)))

// band heading
#place(top + left, dx: lx, dy: by - 0.02in, block(width: 30in)[
  #text(font: display, weight: "bold", size: 62pt, tracking: -0.01em, fill: ink)[Where drafts fit]
])
#place(top + left, dx: 12.6in, dy: by + 0.08in, block(width: 15.6in)[
  #set text(size: 28pt)
  #set par(leading: 0.3em)
  #hl[Highlighted], the loop: validate #sym.arrow next step #sym.arrow resolve, then promote. \
  Two real agent runs on one route, from a Galaxy Workflow Foundry run.
])

// source lanes merging into the reviewed brief
#let lane-a = spine-y - 1.0in
#let lane-b = spine-y + 1.0in
#let brief-x = 12.1in
#let brief-w = 1.95in
#for (ly, src, run) in (
  (lane-a, [PAPER], [DengueSeq [1]]),
  (lane-b, [NEXTFLOW], [nf-core/bacass [2]]),
) {
  place(top + left, line(start: (lx + 3.35in, ly), end: (brief-x - 2.2in, ly), stroke: lane-track))
  place(top + left, curve(stroke: lane-track, curve.move((brief-x - 2.2in, ly)),
    curve.quad((brief-x - 1.2in, ly), (brief-x - brief-w / 2, spine-y))))
  place(top + left, dx: lx, dy: ly - 0.42in, block(width: 3.2in)[
    #set par(leading: 0.2em)
    #text(weight: "bold", size: 36pt, src) \ #text(size: 26pt, fill: ink-soft, run)])
  for (i, l) in ((0, [summarize]), (1, [write brief])) {
    let x = lx + 4.75in + i * 2.75in
    place(top + left, dx: x - 0.2in, dy: ly - 0.2in, circle(radius: 0.2in, fill: slip, stroke: 5pt + info))
    lbl(x, ly + 0.3in, 2.7in, text(size: 26pt, l))
  }
}
// the brief: the human review point
#place(top + left, dx: brief-x - brief-w / 2, dy: spine-y - 0.75in,
  block(width: brief-w, height: 1.5in, fill: gold, stroke: 3pt + gold-dark, radius: r-small, inset: 0.06in,
    align(center + horizon)[#set par(leading: 0.2em)
      #text(weight: "bold", size: 30pt, fill: ink)[BRIEF] \ #text(size: 24pt, fill: ink)[human- \ reviewed]]))

// the draft's stretch of the route: written at 4, resolved and promoted at 5
#let hl-x0 = st-x(4) - 1.3in
#let hl-x1 = st-x(5) + 1.3in
#place(top + left, dx: hl-x0, dy: spine-y - 0.75in, rect(width: hl-x1 - hl-x0, height: 2.65in, radius: r-card, fill: hl-col))
// the shared spine: 11 stations
#place(top + left, line(start: (brief-x + brief-w / 2, spine-y), end: (st-x(11), spine-y), stroke: track))
#for n in range(1, 12) {
  let g = gate-st.at(str(n), default: none)
  dot(st-x(n), spine-y, n, gate: g != none)
  lbl(st-x(n), spine-y + 0.5in, st-dx - 0.12in, text(size: 26pt, weight: if n in (4, 5) { "bold" } else { "regular" }, st-label.at(n - 1)))
  if g != none { lbl(st-x(n), spine-y + 1.42in, st-dx + 0.4in, text(font: mono, size: 24pt, weight: "bold", fill: ink, g)) }
}
// loop mark on station 5: the receipt below is its seven passes
#place(top + left, dx: st-x(5) - 0.75in, dy: spine-y - 1.55in, curve(stroke: (paint: pen, thickness: 5pt, cap: "round"),
  curve.move((0.15in, 1.1in)), curve.cubic((-0.25in, 0.1in), (1.75in, 0.1in), (1.35in, 1.1in))))
#arrow-head((st-x(5) + 0.6in).pt(), (spine-y - 0.45in).pt(), 100deg, (paint: pen, thickness: 5pt, cap: "round"), size: 26)
#place(top + left, dx: st-x(5) - 5.0in, dy: spine-y - 1.3in, block(width: 4.2in, align(right, text(font: hand, weight: "bold", size: 38pt, fill: pen)[×#rt.denv.galaxy.phases.at(4).iterations for DengueSeq])))
// legend
#place(top + left, dx: st-x(6) + 0.3in, dy: by + 0.05in, block(width: 10in)[
  #set text(size: 28pt)
  #box(baseline: 0.1em, gate-mark(0.42in)) a program checks the work here
])
// where the two runs ended
#place(top + left, dx: st-x(6) + 0.3in, dy: by + 0.65in, block(width: 42.85in - st-x(6) - 0.3in)[
  #set text(size: 28pt)
  #set par(leading: 0.28em)
  DengueSeq: test *#if rt.denv.test.status == "pass" [passed] else [failed]*. bacass: #rt.bacass.test.num_failures assertion failed; debug blamed the assertion, not the workflow.
])
// you are here: station 5 drops into the receipt
#place(top + left, dx: st-x(5) + 2.2in, dy: spine-y + 1.3in, text(font: hand, weight: "bold", size: 40pt, fill: pen)[you are here: station 5, below])

// ---------- receipt ----------
#place(top + left, dx: rx + 0.1in, dy: ry + 0.12in, rect(width: rw, height: rb - ry, fill: shadow-col))
#let zig(fill) = {
  let n = 49
  let step = rw / n
  let pts = ((0pt, 0pt),)
  for i in range(n) {
    pts.push(((i + 0.5) * step, 0.26in))
    pts.push(((i + 1) * step, 0pt))
  }
  polygon(fill: fill, stroke: none, ..pts)
}
#place(top + left, dx: rx + 0.1in, dy: rb + 0.12in - 1pt, zig(shadow-col))
#place(top + left, dx: rx, dy: rb - 1pt, zig(slip))

#let tear-line(t) = grid(columns: (1fr, auto, 1fr), column-gutter: 0.3em, align: horizon,
  line(length: 100%, stroke: (paint: ink-soft, thickness: 2.5pt, dash: (6pt, 6pt))),
  text(size: 28pt, tracking: 0.14em, fill: ink-soft, t),
  line(length: 100%, stroke: (paint: ink-soft, thickness: 2.5pt, dash: (6pt, 6pt))))

// the draft at the opening balance: a real excerpt of the bd40715 template (map_reads step)
#let todo(s) = highlight(fill: hl-col, top-edge: "cap-height", bottom-edge: "baseline", extent: 4pt, s)
#let yaml-excerpt = block(width: 100%, inset: (left: 0.35in, y: 0.1in), stroke: (left: 5pt + pen))[
  #set text(size: 31pt)
  #set par(leading: 0.36em)
  #anchor("a-yaml-top")
  class: #text(weight: "bold")[GalaxyWorkflowDraft] \
  steps: \
  #h(1.2em)map_reads: \
  #h(2.4em)tool_id: …/devteam/bwa/bwa_mem \
  #h(2.4em)tool_version: #todo[TODO] \
  #h(2.4em)in: \
  #h(3.6em)#todo[TODO_paired_reads]: Paired-end reads \
  #anchor("a-yaml-todo")
  #h(3.6em)#todo[TODO_reference_fasta]: DENV3 reference genome \
  #h(2.4em)out: \
  #h(3.6em)- id: #todo[TODO_coordinate_sorted_bam] \
  #anchor("a-yaml-plan")
  #h(2.4em)#text(weight: "bold", fill: pen)[\_plan\_state]: | BWA-MEM paired-end … \
  #h(1.2em)#text(fill: ink-soft)[filter_mapped_primary: … #h(0.4em)\# 6 more steps]
]

// burn-down rows: one per draft commit; the triangle marks the step draft-next-step picked
#let pick = box(baseline: -0.08em, polygon(fill: ink, (0pt, 0pt), (0.42em, 0.27em), (0pt, 0.54em)))
#let max-todo = denv.commits.at(0).todo
#let bar-w = 4.4in
#let squares(k, n) = box(baseline: 0.05em, stack(dir: ltr, spacing: 0.07in,
  ..range(n).map(i => rect(width: 0.27in, height: 0.27in, fill: if i < k { ink } else { none },
    stroke: if i < k { none } else { 2.5pt + empty-sq }))))
#let bar(v, fill: ink) = box(baseline: 0.1em, if v > 0 { rect(width: bar-w * v / max-todo, height: 0.56in, fill: fill) } else { rect(width: 0.06in, height: 0.56in, fill: ink) })
#let row-cols = (1fr, 3.35in, 1.2in, bar-w)
#let burn-row(c, label, sub) = {
  grid(columns: row-cols, column-gutter: 0.25in, row-gutter: 0.06in, align: (left + bottom, left + bottom, right + bottom, left + bottom),
    text(weight: "bold", size: 40pt, label),
    [#text(weight: "bold")[#if c.valid [ok] else [FAIL]] #squares(c.ts_ok, c.n_steps)],
    text(weight: "bold", size: 44pt, str(c.todo)),
    bar(c.todo),
    grid.cell(colspan: 3, text(size: 28pt, fill: ink-soft)[#c.sha · #sub]),
  )
  v(0.2in)
}

#let receipt-inset = (x: 0.85in, top: 0.5in, bottom: 0.35in)
#let receipt-body = [
  #set text(font: mono)
  #set align(center)
  #anchor("a-head")
  #text(weight: "bold", size: 60pt, tracking: 0.05em)[GALAXY WORKFLOW DRAFT]
  #v(-0.15em)
  #text(weight: "bold", size: 36pt, tracking: 0.14em)[STATEMENT OF KNOWN UNKNOWNS] \
  #text(size: 28pt, fill: ink-soft)[station 5 · run #denv.run · worked example]
  #set align(left)
  #rule()

  #anchor("a-open")
  #row[#text(weight: "bold")[OPENING BALANCE] #text(fill: ink-soft)[#denv.commits.at(0).sha]][#text(weight: "bold", size: 44pt)[#max-todo] TODO]
  #yaml-excerpt
  #rule()

  #sect([BURN-DOWN], r: [#pick picked by draft-next-step])
  #grid(columns: row-cols, column-gutter: 0.25in, [], text(size: 28pt, fill: ink-soft)[VALIDATE], grid.cell(colspan: 2, text(size: 28pt, fill: ink-soft)[TODO LEFT]))
  #anchor("a-rows")
  #burn-row(denv.commits.at(0), [template], [7 steps planned, 0 concrete])
  #for (i, c) in denv.commits.slice(1).enumerate() {
    let r = c.resolved.at(0)
    if i == 0 { anchor("a-row1") }
    if i == 3 { anchor("a-row4") }
    if i == 5 { anchor("a-row6") }
    burn-row(c, [#pick #r.step], [#r.tool #r.version])
  }
  #anchor("a-rows-end")
  #rule(dash: "solid")
  #block(above: 0.35em, below: 0.25em)[
    #text(size: 58pt, weight: "bold")[#row[BALANCE DUE][#denv.commits.last().todo]]
  ]
  #anchor("a-promote")
  #block(above: 0.4em, below: 0.3em)[
    #text(size: 28pt, fill: ink-soft)[#denv.promoted.sha writes #denv.promoted.file] \
    #text(size: 36pt)[#denv.promoted.from #sym.arrow #text(weight: "bold")[#denv.promoted.to]]
  ]

  #v(0.3em)
  #anchor("a-tear")
  #tear-line[SECOND RUN, SAME LOOP]
  #let b0 = bac.commits.at(0).todo
  #let bh = 1.8in
  #let hatch = tiling(size: (12pt, 12pt), line(start: (0pt, 12pt), end: (12pt, 0pt), stroke: 2.5pt + ink))
  #let vbar(c) = stack(spacing: 0.08in,
    box(width: 0.8in, height: bh, align(bottom,
      if c.todo > 0 { rect(width: 100%, height: bh * c.todo / b0, stroke: 4pt + ink, fill: hatch) }
      else { line(length: 100%, stroke: 4pt + ink) })),
    align(center, text(weight: "bold", size: 36pt, str(c.todo))))
  #grid(columns: (1fr, auto), column-gutter: 0.4in, align: horizon,
    [#text(weight: "bold", size: 34pt)[#bac.run] \
     #text(size: 28pt, fill: ink-soft)[from Nextflow · #(bac.commits.len() - 1) steps resolved \ #if bac.all_valid [valid at every commit] else [NOT valid at every commit] · promoted #bac.promoted.sha]],
    stack(dir: ltr, spacing: 0.22in, ..bac.commits.map(vbar)))
  #box(anchor("a-stub-end"))
  #v(1fr)
  #block(width: 100%, above: 0pt)[
    #set text(size: 28pt, fill: ink-soft)
    #set par(leading: 0.34em)
    #box(anchor("a-foot"))Two real agent runs: DengueSeq DENV3 [1] (top), nf-core/bacass [2] (stub). Every draft commit replayed with #box[gxwf #d.gxwf] #box[`draft-validate --concrete`] #box[`--connections`]. This shows resolution, not correctness.#box(anchor("a-end"))
  ]
]
#place(top + left, dx: rx, dy: ry, block(width: rw, height: rb - ry, fill: slip, breakable: false, inset: receipt-inset, receipt-body))
#place(top + left, dx: rx, dy: ry, rect(width: rw, height: 0.06in, fill: pen))

#context if gates {
  let gap = at("a-foot") - at("a-stub-end")
  assert(gap >= 0.2in, message: "receipt stub runs into the footnote; gap " + repr(gap.to-absolute()))
  assert(at("a-end") <= rb - 0.3in, message: "receipt overflows the slip by " + repr((at("a-end") - rb + 0.3in).to-absolute()))
  assert(rb + 0.26in + 0.12in <= foot-y - 0.1in, message: "receipt tear runs into the footer band")
}

// PROMOTED stamp beside the balance line
#context {
  let y = at("a-promote")
  place(top + left, dx: rx + rw - 7.05in, dy: y - 0.84in, stamp(angle: -6deg, w: 4.9in, size: 50pt)[PROMOTED][plain gxformat2])
  place(top + left, dx: rx + rw - 2.2in, dy: y - 0.95in, rotate(-6deg, reflow: false,
    ellipse(width: 1.75in, height: 1.4in, stroke: (paint: pen, thickness: 6pt))))
}
// you-are-here arrow lands on the receipt head
#draw-arrow(st-x(5), spine-y + 1.85in, st-x(5) - 0.1in, ry + 0.4in, bend: 0.0, thick: 6pt)

#tape(rx - 0.7in, ry - 0.45in, -14deg)
#tape(rx + rw - 2.9in, ry - 0.45in, 12deg)

// ---------- draft snapshot clipping: the graph at row 5, solid = concrete, dashed = TODO_ ----------
#let g = rt.graphs.draft
#let gpos = (
  map_reads: (0in, 0in), filter_mapped_primary: (2.95in, 0in), primer_trim: (2.95in, 0.95in),
  consensus: (0in, 1.9in), variants: (2.95in, 1.9in), per_base_depth: (5.55in, 1.9in), consensus_header: (0in, 2.85in),
)
#let node-h = 0.62in
#let node-w(id) = id.len() * 0.2in + 0.4in
#let draft-graph = box(width: 9.3in, height: 2.85in + node-h, {
  for s in g.steps {
    let (x, y) = gpos.at(s.id)
    for f in s.from {
      let (fx, fy) = gpos.at(f)
      let (x0, y0, x1, y1) = if fy == y { (fx + node-w(f), fy + node-h / 2, x - 0.02in, y + node-h / 2) }
        else { (calc.max(fx, x) + 0.45in, fy + node-h, x + 0.45in, y - 0.02in) }
      draw-arrow(x0, y0, x1, y1, bend: 0.0, col: ink, thick: 3.5pt, head: 18)
    }
  }
  for s in g.steps {
    let (x, y) = gpos.at(s.id)
    place(top + left, dx: x, dy: y, rect(width: node-w(s.id), height: node-h, fill: if s.concrete { tint } else { slip }, inset: 0pt, radius: r-small,
      stroke: if s.concrete { 4.5pt + pen } else { (paint: ink-soft, thickness: 3.5pt, dash: (10pt, 7pt)) },
      align(center + horizon, text(font: mono, size: 24pt, weight: if s.concrete { "bold" } else { "regular" }, fill: if s.concrete { ink } else { ink-soft }, s.id))))
  }
})
#let n-con = g.steps.filter(s => s.concrete).len()

// ---------- margin notes ----------
// left: 1, 3, draft snapshot, at a glance, 5, get started · right: 2, 4, 6, 7, read more
#note("a-open", "left", ry + 0.1in, n: 1, head: [Known knowns], tdy: 0.25in)[
  Inputs, outputs, steps and every edge are #hl[concrete from the first draft].
]
#note("a-rows", "left", ry + 2.9in, n: 3, head: [Valid at every step], tdy: 0.1in, bend: 0.08)[
  #raw("draft-validate") #raw("--concrete") checks concrete steps against #hl[real tool schemas] and skips the rest.
]
#let snap-y = ry + 7.3in
#clipping(lx - 0.1in, snap-y, cwl + 0.1in, tape-at: 7.9in, side: "left")[
  #text(weight: "bold", size: 28pt)[DRAFT AT #text(font: mono, g.sha)] #text(size: 28pt, fill: ink-soft)[· #n-con of #g.steps.len() concrete]
  #v(0.12in)
  #draft-graph
  #v(0.05in)
  #set text(size: 28pt)
  #set par(leading: 0.3em)
  Solid: checked against the tool's schema. Dashed: ports still #raw("TODO_"), skipped. Edges all there. #text(weight: "bold")[Valid anyway.]
  #anchor("a-snap")
]
// pen arrow: the snapshot is the consensus row's commit
#context draw-arrow(lx + cwl - 0.2in, snap-y + 2.6in, rx + 0.45in, at("a-row4") + 0.35in, bend: 0.12)

// card heading + a few rows of reference copy
#let card-head(t) = text(font: display, weight: "bold", size: 62pt, tracking: -0.01em, fill: ink, t)
#let cmds(body) = block(inset: (left: 0.25in), stroke: (left: 4pt + pen))[
  #set text(font: mono, weight: "semibold", tracking: -0.02em)
  #body
]
#let glance-y = ry + 14.1in
#clipping(lx - 0.1in, glance-y, cwl + 0.2in, angle: -0.8deg, side: "left", ix: 0.32in)[
  #card-head[The format]
  #set text(size: 28pt)
  #set par(leading: 0.3em, spacing: 0.45em)
  #block(above: 0.45em)[*Always concrete:* inputs, outputs, step labels and types, every edge.]
  *May wait:* #raw("tool_id"), #raw("tool_version"), port names, as #raw("TODO") or #raw("TODO_<hint>").

  *Intent:* #raw("_plan_state"), #raw("_plan_context"), #raw("_plan_in"), #raw("_plan_out"). Gone once the step resolves.

  *Promote:* #raw("gxwf draft-extract") strips #raw("_plan_*") and flips the class to #raw("GalaxyWorkflow").
]
#note("a-promote", "left", ry + 19.6in, n: 5, head: [Promote, don't translate], tdy: 0.3in, bend: 0.06)[
  Fully resolved, the draft is #hl[ordinary gxformat2]. No translation layer.
]
#let foot-card-y = 38.85in
#let more-y = 37.0in
#clipping(lx - 0.1in, foot-card-y, cwl + 0.2in, side: "left", featured: true, ix: 0.32in)[
  #card-head[Get started]
  #set text(size: 28pt)
  #set par(leading: 0.3em, spacing: 0.4em)
  #cmds[
    npm install -g \@galaxy-tool-util/cli \
    gxwf draft-validate \\ \
    #h(1em)\-\-concrete wf.gxwf.yml \
    gxwf draft-next-step wf.gxwf.yml
  ]
]

#note("a-yaml-todo", "right", ry + 2.5in, n: 2, head: [Known unknowns], tdy: 0.2in, bend: 0.05)[
  Versions, ports, anything not yet known: typed #hl[#raw("TODO_*")] sentinels. #raw("_plan_*") fields carry the intent forward.
]
#note("a-row1", "right", ry + 6.1in, n: 4, head: [The draft says what's next], tdy: 0.35in, bend: 0.06)[
  #raw("gxwf draft-next-step") picks the next step. An agent, or you, finds its tool on the Tool Shed, pins a revision, fills the step. #hl[The format drives the loop.]
]
#note("a-rows-end", "right", ry + 11.35in, n: 6, head: [Reviewable intent], tdy: 0.2in, ady: 0.55in, bend: 0.1)[
  Each resolution is one commit: a #raw("TODO") out, a pinned tool in. #hl[Review the diff.]
  #block(above: 0.3em)[
    #set text(font: sans, size: 28pt, fill: ink)
    #set par(leading: 0.32em)
    #raw("_plan_*") notes keep the why beside the step and can't go stale: a resolved step that still carries them fails validation. #raw("draft-next-step") holds no hidden state; the same draft gives the same answer.
  ]
]
#fixed("right", ry + 16.6in, 7, note-body(cwr, 7, [Unknown unknowns], [
  Those take a run: bacass passed every static check, then failed one test assertion.
  #text(font: sans, size: 28pt, fill: ink)[Checks prove shape, not biology. A validated workflow is a hypothesis about the analysis until it has run.]
]))
#clipping(sx, more-y, cwr, side: "right", ix: 0.32in)[
  #card-head[Read more]
  #set text(size: 28pt)
  #set par(leading: 0.32em, spacing: 0.85em)
  #block(above: 0.5em)[Format spec and every #raw("gxwf") flag:]
  #cmds[jmchilton.github.io/ \ #h(0.5em)galaxy-tool-util-ts \ #text(font: sans, weight: "regular", tracking: 0em, fill: ink-soft)[Guides #sym.arrow Draft Workflow Format]]

  *In code:* #raw("@galaxy-tool-util/schema") exports validate, next step and extract as functions, plus a JSON Schema for editors.

  *In use:* the Galaxy Workflow Foundry's agent skills run this loop, from paper to tested workflow.
]

// ---------- references ----------
#place(top + left, dx: lx, dy: foot-y, block(width: 42.85in - lx, height: W - foot-y, inset: (bottom: 0.08in),
  align(horizon, grid(columns: (auto, 1fr, auto), align: horizon,
    ..m.refs.map(r => text(size: 24pt, fill: slip, r)).intersperse([])))))

// ---------- gates ----------
#context if gates {
  let all = notes.final()
  for side in ("left", "right") {
    let col = all.filter(n => n.side == side).sorted(key: n => n.y)
    for i in range(col.len() - 1) {
      let (a, b) = (col.at(i), col.at(i + 1))
      assert(a.y + a.h + 0.15in <= b.y, message: side + " block " + repr(a.n) + " overlaps the next by " + repr((a.y + a.h + 0.15in - b.y).to-absolute()))
    }
    let last = col.last()
    assert(last.y + last.h <= foot-y - 0.2in, message: side + " column runs into the footer band")
  }
}

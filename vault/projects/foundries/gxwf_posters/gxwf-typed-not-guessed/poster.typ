// gxwf: Galaxy Workflows, Typed, Not Guessed. One gxwf validation receipt over IWC rnaseq-pe, plus where gxwf fits. 44in x 44in.
// Receipt and slip content comes from receipt.json (extract.py reads the saved gxwf output in data/).
// Build flags (sys.inputs): bleed=1 adds 0.125in bleed; count=1 hides word-count-exempt text.

#let d = json("receipt.json")
#set document(title: "gxwf: Galaxy Workflows, Typed, Not Guessed", date: none)
#let bleed = if sys.inputs.at("bleed", default: "0") == "1" { 0.125in } else { 0pt }
#let count-mode = sys.inputs.at("count", default: "0") == "1"
#let exempt(body) = if count-mode { hide(body) } else { body }

// ---------- Galaxy style tokens (../STYLE_GALAXY.md; all opaque except the masthead grid) ----------
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
#let stamp-ok     = rgb("#006f50")   // PASS / VALIDATED
#let ochre        = gold-dark
#let code-bg      = tint
#let mast-grad    = gradient.linear(ink, pen, angle: 45deg) // CSS 135deg: top-left to bottom-right
#let mast-grid    = rgb(255, 255, 255, 8)
#let mast-soft    = tape-col         // secondary text on the masthead

// Atkinson has no arrow glyphs; they fall back to vendored IBM Plex Mono
#let sans    = ("Atkinson Hyperlegible", "IBM Plex Mono")
#let display = sans                  // weight: "bold", tracking: -0.02em
#let mono    = ("Atkinson Hyperlegible Mono", "IBM Plex Mono")
#let mono-tr = -0.03em               // Atkinson Mono advance 0.632em vs Plex 0.600em: keeps the source line widths
#let hand    = ("Kalam", "IBM Plex Mono")

#let r-card  = 0.25in
#let r-small = 0.08in
#let sh      = 0.08in                // card and receipt shadow offset

// ---------- copy that changes most ----------
#let title-lead = [gxwf: Galaxy Workflows,]
#let title-hero = [Typed, Not Guessed]
#let descriptor = [The Galaxy workflow command line: validate, lint, convert, clean]
#let docs-url = [jmchilton.github.io/galaxy-tool-util-ts]

// ---------- geometry (inches from the trim) ----------
#let W = 44in
#let lx = 1.1in
#let cwl = 11.9in
#let rx = 14.0in
#let rw = 16.4in
#let sx = rx + rw + 1.0in
#let cwr = 42.9in - sx
#let hy = 5.75in // thesis slip top
#let ry = 10.6in // body top
#let rb = 32.0in // receipt bottom (before torn edge)
#let colb = 32.6in // left column ends above the band
#let rcolb = 42.95in // right column runs to the bottom
#let bx = 1.0in // band (Foundry run) box
#let by = 33.25in
#let bw = sx - 0.6in - bx
#let bh = 42.86in - by

#set page(width: W + 2 * bleed, height: W + 2 * bleed, margin: bleed, fill: paper,
  background: {
    for i in range(-1, 178) {
      let p = bleed + i * 0.25in
      let st = if calc.rem(i, 4) == 0 { 1.6pt + grid-major } else { 0.8pt + grid-minor }
      place(top + left, line(start: (p, 0pt), end: (p, W + 2 * bleed), stroke: st))
      place(top + left, line(start: (0pt, p), end: (W + 2 * bleed, p), stroke: st))
    }
  })
#set text(font: sans, size: 30pt, fill: ink, lang: "en")
#set par(leading: 0.42em, spacing: 0.5em)
#set smartquote(enabled: false)

// ---------- helpers ----------
#let dots = box(width: 1fr, repeat(gap: 0.18em)[#text(fill: rule-col, weight: "bold")[.]])
#let row(l, r) = block(width: 100%, above: 0.34em, below: 0.34em)[#l#h(0.3em)#dots#h(0.3em)#r]
#let ln(body) = block(width: 100%, above: 0.34em, below: 0.34em, body)
#let rule(dash: "dashed") = block(above: 0.45em, below: 0.45em, line(length: 100%, stroke: (paint: ink, thickness: 2.5pt, dash: dash)))
#let sect(l, r: none) = block(above: 0.5em, below: 0.35em, width: 100%)[
  #text(weight: "bold", size: 42pt, tracking: 0.06em, l)#if r != none [#h(1fr)#text(size: 28pt, fill: ink-soft, r)]]
#let anchor(name) = [#metadata(name)#label(name)]
// highlighter starts at x-height so it never covers the descenders of the line above; the hero passes cap-height
#let hl(body, top: "x-height", extent: 3pt) = highlight(fill: hl-col, extent: extent, top-edge: top, bottom-edge: "descender", body)
#let at(name) = locate(label(name)).position().y - bleed
#let tag(body, col: stamp-ink, size: 26pt, font: mono) = box(inset: (x: 5pt, y: 3pt), baseline: 15%, radius: 4pt, stroke: 2.5pt + col,
  text(font: font, weight: "bold", size: size, fill: col, body))

// numbered section badge: gx-primary disc, white Atkinson 700 numeral
#let badge(n, r: 0.4in) = box(baseline: 22%, circle(radius: r, fill: pen, inset: 0pt,
  align(center + horizon, text(font: sans, weight: "bold", size: 54pt, fill: white, str(n)))))

#let draw-arrow(x0, y0, x1, y1, bend: 0.12, col: pen) = {
  let (fx, fy, tx, ty) = (x0.pt(), y0.pt(), x1.pt(), y1.pt())
  let (mx, my) = (fx + (tx - fx) / 2 - (ty - fy) * bend, fy + (ty - fy) / 2 + (tx - fx) * bend)
  let st = (paint: col, thickness: 4pt, cap: "round", join: "round")
  place(top + left, curve(stroke: st, curve.move((fx * 1pt, fy * 1pt)),
    curve.quad((mx * 1pt, my * 1pt), (tx * 1pt, ty * 1pt))))
  let a = calc.atan2(tx - mx, ty - my)
  for s in (150deg, -150deg) {
    let b = a + s
    place(top + left, curve(stroke: st, curve.move((tx * 1pt, ty * 1pt)),
      curve.line(((tx + 32 * calc.cos(b)) * 1pt, (ty + 32 * calc.sin(b)) * 1pt))))
  }
}

// A margin note: anchor, numbered Kalam head, short Kalam body.
#let note(id, n, head, body) = block(width: 100%, breakable: false)[
  #anchor(id)
  #set text(font: hand, size: 40pt, fill: pen)
  #set par(leading: 0.24em, spacing: 0.4em)
  #block(below: 0.4em)[#set par(leading: 0.12em)
    #badge(n)#h(0.25em)#text(weight: "bold", size: 72pt, head)]
  #body
]

// rubber stamp: double border, Atkinson 700; ok ink for PASS-type words, danger ink for FAIL-type
#let stamp(angle: -8deg, size: 66pt, col: stamp-ink, body) = rotate(angle, reflow: false, box(
  inset: 5pt, radius: 12pt, stroke: (paint: col, thickness: 6pt),
  box(inset: (x: 0.24in, y: 0.1in), radius: 7pt, stroke: (paint: col, thickness: 2.5pt),
    text(font: display, weight: "bold", size: size, fill: col, tracking: 0.06em, body))))

// tape: opaque gx-tape with a gx-grid-major edge and saw-tooth ends
#let tape(x, y, angle, w: 3.4in) = {
  let (h, n, k) = (1.0in, 6, 0.09in)
  let pts = ((0pt, 0pt), (w, 0pt))
  for i in range(1, n + 1) { pts.push((if calc.odd(i) { w - k } else { w }, h * i / n)) }
  pts.push((0pt, h))
  for i in range(n - 1, 0, step: -1) { pts.push((if calc.odd(i) { k } else { 0pt }, h * i / n)) }
  place(top + left, dx: x, dy: y, rotate(angle, reflow: false,
    box(width: w, height: h, polygon(fill: tape-col, stroke: (paint: tape-edge, thickness: 1.2pt, join: "miter"), ..pts))))
}

// card: white, 0.25in radius, offset gx-shadow, 1pt gx-rule outline
#let paper-slip(w, body, angle: 0deg, inset: (x: 0.45in, y: 0.4in)) = context {
  let card = block(width: w, fill: slip, inset: inset, radius: r-card, stroke: 1pt + rule-col, body)
  let h = measure(card).height
  rotate(angle, reflow: false, box(width: w, height: h, {
    place(top + left, dx: sh, dy: sh, rect(width: w, height: h, radius: r-card, fill: shadow-col))
    place(top + left, card)
  }))
}

#let thousands(n) = { let s = str(n); if s.len() > 3 { s.slice(0, s.len() - 3) + "," + s.slice(s.len() - 3) } else { s } }
#let two(x) = { let t = str(x); if t.len() == 3 { t + "0" } else { t } }
#let secs(r) = two(r.min) + "–" + two(r.max) + " s"
#let code-box(body) = block(above: 0.25em, below: 0.45em, fill: code-bg, radius: r-small, stroke: 1pt + grid-minor, inset: 0.16in, width: 100%, body)

// raster crop: x0/y0/cw/ch in source pixels, w = printed width
// both image dimensions are given: with width alone, a short clip box makes Typst fit-crop the image about its centre
#let crop(path, full-w, full-h, x0, y0, cw, ch, w) = {
  let s = w / cw
  block(width: w, height: ch * s, clip: true, place(top + left, dx: -x0 * s, dy: -y0 * s, image(path, width: full-w * s, height: full-h * s)))
}

// ---------- masthead band (full bleed): 135deg gx-dark -> gx-primary, 0.5in white grid, gold bar ----------
#let mast-h = 5.3in // band bottom, gold bar included
#let head-y = 1.0in // title top: inside the 1in safe zone
#let gold-h = 0.25in
#place(top + left, dx: -bleed, dy: -bleed, block(width: W + 2 * bleed, height: mast-h + bleed, fill: mast-grad, clip: true, {
  for i in range(0, 92) {
    let p = i * 0.5in
    place(top + left, line(start: (p, 0pt), end: (p, mast-h + bleed), stroke: 1pt + mast-grid))
    place(top + left, line(start: (0pt, p), end: (W + 2 * bleed, p), stroke: 1pt + mast-grid))
  }
  place(bottom + left, rect(width: 100%, height: gold-h, fill: gold))
}))
#let title-x = lx + 0.4in
#place(top + left, dx: lx, dy: head-y, rect(width: 0.14in, height: 1.14in, fill: gold))
#let logo-h = 1.15in
#let logo-x = 42.9in - logo-h * 347 / 110.6
#let title-block = block[
  #set par(leading: 0.2em)
  #text(font: display, weight: "bold", size: 120pt, tracking: -0.02em, fill: white)[#title-lead #text(fill: gold, title-hero)]
  #v(0.15em)
  #text(size: 44pt, weight: "bold", fill: white, descriptor)
  #v(-0.1em)
  #text(size: 34pt, fill: mast-soft)[Docs: #text(font: mono, tracking: mono-tr, docs-url)]
]
#place(top + left, dx: title-x, dy: head-y, exempt(title-block))
#place(top + left, dx: logo-x, dy: mast-h - gold-h - 0.45in - logo-h,
  image("assets/galaxy_logo_white.svg", height: logo-h))
// masthead gate: title block clears the logo and the gold bar
#context {
  let m = measure(title-block)
  if sys.inputs.at("noassert", default: "0") == "0" {
    assert(title-x + m.width <= logo-x - 0.3in, message: "title runs into the logo: ends at " + str(calc.round((title-x + m.width).inches(), digits: 2)) + "in")
    assert(head-y + m.height <= mast-h - gold-h - 0.3in, message: "title block runs into the gold bar")
  }
}

// ---------- thesis slip (featured: gold left bar) ----------
#let strip-h = 4.15in
#place(top + left, dx: 1.0in + sh, dy: hy + sh, rect(width: 41.8in, height: strip-h, fill: shadow-col))
#place(top + left, dx: 1.0in, dy: hy, block(width: 41.8in, height: strip-h, fill: slip,
  inset: (x: 0.8in, top: 0.55in))[
  #place(top + left, dx: -0.8in, dy: -0.55in, rect(width: 0.14in, height: strip-h, fill: gold))
  #set par(leading: 0.34em)
  #let hh(b) = hl(b, top: "cap-height", extent: 0.12em)
  #text(font: display, weight: "bold", size: 130pt, tracking: -0.02em)[gxwf type-checks #hh[tool calls] \ #hh[and connections] before any job runs.]
])
#tape(0.35in, hy - 0.3in, -16deg, w: 2.6in)
#tape(40.9in, hy - 0.25in, 14deg, w: 2.4in)

// ---------- the receipt ----------
#place(top + left, dx: rx + sh, dy: ry + sh, rect(width: rw, height: rb - ry, fill: shadow-col))
#let zig(fill) = {
  let n = 41
  let step = rw / n
  let pts = ((0pt, 0pt),)
  for i in range(n) {
    pts.push(((i + 0.5) * step, 0.26in))
    pts.push(((i + 1) * step, 0pt))
  }
  polygon(fill: fill, stroke: none, ..pts)
}
#place(top + left, dx: rx + sh, dy: rb + sh - 1pt, zig(shadow-col))
#place(top + left, dx: rx, dy: rb - 1pt, zig(slip))

#let tear-line(t) = grid(columns: (1fr, auto, 1fr), column-gutter: 0.3em, align: horizon,
  line(length: 100%, stroke: (paint: ink-soft, thickness: 2.5pt, dash: (6pt, 6pt))),
  text(font: mono, size: 28pt, tracking: 0.14em, fill: ink-soft, t),
  line(length: 100%, stroke: (paint: ink-soft, thickness: 2.5pt, dash: (6pt, 6pt))))

#let item(l, qty, r) = block(width: 100%, above: 0.36em, below: 0.36em)[
  #l#h(0.3em)#dots#h(0.3em)#box(width: 0.9in, align(right, qty))#h(0.35in)#r]
#let pass = text(weight: "bold")[PASS]
#let total(body) = block(above: 0.5em, below: 0.25em, text(weight: "bold", size: 38pt, body))

// three named tool lines, the rest folded into one
#let shown = ("fastp", "rna_star", "featurecounts")
#let named-tools = d.tools.filter(t => t.tool in shown)
#let other-tools = d.tools.filter(t => t.tool not in shown)
#let sub-qty = d.subworkflows.map(s => s.qty).sum()

#let receipt-body = [
  #set text(font: mono, size: 33pt, tracking: mono-tr)
  #set align(center)
  #text(weight: "bold", size: 64pt, tracking: 0.05em)[TYPE-CHECK RECEIPT]
  #v(-0.15em)
  #anchor("a-head")
  #ln[IWC rnaseq-pe \@ #d.iwc · gxwf #d.cli]
  #set align(left)
  #ln[#text(fill: ink-soft)[\$] gxwf validate rnaseq-pe.ga #"--connections" \ #h(1.6em)#"--strict-structure --strict-state"]
  #rule()

  #anchor("a-tools")
  #sect([TOOL CALLS], r: [QTY #h(0.6in) STATE])
  #for t in named-tools { item[#t.tool #text(fill: ink-soft)[#t.version]][#t.qty][#pass] }
  #item[#text(fill: ink-soft)[… #other-tools.len() more tools]][#other-tools.map(t => t.qty).sum()][#pass]
  #anchor("a-subs")
  #item[#text(fill: ink-soft)[inside #d.subworkflows.len() subworkflows]][#sub-qty][#pass]
  #total[Tool state: #d.tool_state.ok validated, #d.tool_state.skip skipped]
  #rule()

  #v(1fr)
  #anchor("a-conn")
  #sect([CONNECTIONS], r: [top level])
  #row[#d.map_example.from #sym.arrow fastp][map over #d.map_example.mapping]
  #row[map-overs inferred][#d.mapped]
  #row[reductions into MultiQC][#d.reductions]
  #total[Connections: #d.connections.ok ok, #d.connections.invalid invalid]
  #rule(dash: "solid")

  #v(1fr)
  #anchor("a-wall")
  #block(above: 0.4em, below: 0.2em, text(size: 84pt, weight: "bold")[#row[WALL TIME][\< 1 s]])
  #row[warm cache, #d.wall_s.n runs][#secs(d.wall_s)]
  #anchor("a-total")
  #row[jobs run to reach this verdict][#text(weight: "bold")[0]]
  #rule(dash: "solid")

  #v(1fr)
  #anchor("a-iwc")
  #sect([ALL OF IWC], r: [tool state only])
  #row[#d.iwc_tree.workflows workflows · tool calls validated][#thousands(d.iwc_tree.ok)]
  #row[failed][#d.iwc_tree.fail]
  #row[skipped: version mismatch in file][#d.iwc_tree.skip]

  #v(1fr)
  #anchor("a-void")
  #tear-line[TEAR HERE]
  #align(center)[#text(weight: "bold", size: 42pt, tracking: 0.06em)[VOID] #h(0.3em) #text(size: 28pt, fill: ink-soft)[one typo planted in each copy]]
  #let vd(t, head, body) = block(above: 0.55em, below: 0em, width: 100%)[
    #set par(leading: 0.3em)
    #tag(t, size: 28pt) #text(weight: "bold", head) \
    #pad(left: 0.5in, body)
  ]
  #anchor("a-void-param")
  #vd("FAIL")[featureCounts · paired_end_status][
    Expected #d.void_param.expected, \ actual #text(fill: stamp-ink, weight: "bold", d.void_param.actual)]
  #anchor("a-void-conn")
  #vd("INVALID")[fastp #sym.arrow STAR · paired input][
    #d.void_conn.out, \ #d.void_conn.inp]

  #v(1fr)
  #anchor("a-repair")
  #tear-line[REPRINT]
  #ln[#text(weight: "bold")[one letter restored:] #h(0.2em) #box(fill: code-bg, inset: (x: 6pt, y: 3pt))[paired_end_status: PE_fragment#text(weight: "bold", fill: pen)[s]]]
  #row[#d.repair.tool re-run, #d.repair.wall_s.n runs][#secs(d.repair.wall_s)]
  #total[Tool state: #d.repair.summary.ok validated, #d.repair.summary.fail failed]
  #v(0.3em)
  #tear-line[END OF RECEIPT]
  #anchor("a-fill")
]

#place(top + left, dx: rx, dy: ry, block(width: rw, height: rb - ry, fill: slip,
  inset: (x: 0.75in, top: 0.45in, bottom: 0.25in), receipt-body))
// "Galaxy receipt printer" mark along the top edge
#place(top + left, dx: rx, dy: ry, rect(width: rw, height: 0.06in, fill: pen))

// overflow gates: receipt text, both columns and the band end inside their boxes
#let gate(name, lim) = context {
  let y = at(name)
  if sys.inputs.at("noassert", default: "0") == "0" {
    assert(y <= lim + 1pt, message: name + " overflows: ends at " + str(calc.round(y.to-absolute().inches(), digits: 2)) + "in, limit " + str(calc.round(lim.to-absolute().inches(), digits: 2)) + "in")
  }
}
// receipt: natural height (1fr spacers measure as 0) must fit inside the slip
#context {
  let h = measure(block(width: rw - 1.5in, receipt-body)).height
  let room = rb - ry - 0.7in
  if sys.inputs.at("noassert", default: "0") == "0" {
    assert(h <= room, message: "receipt overflows by " + str(calc.round((h - room).to-absolute().inches(), digits: 2)) + "in")
  }
}

// stamps
#context {
  place(top + left, dx: rx + 8.6in, dy: at("a-tools") + 0.55in, stamp(angle: -7deg, size: 66pt, col: stamp-ok)[TYPED])
  place(top + left, dx: rx + rw - 4.3in, dy: at("a-void-conn") + 0.75in, stamp(angle: 6deg, size: 62pt)[VOID])
  place(top + left, dx: rx + rw - 4.3in, dy: at("a-repair") + 1.47in, stamp(angle: -5deg, size: 54pt, col: stamp-ok)[PASS])
}
#tape(rx - 0.7in, ry - 0.45in, -14deg)
#tape(rx + rw - 2.7in, ry - 0.45in, 12deg)

// ---------- left column: where each side checks, note 1, Format 2 card (note 2) ----------
// nf-core metro map cropped to its entrance (source px), beside the Galaxy editor graph
#let nf-w = 6.5in
#let nf-crop = (x0: 60, y0: 135, cw: 720, ch: 330)
#let gx-w = cwl - nf-w - 0.7in
#let gx-crop = (x0: 330, y0: 300, cw: 900, ch: 720)
#let pics = grid(columns: (nf-w + 0.3in, gx-w + 0.3in), column-gutter: 0.1in, align: top,
  block(fill: white, inset: 0.15in, radius: r-small, stroke: 1pt + rule-col)[#anchor("nf-img")#crop("assets/rnaseq-nfcore-arrows.png", 2324, 970, nf-crop.x0, nf-crop.y0, nf-crop.cw, nf-crop.ch, nf-w)
    #v(-0.1em)
    #text(size: 28pt, weight: "bold")[nf-core/rnaseq: #text(fill: stamp-ink)[one] arrow]],
  block(fill: white, inset: 0.15in, radius: r-small, stroke: 1pt + rule-col)[#crop("assets/rnaseq-gx-arrows.png", 1756, 1740, gx-crop.x0, gx-crop.y0, gx-crop.cw, gx-crop.ch, gx-w)
    #v(-0.1em)
    #text(size: 28pt, weight: "bold")[Galaxy: #text(fill: stamp-ink)[arrows everywhere]]],
)

#let bamx = d.bamx
#let fmt2-card = paper-slip(cwl - 0.2in, angle: 0.6deg, inset: (x: 0.4in, y: 0.32in))[
  #set text(font: mono, size: 28pt, tracking: mono-tr)
  #set par(leading: 0.3em)
  #text(weight: "bold")[.ga] #text(fill: ink-soft)[#d.raw_state_len characters, one string]
  #code-box["tool_state": "{\\"alignment\\": {\\"\_\_class\_\_\\": \\"Connected …]
  #text(weight: "bold")[Format 2] #text(fill: ink-soft)[same step, excerpt]
  #code-box[
    state: \
    #h(1em)pe_parameters: \
    #h(2em)paired_end_status: #hl[PE_fragments]
  ]
  #tear-line[A TYPO IN FORMAT 2]
  #anchor("a-bamx")
  #text(fill: ink-soft)[IWC chipseq-sr, MACS2 step:] #box(fill: code-bg, inset: (x: 6pt, y: 3pt))[format: #text(weight: "bold", fill: stamp-ink)[BAMX]] \
  #text(fill: ink-soft)[\$] gxwf validate chipseq-sr.gxwf.yml \ #h(1.6em)#"--connections --strict" \
  #v(0.15em)
  #tag("FAIL", size: 28pt) #text(weight: "bold")[#bamx.tool · format]
  #pad(left: 0.5in)[
    #for n in bamx.named [Expected "#n", actual "BAMX" \ ]
    #text(fill: ink-soft)[\+ #bamx.extra more union-branch line]]
  #text(fill: ink-soft)[unplanted file:] #text(weight: "bold")[#bamx.fixed.ok validated, #bamx.fixed_conn.ok ok]
]

#let left-col = block(width: cwl, height: colb - ry)[
  #v(0.25in)
  #pics
  #v(1fr)
  #note("n1", 1, [Most checks stop at the entrance])[
    nf-schema checks the pipeline's own parameters (circled); flags inside each process are free text, as in Snakemake and WDL. In Galaxy, gxwf can #hl[type each tool call and each connection].
  ]
  #v(1fr)
  #note("n6", 2, [Format 2 makes the types writable])[
    Readable YAML, so good for humans and agents alike.
  ]
  #v(0.15in)
  #fmt2-card
  #anchor("c-left-end")
]
#place(top + left, dx: lx, dy: ry, left-col)

// pen ellipse around nf-core's single check (the red arrow at the FASTQ entrance; source px ~ (183, 250))
#context {
  let s = nf-w / nf-crop.cw
  let (ax, ay) = ((183 - nf-crop.x0) * s, (250 - nf-crop.y0) * s)
  let (ew, eh) = (1.35in, 1.75in)
  place(top + left, dx: lx + 0.15in + ax - ew / 2, dy: at("nf-img") + 0.15in + ay - eh / 2,
    rotate(-10deg, reflow: false, ellipse(width: ew, height: eh, stroke: (paint: pen, thickness: 6pt))))
}

// ---------- right column: notes 3-7, get started, references ----------
// references on a gx-deep footer card (the footer band, kept inside the right column)
#let refs = exempt(block(width: cwr, fill: ink-deep, radius: r-card, inset: (x: 0.3in, y: 0.24in))[
  #set text(size: 24pt, fill: white)
  #set par(leading: 0.26em, spacing: 0.3em, hanging-indent: 1.1em)
  Metro map: nf-core/rnaseq, CC BY; arrow added. Galaxy graph: Galaxy workflow editor; arrows added. \
  Workflows: github.com/galaxyproject/iwc \@ #d.iwc. Validator: npm \@galaxy-tool-util/cli #d.cli. \
  Source: github.com/jmchilton/galaxy-tool-util-ts
])

#let cmd(body) = block(above: 0.2em, below: 0.45em, fill: code-bg, radius: r-small, stroke: 1pt + grid-minor, inset: (x: 0.12in, y: 0.12in), width: 100%, text(font: mono, tracking: mono-tr, body))
#let start-slip = paper-slip(cwr, angle: -0.5deg, inset: (x: 0.3in, y: 0.32in))[
  #set text(size: 30pt)
  #set par(leading: 0.28em)
  #anchor("a-start")
  #text(weight: "bold", size: 44pt, tracking: 0.02em)[GET STARTED]
  #rule()
  #text(weight: "bold")[Install] #text(fill: ink-soft)[(Node.js)]
  #cmd[npm install -g \@galaxy-tool-util/cli]
  #text(weight: "bold")[Cache the tool schemas it uses]
  #cmd[galaxy-tool-cache populate-workflow \ #h(1em)my-wf.gxwf.yml]
  #text(weight: "bold")[Check it, wiring included]
  #cmd[gxwf validate my-wf.gxwf.yml \ #h(1em)#"--connections --strict"]
  #text(weight: "bold")[Check a whole repository] #text(fill: ink-soft)[(tool state)]
  #cmd[gxwf validate-tree workflows/ \ #h(1em)#"--strict-state"]
  #text(weight: "bold")[Turn a .ga into Format 2]
  #cmd[gxwf convert my-wf.ga #"--to" format2]
]

#let right-col = block(width: cwr, height: rcolb - ry)[
  #v(0.9in)
  #note("n2", 3, [Types from the Tool Shed])[
    It serves #hl[typed schemas for 10,000+] community tools: names, types, select options, conditionals, collections.
  ]
  #v(1fr)
  #note("n3", 4, [Connections carry collection algebra])[
    A list of pairs into a paired input: a map-over, #hl[inferred]. A flat list into a paired input: rejected.
  ]
  #v(1fr)
  #note("n4", 5, [One validator, everywhere])[
    The CLI and the gxwf-web browser app run one TypeScript core; the Galaxy Workflows VS Code extension's main branch reuses its tool-state checks. #hl[Under a second], so an agent can repair in a tight loop.
  ]
  #v(1fr)
  #note("n-ci", 6, [Runs in CI])[
    No Python, no Galaxy server. Fill the tool cache, then validate-tree checks a whole repository's tool state, as for all of IWC on the receipt. Any failure #hl[#box[exits non-zero]], with a JSON or Markdown report for the log.
  ]
  #v(1fr)
  #note("n5", 7, [Caught before compute])[
    A one-letter typo fails before any job is queued. Restore it and the re-run passes in under a second.
  ]
  #v(1fr)
  #start-slip
  #v(0.4in)
  #refs
  #anchor("c-right-end")
]
#place(top + left, dx: sx, dy: ry, right-col)

// ---------- band: where gxwf fits ----------
#let arr = text(size: 56pt, weight: "bold", fill: pen)[#sym.arrow.r]
// stations: open = white, gx-primary ring; gate (a gxwf check) = gx-dark, gold ring; cap = what happens there
#let st-w = 5.7in
#let st(name, t: none, cap: none, kind: "open", w: st-w) = {
  let (fill, ring, fg, tcol, ccol) = if kind == "gate" { (ink, 4pt + gold, white, gold, white) } else { (slip, 3pt + pen, ink, pen, ink-soft) }
  box(width: w, fill: fill, stroke: ring, radius: r-small, inset: (x: 0.22in, y: 0.2in))[
    #set par(leading: 0.24em)
    #set align(center)
    #text(size: 48pt, weight: "bold", fill: fg, name)
    #if t != none { v(-0.05em); tag(t, col: tcol, size: 28pt) }
    #if cap != none { v(0.1em); text(size: 30pt, fill: ccol, cap) }
  ]
}
#let flow(..cells) = {
  let xs = cells.pos()
  let out = ()
  for (i, c) in xs.enumerate() {
    if i > 0 { out.push(arr) }
    out.push(c)
  }
  grid(columns: out.len(), column-gutter: 0.16in, align: horizon, ..out)
}
#let loop-box = box(stroke: (paint: info, thickness: 4pt, dash: (16pt, 10pt)), radius: r-card,
  inset: (x: 0.25in, top: 0.14in, bottom: 0.25in))[
  #text(font: hand, weight: "bold", size: 44pt, fill: pen)[#text(font: mono)[#sym.arrow.ccw] until it passes, under a second a lap]
  #v(-0.15em)
  #flow(st([check], t: "gxwf validate", cap: [each tool call's state, then the wiring], kind: "gate"),
    st([fix], cap: [the error names the parameter and what it allows]))
]

#let band-body = [
  #set text(size: 32pt)
  #set par(leading: 0.34em)
  #text(font: display, weight: "bold", size: 72pt, tracking: -0.02em)[Where gxwf fits]
  #v(0.1em)
  #block(width: 100%)[gxwf lives in the inner loop of writing a workflow, by hand or by an agent. A check needs no Galaxy server and takes under a second on a warm cache, so it can run after every edit. #hl[Only a workflow that passes moves on] to real tests.]
  #v(1fr)
  #flow(st([draft], t: "Format 2 · .ga", cap: [by hand, in an editor, or by an agent]), loop-box,
    st([test], t: "validate-tests · Planemo", cap: [real data, real jobs on Galaxy], kind: "gate", w: 7.0in))
  #v(1fr)
  #grid(columns: (1fr, 1.2fr), column-gutter: 0.7in, align: top,
    block[#set par(leading: 0.3em)
      #text(weight: "bold")[One example.] In the Galaxy Workflow Foundry, an agent drafts Format 2 and runs gxwf after each step it writes.],
    block[#set text(font: hand, size: 42pt, fill: pen)
      #set par(leading: 0.22em)
      Types aren't biology: a type check can't tell that a spliced aligner is the wrong tool for a bacterial genome. A workflow that validates still needs real tests and a person's review.])
  #v(0.2em)
  #anchor("c-band-end")
]
// featured card: 0.25in radius, offset shadow, gold left bar
#place(top + left, dx: bx + sh, dy: by + sh, rect(width: bw, height: bh, radius: r-card, fill: shadow-col))
#place(top + left, dx: bx, dy: by, block(width: bw, height: bh, fill: slip, radius: r-card, stroke: 1pt + rule-col, clip: true,
  inset: (x: 0.55in, top: 0.4in, bottom: 0.3in))[
  #place(top + left, dx: -0.55in, dy: -0.4in, rect(width: 0.14in, height: bh, fill: gold))
  #band-body])
#tape(bx - 0.75in, by - 0.75in, -12deg, w: 2.4in)
#tape(bx + bw - 2.2in, by - 0.4in, 10deg, w: 2.6in)

#gate("c-left-end", colb)
#gate("c-right-end", rcolb)
#gate("c-band-end", by + bh - 0.2in)

// ---------- arrows onto receipt lines ----------
#context {
  let L(id, target, tdy: 0.3in, ady: 0.5in, bend: 0.1) = draw-arrow(lx + cwl + 0.1in, at(id) + ady, rx + 0.45in, at(target) + tdy, bend: bend)
  let R(id, target, tdy: 0.3in, ady: 0.5in, bend: 0.1) = draw-arrow(sx - 0.15in, at(id) + ady, rx + rw - 0.45in, at(target) + tdy, bend: -bend)
  L("n1", "a-tools", tdy: 1.5in, bend: -0.08)
  R("n2", "a-tools", tdy: 0.9in)
  R("n3", "a-conn", tdy: 0.9in)
  R("n4", "a-wall", tdy: 0.6in)
  R("n-ci", "a-iwc", tdy: 0.3in)
  R("n5", "a-repair", tdy: 0.9in)
}

// tape the pictures down
#context {
  let y = at("nf-img")
  tape(lx - 0.5in, y - 0.45in, -12deg, w: 2.6in)
  tape(lx + cwl - 2.0in, y - 0.45in, 10deg, w: 2.6in)
}

// safe-zone gate: content boxes stay 1in inside the trim (tape and grid are decoration)
#assert(head-y >= 1in and title-x >= 1in and lx >= 1in and bx >= 1in and sx + cwr <= 43in and rx + rw + 0.14in <= 43in and rcolb <= 43in
  and colb <= by and rb + 0.42in <= by and by + bh + 0.14in <= 43in and bx + bw + 0.14in <= sx,
  message: "content outside the 1in safe zone or overlapping")

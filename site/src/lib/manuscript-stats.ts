/**
 * Build-time word + figure counts for a manuscript's header band.
 * Approximate by design — strips frontmatter, code fences, images, and inline
 * markup, then counts whitespace-delimited tokens; figures are the distinct
 * `**Figure N**` captions (the same captions the cross-ref plugin anchors).
 */
export interface ManuscriptStats {
  words: number;
  figures: number;
}

export function manuscriptStats(body: string): ManuscriptStats {
  const figures = new Set<string>();
  for (const m of body.matchAll(/^\*\*Figure\s+(\d+)\b/gm)) figures.add(m[1]);

  const prose = body
    .replace(/^---\n[\s\S]*?\n---\n/, '')      // frontmatter
    .replace(/```[\s\S]*?```/g, ' ')            // fenced code
    .replace(/`[^`]*`/g, ' ')                   // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // images
    .replace(/<[^>]+>/g, ' ')                   // raw html
    .replace(/[#*_>|\-]+/g, ' ');               // md punctuation
  const words = prose.split(/\s+/).filter(Boolean).length;

  return { words, figures: figures.size };
}

/** "7,200" — words rounded to the nearest 100 for a header pill. */
export function roundWords(n: number): string {
  return (Math.round(n / 100) * 100).toLocaleString('en-US');
}

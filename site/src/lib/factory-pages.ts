// Factory landing pages: URL slug -> factoryFiles entry id, plus hub card copy.

export interface FactoryPage {
  slug: string;
  source: string;
  title: string;
  blurb: string;
}

export const FACTORY_HUB_SOURCE = 'FACTORY';

export const FACTORY_README_URL =
  'https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/factory/README.md';

export const FACTORY_PAGES: FactoryPage[] = [
  {
    slug: 'galaxy-branches',
    source: 'BRANCH_FACTORY',
    title: "John's Galaxy Brain Branch Factory",
    blurb: 'How an issue becomes a Galaxy pull request: triage, implementation, hardening checks, and branch management.',
  },
  {
    slug: 'galaxy-reviews',
    source: 'REVIEW_FACTORY',
    title: "John's Galaxy Brain Review Factory",
    blurb: 'How a Galaxy pull request review is produced: reviewer profiles, verified findings, and the response John posts.',
  },
  {
    slug: 'differential-review',
    source: 'DIFFERENTIAL_REVIEW',
    title: "John's Galaxy Brain Differential Review",
    blurb: 'How agents snapshot each branch after every phase, so John checks work off once and later reads only what changed.',
  },
];

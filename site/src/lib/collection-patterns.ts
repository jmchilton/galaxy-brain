// Content collection glob patterns (tinyglobby via Astro's glob() loader),
// kept out of content.config.ts so they can be tested.

export const VAULT_PATTERN = [
  '**/*.md', '!Dashboard.md', '!Index.md', '!log.md',
  '!.obsidian/**', '!templates/**', '!agents/**', '!repositories/**',
  // `!(index).md` alone misses sub-files whose names start with "index";
  // `!(index.md)` would also match (and prune) the project directories.
  '!projects/**/!(index).md', '!papers/**/!(index).md',
  '!projects/**/index?*.md', '!papers/**/index?*.md',
];

export const PROJECT_FILES_PATTERN = ['projects/**/*.md', '!projects/**/index.md'];

export const PAPER_FILES_PATTERN = ['papers/**/*.md', '!papers/**/index.md'];

export const REPOSITORY_FILES_PATTERN = ['repositories/**/*.md'];

// The one published slice of agents/: reader-facing factory landing pages.
export const FACTORY_FILES_PATTERN = ['agents/factory/FACTORY.md', 'agents/factory/*_FACTORY.md', 'agents/factory/DIFFERENTIAL_REVIEW.md'];

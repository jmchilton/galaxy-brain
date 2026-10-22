import { defineCollection, z } from 'astro:content';
import { fileURLToPath } from 'node:url';
import { glob, type Loader } from 'astro/loaders';
import { slugifyPath, vaultPathToSlug } from './lib/vault-urls';
import {
  FACTORY_FILES_PATTERN,
  PAPER_FILES_PATTERN,
  PROJECT_FILES_PATTERN,
  REPOSITORY_FILES_PATTERN,
  VAULT_PATTERN,
} from './lib/collection-patterns';
import { filterWatcher, patternMatcher } from './lib/watch-filter';

const VAULT_BASE = '../vault';

/** glob() over the vault whose dev watcher honors `!` excludes (Astro's own re-check ORs them). */
function vaultGlob(pattern: string[], generateId: (entry: string) => string): Loader {
  const loader = glob({ pattern, base: VAULT_BASE, generateId: ({ entry }) => generateId(entry) });
  const matches = patternMatcher(pattern);
  return {
    ...loader,
    load: (context) => loader.load({
      ...context,
      watcher: context.watcher
        && filterWatcher(context.watcher, fileURLToPath(new URL(VAULT_BASE, context.config.root)), matches),
    }),
  };
}

const noteTypeSchema = z.enum(['research', 'plan', 'plan-section', 'concept', 'moc', 'project', 'paper']);
const statusSchema = z.enum(['draft', 'reviewed', 'revised', 'stale', 'archived']);
const paperStageSchema = z.enum(['idea', 'outline', 'evidence', 'drafting', 'preprint', 'submitted', 'published']);
const paperKindSchema = z.enum(['application-note', 'software', 'methods', 'perspective', 'white-paper', 'review']);

const vault = defineCollection({
  loader: vaultGlob(VAULT_PATTERN, vaultPathToSlug),
  schema: z.object({
    type: noteTypeSchema,
    tags: z.array(z.string()),
    status: statusSchema,
    created: z.coerce.date(),
    revised: z.coerce.date(),
    revision: z.number(),
    ai_generated: z.boolean(),
    summary: z.string().min(20).max(160),
    // Optional fields
    subtype: z.string().optional(),
    title: z.string().optional(),
    component: z.string().optional(),
    galaxy_areas: z.array(z.string()).optional(),
    github_issue: z.union([z.number(), z.array(z.number())]).optional(),
    github_pr: z.number().optional(),
    github_repo: z.string().optional(),
    related_issues: z.array(z.string()).optional(),
    related_notes: z.array(z.string()).optional(),
    related_prs: z.array(z.union([z.string(), z.number()])).optional(),
    parent_plan: z.string().optional(),
    parent_feature: z.string().optional(),
    section: z.string().optional(),
    short_title: z.string().optional(),
    paper_stage: paperStageSchema.optional(),
    paper_kind: paperKindSchema.optional(),
    target_venue: z.string().optional(),
    central_claim: z.string().optional(),
    preprint_url: z.string().optional(),
    manuscript_url: z.string().optional(),
    related_projects: z.array(z.string()).optional(),
    authors: z.array(z.object({
      name: z.string(),
      orcid: z.string().url().optional(),
      confirmed: z.boolean().optional(),
    })).optional(),
    aliases: z.array(z.string()).optional(),
    sources: z.array(z.string().min(1)).min(1).optional(),
    branch: z.string().optional(),
    unresolved_questions: z.number().optional(),
    resolves_question: z.number().optional(),
  })
});

const projectFiles = defineCollection({
  loader: vaultGlob(PROJECT_FILES_PATTERN, slugifyPath),
  schema: z.object({}).passthrough()
});

const paperFiles = defineCollection({
  loader: vaultGlob(PAPER_FILES_PATTERN, slugifyPath),
  schema: z.object({}).passthrough()
});

// Branch, issue, and review records. Ids drop the status directory so a
// record's URL survives moves between statuses.
const repositoryFiles = defineCollection({
  loader: vaultGlob(REPOSITORY_FILES_PATTERN, vaultPathToSlug),
  schema: z.object({}).passthrough()
});

// Factory landing pages; ids are the bare file stem (e.g. BRANCH_FACTORY).
const factoryFiles = defineCollection({
  loader: vaultGlob(FACTORY_FILES_PATTERN, entry => entry.split('/').pop()!.replace(/\.md$/, '')),
  schema: z.object({}).passthrough()
});

export const collections = { vault, projectFiles, paperFiles, repositoryFiles, factoryFiles };

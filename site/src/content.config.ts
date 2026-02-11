import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const vault = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!Dashboard.md', '!.obsidian/**', '!templates/**'],
    base: '../vault',
    generateId({ entry }) {
      return entry.replace(/\.md$/, '').split('/')
        .map(s => s.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-'))
        .join('/');
    }
  }),
  schema: z.object({
    type: z.string(),
    tags: z.array(z.string()),
    status: z.string(),
    created: z.coerce.date(),
    revised: z.coerce.date(),
    revision: z.number(),
    ai_generated: z.boolean(),
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
    aliases: z.array(z.string()).optional(),
    branch: z.string().optional(),
    unresolved_questions: z.number().optional(),
    resolves_question: z.number().optional(),
  })
});

export const collections = { vault };

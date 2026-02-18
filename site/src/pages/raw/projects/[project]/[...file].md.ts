import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('projectFiles');
  return entries.map(entry => {
    const parts = entry.id.split('/');
    const project = parts[1];
    const file = parts.slice(2).join('/');
    return {
      params: { project, file },
      props: { entry },
    };
  });
};

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: { body?: string } };
  return new Response(entry.body ?? '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

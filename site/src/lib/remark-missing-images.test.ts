import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Root } from 'mdast';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import remarkMissingImages from './remark-missing-images';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'missing-images-'));
  fs.mkdirSync(path.join(dir, 'screenshots'));
  fs.writeFileSync(path.join(dir, 'screenshots', 'there.png'), '');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function run(urls: string[]): Root {
  const tree: Root = {
    type: 'root',
    children: [{
      type: 'paragraph',
      children: urls.map(url => ({ type: 'image' as const, url, alt: `alt ${url}` })),
    }],
  };
  remarkMissingImages()(tree, { path: path.join(dir, 'note.md'), history: [] } as any);
  return tree;
}

describe('remarkMissingImages', () => {
  it('replaces a relative image whose file is missing with a text placeholder', () => {
    const tree = run(['screenshots/gone.png']);
    expect((tree.children[0] as any).children).toEqual([
      { type: 'emphasis', children: [{ type: 'text', value: '[image not published: alt screenshots/gone.png (screenshots/gone.png)]' }] },
    ]);
  });

  it('keeps relative images that exist, remote images, and data URIs', () => {
    const urls = ['screenshots/there.png', 'https://example.org/a.png', '/abs/a.png', 'data:image/png;base64,AAAA'];
    const tree = run(urls);
    expect((tree.children[0] as any).children.map((n: any) => n.type)).toEqual(['image', 'image', 'image', 'image']);
  });

  it('decodes URL-encoded paths before checking', () => {
    fs.writeFileSync(path.join(dir, 'screenshots', 'with space.png'), '');
    const tree = run(['screenshots/with%20space.png']);
    expect((tree.children[0] as any).children[0].type).toBe('image');
  });
});

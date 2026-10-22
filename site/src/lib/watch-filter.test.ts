import { EventEmitter } from 'node:events';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PAPER_FILES_PATTERN, VAULT_PATTERN } from './collection-patterns';
import { filterWatcher, patternMatcher } from './watch-filter';

describe('patternMatcher', () => {
  it('treats ! patterns as excludes, not as alternatives', () => {
    const vault = patternMatcher(VAULT_PATTERN);
    expect(vault('research/note.md')).toBe(true);
    expect(vault('repositories/galaxy/issues/queued/24350/debrief.md')).toBe(false);
    expect(vault('agents/factory/BRANCH_FACTORY.md')).toBe(false);
    expect(patternMatcher(PAPER_FILES_PATTERN)('agents/factory/.playwright-mcp/page.yml')).toBe(false);
    expect(patternMatcher(PAPER_FILES_PATTERN)('papers/gxwf/manuscript.md')).toBe(true);
  });
});

describe('filterWatcher', () => {
  const base = path.resolve('/vault');

  it('drops add/change/unlink events for paths outside the pattern', () => {
    const emitter = new EventEmitter();
    const watcher = filterWatcher(emitter as any, base, patternMatcher(VAULT_PATTERN));
    const onChange = vi.fn();
    watcher.on('change', onChange);
    watcher.on('unlink', onChange);
    emitter.emit('change', path.join(base, 'repositories/galaxy/issues/queued/24350/debrief.md'));
    emitter.emit('unlink', path.join(base, 'agents/factory/TODO.md'));
    expect(onChange).not.toHaveBeenCalled();
    emitter.emit('change', path.join(base, 'research/note.md'));
    expect(onChange).toHaveBeenCalledWith(path.join(base, 'research/note.md'));
  });

  it('passes through other events and methods', () => {
    const emitter = new EventEmitter();
    const watcher = filterWatcher(emitter as any, base, () => false);
    const onReady = vi.fn();
    watcher.on('ready', onReady);
    emitter.emit('ready');
    expect(onReady).toHaveBeenCalled();
    expect(watcher.listenerCount('ready')).toBe(1);
  });
});

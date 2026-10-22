import path from 'node:path';
import type { FSWatcher } from 'vite';
import picomatch from 'picomatch';

const FILE_EVENTS = new Set(['add', 'change', 'unlink']);

/** Match a vault-relative path like tinyglobby: any positive pattern, minus `!` patterns. */
export function patternMatcher(pattern: string[]): (rel: string) => boolean {
  const positives = pattern.filter(p => !p.startsWith('!'));
  const ignore = pattern.filter(p => p.startsWith('!')).map(p => p.slice(1));
  return picomatch(positives, { ignore });
}

/**
 * Drop file events for paths outside a collection's pattern.
 * Astro's glob loader re-checks changed paths with `picomatch.isMatch(path, patterns)`, which ORs `!` patterns.
 */
export function filterWatcher(watcher: FSWatcher, base: string, matches: (rel: string) => boolean): FSWatcher {
  return new Proxy(watcher, {
    get(target, prop, receiver) {
      if (prop === 'on') {
        return (event: string, listener: (file: string, ...rest: unknown[]) => unknown) => {
          const wrapped = FILE_EVENTS.has(event)
            ? (file: string, ...rest: unknown[]) => {
                const rel = path.relative(base, file).split(path.sep).join('/');
                return matches(rel) ? listener(file, ...rest) : undefined;
              }
            : listener;
          target.on(event, wrapped);
          return receiver;
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

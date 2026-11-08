// A review round's findings YAML: types, a strict closed decoder over parsed data, and lookups. No Node imports.

export const ACTIONS = [
  "approve",
  "approve_and_merge",
  "comment",
  "review_comment",
  "request_changes",
  "pull_request",
  "push",
  "issue_refactor",
  "issue_galaxy_brain",
] as const;
export type Action = (typeof ACTIONS)[number];
export const COMMENT_ACTIONS: readonly Action[] = ["approve", "approve_and_merge", "comment", "review_comment", "request_changes"];

export const FILTER_CATEGORIES = ["disproved", "not_actionable", "relitigates_pr", "pre_existing", "comment_nit", "doctest", "prop_vitest"] as const;
export type FilterCategory = (typeof FILTER_CATEGORIES)[number];
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

export const POSTABLE_ID = /^P([123]) ([1-9]\d*)$/;
export const FILTERED_ID = /^F([1-9]\d*)$/;
const SHORT_SHA = /^[0-9a-f]{7,40}$/;
const FULL_SHA = /^[0-9a-f]{40}$/;

export interface Agent { profile: string; path: string; model: string; effort: string }
export interface Run { model: string; effort: string }
export interface Discovery { profile: string; model: string; effort: string }
export interface Commit { sha: string; subject: string; detail?: string; findings: string[] }
export interface Branch { name: string; revision: number; head: string; pr_title?: string; description?: string; commits: Commit[] }
export interface Filtered { category: FilterCategory; reason: string }
export interface Finding {
  id: string;
  include: boolean;
  title: string;
  summary: string;
  implementation_verified: boolean;
  issue?: string;
  issue_details?: string;
  evidence?: string;
  fix?: string;
  fix_details?: string;
  discovered_by: Discovery[];
  filtered?: Filtered;
}
export interface FindingsFile {
  round: number;
  reviewed_commit: string;
  agents: Agent[];
  verification: Run;
  followup_target?: string;
  branches: Branch[];
  actions: Record<Action, boolean>;
  findings: Finding[];
}

export const FINDING_TEXT_FIELDS = ["issue", "issue_details", "evidence", "fix", "fix_details"] as const;

const UNKNOWN_HINT = " (a dedented line inside a block scalar becomes a key; indent it)";

type Obj = Record<string, unknown>;

const sub = (path: string, key: string): string => (path ? `${path}.${key}` : key);

class Decoder {
  readonly errors: string[] = [];

  fail(path: string, message: string): void {
    this.errors.push(path ? `${path}: ${message}` : message);
  }

  /** The mapping at `path`, after reporting unknown and missing keys. */
  object(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Obj | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      this.fail(path, "expected a mapping");
      return null;
    }
    const obj = value as Obj;
    for (const key of Object.keys(obj)) if (!required.includes(key) && !optional.includes(key)) this.fail(path, `unknown key ${JSON.stringify(key)}${UNKNOWN_HINT}`);
    for (const key of required) if (obj[key] == null) this.fail(path, `missing ${key}`);
    return obj;
  }

  string(obj: Obj, key: string, path: string, pattern?: RegExp, what?: string): string | undefined {
    const value = obj[key];
    if (value == null) return undefined;
    if (typeof value !== "string" || !value.trim()) {
      this.fail(sub(path, key), "expected non-empty text");
      return undefined;
    }
    if (pattern && !pattern.test(value)) this.fail(sub(path, key), `${JSON.stringify(value)} isn't ${what}`);
    return value;
  }

  oneOf<T extends string>(obj: Obj, key: string, path: string, values: readonly T[]): T | undefined {
    const value = obj[key];
    if (value == null) return undefined;
    if (typeof value !== "string" || !values.includes(value as T)) {
      this.fail(sub(path, key), `${JSON.stringify(value)} isn't one of ${values.join(", ")}`);
      return undefined;
    }
    return value as T;
  }

  boolean(obj: Obj, key: string, path: string): boolean | undefined {
    const value = obj[key];
    if (value == null) return undefined;
    if (typeof value !== "boolean") this.fail(sub(path, key), `expected true or false, not ${JSON.stringify(value)}`);
    return value === true;
  }

  count(obj: Obj, key: string, path: string): number | undefined {
    const value = obj[key];
    if (value == null) return undefined;
    if (!Number.isInteger(value) || (value as number) < 0) this.fail(sub(path, key), "expected a whole number");
    return value as number;
  }

  list(obj: Obj, key: string, path: string, min = 0): unknown[] {
    const value = obj[key];
    if (value == null) return [];
    if (!Array.isArray(value)) {
      this.fail(sub(path, key), "expected a list");
      return [];
    }
    if (value.length < min) this.fail(sub(path, key), `expected at least ${min}`);
    return value;
  }
}

function decodeRun(d: Decoder, value: unknown, path: string, extra: string[] = []): Obj | null {
  const obj = d.object(value, path, [...extra, "model", "effort"]);
  if (!obj) return null;
  for (const key of extra) d.string(obj, key, path);
  d.string(obj, "model", path);
  d.oneOf(obj, "effort", path, EFFORTS);
  return obj;
}

function decodeBranch(d: Decoder, value: unknown, path: string): void {
  const obj = d.object(value, path, ["name", "revision", "head", "commits"], ["pr_title", "description"]);
  if (!obj) return;
  d.string(obj, "name", path);
  d.count(obj, "revision", path);
  d.string(obj, "head", path, SHORT_SHA, "a commit SHA");
  d.string(obj, "pr_title", path);
  d.string(obj, "description", path);
  d.list(obj, "commits", path).forEach((commit, i) => {
    const at = `${path}.commits[${i}]`;
    const c = d.object(commit, at, ["sha", "subject", "findings"], ["detail"]);
    if (!c) return;
    d.string(c, "sha", at, SHORT_SHA, "a commit SHA");
    d.string(c, "subject", at);
    d.string(c, "detail", at);
    d.list(c, "findings", at, 1).forEach((id, j) => {
      if (typeof id !== "string" || !(POSTABLE_ID.test(id) || FILTERED_ID.test(id))) d.fail(`${at}.findings[${j}]`, `${JSON.stringify(id)} isn't a finding id`);
    });
  });
}

function decodeFinding(d: Decoder, value: unknown, path: string): void {
  const rawId = value && typeof value === "object" ? (value as Obj).id : undefined;
  const at = typeof rawId === "string" ? `${path} (${rawId})` : path;
  const obj = d.object(value, at, ["id", "include", "title", "summary", "discovered_by"], ["implementation_verified", ...FINDING_TEXT_FIELDS, "filtered"]);
  if (!obj) return;
  d.string(obj, "id", at, /^(P[123] [1-9]\d*|F[1-9]\d*)$/, "P<priority> <n> or F<n>");
  d.boolean(obj, "include", at);
  d.string(obj, "title", at);
  d.string(obj, "summary", at);
  d.boolean(obj, "implementation_verified", at);
  for (const key of FINDING_TEXT_FIELDS) d.string(obj, key, at);
  d.list(obj, "discovered_by", at, 1).forEach((one, i) => decodeRun(d, one, `${at}.discovered_by[${i}]`, ["profile"]));
  if (obj.filtered != null) {
    const f = d.object(obj.filtered, `${at}.filtered`, ["category", "reason"]);
    if (f) {
      d.oneOf(f, "category", `${at}.filtered`, FILTER_CATEGORIES);
      d.string(f, "reason", `${at}.filtered`);
    }
  }
}

/** Shape errors in parsed findings YAML; the file is returned only when there are none. */
export function decodeFindings(data: unknown): { file: FindingsFile | null; errors: string[] } {
  const d = new Decoder();
  const root = d.object(data, "", ["round", "reviewed_commit", "agents", "verification", "actions", "findings"], ["followup_target", "branches"]);
  if (root) {
    d.count(root, "round", "");
    d.string(root, "reviewed_commit", "", FULL_SHA, "a full 40-character SHA");
    d.list(root, "agents", "", 1).forEach((agent, i) => decodeRun(d, agent, `agents[${i}]`, ["profile", "path"]));
    decodeRun(d, root.verification, "verification");
    d.string(root, "followup_target", "");
    d.list(root, "branches", "").forEach((branch, i) => decodeBranch(d, branch, `branches[${i}]`));
    const actions = d.object(root.actions, "actions", ACTIONS);
    if (actions) for (const action of ACTIONS) d.boolean(actions, action, "actions");
    d.list(root, "findings", "").forEach((finding, i) => decodeFinding(d, finding, `findings[${i}]`));
  }
  if (d.errors.length) return { file: null, errors: d.errors };
  const file = data as FindingsFile;
  return {
    file: {
      ...file,
      branches: file.branches ?? [],
      findings: (file.findings ?? []).map((f) => ({ ...f, implementation_verified: f.implementation_verified ?? false })),
    },
    errors: [],
  };
}

export type ParsedId = { kind: "P"; priority: number; n: number } | { kind: "F"; n: number };

export function parseId(id: string): ParsedId | null {
  const p = POSTABLE_ID.exec(id);
  if (p) return { kind: "P", priority: Number(p[1]), n: Number(p[2]) };
  const f = FILTERED_ID.exec(id);
  return f ? { kind: "F", n: Number(f[1]) } : null;
}

const idOrder = (id: string): number => {
  const parsed = parseId(id);
  return !parsed ? Infinity : parsed.kind === "P" ? parsed.priority * 1e6 + parsed.n : 4e6 + parsed.n;
};

export const byId = (a: Finding, b: Finding): number => idOrder(a.id) - idOrder(b.id);

/** The branch revision compose and trim work against. */
export const latestBranch = (file: FindingsFile): Branch | undefined => file.branches.at(-1);

export const includedFindings = (file: FindingsFile): Finding[] => file.findings.filter((f) => f.include).sort(byId);

export const isFiltered = (finding: Finding): boolean => FILTERED_ID.test(finding.id);

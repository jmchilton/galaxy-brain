"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GalaxyBrainPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// ../site/src/lib/records.ts
var RECORD_KINDS = ["branches", "issues", "reviews"];
var DEFAULTS_REPO = "_defaults";
function parseRecordPath(rel) {
  const parts = rel.split("/");
  if (parts[0] !== "repositories" || parts.length < 5) return null;
  const kind = parts[2];
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: parts[1], kind, status: parts[3], id: parts[4], rest: parts.slice(5).join("/") };
}
var KIND_LABELS = {
  branches: "Branches",
  issues: "Issues",
  reviews: "Reviews"
};
var STATUS_ORDER = {
  branches: ["active", "merged", "abandoned"],
  issues: ["needs_decision", "queued", "wip", "blocked", "delegated", "closed"],
  reviews: ["active", "archived"]
};
var TERMINAL_STATUSES = /* @__PURE__ */ new Set(["merged", "abandoned", "archived", "closed"]);
function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}
function statusLabel(status) {
  return status.replace(/_/g, " ");
}
function recordTitle(body) {
  const m = body?.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1] : null;
}
function compareNames(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isInteger(nb)) return nb - na;
  return a.localeCompare(b, void 0, { sensitivity: "base" });
}
function groupByStatus(records, kind) {
  const byStatus = /* @__PURE__ */ new Map();
  for (const record of records) {
    if (record.kind !== kind) continue;
    byStatus.set(record.status, [...byStatus.get(record.status) ?? [], record]);
  }
  const known = STATUS_ORDER[kind];
  const statuses = [...byStatus.keys()].sort((a, b) => {
    const ia = known.indexOf(a);
    const ib = known.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  return statuses.map((status) => ({
    status,
    records: byStatus.get(status).sort((a, b) => compareNames(a.name, b.name))
  }));
}

// src/launchers.ts
var KEY_LINE = /^(records|status|agent_dir|name|agent):\s*(.*)$/;
var list = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
function parseLaunchers(markdown) {
  const launchers = [];
  for (const section of markdown.split(/^## /m).slice(1)) {
    const [heading = "", ...lines] = section.split("\n");
    const fields = {};
    let i = 0;
    for (; i < lines.length; i++) {
      const match = KEY_LINE.exec(lines[i].trim());
      if (!match) break;
      fields[match[1]] = match[2].trim();
    }
    const prompt = lines.slice(i).join("\n").trim();
    const label = heading.trim();
    if (!label || !fields.records || !fields.agent_dir || !prompt) continue;
    launchers.push({
      label,
      records: list(fields.records),
      statuses: list(fields.status ?? ""),
      agentDir: fields.agent_dir,
      name: fields.name || fields.agent_dir,
      agent: fields.agent === "codex" ? "codex" : "claude",
      prompt
    });
  }
  return launchers;
}
function recordFromPath(path) {
  const parsed = parseRecordPath(path);
  if (!parsed?.rest) return null;
  const { repo, kind, status, id: name } = parsed;
  return { repo, kind, status, name, dir: ["repositories", repo, kind, status, name].join("/") };
}
function launchersFor(launchers, record) {
  return launchers.filter(
    (launcher) => launcher.records.includes(`${record.repo}/${record.kind}`) && (launcher.statuses.length === 0 || launcher.statuses.includes(record.status))
  );
}
function fillTemplate(template, record, vaultRoot) {
  const values = {
    repo: record.repo,
    kind: record.kind,
    status: record.status,
    name: record.name,
    record: `${vaultRoot}/${record.dir}`
  };
  return template.replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole);
}

// src/record-links.ts
var MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;
function links(body) {
  return [...body.matchAll(MARKDOWN_LINK)].map((match) => ({ label: match[1], url: match[2] }));
}
var escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var FORK_OWNER = "jmchilton";
var BRANCHES_ON_UPSTREAM = /* @__PURE__ */ new Set(["foundry"]);
function upstreamOwner(record, body) {
  const repo = escape(record.repo);
  const owners = links(body).map((link) => new RegExp(`^https://github\\.com/([^/]+)/${repo}/(pull|issues)/`).exec(link.url)?.[1]).filter((owner) => owner && owner !== FORK_OWNER);
  return owners[0] ?? "galaxyproject";
}
function githubUrl(record, body) {
  const all = links(body);
  const id = escape(record.name);
  const find = (pattern, label) => all.find((link) => pattern.test(link.url) && (!label || label.test(link.label)))?.url;
  const upstream = `https://github.com/${upstreamOwner(record, body)}/${record.repo}`;
  if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
  if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
  const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
  const forkOwner = BRANCHES_ON_UPSTREAM.has(record.repo) ? upstreamOwner(record, body) : FORK_OWNER;
  return find(/\/pull\/\d+$/, /^(View )?PR #\d+$/) ?? (statusPr ? `${upstream}/pull/${statusPr}` : void 0) ?? find(new RegExp(`/tree/${id}$`)) ?? `https://github.com/${forkOwner}/${record.repo}/tree/${record.name}`;
}
function worktreeCandidates(record, body, home) {
  const root = `${home}/projects/worktrees/${record.repo}`;
  if (record.kind === "reviews") return [`${root}/pr/${record.name}`];
  if (record.kind !== "branches") return [];
  const listed = /Worktree:\**\s*`([^`]+)`/.exec(body)?.[1]?.replace(/^~(?=\/)/, home);
  return [...listed ? [listed] : [], `${root}/branch/${record.name}`];
}

// src/repository.ts
function repositoryNames(files) {
  const names = /* @__PURE__ */ new Set();
  for (const file of files) {
    const record = recordFromPath(file.path);
    if (record && record.repo !== DEFAULTS_REPO) names.add(record.repo);
  }
  return [...names].sort();
}
function collectRecords(files, repo, readIndex) {
  const records = /* @__PURE__ */ new Map();
  for (const file of files) {
    const ref = recordFromPath(file.path);
    if (!ref || ref.repo !== repo) continue;
    let record = records.get(ref.dir);
    if (!record) {
      record = { ...ref, title: ref.name, mtime: 0 };
      records.set(ref.dir, record);
    }
    record.mtime = Math.max(record.mtime, file.mtime);
    if (file.path === `${ref.dir}/index.md`) {
      record.indexPath = file.path;
      record.title = recordTitle(readIndex(file.path)) ?? ref.name;
    }
  }
  return [...records.values()];
}
function timeAgo(mtime, now) {
  const minutes = Math.max(0, Math.round((now - mtime) / 6e4));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
function repositorySections(records) {
  return RECORD_KINDS.map((kind) => ({
    kind,
    groups: groupByStatus(records, kind).map(({ status, records: records2 }) => ({
      status,
      collapsed: isTerminalStatus(status),
      records: [...records2].sort((a, b) => b.mtime - a.mtime)
    }))
  })).filter((section) => section.groups.length > 0);
}

// src/repository-view.ts
var import_obsidian = require("obsidian");
var REPOSITORY_VIEW = "galaxy-brain-repository";
var RepositoryView = class extends import_obsidian.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.repo = "galaxy";
    /** Status groups toggled away from their default, kept across re-renders. */
    this.toggled = /* @__PURE__ */ new Set();
    this.scheduleRender = (0, import_obsidian.debounce)(() => void this.render(), 300, true);
  }
  getViewType() {
    return REPOSITORY_VIEW;
  }
  getDisplayText() {
    return `${this.repo} records`;
  }
  getIcon() {
    return "library";
  }
  getState() {
    return { repo: this.repo };
  }
  async setState(state, result) {
    if (state.repo && state.repo !== this.repo) {
      this.repo = state.repo;
      this.toggled.clear();
    }
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      if (file.path.startsWith(`repositories/${this.repo}/`)) this.scheduleRender();
    };
    this.registerEvent(this.app.vault.on("create", onChange));
    this.registerEvent(this.app.vault.on("delete", onChange));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      onChange(file);
      onChange({ path: oldPath });
    }));
    this.registerEvent(this.app.metadataCache.on("changed", onChange));
    await this.render();
  }
  async render() {
    const files = this.app.vault.getMarkdownFiles().map((file) => ({ path: file.path, mtime: file.stat.mtime }));
    const bodies = await this.readIndexes(files.map((file) => file.path));
    const records = collectRecords(files, this.repo, (path) => bodies.get(path));
    const launchable = import_obsidian.Platform.isDesktopApp ? await this.launchableRecords(records) : /* @__PURE__ */ new Set();
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository");
    const header = root.createDiv({ cls: "gbr-header" });
    header.createEl("h1", { text: this.repo });
    const select = header.createEl("select", { cls: "dropdown" });
    for (const name of repositoryNames(files)) {
      select.createEl("option", { text: name, value: name }).selected = name === this.repo;
    }
    select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value } });
    const sections = repositorySections(records);
    if (sections.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
    for (const { kind, groups } of sections) {
      const count = groups.reduce((n, group) => n + group.records.length, 0);
      root.createEl("h2", { text: `${KIND_LABELS[kind]} (${count})` });
      for (const group of groups) {
        const key = `${kind}/${group.status}`;
        const details = root.createEl("details", { cls: "gbr-group" });
        details.open = group.collapsed === this.toggled.has(key);
        details.ontoggle = () => {
          if (details.open === group.collapsed) this.toggled.add(key);
          else this.toggled.delete(key);
        };
        details.createEl("summary", { text: `${statusLabel(group.status)} (${group.records.length})` });
        const list2 = details.createEl("ul");
        for (const record of group.records) {
          const body = record.indexPath && bodies.get(record.indexPath) || "";
          this.renderRecord(list2, record, body, launchable.has(record.dir));
        }
      }
    }
  }
  async readIndexes(paths) {
    const prefix = `repositories/${this.repo}/`;
    const indexes = paths.filter((path) => path.startsWith(prefix) && path.endsWith("/index.md"));
    const bodies = /* @__PURE__ */ new Map();
    await Promise.all(indexes.map(async (path) => {
      const file = this.app.vault.getFileByPath(path);
      if (file) bodies.set(path, await this.app.vault.cachedRead(file));
    }));
    return bodies;
  }
  renderRecord(list2, record, body, launchable) {
    const item = list2.createEl("li", { cls: "gbr-record" });
    const link = item.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
    link.onclick = (event) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
    };
    if (record.title !== record.name) item.createSpan({ text: record.name, cls: "gbr-name" });
    item.createSpan({ text: timeAgo(record.mtime, Date.now()), cls: "gbr-time" });
    const actions = item.createSpan({ cls: "gbr-actions" });
    const action = (icon, label, onClick) => {
      const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
    action("github", "Open on GitHub", () => window.open(githubUrl(record, body)));
    const worktree = import_obsidian.Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
    if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
  }
  async launchableRecords(records) {
    const launchers = await this.host.loadLaunchers();
    return new Set(records.filter((record) => launchersFor(launchers, record).length > 0).map((record) => record.dir));
  }
};

// src/main.ts
var LAUNCHERS_PATH = "agents/_shared/LAUNCHERS.md";
var LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
var CODE_BIN_DIRS = ["/usr/local/bin", "/opt/homebrew/bin", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"];
var GalaxyBrainPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.recordActions = /* @__PURE__ */ new WeakMap();
  }
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian2.TFile)) return;
        menu.addItem(
          (item) => item.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file))
        );
        void this.addLaunchItems(menu, file);
      })
    );
    this.addCommand({
      id: "copy-contents",
      name: "Copy contents of current file",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.copyContents(file);
        return true;
      }
    });
    this.registerView(REPOSITORY_VIEW, (leaf) => new RepositoryView(leaf, this));
    this.addRibbonIcon("library", "Open repository records", () => void this.pickRepository());
    this.addCommand({
      id: "open-repository",
      name: "Open repository records",
      callback: () => void this.pickRepository()
    });
    if (!import_obsidian2.Platform.isDesktopApp) return;
    this.addCommand({
      id: "launch-agent",
      name: "Launch agent for this record",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const record = file && recordFromPath(file.path);
        if (!record) return false;
        if (!checking) void this.pickLauncher(record);
        return true;
      }
    });
    const refresh = () => this.refreshRecordActions();
    this.registerEvent(this.app.workspace.on("file-open", refresh));
    this.registerEvent(this.app.workspace.on("layout-change", refresh));
    this.app.workspace.onLayoutReady(refresh);
  }
  async copyContents(file) {
    try {
      await navigator.clipboard.writeText(await this.app.vault.read(file));
      new import_obsidian2.Notice(`Copied ${file.name}`);
    } catch (error) {
      new import_obsidian2.Notice(`Could not copy ${file.name}: ${error}`);
    }
  }
  /** Code, GitHub and agent icons in the header of notes inside a repository record. */
  refreshRecordActions() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian2.MarkdownView)) continue;
      const record = view.file && recordFromPath(view.file.path);
      const existing = this.recordActions.get(view);
      if (record && !existing) {
        const withRecord = (act) => () => {
          const current = view.file && recordFromPath(view.file.path);
          if (current) void act(current);
        };
        const actions = [
          view.addAction("code", "Open with Code", withRecord((r) => this.openRecordInCode(r))),
          view.addAction("github", "Open on GitHub", withRecord((r) => this.openRecordOnGithub(r))),
          view.addAction("bot", "Launch agent", withRecord((r) => this.pickLauncher(r)))
        ];
        this.recordActions.set(view, actions);
        this.register(() => actions.forEach((action) => action.remove()));
      } else if (!record && existing) {
        existing.forEach((action) => action.remove());
        this.recordActions.delete(view);
      }
    }
  }
  async indexBody(record) {
    const index = this.app.vault.getFileByPath(`${record.dir}/index.md`);
    return index ? this.app.vault.cachedRead(index) : "";
  }
  /** The record's worktree, if one exists on disk. */
  worktreeFor(record, body) {
    const { existsSync } = require("fs");
    const { homedir } = require("os");
    return worktreeCandidates(record, body, homedir()).find((path) => existsSync(path)) ?? null;
  }
  openInCode(path) {
    const { execFile } = require("child_process");
    const PATH = [...CODE_BIN_DIRS, process.env.PATH].join(":");
    execFile("code", [path], { env: { ...process.env, PATH } }, (error) => {
      if (error) new import_obsidian2.Notice(`Could not run the VS Code \`code\` CLI: ${error.message}`, 1e4);
    });
  }
  async openRecordInCode(record) {
    const worktree = this.worktreeFor(record, await this.indexBody(record));
    if (worktree) this.openInCode(worktree);
    else new import_obsidian2.Notice(`No worktree on disk for ${record.name}`);
  }
  async openRecordOnGithub(record) {
    window.open(githubUrl(record, await this.indexBody(record)));
  }
  async loadLaunchers() {
    const config = this.app.vault.getAbstractFileByPath(LAUNCHERS_PATH);
    if (!(config instanceof import_obsidian2.TFile)) return [];
    return parseLaunchers(await this.app.vault.cachedRead(config));
  }
  async launchersFor(record) {
    return launchersFor(await this.loadLaunchers(), record);
  }
  async openRepository(repo) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo }, active: true });
  }
  /** Opens the current record's repository, or asks which one. */
  async pickRepository() {
    const file = this.app.workspace.getActiveFile();
    const current = file && recordFromPath(file.path);
    if (current) return this.openRepository(current.repo);
    const files = this.app.vault.getMarkdownFiles().map((f) => ({ path: f.path, mtime: f.stat.mtime }));
    new ChoiceSuggest(this.app, repositoryNames(files), "Open repository\u2026", (repo) => void this.openRepository(repo)).open();
  }
  async addLaunchItems(menu, file) {
    if (!import_obsidian2.Platform.isDesktopApp) return;
    const record = recordFromPath(file.path);
    if (!record) return;
    for (const launcher of await this.launchersFor(record)) {
      menu.addItem(
        (item) => item.setTitle(`Launch: ${launcher.label}`).setIcon("bot").onClick(() => this.confirmLaunch(launcher, record))
      );
    }
  }
  async pickLauncher(record) {
    const launchers = await this.launchersFor(record);
    if (launchers.length === 0) {
      new import_obsidian2.Notice(`No launchers for ${record.repo}/${record.kind} (${record.status}) in ${LAUNCHERS_PATH}`);
      return;
    }
    new LauncherSuggest(this.app, launchers, (launcher) => this.confirmLaunch(launcher, record)).open();
  }
  confirmLaunch(launcher, record) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    new LaunchModal(this.app, launcher, {
      name: fillTemplate(launcher.name, record, vaultRoot),
      prompt: fillTemplate(launcher.prompt, record, vaultRoot),
      launch: (kind, name, prompt) => this.launch(vaultRoot, launcher, kind, name, prompt)
    }).open();
  }
  vaultRoot() {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof import_obsidian2.FileSystemAdapter) return adapter.getBasePath();
    new import_obsidian2.Notice("Launching agents needs the desktop app");
    return null;
  }
  launch(vaultRoot, launcher, kind, name, prompt) {
    const { execFile } = require("child_process");
    const started = new import_obsidian2.Notice(`Launching ${kind} in ${launcher.agentDir}\u2026`, 0);
    execFile(
      `${vaultRoot}/${LAUNCH_SCRIPT}`,
      [launcher.agentDir, kind, name, prompt],
      { timeout: 18e4 },
      (error, stdout, stderr) => {
        started.hide();
        if (error) new import_obsidian2.Notice(`Launch failed: ${(stderr || error.message).trim()}`, 15e3);
        else new import_obsidian2.Notice(stdout.trim(), 1e4);
      }
    );
  }
};
var LauncherSuggest = class extends import_obsidian2.FuzzySuggestModal {
  constructor(app, launchers, choose) {
    super(app);
    this.launchers = launchers;
    this.choose = choose;
    this.setPlaceholder("Launch agent\u2026");
  }
  getItems() {
    return this.launchers;
  }
  getItemText(launcher) {
    return launcher.label;
  }
  onChooseItem(launcher) {
    this.choose(launcher);
  }
};
var ChoiceSuggest = class extends import_obsidian2.FuzzySuggestModal {
  constructor(app, choices, placeholder, choose) {
    super(app);
    this.choices = choices;
    this.choose = choose;
    this.setPlaceholder(placeholder);
  }
  getItems() {
    return this.choices;
  }
  getItemText(choice) {
    return choice;
  }
  onChooseItem(choice) {
    this.choose(choice);
  }
};
var LaunchModal = class extends import_obsidian2.Modal {
  constructor(app, launcher, details) {
    super(app);
    this.launcher = launcher;
    this.details = details;
  }
  onOpen() {
    const { launcher } = this;
    let { name, prompt } = this.details;
    this.setTitle(`${launcher.label} in ${launcher.agentDir}`);
    new import_obsidian2.Setting(this.contentEl).setName("Agent name").addText(
      (text) => text.setValue(name).onChange((value) => name = value)
    );
    new import_obsidian2.Setting(this.contentEl).setName("Prompt").addTextArea((area) => {
      area.setValue(prompt).onChange((value) => prompt = value);
      area.inputEl.rows = 6;
    }).settingEl.addClass("galaxy-brain-launch-prompt");
    const buttons = new import_obsidian2.Setting(this.contentEl);
    const order = launcher.agent === "codex" ? ["codex", "claude"] : ["claude", "codex"];
    for (const kind of order) {
      buttons.addButton((button) => {
        button.setButtonText(kind === "claude" ? "Launch Claude" : "Launch Codex").onClick(() => {
          this.close();
          this.details.launch(kind, name, prompt);
        });
        if (kind === launcher.agent) button.setCta();
      });
    }
    buttons.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};

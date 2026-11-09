"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);

// ../site/src/lib/repository-tabs.ts
function repositoryTabs(repo) {
  return [...REPOSITORY_TABS, ...searchTabs(repo).map(({ id, label: label3 }) => ({ id, label: label3 }))];
}
function githubList(repo, tab) {
  if (hasOwn(GITHUB_LISTS, tab)) return GITHUB_LISTS[tab];
  const search = searchTabs(repo).find((s) => s.id === tab);
  if (!search) throw new Error(`no GitHub tab ${tab} for ${repo}`);
  return { list: "issues", query: () => search.query, title: search.title };
}
function githubListUrl(owner, repo, tab, me = "@me") {
  const { list: list3, query } = githubList(repo, tab);
  return `https://github.com/${owner}/${repo}/${list3}?q=${encodeURIComponent(query(me))}`;
}
function githubListTitle(repo, tab) {
  return githubList(repo, tab).title;
}
function githubLinks(body) {
  return [...body.matchAll(MARKDOWN_LINK)].map((match) => ({ label: match[1], url: match[2] }));
}
function upstreamOwner(repo, bodies) {
  const pattern = new RegExp(`^https://github\\.com/([^/]+)/${escapeRegExp(repo)}/(pull|issues)/`);
  const counts = /* @__PURE__ */ new Map();
  for (const link of bodies.flatMap(githubLinks)) {
    const owner = pattern.exec(link.url)?.[1];
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([owner]) => owner);
  return ranked.find((owner) => owner !== FORK_OWNER) ?? ranked[0] ?? "galaxyproject";
}
var REPOSITORY_TABS, FORK_OWNER, GITHUB_LISTS, SEARCH_TABS, hasOwn, searchTabs, MARKDOWN_LINK, escapeRegExp;
var init_repository_tabs = __esm({
  "../site/src/lib/repository-tabs.ts"() {
    "use strict";
    REPOSITORY_TABS = [
      { id: "branches", label: "My branches" },
      { id: "issues", label: "My issues" },
      { id: "issues_incubator", label: "Issue incubator" },
      { id: "reviews", label: "My reviews" },
      { id: "my-drafts", label: "My drafts" },
      { id: "conflicting", label: "Conflicting" },
      { id: "new-prs", label: "New PRs" },
      { id: "undrafted-prs", label: "Out of draft" },
      { id: "new-issues", label: "New issues" }
    ];
    FORK_OWNER = "jmchilton";
    GITHUB_LISTS = {
      "my-drafts": { list: "pulls", query: (me) => `is:pr is:open author:${me} draft:true`, title: "My open draft PRs on GitHub" },
      // GitHub has no conflict filter.
      conflicting: { list: "pulls", query: (me) => `is:pr is:open author:${me}`, title: "My open PRs on GitHub (it can't filter by conflicts)" },
      "new-prs": { list: "pulls", query: () => "is:pr is:open sort:created-desc", title: "Open PRs, newest first, on GitHub" },
      // GitHub can't sort by ready-for-review time; recently updated non-drafts is the closest.
      "undrafted-prs": { list: "pulls", query: () => "is:pr is:open draft:false sort:updated-desc", title: "Open non-draft PRs, recently updated, on GitHub" },
      "new-issues": { list: "issues", query: () => "is:issue is:open sort:created-desc", title: "Open issues, newest first, on GitHub" }
    };
    SEARCH_TABS = {
      foundry: [
        { id: "needs-triage", label: "Needs triage", query: "is:issue is:open label:needs-triage sort:created-desc", title: "Open issues labelled needs-triage, newest first, on GitHub" },
        { id: "ready-implement", label: "Ready for implementation", query: "is:issue is:open label:work/ready-implement sort:created-desc", title: "Open issues ready to implement, newest first, on GitHub" },
        { id: "ready-research", label: "Ready for research", query: "is:issue is:open label:work/ready-research sort:created-desc", title: "Open issues ready to research, newest first, on GitHub" }
      ]
    };
    hasOwn = (object2, key2) => Object.prototype.hasOwnProperty.call(object2, key2);
    searchTabs = (repo) => hasOwn(SEARCH_TABS, repo) ? SEARCH_TABS[repo] : [];
    MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;
    escapeRegExp = (text2) => text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
});

// ../site/src/lib/records.ts
function isReviewableRecordKind(kind) {
  return REVIEWABLE_RECORD_KINDS.includes(kind);
}
function recordReviewDir(recordDir) {
  return `${recordDir.replace(/\/+$/, "")}/differential-review`;
}
function parseRecordPath(rel) {
  const parts = rel.split("/");
  if (parts[0] !== "repositories" || parts.length < 5) return null;
  const kind = parts[2];
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: parts[1], kind, status: parts[3], id: parts[4], rest: parts.slice(5).join("/") };
}
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
function groupingFor(repo, kind) {
  const file = QUEUE_FILES[kind];
  return file ? `repositories/${repo}/${kind}/${file}` : void 0;
}
function resolveLink(from, link) {
  const parts = from.split("/").slice(0, -1);
  for (const part of link.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  return parts.join("/");
}
function parseGrouping(text2, path, repo, kind) {
  const sections = [];
  for (const line of text2.split("\n")) {
    const heading = line.match(/^## (.+?)\s*\(`([^`]+)`\)\s*$/);
    if (heading) {
      sections.push({ label: heading[1], key: heading[2], names: [] });
      continue;
    }
    const section2 = sections[sections.length - 1];
    if (!line.startsWith("- ") || !section2) continue;
    const record = [...line.matchAll(/\]\(([^)\s]+)\)/g)].filter((link) => !/^[a-z][a-z0-9+.-]*:/i.test(link[1])).map((link) => parseRecordPath(resolveLink(path, decodeURI(link[1])))).find((found) => found?.rest && found.repo === repo && found.kind === kind);
    if (record && !section2.names.includes(record.id)) section2.names.push(record.id);
  }
  return sections;
}
function groupBySections(records, kind, grouping) {
  const ofKind = records.filter((record) => record.kind === kind);
  const byName = new Map(ofKind.map((record) => [record.name, record]));
  const listed = /* @__PURE__ */ new Set();
  const sections = (grouping ?? []).flatMap((section2) => {
    const found = section2.names.flatMap((name) => {
      const record = byName.get(name);
      if (!record || listed.has(name)) return [];
      listed.add(name);
      return [record];
    });
    return found.length ? [{ key: section2.key, label: section2.label, records: found }] : [];
  });
  return { sections, rest: ofKind.filter((record) => !listed.has(record.name)) };
}
var RECORD_KINDS, DEFAULTS_REPO, REVIEWABLE_RECORD_KINDS, KIND_LABELS, STATUS_ORDER, TERMINAL_STATUSES, QUEUE_FILES;
var init_records = __esm({
  "../site/src/lib/records.ts"() {
    "use strict";
    RECORD_KINDS = ["branches", "issues", "issues_incubator", "reviews"];
    DEFAULTS_REPO = "_defaults";
    REVIEWABLE_RECORD_KINDS = ["branches", "reviews"];
    KIND_LABELS = {
      branches: "Branches",
      issues: "Issues",
      issues_incubator: "Issue incubator",
      reviews: "Reviews"
    };
    STATUS_ORDER = {
      branches: ["active", "merged", "abandoned"],
      issues: ["needs_decision", "queued", "wip", "delegated", "closed"],
      issues_incubator: ["incubating", "internal", "rejected"],
      reviews: ["active", "archived"]
    };
    TERMINAL_STATUSES = /* @__PURE__ */ new Set(["merged", "abandoned", "archived", "closed", "rejected"]);
    QUEUE_FILES = {
      branches: "MY_BRANCHES.md",
      issues: "MY_ISSUES.md",
      reviews: "MY_REVIEWS.md"
    };
  }
});

// node_modules/@profoundlogic/hogan/lib/compiler.js
var require_compiler = __commonJS({
  "node_modules/@profoundlogic/hogan/lib/compiler.js"(exports) {
    (function(Hogan4) {
      var rIsWhitespace = /\S/, rQuot = /\"/g, rNewline = /\n/g, rCr = /\r/g, rSlash = /\\/g, rLineSep = /\u2028/, rParagraphSep = /\u2029/;
      Hogan4.tags = {
        "#": 1,
        "^": 2,
        "<": 3,
        "$": 4,
        "/": 5,
        "!": 6,
        ">": 7,
        "=": 8,
        "_v": 9,
        "{": 10,
        "&": 11,
        "_t": 12
      };
      Hogan4.scan = function scan(text2, delimiters) {
        var len = text2.length, IN_TEXT = 0, IN_TAG_TYPE = 1, IN_TAG = 2, state = IN_TEXT, tagType = null, tag = null, buf = "", tokens = [], seenTag = false, i = 0, lineStart = 0, otag = "{{", ctag = "}}";
        function addBuf() {
          if (buf.length > 0) {
            tokens.push({ tag: "_t", text: new String(buf) });
            buf = "";
          }
        }
        function lineIsWhitespace() {
          var isAllWhitespace = true;
          for (var j = lineStart; j < tokens.length; j++) {
            isAllWhitespace = Hogan4.tags[tokens[j].tag] < Hogan4.tags["_v"] || tokens[j].tag == "_t" && tokens[j].text.match(rIsWhitespace) === null;
            if (!isAllWhitespace) {
              return false;
            }
          }
          return isAllWhitespace;
        }
        function filterLine(haveSeenTag, noNewLine) {
          addBuf();
          if (haveSeenTag && lineIsWhitespace()) {
            for (var j = lineStart, next; j < tokens.length; j++) {
              if (tokens[j].text) {
                if ((next = tokens[j + 1]) && next.tag == ">") {
                  next.indent = tokens[j].text.toString();
                }
                tokens.splice(j, 1);
              }
            }
          } else if (!noNewLine) {
            tokens.push({ tag: "\n" });
          }
          seenTag = false;
          lineStart = tokens.length;
        }
        function changeDelimiters(text3, index) {
          var close = "=" + ctag, closeIndex = text3.indexOf(close, index), delimiters2 = trim(
            text3.substring(text3.indexOf("=", index) + 1, closeIndex)
          ).split(" ");
          otag = delimiters2[0];
          ctag = delimiters2[delimiters2.length - 1];
          return closeIndex + close.length - 1;
        }
        if (delimiters) {
          delimiters = delimiters.split(" ");
          otag = delimiters[0];
          ctag = delimiters[1];
        }
        for (i = 0; i < len; i++) {
          if (state == IN_TEXT) {
            if (tagChange(otag, text2, i)) {
              --i;
              addBuf();
              state = IN_TAG_TYPE;
            } else {
              if (text2.charAt(i) == "\n") {
                filterLine(seenTag);
              } else {
                buf += text2.charAt(i);
              }
            }
          } else if (state == IN_TAG_TYPE) {
            i += otag.length - 1;
            tag = Hogan4.tags[text2.charAt(i + 1)];
            tagType = tag ? text2.charAt(i + 1) : "_v";
            if (tagType == "=") {
              i = changeDelimiters(text2, i);
              state = IN_TEXT;
            } else {
              if (tag) {
                i++;
              }
              state = IN_TAG;
            }
            seenTag = i;
          } else {
            if (tagChange(ctag, text2, i)) {
              tokens.push({
                tag: tagType,
                n: trim(buf),
                otag,
                ctag,
                i: tagType == "/" ? seenTag - otag.length : i + ctag.length
              });
              buf = "";
              i += ctag.length - 1;
              state = IN_TEXT;
              if (tagType == "{") {
                if (ctag == "}}") {
                  i++;
                } else {
                  cleanTripleStache(tokens[tokens.length - 1]);
                }
              }
            } else {
              buf += text2.charAt(i);
            }
          }
        }
        filterLine(seenTag, true);
        return tokens;
      };
      function cleanTripleStache(token) {
        if (token.n.substr(token.n.length - 1) === "}") {
          token.n = token.n.substring(0, token.n.length - 1);
        }
      }
      function trim(s) {
        if (s.trim) {
          return s.trim();
        }
        return s.replace(/^\s*|\s*$/g, "");
      }
      function tagChange(tag, text2, index) {
        if (text2.charAt(index) != tag.charAt(0)) {
          return false;
        }
        for (var i = 1, l = tag.length; i < l; i++) {
          if (text2.charAt(index + i) != tag.charAt(i)) {
            return false;
          }
        }
        return true;
      }
      var allowedInSuper = { "_t": true, "\n": true, "$": true, "/": true };
      function buildTree(tokens, kind, stack, customTags) {
        var instructions = [], opener = null, tail = null, token = null;
        tail = stack[stack.length - 1];
        while (tokens.length > 0) {
          token = tokens.shift();
          if (tail && tail.tag == "<" && !(token.tag in allowedInSuper)) {
            throw new Error("Illegal content in < super tag.");
          }
          if (Hogan4.tags[token.tag] <= Hogan4.tags["$"] || isOpener(token, customTags)) {
            stack.push(token);
            token.nodes = buildTree(tokens, token.tag, stack, customTags);
          } else if (token.tag == "/") {
            if (stack.length === 0) {
              throw new Error("Closing tag without opener: /" + token.n);
            }
            opener = stack.pop();
            if (token.n != opener.n && !isCloser(token.n, opener.n, customTags)) {
              throw new Error("Nesting error: " + opener.n + " vs. " + token.n);
            }
            opener.end = token.i;
            return instructions;
          } else if (token.tag == "\n") {
            token.last = tokens.length == 0 || tokens[0].tag == "\n";
          }
          instructions.push(token);
        }
        if (stack.length > 0) {
          throw new Error("missing closing tag: " + stack.pop().n);
        }
        return instructions;
      }
      function isOpener(token, tags) {
        for (var i = 0, l = tags.length; i < l; i++) {
          if (tags[i].o == token.n) {
            token.tag = "#";
            return true;
          }
        }
      }
      function isCloser(close, open, tags) {
        for (var i = 0, l = tags.length; i < l; i++) {
          if (tags[i].c == close && tags[i].o == open) {
            return true;
          }
        }
      }
      function stringifySubstitutions(obj) {
        var items = [];
        for (var key2 in obj) {
          items.push('"' + esc(key2) + '": function(c,p,t,i) {' + obj[key2] + "}");
        }
        return "{ " + items.join(",") + " }";
      }
      function stringifyPartials(codeObj) {
        var partials = [];
        for (var key2 in codeObj.partials) {
          partials.push('"' + esc(key2) + '":{name:"' + esc(codeObj.partials[key2].name) + '", ' + stringifyPartials(codeObj.partials[key2]) + "}");
        }
        return "partials: {" + partials.join(",") + "}, subs: " + stringifySubstitutions(codeObj.subs);
      }
      Hogan4.stringify = function(codeObj, text2, options) {
        return "{code: function (c,p,i) { " + Hogan4.wrapMain(codeObj.code) + " }," + stringifyPartials(codeObj) + "}";
      };
      var serialNo = 0;
      Hogan4.generate = function(tree, text2, options) {
        serialNo = 0;
        var context = { code: "", subs: {}, partials: {} };
        Hogan4.walk(tree, context);
        if (options.asString) {
          return this.stringify(context, text2, options);
        }
        return this.makeTemplate(context, text2, options);
      };
      Hogan4.wrapMain = function(code) {
        return 'var t=this;t.b(i=i||"");' + code + "return t.fl();";
      };
      Hogan4.template = Hogan4.Template;
      Hogan4.makeTemplate = function(codeObj, text2, options) {
        var template = this.makePartials(codeObj);
        template.code = new Function("c", "p", "i", this.wrapMain(codeObj.code));
        return new this.template(template, text2, this, options);
      };
      Hogan4.makePartials = function(codeObj) {
        var key2, template = { subs: {}, partials: codeObj.partials, name: codeObj.name };
        for (key2 in template.partials) {
          template.partials[key2] = this.makePartials(template.partials[key2]);
        }
        for (key2 in codeObj.subs) {
          template.subs[key2] = new Function("c", "p", "t", "i", codeObj.subs[key2]);
        }
        return template;
      };
      function esc(s) {
        return s.replace(rSlash, "\\\\").replace(rQuot, '\\"').replace(rNewline, "\\n").replace(rCr, "\\r").replace(rLineSep, "\\u2028").replace(rParagraphSep, "\\u2029");
      }
      function chooseMethod(s) {
        return ~s.indexOf(".") ? "d" : "f";
      }
      function createPartial(node, context) {
        var prefix = "<" + (context.prefix || "");
        var sym = prefix + node.n + serialNo++;
        context.partials[sym] = { name: node.n, partials: {} };
        context.code += 't.b(t.rp("' + esc(sym) + '",c,p,"' + (node.indent || "") + '"));';
        return sym;
      }
      Hogan4.codegen = {
        "#": function(node, context) {
          context.code += "if(t.s(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,1),c,p,0,' + node.i + "," + node.end + ',"' + node.otag + " " + node.ctag + '")){t.rs(c,p,function(c,p,t){';
          Hogan4.walk(node.nodes, context);
          context.code += "});c.pop();}";
        },
        "^": function(node, context) {
          context.code += "if(!t.s(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,1),c,p,1,0,0,"")){';
          Hogan4.walk(node.nodes, context);
          context.code += "};";
        },
        ">": createPartial,
        "<": function(node, context) {
          var ctx = { partials: {}, code: "", subs: {}, inPartial: true };
          Hogan4.walk(node.nodes, ctx);
          var template = context.partials[createPartial(node, context)];
          template.subs = ctx.subs;
          template.partials = ctx.partials;
        },
        "$": function(node, context) {
          var ctx = { subs: {}, code: "", partials: context.partials, prefix: node.n };
          Hogan4.walk(node.nodes, ctx);
          context.subs[node.n] = ctx.code;
          if (!context.inPartial) {
            context.code += 't.sub("' + esc(node.n) + '",c,p,i);';
          }
        },
        "\n": function(node, context) {
          context.code += write('"\\n"' + (node.last ? "" : " + i"));
        },
        "_v": function(node, context) {
          context.code += "t.b(t.v(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,0)));';
        },
        "_t": function(node, context) {
          context.code += write('"' + esc(node.text) + '"');
        },
        "{": tripleStache,
        "&": tripleStache
      };
      function tripleStache(node, context) {
        context.code += "t.b(t.t(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,0)));';
      }
      function write(s) {
        return "t.b(" + s + ");";
      }
      Hogan4.walk = function(nodelist, context) {
        var func;
        for (var i = 0, l = nodelist.length; i < l; i++) {
          func = Hogan4.codegen[nodelist[i].tag];
          func && func(nodelist[i], context);
        }
        return context;
      };
      Hogan4.parse = function(tokens, text2, options) {
        options = options || {};
        return buildTree(tokens, "", [], options.sectionTags || []);
      };
      Hogan4.cache = {};
      Hogan4.cacheKey = function(text2, options) {
        return [text2, !!options.asString, !!options.disableLambda, options.delimiters, !!options.modelGet].join("||");
      };
      Hogan4.compile = function(text2, options) {
        options = options || {};
        var key2 = Hogan4.cacheKey(text2, options);
        var template = this.cache[key2];
        if (template) {
          var partials = template.partials;
          for (var name in partials) {
            delete partials[name].instance;
          }
          return template;
        }
        template = this.generate(this.parse(this.scan(text2, options.delimiters), text2, options), text2, options);
        return this.cache[key2] = template;
      };
    })(typeof exports !== "undefined" ? exports : Hogan);
  }
});

// node_modules/@profoundlogic/hogan/lib/template.js
var require_template = __commonJS({
  "node_modules/@profoundlogic/hogan/lib/template.js"(exports) {
    var Hogan4 = {};
    (function(Hogan5) {
      Hogan5.Template = function(codeObj, text2, compiler, options) {
        codeObj = codeObj || {};
        this.r = codeObj.code || this.r;
        this.c = compiler;
        this.options = options || {};
        this.text = text2 || "";
        this.partials = codeObj.partials || {};
        this.subs = codeObj.subs || {};
        this.buf = "";
      };
      Hogan5.Template.prototype = {
        // render: replaced by generated code.
        r: function(context, partials, indent) {
          return "";
        },
        // variable escaping
        v: hoganEscape,
        // triple stache
        t: coerceToString,
        render: function render(context, partials, indent) {
          return this.ri([context], partials || {}, indent);
        },
        // render internal -- a hook for overrides that catches partials too
        ri: function(context, partials, indent) {
          return this.r(context, partials, indent);
        },
        // ensurePartial
        ep: function(symbol, partials) {
          var partial = this.partials[symbol];
          var template = partials[partial.name];
          if (partial.instance && partial.base == template) {
            return partial.instance;
          }
          if (typeof template == "string") {
            if (!this.c) {
              throw new Error("No compiler available.");
            }
            template = this.c.compile(template, this.options);
          }
          if (!template) {
            return null;
          }
          this.partials[symbol].base = template;
          if (partial.subs) {
            if (!partials.stackText) partials.stackText = {};
            for (key in partial.subs) {
              if (!partials.stackText[key]) {
                partials.stackText[key] = this.activeSub !== void 0 && partials.stackText[this.activeSub] ? partials.stackText[this.activeSub] : this.text;
              }
            }
            template = createSpecializedPartial(
              template,
              partial.subs,
              partial.partials,
              this.stackSubs,
              this.stackPartials,
              partials.stackText
            );
          }
          this.partials[symbol].instance = template;
          return template;
        },
        // tries to find a partial in the current scope and render it
        rp: function(symbol, context, partials, indent) {
          var partial = this.ep(symbol, partials);
          if (!partial) {
            return "";
          }
          return partial.ri(context, partials, indent);
        },
        // render a section
        rs: function(context, partials, section2) {
          var tail = context[context.length - 1];
          if (!isArray(tail)) {
            section2(context, partials, this);
            return;
          }
          for (var i = 0; i < tail.length; i++) {
            context.push(tail[i]);
            section2(context, partials, this);
            context.pop();
          }
        },
        // maybe start a section
        s: function(val, ctx, partials, inverted, start, end, tags) {
          var pass;
          if (isArray(val) && val.length === 0) {
            return false;
          }
          if (typeof val == "function") {
            val = this.ms(val, ctx, partials, inverted, start, end, tags);
          }
          pass = !!val;
          if (!inverted && pass && ctx) {
            ctx.push(typeof val == "object" ? val : ctx[ctx.length - 1]);
          }
          return pass;
        },
        // find values with dotted names
        d: function(key2, ctx, partials, returnFound) {
          var found, names = key2.split("."), val = this.f(names[0], ctx, partials, returnFound), doModelGet = this.options.modelGet, cx = null;
          if (key2 === "." && isArray(ctx[ctx.length - 2])) {
            val = ctx[ctx.length - 1];
          } else {
            for (var i = 1; i < names.length; i++) {
              found = findInScope(names[i], val, doModelGet);
              if (found !== void 0) {
                cx = val;
                val = found;
              } else {
                val = "";
              }
            }
          }
          if (returnFound && !val) {
            return false;
          }
          if (!returnFound && typeof val == "function") {
            ctx.push(cx);
            val = this.mv(val, ctx, partials);
            ctx.pop();
          }
          return val;
        },
        // find values with normal names
        f: function(key2, ctx, partials, returnFound) {
          var val = false, v = null, found = false, doModelGet = this.options.modelGet;
          for (var i = ctx.length - 1; i >= 0; i--) {
            v = ctx[i];
            val = findInScope(key2, v, doModelGet);
            if (val !== void 0) {
              found = true;
              break;
            }
          }
          if (!found) {
            return returnFound ? false : "";
          }
          if (!returnFound && typeof val == "function") {
            val = this.mv(val, ctx, partials);
          }
          return val;
        },
        // higher order templates
        ls: function(func, cx, ctx, partials, text2, tags) {
          var oldTags = this.options.delimiters;
          this.options.delimiters = tags;
          this.b(this.ct(coerceToString(func.call(cx, text2, ctx)), cx, partials));
          this.options.delimiters = oldTags;
          return false;
        },
        // compile text
        ct: function(text2, cx, partials) {
          if (this.options.disableLambda) {
            throw new Error("Lambda features disabled.");
          }
          return this.c.compile(text2, this.options).render(cx, partials);
        },
        // template result buffering
        b: function(s) {
          this.buf += s;
        },
        fl: function() {
          var r = this.buf;
          this.buf = "";
          return r;
        },
        // method replace section
        ms: function(func, ctx, partials, inverted, start, end, tags) {
          var textSource, cx = ctx[ctx.length - 1], result = func.call(cx);
          if (typeof result == "function") {
            if (inverted) {
              return true;
            } else {
              textSource = this.activeSub && this.subsText && this.subsText[this.activeSub] ? this.subsText[this.activeSub] : this.text;
              return this.ls(result, cx, ctx, partials, textSource.substring(start, end), tags);
            }
          }
          return result;
        },
        // method replace variable
        mv: function(func, ctx, partials) {
          var cx = ctx[ctx.length - 1];
          var result = func.call(cx);
          if (typeof result == "function") {
            return this.ct(coerceToString(result.call(cx)), cx, partials);
          }
          return result;
        },
        sub: function(name, context, partials, indent) {
          var f = this.subs[name];
          if (f) {
            this.activeSub = name;
            f(context, partials, this, indent);
            this.activeSub = false;
          }
        }
      };
      function findInScope(key2, scope, doModelGet) {
        var val;
        if (scope && typeof scope == "object") {
          if (scope[key2] !== void 0) {
            val = scope[key2];
          } else if (doModelGet && scope.get && typeof scope.get == "function") {
            val = scope.get(key2);
          }
        }
        return val;
      }
      function createSpecializedPartial(instance, subs, partials, stackSubs, stackPartials, stackText) {
        function PartialTemplate() {
        }
        ;
        PartialTemplate.prototype = instance;
        function Substitutions() {
        }
        ;
        Substitutions.prototype = instance.subs;
        var key2;
        var partial = new PartialTemplate();
        partial.subs = new Substitutions();
        partial.subsText = {};
        partial.buf = "";
        stackSubs = stackSubs || {};
        partial.stackSubs = stackSubs;
        partial.subsText = stackText;
        for (key2 in subs) {
          if (!stackSubs[key2]) stackSubs[key2] = subs[key2];
        }
        for (key2 in stackSubs) {
          partial.subs[key2] = stackSubs[key2];
        }
        stackPartials = stackPartials || {};
        partial.stackPartials = stackPartials;
        for (key2 in partials) {
          if (!stackPartials[key2]) stackPartials[key2] = partials[key2];
        }
        for (key2 in stackPartials) {
          partial.partials[key2] = stackPartials[key2];
        }
        return partial;
      }
      var rAmp = /&/g, rLt = /</g, rGt = />/g, rApos = /\'/g, rQuot = /\"/g, hChars = /[&<>\"\']/;
      function coerceToString(val) {
        return String(val === null || val === void 0 ? "" : val);
      }
      function hoganEscape(str) {
        str = coerceToString(str);
        return hChars.test(str) ? str.replace(rAmp, "&amp;").replace(rLt, "&lt;").replace(rGt, "&gt;").replace(rApos, "&#39;").replace(rQuot, "&quot;") : str;
      }
      var isArray = Array.isArray || function(a) {
        return Object.prototype.toString.call(a) === "[object Array]";
      };
    })(typeof exports !== "undefined" ? exports : Hogan4);
  }
});

// node_modules/@profoundlogic/hogan/lib/hogan.js
var require_hogan = __commonJS({
  "node_modules/@profoundlogic/hogan/lib/hogan.js"(exports, module2) {
    var Hogan4 = require_compiler();
    Hogan4.Template = require_template().Template;
    Hogan4.template = Hogan4.Template;
    module2.exports = Hogan4;
  }
});

// node_modules/highlight.js/lib/core.js
var require_core = __commonJS({
  "node_modules/highlight.js/lib/core.js"(exports, module2) {
    function deepFreeze(obj) {
      if (obj instanceof Map) {
        obj.clear = obj.delete = obj.set = function() {
          throw new Error("map is read-only");
        };
      } else if (obj instanceof Set) {
        obj.add = obj.clear = obj.delete = function() {
          throw new Error("set is read-only");
        };
      }
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((name) => {
        const prop = obj[name];
        const type = typeof prop;
        if ((type === "object" || type === "function") && !Object.isFrozen(prop)) {
          deepFreeze(prop);
        }
      });
      return obj;
    }
    var Response = class {
      /**
       * @param {CompiledMode} mode
       */
      constructor(mode) {
        if (mode.data === void 0) mode.data = {};
        this.data = mode.data;
        this.isMatchIgnored = false;
      }
      ignoreMatch() {
        this.isMatchIgnored = true;
      }
    };
    function escapeHTML(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    }
    function inherit$1(original, ...objects) {
      const result = /* @__PURE__ */ Object.create(null);
      for (const key2 in original) {
        result[key2] = original[key2];
      }
      objects.forEach(function(obj) {
        for (const key2 in obj) {
          result[key2] = obj[key2];
        }
      });
      return (
        /** @type {T} */
        result
      );
    }
    var SPAN_CLOSE = "</span>";
    var emitsWrappingTags = (node) => {
      return !!node.scope;
    };
    var scopeToCSSClass = (name, { prefix }) => {
      if (name.startsWith("language:")) {
        return name.replace("language:", "language-");
      }
      if (name.includes(".")) {
        const pieces = name.split(".");
        return [
          `${prefix}${pieces.shift()}`,
          ...pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`)
        ].join(" ");
      }
      return `${prefix}${name}`;
    };
    var HTMLRenderer = class {
      /**
       * Creates a new HTMLRenderer
       *
       * @param {Tree} parseTree - the parse tree (must support `walk` API)
       * @param {{classPrefix: string}} options
       */
      constructor(parseTree, options) {
        this.buffer = "";
        this.classPrefix = options.classPrefix;
        parseTree.walk(this);
      }
      /**
       * Adds texts to the output stream
       *
       * @param {string} text */
      addText(text2) {
        this.buffer += escapeHTML(text2);
      }
      /**
       * Adds a node open to the output stream (if needed)
       *
       * @param {Node} node */
      openNode(node) {
        if (!emitsWrappingTags(node)) return;
        const className = scopeToCSSClass(
          node.scope,
          { prefix: this.classPrefix }
        );
        this.span(className);
      }
      /**
       * Adds a node close to the output stream (if needed)
       *
       * @param {Node} node */
      closeNode(node) {
        if (!emitsWrappingTags(node)) return;
        this.buffer += SPAN_CLOSE;
      }
      /**
       * returns the accumulated buffer
      */
      value() {
        return this.buffer;
      }
      // helpers
      /**
       * Builds a span element
       *
       * @param {string} className */
      span(className) {
        this.buffer += `<span class="${className}">`;
      }
    };
    var newNode = (opts = {}) => {
      const result = { children: [] };
      Object.assign(result, opts);
      return result;
    };
    var TokenTree = class _TokenTree {
      constructor() {
        this.rootNode = newNode();
        this.stack = [this.rootNode];
      }
      get top() {
        return this.stack[this.stack.length - 1];
      }
      get root() {
        return this.rootNode;
      }
      /** @param {Node} node */
      add(node) {
        this.top.children.push(node);
      }
      /** @param {string} scope */
      openNode(scope) {
        const node = newNode({ scope });
        this.add(node);
        this.stack.push(node);
      }
      closeNode() {
        if (this.stack.length > 1) {
          return this.stack.pop();
        }
        return void 0;
      }
      closeAllNodes() {
        while (this.closeNode()) ;
      }
      toJSON() {
        return JSON.stringify(this.rootNode, null, 4);
      }
      /**
       * @typedef { import("./html_renderer").Renderer } Renderer
       * @param {Renderer} builder
       */
      walk(builder) {
        return this.constructor._walk(builder, this.rootNode);
      }
      /**
       * @param {Renderer} builder
       * @param {Node} node
       */
      static _walk(builder, node) {
        if (typeof node === "string") {
          builder.addText(node);
        } else if (node.children) {
          builder.openNode(node);
          node.children.forEach((child) => this._walk(builder, child));
          builder.closeNode(node);
        }
        return builder;
      }
      /**
       * @param {Node} node
       */
      static _collapse(node) {
        if (typeof node === "string") return;
        if (!node.children) return;
        if (node.children.every((el3) => typeof el3 === "string")) {
          node.children = [node.children.join("")];
        } else {
          node.children.forEach((child) => {
            _TokenTree._collapse(child);
          });
        }
      }
    };
    var TokenTreeEmitter = class extends TokenTree {
      /**
       * @param {*} options
       */
      constructor(options) {
        super();
        this.options = options;
      }
      /**
       * @param {string} text
       */
      addText(text2) {
        if (text2 === "") {
          return;
        }
        this.add(text2);
      }
      /** @param {string} scope */
      startScope(scope) {
        this.openNode(scope);
      }
      endScope() {
        this.closeNode();
      }
      /**
       * @param {Emitter & {root: DataNode}} emitter
       * @param {string} name
       */
      __addSublanguage(emitter, name) {
        const node = emitter.root;
        if (name) node.scope = `language:${name}`;
        this.add(node);
      }
      toHTML() {
        const renderer = new HTMLRenderer(this, this.options);
        return renderer.value();
      }
      finalize() {
        this.closeAllNodes();
        return true;
      }
    };
    function source(re) {
      if (!re) return null;
      if (typeof re === "string") return re;
      return re.source;
    }
    function lookahead(re) {
      return concat("(?=", re, ")");
    }
    function anyNumberOfTimes(re) {
      return concat("(?:", re, ")*");
    }
    function optional(re) {
      return concat("(?:", re, ")?");
    }
    function concat(...args) {
      const joined = args.map((x) => source(x)).join("");
      return joined;
    }
    function stripOptionsFromArgs(args) {
      const opts = args[args.length - 1];
      if (typeof opts === "object" && opts.constructor === Object) {
        args.splice(args.length - 1, 1);
        return opts;
      } else {
        return {};
      }
    }
    function either(...args) {
      const opts = stripOptionsFromArgs(args);
      const joined = "(" + (opts.capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")";
      return joined;
    }
    function countMatchGroups(re) {
      return new RegExp(re.toString() + "|").exec("").length - 1;
    }
    function startsWith(re, lexeme) {
      const match = re && re.exec(lexeme);
      return match && match.index === 0;
    }
    var BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
    function _rewriteBackreferences(regexps, { joinWith }) {
      let numCaptures = 0;
      return regexps.map((regex2) => {
        numCaptures += 1;
        const offset = numCaptures;
        let re = source(regex2);
        let out = "";
        while (re.length > 0) {
          const match = BACKREF_RE.exec(re);
          if (!match) {
            out += re;
            break;
          }
          out += re.substring(0, match.index);
          re = re.substring(match.index + match[0].length);
          if (match[0][0] === "\\" && match[1]) {
            out += "\\" + String(Number(match[1]) + offset);
          } else {
            out += match[0];
            if (match[0] === "(") {
              numCaptures++;
            }
          }
        }
        return out;
      }).map((re) => `(${re})`).join(joinWith);
    }
    var MATCH_NOTHING_RE = /\b\B/;
    var IDENT_RE3 = "[a-zA-Z]\\w*";
    var UNDERSCORE_IDENT_RE = "[a-zA-Z_]\\w*";
    var NUMBER_RE = "\\b\\d+(\\.\\d+)?";
    var C_NUMBER_RE = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)";
    var BINARY_NUMBER_RE = "\\b(0b[01]+)";
    var RE_STARTERS_RE = "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~";
    var SHEBANG = (opts = {}) => {
      const beginShebang = /^#![ ]*\//;
      if (opts.binary) {
        opts.begin = concat(
          beginShebang,
          /.*\b/,
          opts.binary,
          /\b.*/
        );
      }
      return inherit$1({
        scope: "meta",
        begin: beginShebang,
        end: /$/,
        relevance: 0,
        /** @type {ModeCallback} */
        "on:begin": (m, resp) => {
          if (m.index !== 0) resp.ignoreMatch();
        }
      }, opts);
    };
    var BACKSLASH_ESCAPE = {
      begin: "\\\\[\\s\\S]",
      relevance: 0
    };
    var APOS_STRING_MODE = {
      scope: "string",
      begin: "'",
      end: "'",
      illegal: "\\n",
      contains: [BACKSLASH_ESCAPE]
    };
    var QUOTE_STRING_MODE = {
      scope: "string",
      begin: '"',
      end: '"',
      illegal: "\\n",
      contains: [BACKSLASH_ESCAPE]
    };
    var PHRASAL_WORDS_MODE = {
      begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    var COMMENT = function(begin, end, modeOptions = {}) {
      const mode = inherit$1(
        {
          scope: "comment",
          begin,
          end,
          contains: []
        },
        modeOptions
      );
      mode.contains.push({
        scope: "doctag",
        // hack to avoid the space from being included. the space is necessary to
        // match here to prevent the plain text rule below from gobbling up doctags
        begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
        end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
        excludeBegin: true,
        relevance: 0
      });
      const ENGLISH_WORD = either(
        // list of common 1 and 2 letter words in English
        "I",
        "a",
        "is",
        "so",
        "us",
        "to",
        "at",
        "if",
        "in",
        "it",
        "on",
        // note: this is not an exhaustive list of contractions, just popular ones
        /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
        // contractions - can't we'd they're let's, etc
        /[A-Za-z]+[-][a-z]+/,
        // `no-way`, etc.
        /[A-Za-z][a-z]{2,}/
        // allow capitalized words at beginning of sentences
      );
      mode.contains.push(
        {
          // TODO: how to include ", (, ) without breaking grammars that use these for
          // comment delimiters?
          // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
          // ---
          // this tries to find sequences of 3 english words in a row (without any
          // "programming" type syntax) this gives us a strong signal that we've
          // TRULY found a comment - vs perhaps scanning with the wrong language.
          // It's possible to find something that LOOKS like the start of the
          // comment - but then if there is no readable text - good chance it is a
          // false match and not a comment.
          //
          // for a visual example please see:
          // https://github.com/highlightjs/highlight.js/issues/2827
          begin: concat(
            /[ ]+/,
            // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
            "(",
            ENGLISH_WORD,
            /[.]?[:]?([.][ ]|[ ])/,
            "){3}"
          )
          // look for 3 words in a row
        }
      );
      return mode;
    };
    var C_LINE_COMMENT_MODE = COMMENT("//", "$");
    var C_BLOCK_COMMENT_MODE = COMMENT("/\\*", "\\*/");
    var HASH_COMMENT_MODE = COMMENT("#", "$");
    var NUMBER_MODE = {
      scope: "number",
      begin: NUMBER_RE,
      relevance: 0
    };
    var C_NUMBER_MODE = {
      scope: "number",
      begin: C_NUMBER_RE,
      relevance: 0
    };
    var BINARY_NUMBER_MODE = {
      scope: "number",
      begin: BINARY_NUMBER_RE,
      relevance: 0
    };
    var REGEXP_MODE = {
      scope: "regexp",
      begin: /\/(?=[^/\n]*\/)/,
      end: /\/[gimuy]*/,
      contains: [
        BACKSLASH_ESCAPE,
        {
          begin: /\[/,
          end: /\]/,
          relevance: 0,
          contains: [BACKSLASH_ESCAPE]
        }
      ]
    };
    var TITLE_MODE = {
      scope: "title",
      begin: IDENT_RE3,
      relevance: 0
    };
    var UNDERSCORE_TITLE_MODE = {
      scope: "title",
      begin: UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    var METHOD_GUARD = {
      // excludes method names from keyword processing
      begin: "\\.\\s*" + UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    var END_SAME_AS_BEGIN = function(mode) {
      return Object.assign(
        mode,
        {
          /** @type {ModeCallback} */
          "on:begin": (m, resp) => {
            resp.data._beginMatch = m[1];
          },
          /** @type {ModeCallback} */
          "on:end": (m, resp) => {
            if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
          }
        }
      );
    };
    var MODES3 = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      APOS_STRING_MODE,
      BACKSLASH_ESCAPE,
      BINARY_NUMBER_MODE,
      BINARY_NUMBER_RE,
      COMMENT,
      C_BLOCK_COMMENT_MODE,
      C_LINE_COMMENT_MODE,
      C_NUMBER_MODE,
      C_NUMBER_RE,
      END_SAME_AS_BEGIN,
      HASH_COMMENT_MODE,
      IDENT_RE: IDENT_RE3,
      MATCH_NOTHING_RE,
      METHOD_GUARD,
      NUMBER_MODE,
      NUMBER_RE,
      PHRASAL_WORDS_MODE,
      QUOTE_STRING_MODE,
      REGEXP_MODE,
      RE_STARTERS_RE,
      SHEBANG,
      TITLE_MODE,
      UNDERSCORE_IDENT_RE,
      UNDERSCORE_TITLE_MODE
    });
    function skipIfHasPrecedingDot(match, response) {
      const before = match.input[match.index - 1];
      if (before === ".") {
        response.ignoreMatch();
      }
    }
    function scopeClassName(mode, _parent) {
      if (mode.className !== void 0) {
        mode.scope = mode.className;
        delete mode.className;
      }
    }
    function beginKeywords(mode, parent) {
      if (!parent) return;
      if (!mode.beginKeywords) return;
      mode.begin = "\\b(" + mode.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)";
      mode.__beforeBegin = skipIfHasPrecedingDot;
      mode.keywords = mode.keywords || mode.beginKeywords;
      delete mode.beginKeywords;
      if (mode.relevance === void 0) mode.relevance = 0;
    }
    function compileIllegal(mode, _parent) {
      if (!Array.isArray(mode.illegal)) return;
      mode.illegal = either(...mode.illegal);
    }
    function compileMatch(mode, _parent) {
      if (!mode.match) return;
      if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
      mode.begin = mode.match;
      delete mode.match;
    }
    function compileRelevance(mode, _parent) {
      if (mode.relevance === void 0) mode.relevance = 1;
    }
    var beforeMatchExt = (mode, parent) => {
      if (!mode.beforeMatch) return;
      if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
      const originalMode = Object.assign({}, mode);
      Object.keys(mode).forEach((key2) => {
        delete mode[key2];
      });
      mode.keywords = originalMode.keywords;
      mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
      mode.starts = {
        relevance: 0,
        contains: [
          Object.assign(originalMode, { endsParent: true })
        ]
      };
      mode.relevance = 0;
      delete originalMode.beforeMatch;
    };
    var COMMON_KEYWORDS = [
      "of",
      "and",
      "for",
      "in",
      "not",
      "or",
      "if",
      "then",
      "parent",
      // common variable name
      "list",
      // common variable name
      "value"
      // common variable name
    ];
    var DEFAULT_KEYWORD_SCOPE = "keyword";
    function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
      const compiledKeywords = /* @__PURE__ */ Object.create(null);
      if (typeof rawKeywords === "string") {
        compileList(scopeName, rawKeywords.split(" "));
      } else if (Array.isArray(rawKeywords)) {
        compileList(scopeName, rawKeywords);
      } else {
        Object.keys(rawKeywords).forEach(function(scopeName2) {
          Object.assign(
            compiledKeywords,
            compileKeywords(rawKeywords[scopeName2], caseInsensitive, scopeName2)
          );
        });
      }
      return compiledKeywords;
      function compileList(scopeName2, keywordList) {
        if (caseInsensitive) {
          keywordList = keywordList.map((x) => x.toLowerCase());
        }
        keywordList.forEach(function(keyword) {
          const pair = keyword.split("|");
          compiledKeywords[pair[0]] = [scopeName2, scoreForKeyword(pair[0], pair[1])];
        });
      }
    }
    function scoreForKeyword(keyword, providedScore) {
      if (providedScore) {
        return Number(providedScore);
      }
      return commonKeyword(keyword) ? 0 : 1;
    }
    function commonKeyword(keyword) {
      return COMMON_KEYWORDS.includes(keyword.toLowerCase());
    }
    var seenDeprecations = {};
    var error = (message) => {
      console.error(message);
    };
    var warn2 = (message, ...args) => {
      console.log(`WARN: ${message}`, ...args);
    };
    var deprecated = (version2, message) => {
      if (seenDeprecations[`${version2}/${message}`]) return;
      console.log(`Deprecated as of ${version2}. ${message}`);
      seenDeprecations[`${version2}/${message}`] = true;
    };
    var MultiClassError = new Error();
    function remapScopeNames(mode, regexes, { key: key2 }) {
      let offset = 0;
      const scopeNames = mode[key2];
      const emit = {};
      const positions = {};
      for (let i = 1; i <= regexes.length; i++) {
        positions[i + offset] = scopeNames[i];
        emit[i + offset] = true;
        offset += countMatchGroups(regexes[i - 1]);
      }
      mode[key2] = positions;
      mode[key2]._emit = emit;
      mode[key2]._multi = true;
    }
    function beginMultiClass(mode) {
      if (!Array.isArray(mode.begin)) return;
      if (mode.skip || mode.excludeBegin || mode.returnBegin) {
        error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
        throw MultiClassError;
      }
      if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
        error("beginScope must be object");
        throw MultiClassError;
      }
      remapScopeNames(mode, mode.begin, { key: "beginScope" });
      mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
    }
    function endMultiClass(mode) {
      if (!Array.isArray(mode.end)) return;
      if (mode.skip || mode.excludeEnd || mode.returnEnd) {
        error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
        throw MultiClassError;
      }
      if (typeof mode.endScope !== "object" || mode.endScope === null) {
        error("endScope must be object");
        throw MultiClassError;
      }
      remapScopeNames(mode, mode.end, { key: "endScope" });
      mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
    }
    function scopeSugar(mode) {
      if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
        mode.beginScope = mode.scope;
        delete mode.scope;
      }
    }
    function MultiClass(mode) {
      scopeSugar(mode);
      if (typeof mode.beginScope === "string") {
        mode.beginScope = { _wrap: mode.beginScope };
      }
      if (typeof mode.endScope === "string") {
        mode.endScope = { _wrap: mode.endScope };
      }
      beginMultiClass(mode);
      endMultiClass(mode);
    }
    function compileLanguage(language) {
      function langRe(value, global) {
        return new RegExp(
          source(value),
          "m" + (language.case_insensitive ? "i" : "") + (language.unicodeRegex ? "u" : "") + (global ? "g" : "")
        );
      }
      class MultiRegex {
        constructor() {
          this.matchIndexes = {};
          this.regexes = [];
          this.matchAt = 1;
          this.position = 0;
        }
        // @ts-ignore
        addRule(re, opts) {
          opts.position = this.position++;
          this.matchIndexes[this.matchAt] = opts;
          this.regexes.push([opts, re]);
          this.matchAt += countMatchGroups(re) + 1;
        }
        compile() {
          if (this.regexes.length === 0) {
            this.exec = () => null;
          }
          const terminators = this.regexes.map((el3) => el3[1]);
          this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: "|" }), true);
          this.lastIndex = 0;
        }
        /** @param {string} s */
        exec(s) {
          this.matcherRe.lastIndex = this.lastIndex;
          const match = this.matcherRe.exec(s);
          if (!match) {
            return null;
          }
          const i = match.findIndex((el3, i2) => i2 > 0 && el3 !== void 0);
          const matchData = this.matchIndexes[i];
          match.splice(0, i);
          return Object.assign(match, matchData);
        }
      }
      class ResumableMultiRegex {
        constructor() {
          this.rules = [];
          this.multiRegexes = [];
          this.count = 0;
          this.lastIndex = 0;
          this.regexIndex = 0;
        }
        // @ts-ignore
        getMatcher(index) {
          if (this.multiRegexes[index]) return this.multiRegexes[index];
          const matcher2 = new MultiRegex();
          this.rules.slice(index).forEach(([re, opts]) => matcher2.addRule(re, opts));
          matcher2.compile();
          this.multiRegexes[index] = matcher2;
          return matcher2;
        }
        resumingScanAtSamePosition() {
          return this.regexIndex !== 0;
        }
        considerAll() {
          this.regexIndex = 0;
        }
        // @ts-ignore
        addRule(re, opts) {
          this.rules.push([re, opts]);
          if (opts.type === "begin") this.count++;
        }
        /** @param {string} s */
        exec(s) {
          const m = this.getMatcher(this.regexIndex);
          m.lastIndex = this.lastIndex;
          let result = m.exec(s);
          if (this.resumingScanAtSamePosition()) {
            if (result && result.index === this.lastIndex) ;
            else {
              const m2 = this.getMatcher(0);
              m2.lastIndex = this.lastIndex + 1;
              result = m2.exec(s);
            }
          }
          if (result) {
            this.regexIndex += result.position + 1;
            if (this.regexIndex === this.count) {
              this.considerAll();
            }
          }
          return result;
        }
      }
      function buildModeRegex(mode) {
        const mm = new ResumableMultiRegex();
        mode.contains.forEach((term) => mm.addRule(term.begin, { rule: term, type: "begin" }));
        if (mode.terminatorEnd) {
          mm.addRule(mode.terminatorEnd, { type: "end" });
        }
        if (mode.illegal) {
          mm.addRule(mode.illegal, { type: "illegal" });
        }
        return mm;
      }
      function compileMode(mode, parent) {
        const cmode = (
          /** @type CompiledMode */
          mode
        );
        if (mode.isCompiled) return cmode;
        [
          scopeClassName,
          // do this early so compiler extensions generally don't have to worry about
          // the distinction between match/begin
          compileMatch,
          MultiClass,
          beforeMatchExt
        ].forEach((ext) => ext(mode, parent));
        language.compilerExtensions.forEach((ext) => ext(mode, parent));
        mode.__beforeBegin = null;
        [
          beginKeywords,
          // do this later so compiler extensions that come earlier have access to the
          // raw array if they wanted to perhaps manipulate it, etc.
          compileIllegal,
          // default to 1 relevance if not specified
          compileRelevance
        ].forEach((ext) => ext(mode, parent));
        mode.isCompiled = true;
        let keywordPattern = null;
        if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
          mode.keywords = Object.assign({}, mode.keywords);
          keywordPattern = mode.keywords.$pattern;
          delete mode.keywords.$pattern;
        }
        keywordPattern = keywordPattern || /\w+/;
        if (mode.keywords) {
          mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
        }
        cmode.keywordPatternRe = langRe(keywordPattern, true);
        if (parent) {
          if (!mode.begin) mode.begin = /\B|\b/;
          cmode.beginRe = langRe(cmode.begin);
          if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
          if (mode.end) cmode.endRe = langRe(cmode.end);
          cmode.terminatorEnd = source(cmode.end) || "";
          if (mode.endsWithParent && parent.terminatorEnd) {
            cmode.terminatorEnd += (mode.end ? "|" : "") + parent.terminatorEnd;
          }
        }
        if (mode.illegal) cmode.illegalRe = langRe(
          /** @type {RegExp | string} */
          mode.illegal
        );
        if (!mode.contains) mode.contains = [];
        mode.contains = [].concat(...mode.contains.map(function(c) {
          return expandOrCloneMode(c === "self" ? mode : c);
        }));
        mode.contains.forEach(function(c) {
          compileMode(
            /** @type Mode */
            c,
            cmode
          );
        });
        if (mode.starts) {
          compileMode(mode.starts, parent);
        }
        cmode.matcher = buildModeRegex(cmode);
        return cmode;
      }
      if (!language.compilerExtensions) language.compilerExtensions = [];
      if (language.contains && language.contains.includes("self")) {
        throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
      }
      language.classNameAliases = inherit$1(language.classNameAliases || {});
      return compileMode(
        /** @type Mode */
        language
      );
    }
    function dependencyOnParent(mode) {
      if (!mode) return false;
      return mode.endsWithParent || dependencyOnParent(mode.starts);
    }
    function expandOrCloneMode(mode) {
      if (mode.variants && !mode.cachedVariants) {
        mode.cachedVariants = mode.variants.map(function(variant) {
          return inherit$1(mode, { variants: null }, variant);
        });
      }
      if (mode.cachedVariants) {
        return mode.cachedVariants;
      }
      if (dependencyOnParent(mode)) {
        return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
      }
      if (Object.isFrozen(mode)) {
        return inherit$1(mode);
      }
      return mode;
    }
    var version = "11.11.1";
    var HTMLInjectionError = class extends Error {
      constructor(reason, html2) {
        super(reason);
        this.name = "HTMLInjectionError";
        this.html = html2;
      }
    };
    var escape = escapeHTML;
    var inherit = inherit$1;
    var NO_MATCH = /* @__PURE__ */ Symbol("nomatch");
    var MAX_KEYWORD_HITS = 7;
    var HLJS = function(hljs) {
      const languages = /* @__PURE__ */ Object.create(null);
      const aliases = /* @__PURE__ */ Object.create(null);
      const plugins = [];
      let SAFE_MODE = true;
      const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
      const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: "Plain text", contains: [] };
      let options = {
        ignoreUnescapedHTML: false,
        throwUnescapedHTML: false,
        noHighlightRe: /^(no-?highlight)$/i,
        languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
        classPrefix: "hljs-",
        cssSelector: "pre code",
        languages: null,
        // beta configuration options, subject to change, welcome to discuss
        // https://github.com/highlightjs/highlight.js/issues/1086
        __emitter: TokenTreeEmitter
      };
      function shouldNotHighlight(languageName) {
        return options.noHighlightRe.test(languageName);
      }
      function blockLanguage(block) {
        let classes = block.className + " ";
        classes += block.parentNode ? block.parentNode.className : "";
        const match = options.languageDetectRe.exec(classes);
        if (match) {
          const language = getLanguage(match[1]);
          if (!language) {
            warn2(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
            warn2("Falling back to no-highlight mode for this block.", block);
          }
          return language ? match[1] : "no-highlight";
        }
        return classes.split(/\s+/).find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
      }
      function highlight3(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
        let code = "";
        let languageName = "";
        if (typeof optionsOrCode === "object") {
          code = codeOrLanguageName;
          ignoreIllegals = optionsOrCode.ignoreIllegals;
          languageName = optionsOrCode.language;
        } else {
          deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
          deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
          languageName = codeOrLanguageName;
          code = optionsOrCode;
        }
        if (ignoreIllegals === void 0) {
          ignoreIllegals = true;
        }
        const context = {
          code,
          language: languageName
        };
        fire("before:highlight", context);
        const result = context.result ? context.result : _highlight(context.language, context.code, ignoreIllegals);
        result.code = context.code;
        fire("after:highlight", result);
        return result;
      }
      function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
        const keywordHits = /* @__PURE__ */ Object.create(null);
        function keywordData(mode, matchText) {
          return mode.keywords[matchText];
        }
        function processKeywords() {
          if (!top.keywords) {
            emitter.addText(modeBuffer);
            return;
          }
          let lastIndex = 0;
          top.keywordPatternRe.lastIndex = 0;
          let match = top.keywordPatternRe.exec(modeBuffer);
          let buf = "";
          while (match) {
            buf += modeBuffer.substring(lastIndex, match.index);
            const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
            const data = keywordData(top, word);
            if (data) {
              const [kind, keywordRelevance] = data;
              emitter.addText(buf);
              buf = "";
              keywordHits[word] = (keywordHits[word] || 0) + 1;
              if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
              if (kind.startsWith("_")) {
                buf += match[0];
              } else {
                const cssClass = language.classNameAliases[kind] || kind;
                emitKeyword(match[0], cssClass);
              }
            } else {
              buf += match[0];
            }
            lastIndex = top.keywordPatternRe.lastIndex;
            match = top.keywordPatternRe.exec(modeBuffer);
          }
          buf += modeBuffer.substring(lastIndex);
          emitter.addText(buf);
        }
        function processSubLanguage() {
          if (modeBuffer === "") return;
          let result2 = null;
          if (typeof top.subLanguage === "string") {
            if (!languages[top.subLanguage]) {
              emitter.addText(modeBuffer);
              return;
            }
            result2 = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
            continuations[top.subLanguage] = /** @type {CompiledMode} */
            result2._top;
          } else {
            result2 = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
          }
          if (top.relevance > 0) {
            relevance += result2.relevance;
          }
          emitter.__addSublanguage(result2._emitter, result2.language);
        }
        function processBuffer() {
          if (top.subLanguage != null) {
            processSubLanguage();
          } else {
            processKeywords();
          }
          modeBuffer = "";
        }
        function emitKeyword(keyword, scope) {
          if (keyword === "") return;
          emitter.startScope(scope);
          emitter.addText(keyword);
          emitter.endScope();
        }
        function emitMultiClass(scope, match) {
          let i = 1;
          const max2 = match.length - 1;
          while (i <= max2) {
            if (!scope._emit[i]) {
              i++;
              continue;
            }
            const klass = language.classNameAliases[scope[i]] || scope[i];
            const text2 = match[i];
            if (klass) {
              emitKeyword(text2, klass);
            } else {
              modeBuffer = text2;
              processKeywords();
              modeBuffer = "";
            }
            i++;
          }
        }
        function startNewMode(mode, match) {
          if (mode.scope && typeof mode.scope === "string") {
            emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
          }
          if (mode.beginScope) {
            if (mode.beginScope._wrap) {
              emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
              modeBuffer = "";
            } else if (mode.beginScope._multi) {
              emitMultiClass(mode.beginScope, match);
              modeBuffer = "";
            }
          }
          top = Object.create(mode, { parent: { value: top } });
          return top;
        }
        function endOfMode(mode, match, matchPlusRemainder) {
          let matched = startsWith(mode.endRe, matchPlusRemainder);
          if (matched) {
            if (mode["on:end"]) {
              const resp = new Response(mode);
              mode["on:end"](match, resp);
              if (resp.isMatchIgnored) matched = false;
            }
            if (matched) {
              while (mode.endsParent && mode.parent) {
                mode = mode.parent;
              }
              return mode;
            }
          }
          if (mode.endsWithParent) {
            return endOfMode(mode.parent, match, matchPlusRemainder);
          }
        }
        function doIgnore(lexeme) {
          if (top.matcher.regexIndex === 0) {
            modeBuffer += lexeme[0];
            return 1;
          } else {
            resumeScanAtSamePosition = true;
            return 0;
          }
        }
        function doBeginMatch(match) {
          const lexeme = match[0];
          const newMode = match.rule;
          const resp = new Response(newMode);
          const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
          for (const cb of beforeCallbacks) {
            if (!cb) continue;
            cb(match, resp);
            if (resp.isMatchIgnored) return doIgnore(lexeme);
          }
          if (newMode.skip) {
            modeBuffer += lexeme;
          } else {
            if (newMode.excludeBegin) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (!newMode.returnBegin && !newMode.excludeBegin) {
              modeBuffer = lexeme;
            }
          }
          startNewMode(newMode, match);
          return newMode.returnBegin ? 0 : lexeme.length;
        }
        function doEndMatch(match) {
          const lexeme = match[0];
          const matchPlusRemainder = codeToHighlight.substring(match.index);
          const endMode = endOfMode(top, match, matchPlusRemainder);
          if (!endMode) {
            return NO_MATCH;
          }
          const origin = top;
          if (top.endScope && top.endScope._wrap) {
            processBuffer();
            emitKeyword(lexeme, top.endScope._wrap);
          } else if (top.endScope && top.endScope._multi) {
            processBuffer();
            emitMultiClass(top.endScope, match);
          } else if (origin.skip) {
            modeBuffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              modeBuffer = lexeme;
            }
          }
          do {
            if (top.scope) {
              emitter.closeNode();
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== endMode.parent);
          if (endMode.starts) {
            startNewMode(endMode.starts, match);
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }
        function processContinuations() {
          const list3 = [];
          for (let current = top; current !== language; current = current.parent) {
            if (current.scope) {
              list3.unshift(current.scope);
            }
          }
          list3.forEach((item2) => emitter.openNode(item2));
        }
        let lastMatch = {};
        function processLexeme(textBeforeMatch, match) {
          const lexeme = match && match[0];
          modeBuffer += textBeforeMatch;
          if (lexeme == null) {
            processBuffer();
            return 0;
          }
          if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
            modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
            if (!SAFE_MODE) {
              const err = new Error(`0 width match regex (${languageName})`);
              err.languageName = languageName;
              err.badRule = lastMatch.rule;
              throw err;
            }
            return 1;
          }
          lastMatch = match;
          if (match.type === "begin") {
            return doBeginMatch(match);
          } else if (match.type === "illegal" && !ignoreIllegals) {
            const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || "<unnamed>") + '"');
            err.mode = top;
            throw err;
          } else if (match.type === "end") {
            const processed = doEndMatch(match);
            if (processed !== NO_MATCH) {
              return processed;
            }
          }
          if (match.type === "illegal" && lexeme === "") {
            modeBuffer += "\n";
            return 1;
          }
          if (iterations > 1e5 && iterations > match.index * 3) {
            const err = new Error("potential infinite loop, way more iterations than matches");
            throw err;
          }
          modeBuffer += lexeme;
          return lexeme.length;
        }
        const language = getLanguage(languageName);
        if (!language) {
          error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
          throw new Error('Unknown language: "' + languageName + '"');
        }
        const md = compileLanguage(language);
        let result = "";
        let top = continuation || md;
        const continuations = {};
        const emitter = new options.__emitter(options);
        processContinuations();
        let modeBuffer = "";
        let relevance = 0;
        let index = 0;
        let iterations = 0;
        let resumeScanAtSamePosition = false;
        try {
          if (!language.__emitTokens) {
            top.matcher.considerAll();
            for (; ; ) {
              iterations++;
              if (resumeScanAtSamePosition) {
                resumeScanAtSamePosition = false;
              } else {
                top.matcher.considerAll();
              }
              top.matcher.lastIndex = index;
              const match = top.matcher.exec(codeToHighlight);
              if (!match) break;
              const beforeMatch = codeToHighlight.substring(index, match.index);
              const processedCount = processLexeme(beforeMatch, match);
              index = match.index + processedCount;
            }
            processLexeme(codeToHighlight.substring(index));
          } else {
            language.__emitTokens(codeToHighlight, emitter);
          }
          emitter.finalize();
          result = emitter.toHTML();
          return {
            language: languageName,
            value: result,
            relevance,
            illegal: false,
            _emitter: emitter,
            _top: top
          };
        } catch (err) {
          if (err.message && err.message.includes("Illegal")) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: true,
              relevance: 0,
              _illegalBy: {
                message: err.message,
                index,
                context: codeToHighlight.slice(index - 100, index + 100),
                mode: err.mode,
                resultSoFar: result
              },
              _emitter: emitter
            };
          } else if (SAFE_MODE) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: false,
              relevance: 0,
              errorRaised: err,
              _emitter: emitter,
              _top: top
            };
          } else {
            throw err;
          }
        }
      }
      function justTextHighlightResult(code) {
        const result = {
          value: escape(code),
          illegal: false,
          relevance: 0,
          _top: PLAINTEXT_LANGUAGE,
          _emitter: new options.__emitter(options)
        };
        result._emitter.addText(code);
        return result;
      }
      function highlightAuto(code, languageSubset) {
        languageSubset = languageSubset || options.languages || Object.keys(languages);
        const plaintext = justTextHighlightResult(code);
        const results = languageSubset.filter(getLanguage).filter(autoDetection).map(
          (name) => _highlight(name, code, false)
        );
        results.unshift(plaintext);
        const sorted = results.sort((a, b) => {
          if (a.relevance !== b.relevance) return b.relevance - a.relevance;
          if (a.language && b.language) {
            if (getLanguage(a.language).supersetOf === b.language) {
              return 1;
            } else if (getLanguage(b.language).supersetOf === a.language) {
              return -1;
            }
          }
          return 0;
        });
        const [best, secondBest] = sorted;
        const result = best;
        result.secondBest = secondBest;
        return result;
      }
      function updateClassName(element, currentLang, resultLang) {
        const language = currentLang && aliases[currentLang] || resultLang;
        element.classList.add("hljs");
        element.classList.add(`language-${language}`);
      }
      function highlightElement(element) {
        let node = null;
        const language = blockLanguage(element);
        if (shouldNotHighlight(language)) return;
        fire(
          "before:highlightElement",
          { el: element, language }
        );
        if (element.dataset.highlighted) {
          console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
          return;
        }
        if (element.children.length > 0) {
          if (!options.ignoreUnescapedHTML) {
            console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
            console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
            console.warn("The element with unescaped HTML:");
            console.warn(element);
          }
          if (options.throwUnescapedHTML) {
            const err = new HTMLInjectionError(
              "One of your code blocks includes unescaped HTML.",
              element.innerHTML
            );
            throw err;
          }
        }
        node = element;
        const text2 = node.textContent;
        const result = language ? highlight3(text2, { language, ignoreIllegals: true }) : highlightAuto(text2);
        element.innerHTML = result.value;
        element.dataset.highlighted = "yes";
        updateClassName(element, language, result.language);
        element.result = {
          language: result.language,
          // TODO: remove with version 11.0
          re: result.relevance,
          relevance: result.relevance
        };
        if (result.secondBest) {
          element.secondBest = {
            language: result.secondBest.language,
            relevance: result.secondBest.relevance
          };
        }
        fire("after:highlightElement", { el: element, result, text: text2 });
      }
      function configure(userOptions) {
        options = inherit(options, userOptions);
      }
      const initHighlighting = () => {
        highlightAll();
        deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
      };
      function initHighlightingOnLoad() {
        highlightAll();
        deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
      }
      let wantsHighlight = false;
      function highlightAll() {
        function boot() {
          highlightAll();
        }
        if (document.readyState === "loading") {
          if (!wantsHighlight) {
            window.addEventListener("DOMContentLoaded", boot, false);
          }
          wantsHighlight = true;
          return;
        }
        const blocks2 = document.querySelectorAll(options.cssSelector);
        blocks2.forEach(highlightElement);
      }
      function registerLanguage(languageName, languageDefinition) {
        let lang = null;
        try {
          lang = languageDefinition(hljs);
        } catch (error$1) {
          error("Language definition for '{}' could not be registered.".replace("{}", languageName));
          if (!SAFE_MODE) {
            throw error$1;
          } else {
            error(error$1);
          }
          lang = PLAINTEXT_LANGUAGE;
        }
        if (!lang.name) lang.name = languageName;
        languages[languageName] = lang;
        lang.rawDefinition = languageDefinition.bind(null, hljs);
        if (lang.aliases) {
          registerAliases(lang.aliases, { languageName });
        }
      }
      function unregisterLanguage(languageName) {
        delete languages[languageName];
        for (const alias of Object.keys(aliases)) {
          if (aliases[alias] === languageName) {
            delete aliases[alias];
          }
        }
      }
      function listLanguages() {
        return Object.keys(languages);
      }
      function getLanguage(name) {
        name = (name || "").toLowerCase();
        return languages[name] || languages[aliases[name]];
      }
      function registerAliases(aliasList, { languageName }) {
        if (typeof aliasList === "string") {
          aliasList = [aliasList];
        }
        aliasList.forEach((alias) => {
          aliases[alias.toLowerCase()] = languageName;
        });
      }
      function autoDetection(name) {
        const lang = getLanguage(name);
        return lang && !lang.disableAutodetect;
      }
      function upgradePluginAPI(plugin) {
        if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
          plugin["before:highlightElement"] = (data) => {
            plugin["before:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
        if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
          plugin["after:highlightElement"] = (data) => {
            plugin["after:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
      }
      function addPlugin(plugin) {
        upgradePluginAPI(plugin);
        plugins.push(plugin);
      }
      function removePlugin(plugin) {
        const index = plugins.indexOf(plugin);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
      }
      function fire(event, args) {
        const cb = event;
        plugins.forEach(function(plugin) {
          if (plugin[cb]) {
            plugin[cb](args);
          }
        });
      }
      function deprecateHighlightBlock(el3) {
        deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
        deprecated("10.7.0", "Please use highlightElement now.");
        return highlightElement(el3);
      }
      Object.assign(hljs, {
        highlight: highlight3,
        highlightAuto,
        highlightAll,
        highlightElement,
        // TODO: Remove with v12 API
        highlightBlock: deprecateHighlightBlock,
        configure,
        initHighlighting,
        initHighlightingOnLoad,
        registerLanguage,
        unregisterLanguage,
        listLanguages,
        getLanguage,
        registerAliases,
        autoDetection,
        inherit,
        addPlugin,
        removePlugin
      });
      hljs.debugMode = function() {
        SAFE_MODE = false;
      };
      hljs.safeMode = function() {
        SAFE_MODE = true;
      };
      hljs.versionString = version;
      hljs.regex = {
        concat,
        lookahead,
        either,
        optional,
        anyNumberOfTimes
      };
      for (const key2 in MODES3) {
        if (typeof MODES3[key2] === "object") {
          deepFreeze(MODES3[key2]);
        }
      }
      Object.assign(hljs, MODES3);
      return hljs;
    };
    var highlight2 = HLJS({});
    highlight2.newInstance = () => HLJS({});
    module2.exports = highlight2;
    highlight2.HighlightJS = highlight2;
    highlight2.default = highlight2;
  }
});

// ../review-factory/src/model.ts
function decodeRun(d, value, path, extra = []) {
  const obj = d.object(value, path, [...extra, "model", "effort"]);
  if (!obj) return null;
  for (const key2 of extra) d.string(obj, key2, path);
  d.string(obj, "model", path);
  d.oneOf(obj, "effort", path, EFFORTS);
  return obj;
}
function decodeBranch(d, value, path) {
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
function decodeFinding(d, value, path) {
  const rawId = value && typeof value === "object" ? value.id : void 0;
  const at = typeof rawId === "string" ? `${path} (${rawId})` : path;
  const obj = d.object(value, at, ["id", "include", "title", "summary", "discovered_by"], ["implementation_verified", ...FINDING_TEXT_FIELDS, "filtered"]);
  if (!obj) return;
  d.string(obj, "id", at, /^(P[123] [1-9]\d*|F[1-9]\d*)$/, "P<priority> <n> or F<n>");
  d.boolean(obj, "include", at);
  d.string(obj, "title", at);
  d.string(obj, "summary", at);
  d.boolean(obj, "implementation_verified", at);
  for (const key2 of FINDING_TEXT_FIELDS) d.string(obj, key2, at);
  d.list(obj, "discovered_by", at, 1).forEach((one, i) => decodeRun(d, one, `${at}.discovered_by[${i}]`, ["profile"]));
  if (obj.filtered != null) {
    const f = d.object(obj.filtered, `${at}.filtered`, ["category", "reason"]);
    if (f) {
      d.oneOf(f, "category", `${at}.filtered`, FILTER_CATEGORIES);
      d.string(f, "reason", `${at}.filtered`);
    }
  }
}
function decodeFindings(data) {
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
  const file = data;
  return {
    file: {
      ...file,
      branches: file.branches ?? [],
      findings: (file.findings ?? []).map((f) => ({ ...f, implementation_verified: f.implementation_verified ?? false }))
    },
    errors: []
  };
}
function parseId(id) {
  const p = POSTABLE_ID.exec(id);
  if (p) return { kind: "P", priority: Number(p[1]), n: Number(p[2]) };
  const f = FILTERED_ID.exec(id);
  return f ? { kind: "F", n: Number(f[1]) } : null;
}
var ACTIONS, COMMENT_ACTIONS, FILTER_CATEGORIES, EFFORTS, POSTABLE_ID, FILTERED_ID, SHORT_SHA, FULL_SHA, FINDING_TEXT_FIELDS, UNKNOWN_HINT, sub, Decoder, idOrder, byId, latestBranch, includedFindings;
var init_model = __esm({
  "../review-factory/src/model.ts"() {
    "use strict";
    ACTIONS = [
      "approve",
      "approve_and_merge",
      "comment",
      "review_comment",
      "request_changes",
      "pull_request",
      "push",
      "issue_refactor",
      "issue_galaxy_brain"
    ];
    COMMENT_ACTIONS = ["approve", "approve_and_merge", "comment", "review_comment", "request_changes"];
    FILTER_CATEGORIES = ["disproved", "not_actionable", "relitigates_pr", "pre_existing", "comment_nit", "doctest", "prop_vitest"];
    EFFORTS = ["low", "medium", "high", "xhigh", "max"];
    POSTABLE_ID = /^P([123]) ([1-9]\d*)$/;
    FILTERED_ID = /^F([1-9]\d*)$/;
    SHORT_SHA = /^[0-9a-f]{7,40}$/;
    FULL_SHA = /^[0-9a-f]{40}$/;
    FINDING_TEXT_FIELDS = ["issue", "issue_details", "evidence", "fix", "fix_details"];
    UNKNOWN_HINT = " (a dedented line inside a block scalar becomes a key; indent it)";
    sub = (path, key2) => path ? `${path}.${key2}` : key2;
    Decoder = class {
      constructor() {
        __publicField(this, "errors", []);
      }
      fail(path, message) {
        this.errors.push(path ? `${path}: ${message}` : message);
      }
      /** The mapping at `path`, after reporting unknown and missing keys. */
      object(value, path, required, optional = []) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          this.fail(path, "expected a mapping");
          return null;
        }
        const obj = value;
        for (const key2 of Object.keys(obj)) if (!required.includes(key2) && !optional.includes(key2)) this.fail(path, `unknown key ${JSON.stringify(key2)}${UNKNOWN_HINT}`);
        for (const key2 of required) if (obj[key2] == null) this.fail(path, `missing ${key2}`);
        return obj;
      }
      string(obj, key2, path, pattern, what) {
        const value = obj[key2];
        if (value == null) return void 0;
        if (typeof value !== "string" || !value.trim()) {
          this.fail(sub(path, key2), "expected non-empty text");
          return void 0;
        }
        if (pattern && !pattern.test(value)) this.fail(sub(path, key2), `${JSON.stringify(value)} isn't ${what}`);
        return value;
      }
      oneOf(obj, key2, path, values) {
        const value = obj[key2];
        if (value == null) return void 0;
        if (typeof value !== "string" || !values.includes(value)) {
          this.fail(sub(path, key2), `${JSON.stringify(value)} isn't one of ${values.join(", ")}`);
          return void 0;
        }
        return value;
      }
      boolean(obj, key2, path) {
        const value = obj[key2];
        if (value == null) return void 0;
        if (typeof value !== "boolean") this.fail(sub(path, key2), `expected true or false, not ${JSON.stringify(value)}`);
        return value === true;
      }
      count(obj, key2, path) {
        const value = obj[key2];
        if (value == null) return void 0;
        if (!Number.isInteger(value) || value < 0) this.fail(sub(path, key2), "expected a whole number");
        return value;
      }
      list(obj, key2, path, min = 0) {
        const value = obj[key2];
        if (value == null) return [];
        if (!Array.isArray(value)) {
          this.fail(sub(path, key2), "expected a list");
          return [];
        }
        if (value.length < min) this.fail(sub(path, key2), `expected at least ${min}`);
        return value;
      }
    };
    idOrder = (id) => {
      const parsed = parseId(id);
      return !parsed ? Infinity : parsed.kind === "P" ? parsed.priority * 1e6 + parsed.n : 4e6 + parsed.n;
    };
    byId = (a, b) => idOrder(a.id) - idOrder(b.id);
    latestBranch = (file) => file.branches.at(-1);
    includedFindings = (file) => file.findings.filter((f) => f.include).sort(byId);
  }
});

// ../review-factory/src/status.ts
function trimWork(file) {
  const work = { drop: [], restore: [], ask: [] };
  const latest = latestBranch(file);
  if (!latest) return work;
  const included = new Set(file.findings.filter((f) => f.include).map((f) => f.id));
  const sort = (commit) => {
    const keep = commit.findings.filter((id) => included.has(id));
    const drop = commit.findings.filter((id) => !included.has(id));
    return { keep, drop };
  };
  const onLatest = /* @__PURE__ */ new Set();
  for (const commit of latest.commits) {
    const { keep, drop } = sort(commit);
    keep.forEach((id) => onLatest.add(id));
    if (!keep.length) work.drop.push({ sha: commit.sha, findings: drop });
    else if (drop.length) work.ask.push({ sha: commit.sha, included: keep, excluded: drop });
  }
  const restored = /* @__PURE__ */ new Set();
  for (const branch of file.branches.slice(0, -1).reverse()) {
    for (const commit of branch.commits) {
      const missing = commit.findings.filter((id) => included.has(id) && !onLatest.has(id) && !restored.has(id));
      if (!missing.length) continue;
      missing.forEach((id) => restored.add(id));
      const { drop } = sort(commit);
      if (drop.length) work.ask.push({ sha: commit.sha, included: missing, excluded: drop });
      else work.restore.push({ sha: commit.sha, revision: branch.revision, findings: missing });
    }
  }
  return work;
}
function trimLine(file) {
  const { drop, restore, ask } = trimWork(file);
  const parts = [
    ...drop.map((c) => `drop ${c.sha} (${c.findings.join(", ")})`),
    ...restore.map((c) => `restore ${c.sha} (${c.findings.join(", ")})`),
    ...ask.map((c) => `ask John about ${c.sha} (keeps ${c.included.join(", ")}, drops ${c.excluded.join(", ")})`)
  ];
  return parts.length ? `\u2702\uFE0F Trim: ${parts.join(", ")}` : null;
}
var init_status = __esm({
  "../review-factory/src/status.ts"() {
    "use strict";
    init_model();
  }
});

// ../review-factory/src/gates.ts
function fileGates(file) {
  const errors = [];
  const counts = /* @__PURE__ */ new Map();
  for (const f of file.findings) counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
  for (const [id, n] of counts) if (n > 1) errors.push(`${id} is used by ${n} findings`);
  const profiles = new Set(file.agents.map((a) => a.profile));
  if (profiles.size !== file.agents.length) errors.push("agents lists a profile twice");
  for (const f of file.findings) {
    const filteredId = FILTERED_ID.test(f.id);
    if (!filteredId && f.filtered) errors.push(`${f.id}: only F items are filtered`);
    if (filteredId && !f.filtered) errors.push(`${f.id}: F items need filtered`);
    if (!filteredId && !f.issue) errors.push(`${f.id}: missing issue`);
    for (const d of f.discovered_by) if (!profiles.has(d.profile)) errors.push(`${f.id}: discovered by ${d.profile}, which isn't in agents`);
  }
  const names = /* @__PURE__ */ new Set();
  file.branches.forEach((branch, i) => {
    const at = `branches[${i}]`;
    if (names.has(branch.name)) errors.push(`${at}: ${branch.name} is listed twice`);
    names.add(branch.name);
    const previous = file.branches[i - 1];
    if (previous && branch.revision <= previous.revision) errors.push(`${at}: revision ${branch.revision} must be above the previous ${previous.revision}`);
    const shas = /* @__PURE__ */ new Set();
    for (const commit of branch.commits) {
      if (shas.has(commit.sha)) errors.push(`${at}: commit ${commit.sha} is listed twice`);
      shas.add(commit.sha);
      for (const id of commit.findings) {
        if (FILTERED_ID.test(id)) errors.push(`${at} commit ${commit.sha}: ${id} is filtered; trim gives a finding a P id before a commit can fix it`);
        else if (!counts.has(id)) errors.push(`${at} commit ${commit.sha}: no finding ${id}`);
      }
    }
  });
  const latest = latestBranch(file);
  if (latest?.commits.length && !latest.description) errors.push(`${latest.name}: missing description`);
  return errors;
}
function mentions(text2) {
  return [...text2.replace(CODE, "").matchAll(MENTION)].map((m) => m[1]);
}
function agentText(ctx) {
  const out = [];
  for (const f of includedFindings(ctx.file)) {
    out.push([f.id, [f.title, ...FINDING_TEXT_FIELDS.map((k) => f[k] ?? "")].join("\n")]);
  }
  const latest = latestBranch(ctx.file);
  if (latest) out.push([latest.name, [latest.pr_title, latest.description, ...latest.commits.flatMap((c) => [c.subject, c.detail])].join("\n")]);
  if (ctx.risks) out.push(["risks.md", ctx.risks]);
  if (ctx.followupIssue) out.push(["followup_refactor_issue.md", ctx.followupIssue]);
  return out;
}
function composeGates(ctx, mode) {
  const { file } = ctx;
  const { actions } = file;
  const errors = fileGates(file);
  const warnings = [];
  const checked = COMMENT_ACTIONS.filter((a) => actions[a]);
  if (!checked.length) errors.push(`check one of ${COMMENT_ACTIONS.map(label).join(", ")}`);
  if (checked.length > 1) errors.push(`check only one of ${checked.map(label).join(", ")}`);
  if (noteIsEmpty(ctx.commentNote)) errors.push(`${commentNoteName(file.round)} is empty`);
  const included = new Set(includedFindings(file).map((f) => f.id));
  for (const [name, note] of [["comment note", ctx.commentNote], ["PR note", ctx.prNote]]) {
    for (const id of new Set(noteText(note).match(CITATION) ?? [])) if (!included.has(id)) errors.push(`the ${name} cites ${id}, which isn't included`);
  }
  for (const f of includedFindings(file)) if (!POSTABLE_ID.test(f.id)) errors.push(`${f.id} is included; trim must verify it and give it a P id`);
  const trim = trimLine(file);
  if (trim) errors.push(trim);
  for (const [where, text2] of agentText(ctx)) for (const login of new Set(mentions(text2))) errors.push(`${where} mentions @${login}; put it in backticks or drop the @`);
  const branchCommits = latestBranch(file)?.commits.length ?? 0;
  if (actions.pull_request) {
    if (noteIsEmpty(ctx.prNote)) errors.push(`${prNoteName(file.round)} is empty`);
    if (!branchCommits) errors.push("Pull request is checked but the review branch has no commits");
    else if (!latestBranch(file).pr_title) errors.push(`${latestBranch(file).name}: missing pr_title`);
    if (actions.push) errors.push("check Pull request or Push, not both");
    if (mode === "comment" && !ctx.prUrl) errors.push("Pull request is checked: run `compose pr`, open the PR, then `compose comment --pr-url <url>`");
  } else if (mode === "pr") errors.push("Pull request isn't checked");
  if (actions.push && !branchCommits) errors.push("Push is checked but the review branch has no commits");
  if (actions.issue_refactor && !ctx.followupIssue) errors.push("Issue (refactor) is checked but there's no followup_refactor_issue.md");
  if (actions.issue_galaxy_brain && !ctx.learningIssue) errors.push("Issue (galaxy-brain) is checked but there's no learning_galaxy_followup_issue.md");
  if (ctx.followupIssue && !file.followup_target) errors.push("followup_refactor_issue.md needs followup_target");
  if (ctx.humanReview) {
    const shas = ctx.humanReview.match(HUMAN_REVIEW_SHA) ?? [];
    const other = shas.find((sha) => !file.reviewed_commit.startsWith(sha));
    if (other && !shas.some((sha) => file.reviewed_commit.startsWith(sha))) warnings.push(`human_review.md names ${other}, not the reviewed commit ${file.reviewed_commit.slice(0, 11)}`);
  }
  return { errors, warnings };
}
var commentNoteName, prNoteName, PLACEHOLDER, HTML_COMMENT, noteText, noteIsEmpty, label, CODE, MENTION, CITATION, HUMAN_REVIEW_SHA;
var init_gates = __esm({
  "../review-factory/src/gates.ts"() {
    "use strict";
    init_model();
    init_status();
    commentNoteName = (round2) => `johns_review_${round2}_comment_note.md`;
    prNoteName = (round2) => `johns_review_${round2}_pr_note.md`;
    PLACEHOLDER = /\(space for John's free style comments[^)]*\)/g;
    HTML_COMMENT = /<!--[\s\S]*?-->/g;
    noteText = (note) => (note ?? "").replace(HTML_COMMENT, "").replace(PLACEHOLDER, "").trim();
    noteIsEmpty = (note) => !noteText(note);
    label = (action) => action.replace(/_/g, " ");
    CODE = /```[\s\S]*?```|`[^`\n]*`/g;
    MENTION = /(?<![\w`@])@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/g;
    CITATION = /\bP[123] \d+\b/g;
    HUMAN_REVIEW_SHA = /\b[0-9a-f]{7,40}\b/g;
  }
});

// ../review-factory/src/compose.ts
function agentDetails(ctx) {
  const { file } = ctx;
  const links = new Links(ctx.repo, file);
  const runs = file.agents.map((a) => `- Review profile ${links.profile(a.profile)} was run via ${a.model} at ${a.effort} effort.`);
  runs.push(`- Verification was run as documented [here](${PROCESS_URL}) via ${file.verification.model} at ${file.verification.effort} effort.`);
  return details("Automated Review Details", blocks([ctx.repo === "galaxy" && FACTORY_LINE, runs.join("\n")]));
}
function branchBlock(ctx, branch) {
  const links = new Links(ctx.repo, ctx.file);
  const commits = branch.commits.map((c) => `- [\`${c.sha}\`](${links.commit(c.sha)}) ${c.detail ? `${c.subject}: ${c.detail.trim()}` : c.subject}`);
  const inner = details("Branch and Commit Details", blocks([links.inline(branch.description.trim(), branch), commits.join("\n")]));
  const intro = `This [review branch](${links.tree(branch.name)}) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.`;
  return details("Review Verification Branch Details", blocks([intro, inner]));
}
function postedBranch(file) {
  const branch = latestBranch(file);
  return branch?.commits.length ? branch : void 0;
}
function findingBody(ctx, f, branch) {
  const { file } = ctx;
  const links = new Links(ctx.repo, file);
  const fixes = (branch?.commits ?? []).filter((c) => c.findings.includes(f.id)).map((c) => `[\`${c.sha}\`](${links.commit(c.sha)})`);
  const verified = f.implementation_verified ? ` Verified via ${file.verification.model} at ${file.verification.effort} effort.` : "";
  const provenance = `Discovered by ${list2(f.discovered_by.map((d) => discovery(links, d)))}.${verified}`;
  return blocks([
    f.issue.trim(),
    f.issue_details && details("Details", f.issue_details),
    f.evidence && details("Evidence", f.evidence),
    f.fix?.trim(),
    f.fix_details && details("Details", f.fix_details),
    fixes.length > 0 && `Fixed on the review branch in ${list2(fixes)}.`,
    details("Discovery & Verification Agent Details", provenance)
  ]).trimEnd();
}
function fence(text2) {
  const longest = Math.max(2, ...(text2.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(longest + 1);
}
function followup(ctx) {
  if (!ctx.followupIssue) return null;
  const issue = ctx.followupIssue.trim();
  const marks = fence(issue);
  return details(
    `Suggested Follow-Up Refactoring for ${ctx.file.followup_target}`,
    `Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

${marks}markdown
${issue}
${marks}`
  );
}
function reviewBlocks(ctx) {
  const findings = includedFindings(ctx.file);
  const withBranch = postedBranch(ctx.file);
  const out = [agentDetails(ctx)];
  if (ctx.risks?.trim()) out.push(details("Risks", ctx.risks));
  if (!findings.length) out.push(NO_FINDINGS[ctx.pr % 3]);
  else {
    out.push("## Automated Review Findings", ABOUT_FINDINGS);
    if (withBranch) out.push(branchBlock(ctx, withBranch));
    out.push(...findings.map((f) => findingBlock(ctx, f, withBranch)));
  }
  const issue = followup(ctx);
  if (issue) out.push(issue);
  return out;
}
function composeComment(ctx) {
  const head = [noteText(ctx.commentNote), humanReview(ctx)];
  if (ctx.file.actions.pull_request) {
    return blocks([...head, `The automated review findings, and a branch with fixes for them, are in ${ctx.prUrl}.`]);
  }
  return blocks([...head, ...reviewBlocks(ctx)]);
}
var AGENTS_URL, PROCESS_URL, FACTORY_LINE, ABOUT_FINDINGS, NO_FINDINGS, details, blocks, list2, Links, discovery, findingBlock, humanReview, composePrBody;
var init_compose = __esm({
  "../review-factory/src/compose.ts"() {
    "use strict";
    init_repository_tabs();
    init_gates();
    init_model();
    AGENTS_URL = "https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents";
    PROCESS_URL = `${AGENTS_URL}/_shared/PROCESS_INITIAL_REVIEW.md`;
    FACTORY_LINE = "Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).";
    ABOUT_FINDINGS = `<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>`;
    NO_FINDINGS = [
      "- What is this magic \u{1FA84} - no findings! What a trick you pulled off here.",
      "- Exit 0 from these Unix-y agents \u{1F427} - everything must be okay.",
      "- Heroic effort \u{1F9B8} - none of the agents found issues."
    ];
    details = (summary, body) => `<details><summary>${summary}</summary>

${body.trim()}

</details>`;
    blocks = (parts) => `${parts.filter(Boolean).join("\n\n")}
`;
    list2 = (items) => items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
    Links = class {
      constructor(repo, file) {
        __publicField(this, "repo", repo);
        __publicField(this, "file", file);
        __publicField(this, "tree", (branch) => `https://github.com/${FORK_OWNER}/${this.repo}/tree/${branch}`);
        __publicField(this, "commit", (sha) => `https://github.com/${FORK_OWNER}/${this.repo}/commit/${sha}`);
        __publicField(this, "profile", (profile) => {
          const path = this.file.agents.find((a) => a.profile === profile)?.path;
          return `[${profile}](${AGENTS_URL}/${path})`;
        });
      }
      knownSha(token) {
        if (!/^[0-9a-f]{7,40}$/.test(token)) return false;
        const shas = [this.file.reviewed_commit, ...this.file.branches.flatMap((b) => [b.head, ...b.commits.map((c) => c.sha)])];
        return shas.some((sha) => sha.startsWith(token) || token.startsWith(sha));
      }
      /** Links backticked branch names and known commit SHAs that aren't links yet. */
      inline(text2, branch) {
        return text2.replace(/(?<!\[)`([^`\n]+)`(?!\]\()/g, (span, token) => {
          if (token === branch.name) return `[${span}](${this.tree(token)})`;
          return this.knownSha(token) ? `[${span}](${this.commit(token)})` : span;
        });
      }
    };
    discovery = (links, d) => `${links.profile(d.profile)} via ${d.model} at ${d.effort} effort`;
    findingBlock = (ctx, f, branch) => `### ${f.id}: ${f.title}${f.implementation_verified ? " (implementation verified)" : ""}

${findingBody(ctx, f, branch)}`;
    humanReview = (ctx) => ctx.humanReview?.trim() ? `## Human Review

${ctx.humanReview.trim()}` : null;
    composePrBody = (ctx) => blocks([noteText(ctx.prNote), ...reviewBlocks(ctx)]);
  }
});

// ../review-factory/src/landing.ts
function statusLine(ctx) {
  const trim = trimLine(ctx.file);
  if (trim) return trim;
  const mode = gateMode(ctx);
  const { errors } = composeGates(ctx, mode);
  if (errors.length) return `\u26D4 ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`;
  if (mode === "pr") return "\u2705 Ready to open the PR";
  return `\u2705 Ready to ${ACTIONS.filter((a) => ctx.file.actions[a]).map(label2).join(", ")}`;
}
function landing(ctx) {
  const { file } = ctx;
  const branch = postedBranch(file);
  const applies = { pull_request: !!branch, push: !!branch, issue_refactor: !!ctx.followupIssue, issue_galaxy_brain: ctx.learningIssue };
  const items = [...file.findings].sort(byId).map((f) => ({
    id: f.id,
    title: f.title,
    summary: f.summary,
    include: f.include,
    ...f.filtered ? { filtered: f.filtered } : {},
    fixedIn: (branch?.commits ?? []).filter((c) => c.findings.includes(f.id)).map((c) => c.sha),
    ...f.issue ? { text: findingBody(ctx, f, branch) } : {}
  }));
  const mode = gateMode(ctx);
  return {
    status: statusLine(ctx),
    ...composeGates(ctx, mode),
    findings: items.filter((f) => !FILTERED_ID.test(f.id)),
    filtered: items.filter((f) => FILTERED_ID.test(f.id)),
    notes: [
      { name: commentNoteName(file.round), state: noteState(ctx.commentNote) },
      { name: prNoteName(file.round), state: noteState(ctx.prNote) }
    ],
    actions: ACTIONS.filter((a) => applies[a] !== false || file.actions[a]).map((action) => ({ action, label: ACTION_LABELS[action], checked: file.actions[action] })),
    previews: {
      comment: composeComment(mode === "pr" ? { ...ctx, prUrl: "the review-branch PR" } : ctx),
      pr: branch ? composePrBody(ctx) : null
    }
  };
}
var label2, gateMode, ACTION_LABELS, noteLabel, TONES, statusTone, noteState;
var init_landing = __esm({
  "../review-factory/src/landing.ts"() {
    "use strict";
    init_compose();
    init_gates();
    init_model();
    init_status();
    label2 = (action) => action.replace(/_/g, " ");
    gateMode = (ctx) => ctx.file.actions.pull_request && !ctx.prUrl ? "pr" : "comment";
    ACTION_LABELS = {
      approve: "Approve",
      approve_and_merge: "Approve and merge",
      comment: "Comment",
      review_comment: "Review comment",
      request_changes: "Request changes",
      pull_request: "Pull request",
      push: "Push",
      issue_refactor: "Issue (refactor)",
      issue_galaxy_brain: "Issue (galaxy-brain)"
    };
    noteLabel = ({ name, state }) => `\u{1F4DD} ${/_pr_note\.md$/.test(name) ? "PR note" : "Comment note"}${state === "written" ? "" : ` \xB7 ${state}`}`;
    TONES = [
      ["\u2705", "ready"],
      ["\u2702\uFE0F", "trim"],
      ["\u26A0\uFE0F", "warning"]
    ];
    statusTone = (line) => TONES.find(([mark]) => line.startsWith(mark))?.[1] ?? "blocked";
    noteState = (note) => note === null ? "missing" : noteIsEmpty(note) ? "empty" : "written";
  }
});

// node_modules/yaml/browser/dist/nodes/identity.js
function isCollection(node) {
  if (node && typeof node === "object")
    switch (node[NODE_TYPE]) {
      case MAP:
      case SEQ:
        return true;
    }
  return false;
}
function isNode(node) {
  if (node && typeof node === "object")
    switch (node[NODE_TYPE]) {
      case ALIAS:
      case MAP:
      case SCALAR:
      case SEQ:
        return true;
    }
  return false;
}
var ALIAS, DOC, MAP, PAIR, SCALAR, SEQ, NODE_TYPE, isAlias, isDocument, isMap, isPair, isScalar, isSeq, hasAnchor;
var init_identity = __esm({
  "node_modules/yaml/browser/dist/nodes/identity.js"() {
    ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  }
});

// node_modules/yaml/browser/dist/visit.js
function visit(node, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node)) {
    const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
    if (cd === REMOVE)
      node.contents = null;
  } else
    visit_(null, node, visitor_, Object.freeze([]));
}
function visit_(key2, node, visitor, path) {
  const ctrl = callVisitor(key2, node, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key2, path, ctrl);
    return visit_(key2, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node)) {
      path = Object.freeze(path.concat(node));
      for (let i = 0; i < node.items.length; ++i) {
        const ci = visit_(i, node.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node)) {
      path = Object.freeze(path.concat(node));
      const ck = visit_("key", node.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node.key = null;
      const cv = visit_("value", node.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node.value = null;
    }
  }
  return ctrl;
}
async function visitAsync(node, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node)) {
    const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
    if (cd === REMOVE)
      node.contents = null;
  } else
    await visitAsync_(null, node, visitor_, Object.freeze([]));
}
async function visitAsync_(key2, node, visitor, path) {
  const ctrl = await callVisitor(key2, node, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key2, path, ctrl);
    return visitAsync_(key2, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node)) {
      path = Object.freeze(path.concat(node));
      for (let i = 0; i < node.items.length; ++i) {
        const ci = await visitAsync_(i, node.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node)) {
      path = Object.freeze(path.concat(node));
      const ck = await visitAsync_("key", node.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node.key = null;
      const cv = await visitAsync_("value", node.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node.value = null;
    }
  }
  return ctrl;
}
function initVisitor(visitor) {
  if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
    return Object.assign({
      Alias: visitor.Node,
      Map: visitor.Node,
      Scalar: visitor.Node,
      Seq: visitor.Node
    }, visitor.Value && {
      Map: visitor.Value,
      Scalar: visitor.Value,
      Seq: visitor.Value
    }, visitor.Collection && {
      Map: visitor.Collection,
      Seq: visitor.Collection
    }, visitor);
  }
  return visitor;
}
function callVisitor(key2, node, visitor, path) {
  if (typeof visitor === "function")
    return visitor(key2, node, path);
  if (isMap(node))
    return visitor.Map?.(key2, node, path);
  if (isSeq(node))
    return visitor.Seq?.(key2, node, path);
  if (isPair(node))
    return visitor.Pair?.(key2, node, path);
  if (isScalar(node))
    return visitor.Scalar?.(key2, node, path);
  if (isAlias(node))
    return visitor.Alias?.(key2, node, path);
  return void 0;
}
function replaceNode(key2, path, node) {
  const parent = path[path.length - 1];
  if (isCollection(parent)) {
    parent.items[key2] = node;
  } else if (isPair(parent)) {
    if (key2 === "key")
      parent.key = node;
    else
      parent.value = node;
  } else if (isDocument(parent)) {
    parent.contents = node;
  } else {
    const pt = isAlias(parent) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${pt} parent`);
  }
}
var BREAK, SKIP, REMOVE;
var init_visit = __esm({
  "node_modules/yaml/browser/dist/visit.js"() {
    init_identity();
    BREAK = /* @__PURE__ */ Symbol("break visit");
    SKIP = /* @__PURE__ */ Symbol("skip children");
    REMOVE = /* @__PURE__ */ Symbol("remove node");
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
  }
});

// node_modules/yaml/browser/dist/doc/directives.js
var escapeChars, escapeTagName, Directives;
var init_directives = __esm({
  "node_modules/yaml/browser/dist/doc/directives.js"() {
    init_identity();
    init_visit();
    escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    Directives = class _Directives {
      constructor(yaml2, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml2);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
          const tags = {};
          visit(doc.contents, (_key, node) => {
            if (isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  }
});

// node_modules/yaml/browser/dist/doc/anchors.js
function anchorIsValid(anchor) {
  if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
    const sa = JSON.stringify(anchor);
    const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
    throw new Error(msg);
  }
  return true;
}
function anchorNames(root) {
  const anchors = /* @__PURE__ */ new Set();
  visit(root, {
    Value(_key, node) {
      if (node.anchor)
        anchors.add(node.anchor);
    }
  });
  return anchors;
}
function findNewAnchor(prefix, exclude) {
  for (let i = 1; true; ++i) {
    const name = `${prefix}${i}`;
    if (!exclude.has(name))
      return name;
  }
}
function createNodeAnchors(doc, prefix) {
  const aliasObjects = [];
  const sourceObjects = /* @__PURE__ */ new Map();
  let prevAnchors = null;
  return {
    onAnchor: (source) => {
      aliasObjects.push(source);
      prevAnchors ?? (prevAnchors = anchorNames(doc));
      const anchor = findNewAnchor(prefix, prevAnchors);
      prevAnchors.add(anchor);
      return anchor;
    },
    /**
     * With circular references, the source node is only resolved after all
     * of its child nodes are. This is why anchors are set only after all of
     * the nodes have been created.
     */
    setAnchors: () => {
      for (const source of aliasObjects) {
        const ref = sourceObjects.get(source);
        if (typeof ref === "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node))) {
          ref.node.anchor = ref.anchor;
        } else {
          const error = new Error("Failed to resolve repeated object (this should not happen)");
          error.source = source;
          throw error;
        }
      }
    },
    sourceObjects
  };
}
var init_anchors = __esm({
  "node_modules/yaml/browser/dist/doc/anchors.js"() {
    init_identity();
    init_visit();
  }
});

// node_modules/yaml/browser/dist/doc/applyReviver.js
function applyReviver(reviver, obj, key2, val) {
  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      for (let i = 0, len = val.length; i < len; ++i) {
        const v0 = val[i];
        const v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === void 0)
          delete val[i];
        else if (v1 !== v0)
          val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (const k of Array.from(val.keys())) {
        const v0 = val.get(k);
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          val.delete(k);
        else if (v1 !== v0)
          val.set(k, v1);
      }
    } else if (val instanceof Set) {
      for (const v0 of Array.from(val)) {
        const v1 = applyReviver(reviver, val, v0, v0);
        if (v1 === void 0)
          val.delete(v0);
        else if (v1 !== v0) {
          val.delete(v0);
          val.add(v1);
        }
      }
    } else {
      for (const [k, v0] of Object.entries(val)) {
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          delete val[k];
        else if (v1 !== v0)
          val[k] = v1;
      }
    }
  }
  return reviver.call(obj, key2, val);
}
var init_applyReviver = __esm({
  "node_modules/yaml/browser/dist/doc/applyReviver.js"() {
  }
});

// node_modules/yaml/browser/dist/nodes/toJS.js
function toJS(value, arg, ctx) {
  if (Array.isArray(value))
    return value.map((v, i) => toJS(v, String(i), ctx));
  if (value && typeof value.toJSON === "function") {
    if (!ctx || !hasAnchor(value))
      return value.toJSON(arg, ctx);
    const data = { aliasCount: 0, count: 1, res: void 0 };
    ctx.anchors.set(value, data);
    ctx.onCreate = (res2) => {
      data.res = res2;
      delete ctx.onCreate;
    };
    const res = value.toJSON(arg, ctx);
    if (ctx.onCreate)
      ctx.onCreate(res);
    return res;
  }
  if (typeof value === "bigint" && !ctx?.keep)
    return Number(value);
  return value;
}
var init_toJS = __esm({
  "node_modules/yaml/browser/dist/nodes/toJS.js"() {
    init_identity();
  }
});

// node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase;
var init_Node = __esm({
  "node_modules/yaml/browser/dist/nodes/Node.js"() {
    init_applyReviver();
    init_identity();
    init_toJS();
    NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
  }
});

// node_modules/yaml/browser/dist/nodes/Alias.js
function getAliasCount(doc, node, anchors) {
  if (isAlias(node)) {
    const source = node.resolve(doc);
    const anchor = anchors && source && anchors.get(source);
    return anchor ? anchor.count * anchor.aliasCount : 0;
  } else if (isCollection(node)) {
    let count = 0;
    for (const item2 of node.items) {
      const c = getAliasCount(doc, item2, anchors);
      if (c > count)
        count = c;
    }
    return count;
  } else if (isPair(node)) {
    const kc = getAliasCount(doc, node.key, anchors);
    const vc = getAliasCount(doc, node.value, anchors);
    return Math.max(kc, vc);
  }
  return 1;
}
var Alias;
var init_Alias = __esm({
  "node_modules/yaml/browser/dist/nodes/Alias.js"() {
    init_anchors();
    init_visit();
    init_identity();
    init_Node();
    init_toJS();
    Alias = class extends NodeBase {
      constructor(source) {
        super(ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit(doc, {
            Node: (_key, node) => {
              if (isAlias(node) || hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors, doc: doc2, maxAliasCount } = ctx;
          let data = anchors.get(found);
          if (!data) {
            toJS(found, null, ctx);
            data = anchors.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
  }
});

// node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue, Scalar;
var init_Scalar = __esm({
  "node_modules/yaml/browser/dist/nodes/Scalar.js"() {
    init_identity();
    init_Node();
    init_toJS();
    isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    Scalar = class extends NodeBase {
      constructor(value) {
        super(SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  }
});

// node_modules/yaml/browser/dist/doc/createNode.js
function findTagObject(value, tagName, tags) {
  if (tagName) {
    const match = tags.filter((t) => t.tag === tagName);
    const tagObj = match.find((t) => !t.format) ?? match[0];
    if (!tagObj)
      throw new Error(`Tag ${tagName} not found`);
    return tagObj;
  }
  return tags.find((t) => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
  if (isDocument(value))
    value = value.contents;
  if (isNode(value))
    return value;
  if (isPair(value)) {
    const map2 = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
    map2.items.push(value);
    return map2;
  }
  if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
    value = value.valueOf();
  }
  const { aliasDuplicateObjects, onAnchor, onTagObj, schema: schema4, sourceObjects } = ctx;
  let ref = void 0;
  if (aliasDuplicateObjects && value && typeof value === "object") {
    ref = sourceObjects.get(value);
    if (ref) {
      ref.anchor ?? (ref.anchor = onAnchor(value));
      return new Alias(ref.anchor);
    } else {
      ref = { anchor: null, node: null };
      sourceObjects.set(value, ref);
    }
  }
  if (tagName?.startsWith("!!"))
    tagName = defaultTagPrefix + tagName.slice(2);
  let tagObj = findTagObject(value, tagName, schema4.tags);
  if (!tagObj) {
    if (value && typeof value.toJSON === "function") {
      value = value.toJSON();
    }
    if (!value || typeof value !== "object") {
      const node2 = new Scalar(value);
      if (ref)
        ref.node = node2;
      return node2;
    }
    tagObj = value instanceof Map ? schema4[MAP] : Symbol.iterator in Object(value) ? schema4[SEQ] : schema4[MAP];
  }
  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  }
  const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
  if (tagName)
    node.tag = tagName;
  else if (!tagObj.default)
    node.tag = tagObj.tag;
  if (ref)
    ref.node = node;
  return node;
}
var defaultTagPrefix;
var init_createNode = __esm({
  "node_modules/yaml/browser/dist/doc/createNode.js"() {
    init_Alias();
    init_identity();
    init_Scalar();
    defaultTagPrefix = "tag:yaml.org,2002:";
  }
});

// node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema4, path, value) {
  let v = value;
  for (let i = path.length - 1; i >= 0; --i) {
    const k = path[i];
    if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
      const a = [];
      a[k] = v;
      v = a;
    } else {
      v = /* @__PURE__ */ new Map([[k, v]]);
    }
  }
  return createNode(v, void 0, {
    aliasDuplicateObjects: false,
    keepUndefined: false,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: schema4,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
var isEmptyPath, Collection;
var init_Collection = __esm({
  "node_modules/yaml/browser/dist/nodes/Collection.js"() {
    init_createNode();
    init_identity();
    init_Node();
    isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    Collection = class extends NodeBase {
      constructor(type, schema4) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema4,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema4) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema4)
          copy.schema = schema4;
        copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema4) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value) {
        if (isEmptyPath(path))
          this.add(value);
        else {
          const [key2, ...rest] = path;
          const node = this.get(key2, true);
          if (isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key2, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key2}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key2, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key2);
        const node = this.get(key2, true);
        if (isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key2}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key2, ...rest] = path;
        const node = this.get(key2, true);
        if (rest.length === 0)
          return !keepScalar && isScalar(node) ? node.value : node;
        else
          return isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key2, ...rest] = path;
        if (rest.length === 0)
          return this.has(key2);
        const node = this.get(key2, true);
        return isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        const [key2, ...rest] = path;
        if (rest.length === 0) {
          this.set(key2, value);
        } else {
          const node = this.get(key2, true);
          if (isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key2, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key2}. Remaining path: ${rest}`);
        }
      }
    };
  }
});

// node_modules/yaml/browser/dist/stringify/stringifyComment.js
function indentComment(comment, indent) {
  if (/^\n+$/.test(comment))
    return comment.substring(1);
  return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var stringifyComment, lineComment;
var init_stringifyComment = __esm({
  "node_modules/yaml/browser/dist/stringify/stringifyComment.js"() {
    stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  }
});

// node_modules/yaml/browser/dist/stringify/foldFlowLines.js
function foldFlowLines(text2, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
  if (!lineWidth || lineWidth < 0)
    return text2;
  if (lineWidth < minContentWidth)
    minContentWidth = 0;
  const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text2.length <= endStep)
    return text2;
  const folds = [];
  const escapedFolds = {};
  let end = lineWidth - indent.length;
  if (typeof indentAtStart === "number") {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
      folds.push(0);
    else
      end = lineWidth - indentAtStart;
  }
  let split = void 0;
  let prev = void 0;
  let overflow = false;
  let i = -1;
  let escStart = -1;
  let escEnd = -1;
  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text2, i, indent.length);
    if (i !== -1)
      end = i + endStep;
  }
  for (let ch; ch = text2[i += 1]; ) {
    if (mode === FOLD_QUOTED && ch === "\\") {
      escStart = i;
      switch (text2[i + 1]) {
        case "x":
          i += 3;
          break;
        case "u":
          i += 5;
          break;
        case "U":
          i += 9;
          break;
        default:
          i += 1;
      }
      escEnd = i;
    }
    if (ch === "\n") {
      if (mode === FOLD_BLOCK)
        i = consumeMoreIndentedLines(text2, i, indent.length);
      end = i + indent.length + endStep;
      split = void 0;
    } else {
      if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
        const next = text2[i + 1];
        if (next && next !== " " && next !== "\n" && next !== "	")
          split = i;
      }
      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = void 0;
        } else if (mode === FOLD_QUOTED) {
          while (prev === " " || prev === "	") {
            prev = ch;
            ch = text2[i += 1];
            overflow = true;
          }
          const j = i > escEnd + 1 ? i - 2 : escStart - 1;
          if (escapedFolds[j])
            return text2;
          folds.push(j);
          escapedFolds[j] = true;
          end = j + endStep;
          split = void 0;
        } else {
          overflow = true;
        }
      }
    }
    prev = ch;
  }
  if (overflow && onOverflow)
    onOverflow();
  if (folds.length === 0)
    return text2;
  if (onFold)
    onFold();
  let res = text2.slice(0, folds[0]);
  for (let i2 = 0; i2 < folds.length; ++i2) {
    const fold = folds[i2];
    const end2 = folds[i2 + 1] || text2.length;
    if (fold === 0)
      res = `
${indent}${text2.slice(0, end2)}`;
    else {
      if (mode === FOLD_QUOTED && escapedFolds[fold])
        res += `${text2[fold]}\\`;
      res += `
${indent}${text2.slice(fold + 1, end2)}`;
    }
  }
  return res;
}
function consumeMoreIndentedLines(text2, i, indent) {
  let end = i;
  let start = i + 1;
  let ch = text2[start];
  while (ch === " " || ch === "	") {
    if (i < start + indent) {
      ch = text2[++i];
    } else {
      do {
        ch = text2[++i];
      } while (ch && ch !== "\n");
      end = i;
      start = i + 1;
      ch = text2[start];
    }
  }
  return end;
}
var FOLD_FLOW, FOLD_BLOCK, FOLD_QUOTED;
var init_foldFlowLines = __esm({
  "node_modules/yaml/browser/dist/stringify/foldFlowLines.js"() {
    FOLD_FLOW = "flow";
    FOLD_BLOCK = "block";
    FOLD_QUOTED = "quoted";
  }
});

// node_modules/yaml/browser/dist/stringify/stringifyString.js
function lineLengthOverLimit(str, lineWidth, indentLength) {
  if (!lineWidth || lineWidth < 0)
    return false;
  const limit = lineWidth - indentLength;
  const strLen = str.length;
  if (strLen <= limit)
    return false;
  for (let i = 0, start = 0; i < strLen; ++i) {
    if (str[i] === "\n") {
      if (i - start > limit)
        return true;
      start = i + 1;
      if (strLen - start <= limit)
        return false;
    }
  }
  return true;
}
function doubleQuotedString(value, ctx) {
  const json2 = JSON.stringify(value);
  if (ctx.options.doubleQuotedAsJSON)
    return json2;
  const { implicitKey } = ctx;
  const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  let str = "";
  let start = 0;
  for (let i = 0, ch = json2[i]; ch; ch = json2[++i]) {
    if (ch === " " && json2[i + 1] === "\\" && json2[i + 2] === "n") {
      str += json2.slice(start, i) + "\\ ";
      i += 1;
      start = i;
      ch = "\\";
    }
    if (ch === "\\")
      switch (json2[i + 1]) {
        case "u":
          {
            str += json2.slice(start, i);
            const code = json2.substr(i + 2, 4);
            switch (code) {
              case "0000":
                str += "\\0";
                break;
              case "0007":
                str += "\\a";
                break;
              case "000b":
                str += "\\v";
                break;
              case "001b":
                str += "\\e";
                break;
              case "0085":
                str += "\\N";
                break;
              case "00a0":
                str += "\\_";
                break;
              case "2028":
                str += "\\L";
                break;
              case "2029":
                str += "\\P";
                break;
              default:
                if (code.substr(0, 2) === "00")
                  str += "\\x" + code.substr(2);
                else
                  str += json2.substr(i, 6);
            }
            i += 5;
            start = i + 1;
          }
          break;
        case "n":
          if (implicitKey || json2[i + 2] === '"' || json2.length < minMultiLineLength) {
            i += 1;
          } else {
            str += json2.slice(start, i) + "\n\n";
            while (json2[i + 2] === "\\" && json2[i + 3] === "n" && json2[i + 4] !== '"') {
              str += "\n";
              i += 2;
            }
            str += indent;
            if (json2[i + 2] === " ")
              str += "\\";
            i += 1;
            start = i + 1;
          }
          break;
        default:
          i += 1;
      }
  }
  str = start ? str + json2.slice(start) : json2;
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
  if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
    return doubleQuotedString(value, ctx);
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
  return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
  const { singleQuote } = ctx.options;
  let qs;
  if (singleQuote === false)
    qs = doubleQuotedString;
  else {
    const hasDouble = value.includes('"');
    const hasSingle = value.includes("'");
    if (hasDouble && !hasSingle)
      qs = singleQuotedString;
    else if (hasSingle && !hasDouble)
      qs = doubleQuotedString;
    else
      qs = singleQuote ? singleQuotedString : doubleQuotedString;
  }
  return qs(value, ctx);
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
  const { blockQuote, commentString, lineWidth } = ctx.options;
  if (!blockQuote || /\n[\t ]+$/.test(value)) {
    return quotedString(value, ctx);
  }
  const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
  const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
  if (!value)
    return literal ? "|\n" : ">\n";
  let chomp;
  let endStart;
  for (endStart = value.length; endStart > 0; --endStart) {
    const ch = value[endStart - 1];
    if (ch !== "\n" && ch !== "	" && ch !== " ")
      break;
  }
  let end = value.substring(endStart);
  const endNlPos = end.indexOf("\n");
  if (endNlPos === -1) {
    chomp = "-";
  } else if (value === end || endNlPos !== end.length - 1) {
    chomp = "+";
    if (onChompKeep)
      onChompKeep();
  } else {
    chomp = "";
  }
  if (end) {
    value = value.slice(0, -end.length);
    if (end[end.length - 1] === "\n")
      end = end.slice(0, -1);
    end = end.replace(blockEndNewlines, `$&${indent}`);
  }
  let startWithSpace = false;
  let startEnd;
  let startNlPos = -1;
  for (startEnd = 0; startEnd < value.length; ++startEnd) {
    const ch = value[startEnd];
    if (ch === " ")
      startWithSpace = true;
    else if (ch === "\n")
      startNlPos = startEnd;
    else
      break;
  }
  let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
  if (start) {
    value = value.substring(start.length);
    start = start.replace(/\n+/g, `$&${indent}`);
  }
  const indentSize = indent ? "2" : "1";
  let header = (startWithSpace ? indentSize : "") + chomp;
  if (comment) {
    header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
    if (onComment)
      onComment();
  }
  if (!literal) {
    const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
    let literalFallback = false;
    const foldOptions = getFoldOptions(ctx, true);
    if (blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED) {
      foldOptions.onOverflow = () => {
        literalFallback = true;
      };
    }
    const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
    if (!literalFallback)
      return `>${header}
${indent}${body}`;
  }
  value = value.replace(/\n+/g, `$&${indent}`);
  return `|${header}
${indent}${start}${value}${end}`;
}
function plainString(item2, ctx, onComment, onChompKeep) {
  const { type, value } = item2;
  const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
  if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
    return quotedString(value, ctx);
  }
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item2, ctx, onComment, onChompKeep);
  }
  if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) {
    return blockString(item2, ctx, onComment, onChompKeep);
  }
  if (containsDocumentMarker(value)) {
    if (indent === "") {
      ctx.forceBlockIndent = true;
      return blockString(item2, ctx, onComment, onChompKeep);
    } else if (implicitKey && indent === indentStep) {
      return quotedString(value, ctx);
    }
  }
  const str = value.replace(/\n+/g, `$&
${indent}`);
  if (actualString) {
    const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
    const { compat, tags } = ctx.doc.schema;
    if (tags.some(test) || compat?.some(test))
      return quotedString(value, ctx);
  }
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item2, ctx, onComment, onChompKeep) {
  const { implicitKey, inFlow } = ctx;
  const ss = typeof item2.value === "string" ? item2 : Object.assign({}, item2, { value: String(item2.value) });
  let { type } = item2;
  if (type !== Scalar.QUOTE_DOUBLE) {
    if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
      type = Scalar.QUOTE_DOUBLE;
  }
  const _stringify = (_type) => {
    switch (_type) {
      case Scalar.BLOCK_FOLDED:
      case Scalar.BLOCK_LITERAL:
        return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
      case Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(ss.value, ctx);
      case Scalar.QUOTE_SINGLE:
        return singleQuotedString(ss.value, ctx);
      case Scalar.PLAIN:
        return plainString(ss, ctx, onComment, onChompKeep);
      default:
        return null;
    }
  };
  let res = _stringify(type);
  if (res === null) {
    const { defaultKeyType, defaultStringType } = ctx.options;
    const t = implicitKey && defaultKeyType || defaultStringType;
    res = _stringify(t);
    if (res === null)
      throw new Error(`Unsupported default string type ${t}`);
  }
  return res;
}
var getFoldOptions, containsDocumentMarker, blockEndNewlines;
var init_stringifyString = __esm({
  "node_modules/yaml/browser/dist/stringify/stringifyString.js"() {
    init_Scalar();
    init_foldFlowLines();
    getFoldOptions = (ctx, isBlock2) => ({
      indentAtStart: isBlock2 ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
  }
});

// node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
  const opt = Object.assign({
    blockQuote: true,
    commentString: stringifyComment,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: false,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: true,
    indentSeq: true,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: false,
    singleQuote: null,
    trailingComma: false,
    trueStr: "true",
    verifyAliasOrder: true
  }, doc.schema.toStringOptions, options);
  let inFlow;
  switch (opt.collectionStyle) {
    case "block":
      inFlow = false;
      break;
    case "flow":
      inFlow = true;
      break;
    default:
      inFlow = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc,
    flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
    inFlow,
    options: opt
  };
}
function getTagObject(tags, item2) {
  if (item2.tag) {
    const match = tags.filter((t) => t.tag === item2.tag);
    if (match.length > 0)
      return match.find((t) => t.format === item2.format) ?? match[0];
  }
  let tagObj = void 0;
  let obj;
  if (isScalar(item2)) {
    obj = item2.value;
    let match = tags.filter((t) => t.identify?.(obj));
    if (match.length > 1) {
      const testMatch = match.filter((t) => t.test);
      if (testMatch.length > 0)
        match = testMatch;
    }
    tagObj = match.find((t) => t.format === item2.format) ?? match.find((t) => !t.format);
  } else {
    obj = item2;
    tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
  }
  if (!tagObj) {
    const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
    throw new Error(`Tag not resolved for ${name} value`);
  }
  return tagObj;
}
function stringifyProps(node, tagObj, { anchors, doc }) {
  if (!doc.directives)
    return "";
  const props = [];
  const anchor = (isScalar(node) || isCollection(node)) && node.anchor;
  if (anchor && anchorIsValid(anchor)) {
    anchors.add(anchor);
    props.push(`&${anchor}`);
  }
  const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
  if (tag)
    props.push(doc.directives.tagString(tag));
  return props.join(" ");
}
function stringify(item2, ctx, onComment, onChompKeep) {
  if (isPair(item2))
    return item2.toString(ctx, onComment, onChompKeep);
  if (isAlias(item2)) {
    if (ctx.doc.directives)
      return item2.toString(ctx);
    if (ctx.resolvedAliases?.has(item2)) {
      throw new TypeError(`Cannot stringify circular structure without alias nodes`);
    } else {
      if (ctx.resolvedAliases)
        ctx.resolvedAliases.add(item2);
      else
        ctx.resolvedAliases = /* @__PURE__ */ new Set([item2]);
      item2 = item2.resolve(ctx.doc);
    }
  }
  let tagObj = void 0;
  const node = isNode(item2) ? item2 : ctx.doc.createNode(item2, { onTagObj: (o) => tagObj = o });
  tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
  const props = stringifyProps(node, tagObj, ctx);
  if (props.length > 0)
    ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
  const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : isScalar(node) ? stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
  if (!props)
    return str;
  return isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
}
var init_stringify = __esm({
  "node_modules/yaml/browser/dist/stringify/stringify.js"() {
    init_anchors();
    init_identity();
    init_stringifyComment();
    init_stringifyString();
  }
});

// node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key: key2, value }, ctx, onComment, onChompKeep) {
  const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
  let keyComment = isNode(key2) && key2.comment || null;
  if (simpleKeys) {
    if (keyComment) {
      throw new Error("With simple keys, key nodes cannot have comments");
    }
    if (isCollection(key2) || !isNode(key2) && typeof key2 === "object") {
      const msg = "With simple keys, collection cannot be used as a key value";
      throw new Error(msg);
    }
  }
  let explicitKey = !simpleKeys && (!key2 || keyComment && value == null && !ctx.inFlow || isCollection(key2) || (isScalar(key2) ? key2.type === Scalar.BLOCK_FOLDED || key2.type === Scalar.BLOCK_LITERAL : typeof key2 === "object"));
  ctx = Object.assign({}, ctx, {
    allNullValues: false,
    implicitKey: !explicitKey && (simpleKeys || !allNullValues),
    indent: indent + indentStep
  });
  let keyCommentDone = false;
  let chompKeep = false;
  let str = stringify(key2, ctx, () => keyCommentDone = true, () => chompKeep = true);
  if (!explicitKey && !ctx.inFlow && str.length > 1024) {
    if (simpleKeys)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    explicitKey = true;
  }
  if (ctx.inFlow) {
    if (allNullValues || value == null) {
      if (keyCommentDone && onComment)
        onComment();
      return str === "" ? "?" : explicitKey ? `? ${str}` : str;
    }
  } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
    str = `? ${str}`;
    if (keyComment && !keyCommentDone) {
      str += lineComment(str, ctx.indent, commentString(keyComment));
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  if (keyCommentDone)
    keyComment = null;
  if (explicitKey) {
    if (keyComment)
      str += lineComment(str, ctx.indent, commentString(keyComment));
    str = `? ${str}
${indent}:`;
  } else {
    str = `${str}:`;
    if (keyComment)
      str += lineComment(str, ctx.indent, commentString(keyComment));
  }
  let vsb, vcb, valueComment;
  if (isNode(value)) {
    vsb = !!value.spaceBefore;
    vcb = value.commentBefore;
    valueComment = value.comment;
  } else {
    vsb = false;
    vcb = null;
    valueComment = null;
    if (value && typeof value === "object")
      value = doc.createNode(value);
  }
  ctx.implicitKey = false;
  if (!explicitKey && !keyComment && isScalar(value))
    ctx.indentAtStart = str.length + 1;
  chompKeep = false;
  if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) {
    ctx.indent = ctx.indent.substring(2);
  }
  let valueCommentDone = false;
  const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
  let ws = " ";
  if (keyComment || vsb || vcb) {
    ws = vsb ? "\n" : "";
    if (vcb) {
      const cs = commentString(vcb);
      ws += `
${indentComment(cs, ctx.indent)}`;
    }
    if (valueStr === "" && !ctx.inFlow) {
      if (ws === "\n" && valueComment)
        ws = "\n\n";
    } else {
      ws += `
${ctx.indent}`;
    }
  } else if (!explicitKey && isCollection(value)) {
    const vs0 = valueStr[0];
    const nl0 = valueStr.indexOf("\n");
    const hasNewline = nl0 !== -1;
    const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
    if (hasNewline || !flow) {
      let hasPropsLine = false;
      if (hasNewline && (vs0 === "&" || vs0 === "!")) {
        let sp0 = valueStr.indexOf(" ");
        if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
          sp0 = valueStr.indexOf(" ", sp0 + 1);
        }
        if (sp0 === -1 || nl0 < sp0)
          hasPropsLine = true;
      }
      if (!hasPropsLine)
        ws = `
${ctx.indent}`;
    }
  } else if (valueStr === "" || valueStr[0] === "\n") {
    ws = "";
  }
  str += ws + valueStr;
  if (ctx.inFlow) {
    if (valueCommentDone && onComment)
      onComment();
  } else if (valueComment && !valueCommentDone) {
    str += lineComment(str, ctx.indent, commentString(valueComment));
  } else if (chompKeep && onChompKeep) {
    onChompKeep();
  }
  return str;
}
var init_stringifyPair = __esm({
  "node_modules/yaml/browser/dist/stringify/stringifyPair.js"() {
    init_identity();
    init_Scalar();
    init_stringify();
    init_stringifyComment();
  }
});

// node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
  if (logLevel === "debug" || logLevel === "warn") {
    console.warn(warning);
  }
}
var init_log = __esm({
  "node_modules/yaml/browser/dist/log.js"() {
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
function addMergeToJSMap(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (isSeq(source))
    for (const it of source.items)
      mergeValue(ctx, map2, it);
  else if (Array.isArray(source))
    for (const it of source)
      mergeValue(ctx, map2, it);
  else
    mergeValue(ctx, map2, source);
}
function mergeValue(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (!isMap(source))
    throw new Error("Merge sources must be maps or map aliases");
  const srcMap = source.toJSON(null, ctx, Map);
  for (const [key2, value2] of srcMap) {
    if (map2 instanceof Map) {
      if (!map2.has(key2))
        map2.set(key2, value2);
    } else if (map2 instanceof Set) {
      map2.add(key2);
    } else if (!Object.prototype.hasOwnProperty.call(map2, key2)) {
      Object.defineProperty(map2, key2, {
        value: value2,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }
  return map2;
}
function resolveAliasValue(ctx, value) {
  return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}
var MERGE_KEY, merge, isMergeKey;
var init_merge = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js"() {
    init_identity();
    init_Scalar();
    MERGE_KEY = "<<";
    merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    isMergeKey = (ctx, key2) => (merge.identify(key2) || isScalar(key2) && (!key2.type || key2.type === Scalar.PLAIN) && merge.identify(key2.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  }
});

// node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map2, { key: key2, value }) {
  if (isNode(key2) && key2.addToJSMap)
    key2.addToJSMap(ctx, map2, value);
  else if (isMergeKey(ctx, key2))
    addMergeToJSMap(ctx, map2, value);
  else {
    const jsKey = toJS(key2, "", ctx);
    if (map2 instanceof Map) {
      map2.set(jsKey, toJS(value, jsKey, ctx));
    } else if (map2 instanceof Set) {
      map2.add(jsKey);
    } else {
      const stringKey = stringifyKey(key2, jsKey, ctx);
      const jsValue = toJS(value, stringKey, ctx);
      if (stringKey in map2)
        Object.defineProperty(map2, stringKey, {
          value: jsValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
      else
        map2[stringKey] = jsValue;
    }
  }
  return map2;
}
function stringifyKey(key2, jsKey, ctx) {
  if (jsKey === null)
    return "";
  if (typeof jsKey !== "object")
    return String(jsKey);
  if (isNode(key2) && ctx?.doc) {
    const strCtx = createStringifyContext(ctx.doc, {});
    strCtx.anchors = /* @__PURE__ */ new Set();
    for (const node of ctx.anchors.keys())
      strCtx.anchors.add(node.anchor);
    strCtx.inFlow = true;
    strCtx.inStringifyKey = true;
    const strKey = key2.toString(strCtx);
    if (!ctx.mapKeyWarned) {
      let jsonStr = JSON.stringify(strKey);
      if (jsonStr.length > 40)
        jsonStr = jsonStr.substring(0, 36) + '..."';
      warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
      ctx.mapKeyWarned = true;
    }
    return strKey;
  }
  return JSON.stringify(jsKey);
}
var init_addPairToJSMap = __esm({
  "node_modules/yaml/browser/dist/nodes/addPairToJSMap.js"() {
    init_log();
    init_merge();
    init_stringify();
    init_identity();
    init_toJS();
  }
});

// node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key2, value, ctx) {
  const k = createNode(key2, void 0, ctx);
  const v = createNode(value, void 0, ctx);
  return new Pair(k, v);
}
var Pair;
var init_Pair = __esm({
  "node_modules/yaml/browser/dist/nodes/Pair.js"() {
    init_createNode();
    init_stringifyPair();
    init_addPairToJSMap();
    init_identity();
    Pair = class _Pair {
      constructor(key2, value = null) {
        Object.defineProperty(this, NODE_TYPE, { value: PAIR });
        this.key = key2;
        this.value = value;
      }
      clone(schema4) {
        let { key: key2, value } = this;
        if (isNode(key2))
          key2 = key2.clone(schema4);
        if (isNode(value))
          value = value.clone(schema4);
        return new _Pair(key2, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
  }
});

// node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
  const flow = ctx.inFlow ?? collection.flow;
  const stringify4 = flow ? stringifyFlowCollection : stringifyBlockCollection;
  return stringify4(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
  const { indent, options: { commentString } } = ctx;
  const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
  let chompKeep = false;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item2 = items[i];
    let comment2 = null;
    if (isNode(item2)) {
      if (!chompKeep && item2.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item2.commentBefore, chompKeep);
      if (item2.comment)
        comment2 = item2.comment;
    } else if (isPair(item2)) {
      const ik = isNode(item2.key) ? item2.key : null;
      if (ik) {
        if (!chompKeep && ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
      }
    }
    chompKeep = false;
    let str2 = stringify(item2, itemCtx, () => comment2 = null, () => chompKeep = true);
    if (comment2)
      str2 += lineComment(str2, itemIndent, commentString(comment2));
    if (chompKeep && comment2)
      chompKeep = false;
    lines.push(blockItemPrefix + str2);
  }
  let str;
  if (lines.length === 0) {
    str = flowChars.start + flowChars.end;
  } else {
    str = lines[0];
    for (let i = 1; i < lines.length; ++i) {
      const line = lines[i];
      str += line ? `
${indent}${line}` : "\n";
    }
  }
  if (comment) {
    str += "\n" + indentComment(commentString(comment), indent);
    if (onComment)
      onComment();
  } else if (chompKeep && onChompKeep)
    onChompKeep();
  return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
  const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
  itemIndent += indentStep;
  const itemCtx = Object.assign({}, ctx, {
    indent: itemIndent,
    inFlow: true,
    type: null
  });
  let reqNewline = false;
  let linesAtValue = 0;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item2 = items[i];
    let comment = null;
    if (isNode(item2)) {
      if (item2.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item2.commentBefore, false);
      if (item2.comment)
        comment = item2.comment;
    } else if (isPair(item2)) {
      const ik = isNode(item2.key) ? item2.key : null;
      if (ik) {
        if (ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, false);
        if (ik.comment)
          reqNewline = true;
      }
      const iv = isNode(item2.value) ? item2.value : null;
      if (iv) {
        if (iv.comment)
          comment = iv.comment;
        if (iv.commentBefore)
          reqNewline = true;
      } else if (item2.value == null && ik?.comment) {
        comment = ik.comment;
      }
    }
    if (comment)
      reqNewline = true;
    let str = stringify(item2, itemCtx, () => comment = null);
    reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
    if (i < items.length - 1) {
      str += ",";
    } else if (ctx.options.trailingComma) {
      if (ctx.options.lineWidth > 0) {
        reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
      }
      if (reqNewline) {
        str += ",";
      }
    }
    if (comment)
      str += lineComment(str, itemIndent, commentString(comment));
    lines.push(str);
    linesAtValue = lines.length;
  }
  const { start, end } = flowChars;
  if (lines.length === 0) {
    return start + end;
  } else {
    if (!reqNewline) {
      const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
      reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
    }
    if (reqNewline) {
      let str = start;
      for (const line of lines)
        str += line ? `
${indentStep}${indent}${line}` : "\n";
      return `${str}
${indent}${end}`;
    } else {
      return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
    }
  }
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
  if (comment && chompKeep)
    comment = comment.replace(/^\n+/, "");
  if (comment) {
    const ic = indentComment(commentString(comment), indent);
    lines.push(ic.trimStart());
  }
}
var init_stringifyCollection = __esm({
  "node_modules/yaml/browser/dist/stringify/stringifyCollection.js"() {
    init_identity();
    init_stringify();
    init_stringifyComment();
  }
});

// node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key2) {
  const k = isScalar(key2) ? key2.value : key2;
  for (const it of items) {
    if (isPair(it)) {
      if (it.key === key2 || it.key === k)
        return it;
      if (isScalar(it.key) && it.key.value === k)
        return it;
    }
  }
  return void 0;
}
var YAMLMap;
var init_YAMLMap = __esm({
  "node_modules/yaml/browser/dist/nodes/YAMLMap.js"() {
    init_stringifyCollection();
    init_addPairToJSMap();
    init_Collection();
    init_identity();
    init_Pair();
    init_Scalar();
    YAMLMap = class extends Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema4) {
        super(MAP, schema4);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema4, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map2 = new this(schema4);
        const add = (key2, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key2, value);
          else if (Array.isArray(replacer) && !replacer.includes(key2))
            return;
          if (value !== void 0 || keepUndefined)
            map2.items.push(createPair(key2, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key2, value] of obj)
            add(key2, value);
        } else if (obj && typeof obj === "object") {
          for (const key2 of Object.keys(obj))
            add(key2, obj[key2]);
        }
        if (typeof schema4.sortMapEntries === "function") {
          map2.items.sort(schema4.sortMapEntries);
        }
        return map2;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair(pair, pair?.value);
        } else
          _pair = new Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (isScalar(prev.value) && isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item2) => sortEntries(_pair, item2) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key2) {
        const it = findPair(this.items, key2);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key2, keepScalar) {
        const it = findPair(this.items, key2);
        const node = it?.value;
        return (!keepScalar && isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key2) {
        return !!findPair(this.items, key2);
      }
      set(key2, value) {
        this.add(new Pair(key2, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map2 = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map2);
        for (const item2 of this.items)
          addPairToJSMap(ctx, map2, item2);
        return map2;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item2 of this.items) {
          if (!isPair(item2))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item2)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
  }
});

// node_modules/yaml/browser/dist/schema/common/map.js
var map;
var init_map = __esm({
  "node_modules/yaml/browser/dist/schema/common/map.js"() {
    init_identity();
    init_YAMLMap();
    map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema4, obj, ctx) => YAMLMap.from(schema4, obj, ctx)
    };
  }
});

// node_modules/yaml/browser/dist/nodes/YAMLSeq.js
function asItemIndex(key2) {
  let idx = isScalar(key2) ? key2.value : key2;
  if (idx && typeof idx === "string")
    idx = Number(idx);
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}
var YAMLSeq;
var init_YAMLSeq = __esm({
  "node_modules/yaml/browser/dist/nodes/YAMLSeq.js"() {
    init_createNode();
    init_stringifyCollection();
    init_Collection();
    init_identity();
    init_Scalar();
    init_toJS();
    YAMLSeq = class extends Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema4) {
        super(SEQ, schema4);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key2) {
        const idx = asItemIndex(key2);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key2, keepScalar) {
        const idx = asItemIndex(key2);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key2) {
        const idx = asItemIndex(key2);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key2, value) {
        const idx = asItemIndex(key2);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key2}.`);
        const prev = this.items[idx];
        if (isScalar(prev) && isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq2 = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq2);
        let i = 0;
        for (const item2 of this.items)
          seq2.push(toJS(item2, String(i++), ctx));
        return seq2;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema4, obj, ctx) {
        const { replacer } = ctx;
        const seq2 = new this(schema4);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key2 = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key2, it);
            }
            seq2.items.push(createNode(it, void 0, ctx));
          }
        }
        return seq2;
      }
    };
  }
});

// node_modules/yaml/browser/dist/schema/common/seq.js
var seq;
var init_seq = __esm({
  "node_modules/yaml/browser/dist/schema/common/seq.js"() {
    init_identity();
    init_YAMLSeq();
    seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema4, obj, ctx) => YAMLSeq.from(schema4, obj, ctx)
    };
  }
});

// node_modules/yaml/browser/dist/schema/common/string.js
var string;
var init_string = __esm({
  "node_modules/yaml/browser/dist/schema/common/string.js"() {
    init_stringifyString();
    string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item2, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString(item2, ctx, onComment, onChompKeep);
      }
    };
  }
});

// node_modules/yaml/browser/dist/schema/common/null.js
var nullTag;
var init_null = __esm({
  "node_modules/yaml/browser/dist/schema/common/null.js"() {
    init_Scalar();
    nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
  }
});

// node_modules/yaml/browser/dist/schema/core/bool.js
var boolTag;
var init_bool = __esm({
  "node_modules/yaml/browser/dist/schema/core/bool.js"() {
    init_Scalar();
    boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
  }
});

// node_modules/yaml/browser/dist/stringify/stringifyNumber.js
function stringifyNumber({ format, minFractionDigits, tag, value }) {
  if (typeof value === "bigint")
    return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (!isFinite(num))
    return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
  let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
  if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
    let i = n.indexOf(".");
    if (i < 0) {
      i = n.length;
      n += ".";
    }
    let d = minFractionDigits - (n.length - i - 1);
    while (d-- > 0)
      n += "0";
  }
  return n;
}
var init_stringifyNumber = __esm({
  "node_modules/yaml/browser/dist/stringify/stringifyNumber.js"() {
  }
});

// node_modules/yaml/browser/dist/schema/core/float.js
var floatNaN, floatExp, float;
var init_float = __esm({
  "node_modules/yaml/browser/dist/schema/core/float.js"() {
    init_Scalar();
    init_stringifyNumber();
    floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber
    };
    floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber(node);
      }
    };
    float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber
    };
  }
});

// node_modules/yaml/browser/dist/schema/core/int.js
function intStringify(node, radix, prefix) {
  const { value } = node;
  if (intIdentify(value) && value >= 0)
    return prefix + value.toString(radix);
  return stringifyNumber(node);
}
var intIdentify, intResolve, intOct, int, intHex;
var init_int = __esm({
  "node_modules/yaml/browser/dist/schema/core/int.js"() {
    init_stringifyNumber();
    intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber
    };
    intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
  }
});

// node_modules/yaml/browser/dist/schema/core/schema.js
var schema;
var init_schema = __esm({
  "node_modules/yaml/browser/dist/schema/core/schema.js"() {
    init_map();
    init_null();
    init_seq();
    init_string();
    init_bool();
    init_float();
    init_int();
    schema = [
      map,
      seq,
      string,
      nullTag,
      boolTag,
      intOct,
      int,
      intHex,
      floatNaN,
      floatExp,
      float
    ];
  }
});

// node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify2(value) {
  return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON, jsonScalars, jsonError, schema2;
var init_schema2 = __esm({
  "node_modules/yaml/browser/dist/schema/json/schema.js"() {
    init_Scalar();
    init_map();
    init_seq();
    stringifyJSON = ({ value }) => JSON.stringify(value);
    jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify2,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify2(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    schema2 = [map, seq].concat(jsonScalars, jsonError);
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
var binary;
var init_binary = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js"() {
    init_Scalar();
    init_stringifyString();
    binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.BLOCK_LITERAL);
        if (type !== Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function resolvePairs(seq2, onError) {
  if (isSeq(seq2)) {
    for (let i = 0; i < seq2.items.length; ++i) {
      let item2 = seq2.items[i];
      if (isPair(item2))
        continue;
      else if (isMap(item2)) {
        if (item2.items.length > 1)
          onError("Each pair must have its own sequence indicator");
        const pair = item2.items[0] || new Pair(new Scalar(null));
        if (item2.commentBefore)
          pair.key.commentBefore = pair.key.commentBefore ? `${item2.commentBefore}
${pair.key.commentBefore}` : item2.commentBefore;
        if (item2.comment) {
          const cn = pair.value ?? pair.key;
          cn.comment = cn.comment ? `${item2.comment}
${cn.comment}` : item2.comment;
        }
        item2 = pair;
      }
      seq2.items[i] = isPair(item2) ? item2 : new Pair(item2);
    }
  } else
    onError("Expected a sequence for this tag");
  return seq2;
}
function createPairs(schema4, iterable, ctx) {
  const { replacer } = ctx;
  const pairs2 = new YAMLSeq(schema4);
  pairs2.tag = "tag:yaml.org,2002:pairs";
  let i = 0;
  if (iterable && Symbol.iterator in Object(iterable))
    for (let it of iterable) {
      if (typeof replacer === "function")
        it = replacer.call(iterable, String(i++), it);
      let key2, value;
      if (Array.isArray(it)) {
        if (it.length === 2) {
          key2 = it[0];
          value = it[1];
        } else
          throw new TypeError(`Expected [key, value] tuple: ${it}`);
      } else if (it && it instanceof Object) {
        const keys = Object.keys(it);
        if (keys.length === 1) {
          key2 = keys[0];
          value = it[key2];
        } else {
          throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
        }
      } else {
        key2 = it;
      }
      pairs2.items.push(createPair(key2, value, ctx));
    }
  return pairs2;
}
var pairs;
var init_pairs = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js"() {
    init_identity();
    init_Pair();
    init_Scalar();
    init_YAMLSeq();
    pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap, omap;
var init_omap = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js"() {
    init_identity();
    init_toJS();
    init_YAMLMap();
    init_YAMLSeq();
    init_pairs();
    YAMLOMap = class _YAMLOMap extends YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map2 = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map2);
        for (const pair of this.items) {
          let key2, value;
          if (isPair(pair)) {
            key2 = toJS(pair.key, "", ctx);
            value = toJS(pair.value, key2, ctx);
          } else {
            key2 = toJS(pair, "", ctx);
          }
          if (map2.has(key2))
            throw new Error("Ordered maps must not include duplicate keys");
          map2.set(key2, value);
        }
        return map2;
      }
      static from(schema4, iterable, ctx) {
        const pairs2 = createPairs(schema4, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs2.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq2, onError) {
        const pairs2 = resolvePairs(seq2, onError);
        const seenKeys = [];
        for (const { key: key2 } of pairs2.items) {
          if (isScalar(key2)) {
            if (seenKeys.includes(key2.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key2.value}`);
            } else {
              seenKeys.push(key2.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs2);
      },
      createNode: (schema4, iterable, ctx) => YAMLOMap.from(schema4, iterable, ctx)
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
function boolStringify({ value, source }, ctx) {
  const boolObj = value ? trueTag : falseTag;
  if (source && boolObj.test.test(source))
    return source;
  return value ? ctx.options.trueStr : ctx.options.falseStr;
}
var trueTag, falseTag;
var init_bool2 = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js"() {
    init_Scalar();
    trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar(true),
      stringify: boolStringify
    };
    falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar(false),
      stringify: boolStringify
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
var floatNaN2, floatExp2, float2;
var init_float2 = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/float.js"() {
    init_Scalar();
    init_stringifyNumber();
    floatNaN2 = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber
    };
    floatExp2 = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber(node);
      }
    };
    float2 = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
function intResolve2(str, offset, radix, { intAsBigInt }) {
  const sign = str[0];
  if (sign === "-" || sign === "+")
    offset += 1;
  str = str.substring(offset).replace(/_/g, "");
  if (intAsBigInt) {
    switch (radix) {
      case 2:
        str = `0b${str}`;
        break;
      case 8:
        str = `0o${str}`;
        break;
      case 16:
        str = `0x${str}`;
        break;
    }
    const n2 = BigInt(str);
    return sign === "-" ? BigInt(-1) * n2 : n2;
  }
  const n = parseInt(str, radix);
  return sign === "-" ? -1 * n : n;
}
function intStringify2(node, radix, prefix) {
  const { value } = node;
  if (intIdentify3(value)) {
    const str = value.toString(radix);
    return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
  }
  return stringifyNumber(node);
}
var intIdentify3, intBin, intOct2, int2, intHex2;
var init_int2 = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/int.js"() {
    init_stringifyNumber();
    intIdentify3 = (value) => typeof value === "bigint" || Number.isInteger(value);
    intBin = {
      identify: intIdentify3,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve2(str, 2, 2, opt),
      stringify: (node) => intStringify2(node, 2, "0b")
    };
    intOct2 = {
      identify: intIdentify3,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve2(str, 1, 8, opt),
      stringify: (node) => intStringify2(node, 8, "0")
    };
    int2 = {
      identify: intIdentify3,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve2(str, 0, 10, opt),
      stringify: stringifyNumber
    };
    intHex2 = {
      identify: intIdentify3,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve2(str, 2, 16, opt),
      stringify: (node) => intStringify2(node, 16, "0x")
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet, set;
var init_set = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/set.js"() {
    init_identity();
    init_Pair();
    init_YAMLMap();
    YAMLSet = class _YAMLSet extends YAMLMap {
      constructor(schema4) {
        super(schema4);
        this.tag = _YAMLSet.tag;
      }
      add(key2) {
        let pair;
        if (isPair(key2))
          pair = key2;
        else if (key2 && typeof key2 === "object" && "key" in key2 && "value" in key2 && key2.value === null)
          pair = new Pair(key2.key, null);
        else
          pair = new Pair(key2, null);
        const prev = findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key2, keepPair) {
        const pair = findPair(this.items, key2);
        return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key2, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = findPair(this.items, key2);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair(key2));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema4, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema4);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema4, iterable, ctx) => YAMLSet.from(schema4, iterable, ctx),
      resolve(map2, onError) {
        if (isMap(map2)) {
          if (map2.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map2);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map2;
      }
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
function parseSexagesimal(str, asBigInt) {
  const sign = str[0];
  const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
  const num = (n) => asBigInt ? BigInt(n) : Number(n);
  const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
  return sign === "-" ? num(-1) * res : res;
}
function stringifySexagesimal(node) {
  let { value } = node;
  let num = (n) => n;
  if (typeof value === "bigint")
    num = (n) => BigInt(n);
  else if (isNaN(value) || !isFinite(value))
    return stringifyNumber(node);
  let sign = "";
  if (value < 0) {
    sign = "-";
    value *= num(-1);
  }
  const _60 = num(60);
  const parts = [value % _60];
  if (value < 60) {
    parts.unshift(0);
  } else {
    value = (value - parts[0]) / _60;
    parts.unshift(value % _60);
    if (value >= 60) {
      value = (value - parts[0]) / _60;
      parts.unshift(value);
    }
  }
  return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
var intTime, floatTime, timestamp;
var init_timestamp = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js"() {
    init_stringifyNumber();
    intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
  }
});

// node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
var schema3;
var init_schema3 = __esm({
  "node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js"() {
    init_map();
    init_null();
    init_seq();
    init_string();
    init_binary();
    init_bool2();
    init_float2();
    init_int2();
    init_merge();
    init_omap();
    init_pairs();
    init_set();
    init_timestamp();
    schema3 = [
      map,
      seq,
      string,
      nullTag,
      trueTag,
      falseTag,
      intBin,
      intOct2,
      int2,
      intHex2,
      floatNaN2,
      floatExp2,
      float2,
      binary,
      merge,
      omap,
      pairs,
      set,
      intTime,
      floatTime,
      timestamp
    ];
  }
});

// node_modules/yaml/browser/dist/schema/tags.js
function getTags(customTags, schemaName, addMergeTag) {
  const schemaTags = schemas.get(schemaName);
  if (schemaTags && !customTags) {
    return addMergeTag && !schemaTags.includes(merge) ? schemaTags.concat(merge) : schemaTags.slice();
  }
  let tags = schemaTags;
  if (!tags) {
    if (Array.isArray(customTags))
      tags = [];
    else {
      const keys = Array.from(schemas.keys()).filter((key2) => key2 !== "yaml11").map((key2) => JSON.stringify(key2)).join(", ");
      throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
    }
  }
  if (Array.isArray(customTags)) {
    for (const tag of customTags)
      tags = tags.concat(tag);
  } else if (typeof customTags === "function") {
    tags = customTags(tags.slice());
  }
  if (addMergeTag)
    tags = tags.concat(merge);
  return tags.reduce((tags2, tag) => {
    const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
    if (!tagObj) {
      const tagName = JSON.stringify(tag);
      const keys = Object.keys(tagsByName).map((key2) => JSON.stringify(key2)).join(", ");
      throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
    }
    if (!tags2.includes(tagObj))
      tags2.push(tagObj);
    return tags2;
  }, []);
}
var schemas, tagsByName, coreKnownTags;
var init_tags = __esm({
  "node_modules/yaml/browser/dist/schema/tags.js"() {
    init_map();
    init_null();
    init_seq();
    init_string();
    init_bool();
    init_float();
    init_int();
    init_schema();
    init_schema2();
    init_binary();
    init_merge();
    init_omap();
    init_pairs();
    init_schema3();
    init_set();
    init_timestamp();
    schemas = /* @__PURE__ */ new Map([
      ["core", schema],
      ["failsafe", [map, seq, string]],
      ["json", schema2],
      ["yaml11", schema3],
      ["yaml-1.1", schema3]
    ]);
    tagsByName = {
      binary,
      bool: boolTag,
      float,
      floatExp,
      floatNaN,
      floatTime,
      int,
      intHex,
      intOct,
      intTime,
      map,
      merge,
      null: nullTag,
      omap,
      pairs,
      seq,
      set,
      timestamp
    };
    coreKnownTags = {
      "tag:yaml.org,2002:binary": binary,
      "tag:yaml.org,2002:merge": merge,
      "tag:yaml.org,2002:omap": omap,
      "tag:yaml.org,2002:pairs": pairs,
      "tag:yaml.org,2002:set": set,
      "tag:yaml.org,2002:timestamp": timestamp
    };
  }
});

// node_modules/yaml/browser/dist/schema/Schema.js
var sortMapEntriesByKey, Schema;
var init_Schema = __esm({
  "node_modules/yaml/browser/dist/schema/Schema.js"() {
    init_identity();
    init_map();
    init_seq();
    init_string();
    init_tags();
    sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    Schema = class _Schema {
      constructor({ compat, customTags, merge: merge2, resolveKnownTags, schema: schema4, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null;
        this.name = typeof schema4 === "string" && schema4 || "core";
        this.knownTags = resolveKnownTags ? coreKnownTags : {};
        this.tags = getTags(customTags, this.name, merge2);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, MAP, { value: map });
        Object.defineProperty(this, SCALAR, { value: string });
        Object.defineProperty(this, SEQ, { value: seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
  }
});

// node_modules/yaml/browser/dist/stringify/stringifyDocument.js
function stringifyDocument(doc, options) {
  const lines = [];
  let hasDirectives = options.directives === true;
  if (options.directives !== false && doc.directives) {
    const dir = doc.directives.toString(doc);
    if (dir) {
      lines.push(dir);
      hasDirectives = true;
    } else if (doc.directives.docStart)
      hasDirectives = true;
  }
  if (hasDirectives)
    lines.push("---");
  const ctx = createStringifyContext(doc, options);
  const { commentString } = ctx.options;
  if (doc.commentBefore) {
    if (lines.length !== 1)
      lines.unshift("");
    const cs = commentString(doc.commentBefore);
    lines.unshift(indentComment(cs, ""));
  }
  let chompKeep = false;
  let contentComment = null;
  if (doc.contents) {
    if (isNode(doc.contents)) {
      if (doc.contents.spaceBefore && hasDirectives)
        lines.push("");
      if (doc.contents.commentBefore) {
        const cs = commentString(doc.contents.commentBefore);
        lines.push(indentComment(cs, ""));
      }
      ctx.forceBlockIndent = !!doc.comment;
      contentComment = doc.contents.comment;
    }
    const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
    let body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
    if (contentComment)
      body += lineComment(body, "", commentString(contentComment));
    if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
      lines[lines.length - 1] = `--- ${body}`;
    } else
      lines.push(body);
  } else {
    lines.push(stringify(doc.contents, ctx));
  }
  if (doc.directives?.docEnd) {
    if (doc.comment) {
      const cs = commentString(doc.comment);
      if (cs.includes("\n")) {
        lines.push("...");
        lines.push(indentComment(cs, ""));
      } else {
        lines.push(`... ${cs}`);
      }
    } else {
      lines.push("...");
    }
  } else {
    let dc = doc.comment;
    if (dc && chompKeep)
      dc = dc.replace(/^\n+/, "");
    if (dc) {
      if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
        lines.push("");
      lines.push(indentComment(commentString(dc), ""));
    }
  }
  return lines.join("\n") + "\n";
}
var init_stringifyDocument = __esm({
  "node_modules/yaml/browser/dist/stringify/stringifyDocument.js"() {
    init_identity();
    init_stringify();
    init_stringifyComment();
  }
});

// node_modules/yaml/browser/dist/doc/Document.js
function assertCollection(contents) {
  if (isCollection(contents))
    return true;
  throw new Error("Expected a YAML collection as document contents");
}
var Document;
var init_Document = __esm({
  "node_modules/yaml/browser/dist/doc/Document.js"() {
    init_Alias();
    init_Collection();
    init_identity();
    init_Pair();
    init_toJS();
    init_Schema();
    init_stringifyDocument();
    init_anchors();
    init_applyReviver();
    init_createNode();
    init_directives();
    Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, NODE_TYPE, { value: DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [NODE_TYPE]: { value: DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
        }
        return new Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode(value, tag, ctx);
        if (flow && isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key2, value, options = {}) {
        const k = this.createNode(key2, null, options);
        const v = this.createNode(value, null, options);
        return new Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key2) {
        return assertCollection(this.contents) ? this.contents.delete(key2) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key2, keepScalar) {
        return isCollection(this.contents) ? this.contents.get(key2, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (isEmptyPath(path))
          return !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents;
        return isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key2) {
        return isCollection(this.contents) ? this.contents.has(key2) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (isEmptyPath(path))
          return this.contents !== void 0;
        return isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key2, value) {
        if (this.contents == null) {
          this.contents = collectionFromPath(this.schema, [key2], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key2, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        if (isEmptyPath(path)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = collectionFromPath(this.schema, Array.from(path), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json: json2, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json2,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument(this, options);
      }
    };
  }
});

// node_modules/yaml/browser/dist/errors.js
var YAMLError, YAMLParseError, YAMLWarning, prettifyError;
var init_errors = __esm({
  "node_modules/yaml/browser/dist/errors.js"() {
    YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
  }
});

// node_modules/yaml/browser/dist/compose/resolve-props.js
function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
  let spaceBefore = false;
  let atNewline = startOnNewline;
  let hasSpace = startOnNewline;
  let comment = "";
  let commentSep = "";
  let hasNewline = false;
  let reqSpace = false;
  let tab = null;
  let anchor = null;
  let tag = null;
  let newlineAfterProp = null;
  let comma = null;
  let found = null;
  let start = null;
  for (const token of tokens) {
    if (reqSpace) {
      if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
        onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      reqSpace = false;
    }
    if (tab) {
      if (atNewline && token.type !== "comment" && token.type !== "newline") {
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      }
      tab = null;
    }
    switch (token.type) {
      case "space":
        if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
          tab = token;
        }
        hasSpace = true;
        break;
      case "comment": {
        if (!hasSpace)
          onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
        const cb = token.source.substring(1) || " ";
        if (!comment)
          comment = cb;
        else
          comment += commentSep + cb;
        commentSep = "";
        atNewline = false;
        break;
      }
      case "newline":
        if (atNewline) {
          if (comment)
            comment += token.source;
          else if (!found || indicator !== "seq-item-ind")
            spaceBefore = true;
        } else
          commentSep += token.source;
        atNewline = true;
        hasNewline = true;
        if (anchor || tag)
          newlineAfterProp = token;
        hasSpace = true;
        break;
      case "anchor":
        if (anchor)
          onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
        if (token.source.endsWith(":"))
          onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
        anchor = token;
        start ?? (start = token.offset);
        atNewline = false;
        hasSpace = false;
        reqSpace = true;
        break;
      case "tag": {
        if (tag)
          onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
        tag = token;
        start ?? (start = token.offset);
        atNewline = false;
        hasSpace = false;
        reqSpace = true;
        break;
      }
      case indicator:
        if (anchor || tag)
          onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
        if (found)
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
        found = token;
        atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
        hasSpace = false;
        break;
      case "comma":
        if (flow) {
          if (comma)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
          comma = token;
          atNewline = false;
          hasSpace = false;
          break;
        }
      // else fallthrough
      default:
        onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
        atNewline = false;
        hasSpace = false;
    }
  }
  const last = tokens[tokens.length - 1];
  const end = last ? last.offset + last.source.length : offset;
  if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
    onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
  }
  if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
    onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
  return {
    comma,
    found,
    spaceBefore,
    comment,
    hasNewline,
    anchor,
    tag,
    newlineAfterProp,
    end,
    start: start ?? end
  };
}
var init_resolve_props = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-props.js"() {
  }
});

// node_modules/yaml/browser/dist/compose/util-contains-newline.js
function containsNewline(key2) {
  if (!key2)
    return null;
  switch (key2.type) {
    case "alias":
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      if (key2.source.includes("\n"))
        return true;
      if (key2.end) {
        for (const st of key2.end)
          if (st.type === "newline")
            return true;
      }
      return false;
    case "flow-collection":
      for (const it of key2.items) {
        for (const st of it.start)
          if (st.type === "newline")
            return true;
        if (it.sep) {
          for (const st of it.sep)
            if (st.type === "newline")
              return true;
        }
        if (containsNewline(it.key) || containsNewline(it.value))
          return true;
      }
      return false;
    default:
      return true;
  }
}
var init_util_contains_newline = __esm({
  "node_modules/yaml/browser/dist/compose/util-contains-newline.js"() {
  }
});

// node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
function flowIndentCheck(indent, fc, onError) {
  if (fc?.type === "flow-collection") {
    const end = fc.end[0];
    if (end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc)) {
      const msg = "Flow end indicator should be more indented than parent";
      onError(end, "BAD_INDENT", msg, true);
    }
  }
}
var init_util_flow_indent_check = __esm({
  "node_modules/yaml/browser/dist/compose/util-flow-indent-check.js"() {
    init_util_contains_newline();
  }
});

// node_modules/yaml/browser/dist/compose/util-map-includes.js
function mapIncludes(ctx, items, search) {
  const { uniqueKeys } = ctx.options;
  if (uniqueKeys === false)
    return false;
  const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
  return items.some((pair) => isEqual(pair.key, search));
}
var init_util_map_includes = __esm({
  "node_modules/yaml/browser/dist/compose/util-map-includes.js"() {
    init_identity();
  }
});

// node_modules/yaml/browser/dist/compose/resolve-block-map.js
function resolveBlockMap({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bm, onError, tag) {
  const NodeClass = tag?.nodeClass ?? YAMLMap;
  const map2 = new NodeClass(ctx.schema);
  if (ctx.atRoot)
    ctx.atRoot = false;
  let offset = bm.offset;
  let commentEnd = null;
  for (const collItem of bm.items) {
    const { start, key: key2, sep: sep2, value } = collItem;
    const keyProps = resolveProps(start, {
      indicator: "explicit-key-ind",
      next: key2 ?? sep2?.[0],
      offset,
      onError,
      parentIndent: bm.indent,
      startOnNewline: true
    });
    const implicitKey = !keyProps.found;
    if (implicitKey) {
      if (key2) {
        if (key2.type === "block-seq")
          onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
        else if ("indent" in key2 && key2.indent !== bm.indent)
          onError(offset, "BAD_INDENT", startColMsg);
      }
      if (!keyProps.anchor && !keyProps.tag && !sep2) {
        commentEnd = keyProps.end;
        if (keyProps.comment) {
          if (map2.comment)
            map2.comment += "\n" + keyProps.comment;
          else
            map2.comment = keyProps.comment;
        }
        continue;
      }
      if (keyProps.newlineAfterProp || containsNewline(key2)) {
        onError(key2 ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
      }
    } else if (keyProps.found?.indent !== bm.indent) {
      onError(offset, "BAD_INDENT", startColMsg);
    }
    ctx.atKey = true;
    const keyStart = keyProps.end;
    const keyNode = key2 ? composeNode2(ctx, key2, keyProps, onError) : composeEmptyNode2(ctx, keyStart, start, null, keyProps, onError);
    if (ctx.schema.compat)
      flowIndentCheck(bm.indent, key2, onError);
    ctx.atKey = false;
    if (mapIncludes(ctx, map2.items, keyNode))
      onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
    const valueProps = resolveProps(sep2 ?? [], {
      indicator: "map-value-ind",
      next: value,
      offset: keyNode.range[2],
      onError,
      parentIndent: bm.indent,
      startOnNewline: !key2 || key2.type === "block-scalar"
    });
    offset = valueProps.end;
    if (valueProps.found) {
      if (implicitKey) {
        if (value?.type === "block-map" && !valueProps.hasNewline)
          onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
        if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
          onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
      }
      const valueNode = value ? composeNode2(ctx, value, valueProps, onError) : composeEmptyNode2(ctx, offset, sep2, null, valueProps, onError);
      if (ctx.schema.compat)
        flowIndentCheck(bm.indent, value, onError);
      offset = valueNode.range[2];
      const pair = new Pair(keyNode, valueNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      map2.items.push(pair);
    } else {
      if (implicitKey)
        onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
      if (valueProps.comment) {
        if (keyNode.comment)
          keyNode.comment += "\n" + valueProps.comment;
        else
          keyNode.comment = valueProps.comment;
      }
      const pair = new Pair(keyNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      map2.items.push(pair);
    }
  }
  if (commentEnd && commentEnd < offset)
    onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
  map2.range = [bm.offset, offset, commentEnd ?? offset];
  return map2;
}
var startColMsg;
var init_resolve_block_map = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-block-map.js"() {
    init_Pair();
    init_YAMLMap();
    init_resolve_props();
    init_util_contains_newline();
    init_util_flow_indent_check();
    init_util_map_includes();
    startColMsg = "All mapping items must start at the same column";
  }
});

// node_modules/yaml/browser/dist/compose/resolve-block-seq.js
function resolveBlockSeq({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bs, onError, tag) {
  const NodeClass = tag?.nodeClass ?? YAMLSeq;
  const seq2 = new NodeClass(ctx.schema);
  if (ctx.atRoot)
    ctx.atRoot = false;
  if (ctx.atKey)
    ctx.atKey = false;
  let offset = bs.offset;
  let commentEnd = null;
  for (const { start, value } of bs.items) {
    const props = resolveProps(start, {
      indicator: "seq-item-ind",
      next: value,
      offset,
      onError,
      parentIndent: bs.indent,
      startOnNewline: true
    });
    if (!props.found) {
      if (props.anchor || props.tag || value) {
        if (value?.type === "block-seq")
          onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
        else
          onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
      } else {
        commentEnd = props.end;
        if (props.comment)
          seq2.comment = props.comment;
        continue;
      }
    }
    const node = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, start, null, props, onError);
    if (ctx.schema.compat)
      flowIndentCheck(bs.indent, value, onError);
    offset = node.range[2];
    seq2.items.push(node);
  }
  seq2.range = [bs.offset, offset, commentEnd ?? offset];
  return seq2;
}
var init_resolve_block_seq = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-block-seq.js"() {
    init_YAMLSeq();
    init_resolve_props();
    init_util_flow_indent_check();
  }
});

// node_modules/yaml/browser/dist/compose/resolve-end.js
function resolveEnd(end, offset, reqSpace, onError) {
  let comment = "";
  if (end) {
    let hasSpace = false;
    let sep2 = "";
    for (const token of end) {
      const { source, type } = token;
      switch (type) {
        case "space":
          hasSpace = true;
          break;
        case "comment": {
          if (reqSpace && !hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += sep2 + cb;
          sep2 = "";
          break;
        }
        case "newline":
          if (comment)
            sep2 += source;
          hasSpace = true;
          break;
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
      }
      offset += source.length;
    }
  }
  return { comment, offset };
}
var init_resolve_end = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-end.js"() {
  }
});

// node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
function resolveFlowCollection({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, fc, onError, tag) {
  const isMap2 = fc.start.source === "{";
  const fcName = isMap2 ? "flow map" : "flow sequence";
  const NodeClass = tag?.nodeClass ?? (isMap2 ? YAMLMap : YAMLSeq);
  const coll = new NodeClass(ctx.schema);
  coll.flow = true;
  const atRoot = ctx.atRoot;
  if (atRoot)
    ctx.atRoot = false;
  if (ctx.atKey)
    ctx.atKey = false;
  let offset = fc.offset + fc.start.source.length;
  for (let i = 0; i < fc.items.length; ++i) {
    const collItem = fc.items[i];
    const { start, key: key2, sep: sep2, value } = collItem;
    const props = resolveProps(start, {
      flow: fcName,
      indicator: "explicit-key-ind",
      next: key2 ?? sep2?.[0],
      offset,
      onError,
      parentIndent: fc.indent,
      startOnNewline: false
    });
    if (!props.found) {
      if (!props.anchor && !props.tag && !sep2 && !value) {
        if (i === 0 && props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        else if (i < fc.items.length - 1)
          onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
        if (props.comment) {
          if (coll.comment)
            coll.comment += "\n" + props.comment;
          else
            coll.comment = props.comment;
        }
        offset = props.end;
        continue;
      }
      if (!isMap2 && ctx.options.strict && containsNewline(key2))
        onError(
          key2,
          // checked by containsNewline()
          "MULTILINE_IMPLICIT_KEY",
          "Implicit keys of flow sequence pairs need to be on a single line"
        );
    }
    if (i === 0) {
      if (props.comma)
        onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
    } else {
      if (!props.comma)
        onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
      if (props.comment) {
        let prevItemComment = "";
        loop: for (const st of start) {
          switch (st.type) {
            case "comma":
            case "space":
              break;
            case "comment":
              prevItemComment = st.source.substring(1);
              break loop;
            default:
              break loop;
          }
        }
        if (prevItemComment) {
          let prev = coll.items[coll.items.length - 1];
          if (isPair(prev))
            prev = prev.value ?? prev.key;
          if (prev.comment)
            prev.comment += "\n" + prevItemComment;
          else
            prev.comment = prevItemComment;
          props.comment = props.comment.substring(prevItemComment.length + 1);
        }
      }
    }
    if (!isMap2 && !sep2 && !props.found) {
      const valueNode = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, sep2, null, props, onError);
      coll.items.push(valueNode);
      offset = valueNode.range[2];
      if (isBlock(value))
        onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
    } else {
      ctx.atKey = true;
      const keyStart = props.end;
      const keyNode = key2 ? composeNode2(ctx, key2, props, onError) : composeEmptyNode2(ctx, keyStart, start, null, props, onError);
      if (isBlock(key2))
        onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
      ctx.atKey = false;
      const valueProps = resolveProps(sep2 ?? [], {
        flow: fcName,
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (valueProps.found) {
        if (!isMap2 && !props.found && ctx.options.strict) {
          if (sep2)
            for (const st of sep2) {
              if (st === valueProps.found)
                break;
              if (st.type === "newline") {
                onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                break;
              }
            }
          if (props.start < valueProps.found.offset - 1024)
            onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
        }
      } else if (value) {
        if ("source" in value && value.source?.[0] === ":")
          onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
        else
          onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
      }
      const valueNode = value ? composeNode2(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode2(ctx, valueProps.end, sep2, null, valueProps, onError) : null;
      if (valueNode) {
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else if (valueProps.comment) {
        if (keyNode.comment)
          keyNode.comment += "\n" + valueProps.comment;
        else
          keyNode.comment = valueProps.comment;
      }
      const pair = new Pair(keyNode, valueNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      if (isMap2) {
        const map2 = coll;
        if (mapIncludes(ctx, map2.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        map2.items.push(pair);
      } else {
        const map2 = new YAMLMap(ctx.schema);
        map2.flow = true;
        map2.items.push(pair);
        const endRange = (valueNode ?? keyNode).range;
        map2.range = [keyNode.range[0], endRange[1], endRange[2]];
        coll.items.push(map2);
      }
      offset = valueNode ? valueNode.range[2] : valueProps.end;
    }
  }
  const expectedEnd = isMap2 ? "}" : "]";
  const [ce, ...ee] = fc.end;
  let cePos = offset;
  if (ce?.source === expectedEnd)
    cePos = ce.offset + ce.source.length;
  else {
    const name = fcName[0].toUpperCase() + fcName.substring(1);
    const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
    onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
    if (ce && ce.source.length !== 1)
      ee.unshift(ce);
  }
  if (ee.length > 0) {
    const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
    if (end.comment) {
      if (coll.comment)
        coll.comment += "\n" + end.comment;
      else
        coll.comment = end.comment;
    }
    coll.range = [fc.offset, cePos, end.offset];
  } else {
    coll.range = [fc.offset, cePos, cePos];
  }
  return coll;
}
var blockMsg, isBlock;
var init_resolve_flow_collection = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-flow-collection.js"() {
    init_identity();
    init_Pair();
    init_YAMLMap();
    init_YAMLSeq();
    init_resolve_end();
    init_resolve_props();
    init_util_contains_newline();
    init_util_map_includes();
    blockMsg = "Block collections are not allowed within flow collections";
    isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  }
});

// node_modules/yaml/browser/dist/compose/compose-collection.js
function resolveCollection(CN2, ctx, token, onError, tagName, tag) {
  const coll = token.type === "block-map" ? resolveBlockMap(CN2, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN2, ctx, token, onError, tag) : resolveFlowCollection(CN2, ctx, token, onError, tag);
  const Coll = coll.constructor;
  if (tagName === "!" || tagName === Coll.tagName) {
    coll.tag = Coll.tagName;
    return coll;
  }
  if (tagName)
    coll.tag = tagName;
  return coll;
}
function composeCollection(CN2, ctx, token, props, onError) {
  const tagToken = props.tag;
  const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
  if (token.type === "block-seq") {
    const { anchor, newlineAfterProp: nl } = props;
    const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
    if (lastProp && (!nl || nl.offset < lastProp.offset)) {
      const message = "Missing newline after block sequence props";
      onError(lastProp, "MISSING_CHAR", message);
    }
  }
  const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
  if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq") {
    return resolveCollection(CN2, ctx, token, onError, tagName);
  }
  let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
  if (!tag) {
    const kt = ctx.schema.knownTags[tagName];
    if (kt?.collection === expType) {
      ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
      tag = kt;
    } else {
      if (kt) {
        onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
      } else {
        onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
      }
      return resolveCollection(CN2, ctx, token, onError, tagName);
    }
  }
  const coll = resolveCollection(CN2, ctx, token, onError, tagName, tag);
  const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
  const node = isNode(res) ? res : new Scalar(res);
  node.range = coll.range;
  node.tag = tagName;
  if (tag?.format)
    node.format = tag.format;
  return node;
}
var init_compose_collection = __esm({
  "node_modules/yaml/browser/dist/compose/compose-collection.js"() {
    init_identity();
    init_Scalar();
    init_YAMLMap();
    init_YAMLSeq();
    init_resolve_block_map();
    init_resolve_block_seq();
    init_resolve_flow_collection();
  }
});

// node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
function resolveBlockScalar(ctx, scalar, onError) {
  const start = scalar.offset;
  const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
  if (!header)
    return { value: "", type: null, comment: "", range: [start, start, start] };
  const type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
  const lines = scalar.source ? splitLines2(scalar.source) : [];
  let chompStart = lines.length;
  for (let i = lines.length - 1; i >= 0; --i) {
    const content = lines[i][1];
    if (content === "" || content === "\r")
      chompStart = i;
    else
      break;
  }
  if (chompStart === 0) {
    const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
    let end2 = start + header.length;
    if (scalar.source)
      end2 += scalar.source.length;
    return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
  }
  let trimIndent = scalar.indent + header.indent;
  let offset = scalar.offset + header.length;
  let contentStart = 0;
  for (let i = 0; i < chompStart; ++i) {
    const [indent, content] = lines[i];
    if (content === "" || content === "\r") {
      if (header.indent === 0 && indent.length > trimIndent)
        trimIndent = indent.length;
    } else {
      if (indent.length < trimIndent) {
        const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
        onError(offset + indent.length, "MISSING_CHAR", message);
      }
      if (header.indent === 0)
        trimIndent = indent.length;
      contentStart = i;
      if (trimIndent === 0 && !ctx.atRoot) {
        const message = "Block scalar values in collections must be indented";
        onError(offset, "BAD_INDENT", message);
      }
      break;
    }
    offset += indent.length + content.length + 1;
  }
  for (let i = lines.length - 1; i >= chompStart; --i) {
    if (lines[i][0].length > trimIndent)
      chompStart = i + 1;
  }
  let value = "";
  let sep2 = "";
  let prevMoreIndented = false;
  for (let i = 0; i < contentStart; ++i)
    value += lines[i][0].slice(trimIndent) + "\n";
  for (let i = contentStart; i < chompStart; ++i) {
    let [indent, content] = lines[i];
    offset += indent.length + content.length + 1;
    const crlf = content[content.length - 1] === "\r";
    if (crlf)
      content = content.slice(0, -1);
    if (content && indent.length < trimIndent) {
      const src = header.indent ? "explicit indentation indicator" : "first line";
      const message = `Block scalar lines must not be less indented than their ${src}`;
      onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
      indent = "";
    }
    if (type === Scalar.BLOCK_LITERAL) {
      value += sep2 + indent.slice(trimIndent) + content;
      sep2 = "\n";
    } else if (indent.length > trimIndent || content[0] === "	") {
      if (sep2 === " ")
        sep2 = "\n";
      else if (!prevMoreIndented && sep2 === "\n")
        sep2 = "\n\n";
      value += sep2 + indent.slice(trimIndent) + content;
      sep2 = "\n";
      prevMoreIndented = true;
    } else if (content === "") {
      if (sep2 === "\n")
        value += "\n";
      else
        sep2 = "\n";
    } else {
      value += sep2 + content;
      sep2 = " ";
      prevMoreIndented = false;
    }
  }
  switch (header.chomp) {
    case "-":
      break;
    case "+":
      for (let i = chompStart; i < lines.length; ++i)
        value += "\n" + lines[i][0].slice(trimIndent);
      if (value[value.length - 1] !== "\n")
        value += "\n";
      break;
    default:
      value += "\n";
  }
  const end = start + header.length + scalar.source.length;
  return { value, type, comment: header.comment, range: [start, end, end] };
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
  if (props[0].type !== "block-scalar-header") {
    onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
    return null;
  }
  const { source } = props[0];
  const mode = source[0];
  let indent = 0;
  let chomp = "";
  let error = -1;
  for (let i = 1; i < source.length; ++i) {
    const ch = source[i];
    if (!chomp && (ch === "-" || ch === "+"))
      chomp = ch;
    else {
      const n = Number(ch);
      if (!indent && n)
        indent = n;
      else if (error === -1)
        error = offset + i;
    }
  }
  if (error !== -1)
    onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
  let hasSpace = false;
  let comment = "";
  let length = source.length;
  for (let i = 1; i < props.length; ++i) {
    const token = props[i];
    switch (token.type) {
      case "space":
        hasSpace = true;
      // fallthrough
      case "newline":
        length += token.source.length;
        break;
      case "comment":
        if (strict && !hasSpace) {
          const message = "Comments must be separated from other tokens by white space characters";
          onError(token, "MISSING_CHAR", message);
        }
        length += token.source.length;
        comment = token.source.substring(1);
        break;
      case "error":
        onError(token, "UNEXPECTED_TOKEN", token.message);
        length += token.source.length;
        break;
      /* istanbul ignore next should not happen */
      default: {
        const message = `Unexpected token in block scalar header: ${token.type}`;
        onError(token, "UNEXPECTED_TOKEN", message);
        const ts = token.source;
        if (ts && typeof ts === "string")
          length += ts.length;
      }
    }
  }
  return { mode, indent, chomp, comment, length };
}
function splitLines2(source) {
  const split = source.split(/\n( *)/);
  const first = split[0];
  const m = first.match(/^( *)/);
  const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
  const lines = [line0];
  for (let i = 1; i < split.length; i += 2)
    lines.push([split[i], split[i + 1]]);
  return lines;
}
var init_resolve_block_scalar = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-block-scalar.js"() {
    init_Scalar();
  }
});

// node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
function resolveFlowScalar(scalar, strict, onError) {
  const { offset, type, source, end } = scalar;
  let _type;
  let value;
  const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
  switch (type) {
    case "scalar":
      _type = Scalar.PLAIN;
      value = plainValue(source, _onError);
      break;
    case "single-quoted-scalar":
      _type = Scalar.QUOTE_SINGLE;
      value = singleQuotedValue(source, _onError);
      break;
    case "double-quoted-scalar":
      _type = Scalar.QUOTE_DOUBLE;
      value = doubleQuotedValue(source, _onError);
      break;
    /* istanbul ignore next should not happen */
    default:
      onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
      return {
        value: "",
        type: null,
        comment: "",
        range: [offset, offset + source.length, offset + source.length]
      };
  }
  const valueEnd = offset + source.length;
  const re = resolveEnd(end, valueEnd, strict, onError);
  return {
    value,
    type: _type,
    comment: re.comment,
    range: [offset, valueEnd, re.offset]
  };
}
function plainValue(source, onError) {
  let badChar = "";
  switch (source[0]) {
    /* istanbul ignore next should not happen */
    case "	":
      badChar = "a tab character";
      break;
    case ",":
      badChar = "flow indicator character ,";
      break;
    case "%":
      badChar = "directive indicator character %";
      break;
    case "|":
    case ">": {
      badChar = `block scalar indicator ${source[0]}`;
      break;
    }
    case "@":
    case "`": {
      badChar = `reserved character ${source[0]}`;
      break;
    }
  }
  if (badChar)
    onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
  return unfoldLines(source);
}
function singleQuotedValue(source, onError) {
  if (source[source.length - 1] !== "'" || source.length === 1)
    onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
  return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function unfoldLines(source) {
  const line = /(.*?)\r?\n/sy;
  let match = line.exec(source);
  if (!match)
    return source;
  let trimEnd, trimBoth;
  try {
    trimEnd = new RegExp("(?<![ 	])[ 	]+$");
    trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
  } catch {
    trimEnd = /[ \t]+$/;
    trimBoth = /^[ \t]+|[ \t]+$/g;
  }
  let res = match[1].replace(trimEnd, "");
  let sep2 = " ";
  let pos = line.lastIndex;
  while (match = line.exec(source)) {
    const lm = match[1].replace(trimBoth, "");
    if (lm === "") {
      if (sep2 === "\n")
        res += sep2;
      else
        sep2 = "\n";
    } else {
      res += sep2 + lm;
      sep2 = " ";
    }
    pos = line.lastIndex;
  }
  const last = /[ \t]*(.*)/sy;
  last.lastIndex = pos;
  match = last.exec(source);
  return res + sep2 + (match?.[1] ?? "");
}
function doubleQuotedValue(source, onError) {
  let res = "";
  for (let i = 1; i < source.length - 1; ++i) {
    const ch = source[i];
    if (ch === "\r" && source[i + 1] === "\n")
      continue;
    if (ch === "\n") {
      const { fold, offset } = foldNewline(source, i);
      res += fold;
      i = offset;
    } else if (ch === "\\") {
      let next = source[++i];
      const cc = escapeCodes[next];
      if (cc)
        res += cc;
      else if (next === "\n") {
        next = source[i + 1];
        while (next === " " || next === "	")
          next = source[++i + 1];
      } else if (next === "\r" && source[i + 1] === "\n") {
        next = source[++i + 1];
        while (next === " " || next === "	")
          next = source[++i + 1];
      } else if (next === "x" || next === "u" || next === "U") {
        const length = next === "x" ? 2 : next === "u" ? 4 : 8;
        res += parseCharCode(source, i + 1, length, onError);
        i += length;
      } else {
        const raw = source.substr(i - 1, 2);
        onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        res += raw;
      }
    } else if (ch === " " || ch === "	") {
      const wsStart = i;
      let next = source[i + 1];
      while (next === " " || next === "	")
        next = source[++i + 1];
      if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
        res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
    } else {
      res += ch;
    }
  }
  if (source[source.length - 1] !== '"' || source.length === 1)
    onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
  return res;
}
function foldNewline(source, offset) {
  let fold = "";
  let ch = source[offset + 1];
  while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
    if (ch === "\r" && source[offset + 2] !== "\n")
      break;
    if (ch === "\n")
      fold += "\n";
    offset += 1;
    ch = source[offset + 1];
  }
  if (!fold)
    fold = " ";
  return { fold, offset };
}
function parseCharCode(source, offset, length, onError) {
  const cc = source.substr(offset, length);
  const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
  const code = ok ? parseInt(cc, 16) : NaN;
  try {
    return String.fromCodePoint(code);
  } catch {
    const raw = source.substr(offset - 2, length + 2);
    onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
    return raw;
  }
}
var escapeCodes;
var init_resolve_flow_scalar = __esm({
  "node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js"() {
    init_Scalar();
    init_resolve_end();
    escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
  }
});

// node_modules/yaml/browser/dist/compose/compose-scalar.js
function composeScalar(ctx, token, tagToken, onError) {
  const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError);
  const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
  let tag;
  if (ctx.options.stringKeys && ctx.atKey) {
    tag = ctx.schema[SCALAR];
  } else if (tagName)
    tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
  else if (token.type === "scalar")
    tag = findScalarTagByTest(ctx, value, token, onError);
  else
    tag = ctx.schema[SCALAR];
  let scalar;
  try {
    const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
    scalar = isScalar(res) ? res : new Scalar(res);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
    scalar = new Scalar(value);
  }
  scalar.range = range;
  scalar.source = value;
  if (type)
    scalar.type = type;
  if (tagName)
    scalar.tag = tagName;
  if (tag.format)
    scalar.format = tag.format;
  if (comment)
    scalar.comment = comment;
  return scalar;
}
function findScalarTagByName(schema4, value, tagName, tagToken, onError) {
  if (tagName === "!")
    return schema4[SCALAR];
  const matchWithTest = [];
  for (const tag of schema4.tags) {
    if (!tag.collection && tag.tag === tagName) {
      if (tag.default && tag.test)
        matchWithTest.push(tag);
      else
        return tag;
    }
  }
  for (const tag of matchWithTest)
    if (tag.test?.test(value))
      return tag;
  const kt = schema4.knownTags[tagName];
  if (kt && !kt.collection) {
    schema4.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
    return kt;
  }
  onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
  return schema4[SCALAR];
}
function findScalarTagByTest({ atKey, directives, schema: schema4 }, value, token, onError) {
  const tag = schema4.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema4[SCALAR];
  if (schema4.compat) {
    const compat = schema4.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema4[SCALAR];
    if (tag.tag !== compat.tag) {
      const ts = directives.tagString(tag.tag);
      const cs = directives.tagString(compat.tag);
      const msg = `Value may be parsed as either ${ts} or ${cs}`;
      onError(token, "TAG_RESOLVE_FAILED", msg, true);
    }
  }
  return tag;
}
var init_compose_scalar = __esm({
  "node_modules/yaml/browser/dist/compose/compose-scalar.js"() {
    init_identity();
    init_Scalar();
    init_resolve_block_scalar();
    init_resolve_flow_scalar();
  }
});

// node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
function emptyScalarPosition(offset, before, pos) {
  if (before) {
    pos ?? (pos = before.length);
    for (let i = pos - 1; i >= 0; --i) {
      let st = before[i];
      switch (st.type) {
        case "space":
        case "comment":
        case "newline":
          offset -= st.source.length;
          continue;
      }
      st = before[++i];
      while (st?.type === "space") {
        offset += st.source.length;
        st = before[++i];
      }
      break;
    }
  }
  return offset;
}
var init_util_empty_scalar_position = __esm({
  "node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js"() {
  }
});

// node_modules/yaml/browser/dist/compose/compose-node.js
function composeNode(ctx, token, props, onError) {
  const atKey = ctx.atKey;
  const { spaceBefore, comment, anchor, tag } = props;
  let node;
  let isSrcToken = true;
  switch (token.type) {
    case "alias":
      node = composeAlias(ctx, token, onError);
      if (anchor || tag)
        onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
      break;
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "block-scalar":
      node = composeScalar(ctx, token, tag, onError);
      if (anchor)
        node.anchor = anchor.source.substring(1);
      break;
    case "block-map":
    case "block-seq":
    case "flow-collection":
      try {
        node = composeCollection(CN, ctx, token, props, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onError(token, "RESOURCE_EXHAUSTION", message);
      }
      break;
    default: {
      const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
      onError(token, "UNEXPECTED_TOKEN", message);
      isSrcToken = false;
    }
  }
  node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
  if (anchor && node.anchor === "")
    onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
  if (atKey && ctx.options.stringKeys && (!isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
    const msg = "With stringKeys, all keys must be strings";
    onError(tag ?? token, "NON_STRING_KEY", msg);
  }
  if (spaceBefore)
    node.spaceBefore = true;
  if (comment) {
    if (token.type === "scalar" && token.source === "")
      node.comment = comment;
    else
      node.commentBefore = comment;
  }
  if (ctx.options.keepSourceTokens && isSrcToken)
    node.srcToken = token;
  return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
  const token = {
    type: "scalar",
    offset: emptyScalarPosition(offset, before, pos),
    indent: -1,
    source: ""
  };
  const node = composeScalar(ctx, token, tag, onError);
  if (anchor) {
    node.anchor = anchor.source.substring(1);
    if (node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
  }
  if (spaceBefore)
    node.spaceBefore = true;
  if (comment) {
    node.comment = comment;
    node.range[2] = end;
  }
  return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
  const alias = new Alias(source.substring(1));
  if (alias.source === "")
    onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
  if (alias.source.endsWith(":"))
    onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
  const valueEnd = offset + source.length;
  const re = resolveEnd(end, valueEnd, options.strict, onError);
  alias.range = [offset, valueEnd, re.offset];
  if (re.comment)
    alias.comment = re.comment;
  return alias;
}
var CN;
var init_compose_node = __esm({
  "node_modules/yaml/browser/dist/compose/compose-node.js"() {
    init_Alias();
    init_identity();
    init_compose_collection();
    init_compose_scalar();
    init_resolve_end();
    init_util_empty_scalar_position();
    CN = { composeNode, composeEmptyNode };
  }
});

// node_modules/yaml/browser/dist/compose/compose-doc.js
function composeDoc(options, directives, { offset, start, value, end }, onError) {
  const opts = Object.assign({ _directives: directives }, options);
  const doc = new Document(void 0, opts);
  const ctx = {
    atKey: false,
    atRoot: true,
    directives: doc.directives,
    options: doc.options,
    schema: doc.schema
  };
  const props = resolveProps(start, {
    indicator: "doc-start",
    next: value ?? end?.[0],
    offset,
    onError,
    parentIndent: 0,
    startOnNewline: true
  });
  if (props.found) {
    doc.directives.docStart = true;
    if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
      onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
  }
  doc.contents = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
  const contentEnd = doc.contents.range[2];
  const re = resolveEnd(end, contentEnd, false, onError);
  if (re.comment)
    doc.comment = re.comment;
  doc.range = [offset, contentEnd, re.offset];
  return doc;
}
var init_compose_doc = __esm({
  "node_modules/yaml/browser/dist/compose/compose-doc.js"() {
    init_Document();
    init_compose_node();
    init_resolve_end();
    init_resolve_props();
  }
});

// node_modules/yaml/browser/dist/compose/composer.js
function getErrorPos(src) {
  if (typeof src === "number")
    return [src, src + 1];
  if (Array.isArray(src))
    return src.length === 2 ? src : [src[0], src[1]];
  const { offset, source } = src;
  return [offset, offset + (typeof source === "string" ? source.length : 1)];
}
function parsePrelude(prelude) {
  let comment = "";
  let atComment = false;
  let afterEmptyLine = false;
  for (let i = 0; i < prelude.length; ++i) {
    const source = prelude[i];
    switch (source[0]) {
      case "#":
        comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
        atComment = true;
        afterEmptyLine = false;
        break;
      case "%":
        if (prelude[i + 1]?.[0] !== "#")
          i += 1;
        atComment = false;
        break;
      default:
        if (!atComment)
          afterEmptyLine = true;
        atComment = false;
    }
  }
  return { comment, afterEmptyLine };
}
var Composer;
var init_composer = __esm({
  "node_modules/yaml/browser/dist/compose/composer.js"() {
    init_directives();
    init_Document();
    init_errors();
    init_identity();
    init_compose_doc();
    init_resolve_end();
    Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new YAMLWarning(pos, code, message));
          else
            this.errors.push(new YAMLParseError(pos, code, message));
        };
        this.directives = new Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
  }
});

// node_modules/yaml/browser/dist/parse/cst-scalar.js
var init_cst_scalar = __esm({
  "node_modules/yaml/browser/dist/parse/cst-scalar.js"() {
    init_resolve_block_scalar();
    init_resolve_flow_scalar();
    init_errors();
    init_stringifyString();
  }
});

// node_modules/yaml/browser/dist/parse/cst-stringify.js
var init_cst_stringify = __esm({
  "node_modules/yaml/browser/dist/parse/cst-stringify.js"() {
  }
});

// node_modules/yaml/browser/dist/parse/cst-visit.js
function visit2(cst, visitor) {
  if ("type" in cst && cst.type === "document")
    cst = { start: cst.start, value: cst.value };
  _visit(Object.freeze([]), cst, visitor);
}
function _visit(path, item2, visitor) {
  let ctrl = visitor(item2, path);
  if (typeof ctrl === "symbol")
    return ctrl;
  for (const field of ["key", "value"]) {
    const token = item2[field];
    if (token && "items" in token) {
      for (let i = 0; i < token.items.length; ++i) {
        const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK2)
          return BREAK2;
        else if (ci === REMOVE2) {
          token.items.splice(i, 1);
          i -= 1;
        }
      }
      if (typeof ctrl === "function" && field === "key")
        ctrl = ctrl(item2, path);
    }
  }
  return typeof ctrl === "function" ? ctrl(item2, path) : ctrl;
}
var BREAK2, SKIP2, REMOVE2;
var init_cst_visit = __esm({
  "node_modules/yaml/browser/dist/parse/cst-visit.js"() {
    BREAK2 = /* @__PURE__ */ Symbol("break visit");
    SKIP2 = /* @__PURE__ */ Symbol("skip children");
    REMOVE2 = /* @__PURE__ */ Symbol("remove item");
    visit2.BREAK = BREAK2;
    visit2.SKIP = SKIP2;
    visit2.REMOVE = REMOVE2;
    visit2.itemAtPath = (cst, path) => {
      let item2 = cst;
      for (const [field, index] of path) {
        const tok = item2?.[field];
        if (tok && "items" in tok) {
          item2 = tok.items[index];
        } else
          return void 0;
      }
      return item2;
    };
    visit2.parentCollection = (cst, path) => {
      const parent = visit2.itemAtPath(cst, path.slice(0, -1));
      const field = path[path.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
  }
});

// node_modules/yaml/browser/dist/parse/cst.js
function tokenType(source) {
  switch (source) {
    case BOM:
      return "byte-order-mark";
    case DOCUMENT:
      return "doc-mode";
    case FLOW_END:
      return "flow-error-end";
    case SCALAR2:
      return "scalar";
    case "---":
      return "doc-start";
    case "...":
      return "doc-end";
    case "":
    case "\n":
    case "\r\n":
      return "newline";
    case "-":
      return "seq-item-ind";
    case "?":
      return "explicit-key-ind";
    case ":":
      return "map-value-ind";
    case "{":
      return "flow-map-start";
    case "}":
      return "flow-map-end";
    case "[":
      return "flow-seq-start";
    case "]":
      return "flow-seq-end";
    case ",":
      return "comma";
  }
  switch (source[0]) {
    case " ":
    case "	":
      return "space";
    case "#":
      return "comment";
    case "%":
      return "directive-line";
    case "*":
      return "alias";
    case "&":
      return "anchor";
    case "!":
      return "tag";
    case "'":
      return "single-quoted-scalar";
    case '"':
      return "double-quoted-scalar";
    case "|":
    case ">":
      return "block-scalar-header";
  }
  return null;
}
var BOM, DOCUMENT, FLOW_END, SCALAR2;
var init_cst = __esm({
  "node_modules/yaml/browser/dist/parse/cst.js"() {
    init_cst_scalar();
    init_cst_stringify();
    init_cst_visit();
    BOM = "\uFEFF";
    DOCUMENT = "";
    FLOW_END = "";
    SCALAR2 = "";
  }
});

// node_modules/yaml/browser/dist/parse/lexer.js
function isEmpty(ch) {
  switch (ch) {
    case void 0:
    case " ":
    case "\n":
    case "\r":
    case "	":
      return true;
    default:
      return false;
  }
}
var hexDigits, tagChars, flowIndicatorChars, invalidAnchorChars, isNotAnchorChar, Lexer;
var init_lexer = __esm({
  "node_modules/yaml/browser/dist/parse/lexer.js"() {
    init_cst();
    hexDigits = new Set("0123456789ABCDEFabcdef");
    tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    flowIndicatorChars = new Set(",[]{}");
    invalidAnchorChars = new Set(" ,[]{}\n\r	");
    isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield SCALAR2;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield SCALAR2;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
  }
});

// node_modules/yaml/browser/dist/parse/line-counter.js
var LineCounter;
var init_line_counter = __esm({
  "node_modules/yaml/browser/dist/parse/line-counter.js"() {
    LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
  }
});

// node_modules/yaml/browser/dist/parse/parser.js
function includesToken(list3, type) {
  for (let i = 0; i < list3.length; ++i)
    if (list3[i].type === type)
      return true;
  return false;
}
function findNonEmptyIndex(list3) {
  for (let i = 0; i < list3.length; ++i) {
    switch (list3[i].type) {
      case "space":
      case "comment":
      case "newline":
        break;
      default:
        return i;
    }
  }
  return -1;
}
function isFlowToken(token) {
  switch (token?.type) {
    case "alias":
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "flow-collection":
      return true;
    default:
      return false;
  }
}
function getPrevProps(parent) {
  switch (parent.type) {
    case "document":
      return parent.start;
    case "block-map": {
      const it = parent.items[parent.items.length - 1];
      return it.sep ?? it.start;
    }
    case "block-seq":
      return parent.items[parent.items.length - 1].start;
    /* istanbul ignore next should not happen */
    default:
      return [];
  }
}
function getFirstKeyStartProps(prev) {
  if (prev.length === 0)
    return [];
  let i = prev.length;
  loop: while (--i >= 0) {
    switch (prev[i].type) {
      case "doc-start":
      case "explicit-key-ind":
      case "map-value-ind":
      case "seq-item-ind":
      case "newline":
        break loop;
    }
  }
  while (prev[++i]?.type === "space") {
  }
  return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
  if (source.length < 1e5)
    Array.prototype.push.apply(target, source);
  else
    for (let i = 0; i < source.length; ++i)
      target.push(source[i]);
}
function fixFlowSeqItems(fc) {
  if (fc.start.type === "flow-seq-start") {
    for (const it of fc.items) {
      if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
        if (it.key)
          it.value = it.key;
        delete it.key;
        if (isFlowToken(it.value)) {
          if (it.value.end)
            arrayPushArray(it.value.end, it.sep);
          else
            it.value.end = it.sep;
        } else
          arrayPushArray(it.start, it.sep);
        delete it.sep;
      }
    }
  }
}
var Parser;
var init_parser = __esm({
  "node_modules/yaml/browser/dist/parse/parser.js"() {
    init_cst();
    init_lexer();
    Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep2;
          if (scalar.end) {
            sep2 = scalar.end;
            sep2.push(this.sourceToken);
            delete scalar.end;
          } else
            sep2 = [this.sourceToken];
          const map2 = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep2 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map2;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map2) {
        const it = map2.items[map2.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map2.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map2.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map2.indent)) {
                const prev = map2.items[map2.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map2.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map2.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map2.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map2.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map2.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map2.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map2.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key2 = it.key;
                  const sep2 = it.sep;
                  sep2.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: key2, sep: sep2 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map2.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map2.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map2);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map2.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq2) {
        const it = seq2.items[seq2.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq2.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq2.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq2.indent)) {
                const prev = seq2.items[seq2.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq2.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq2.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq2.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq2.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq2.indent) {
          const bv = this.startBlockValue(seq2);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep2 = fc.end.splice(1, fc.end.length);
            sep2.push(this.sourceToken);
            const map2 = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep2 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map2;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
  }
});

// node_modules/yaml/browser/dist/public-api.js
function parseOptions(options) {
  const prettyErrors = options.prettyErrors !== false;
  const lineCounter = options.lineCounter || prettyErrors && new LineCounter() || null;
  return { lineCounter, prettyErrors };
}
function parseDocument(source, options = {}) {
  const { lineCounter, prettyErrors } = parseOptions(options);
  const parser = new Parser(lineCounter?.addNewLine);
  const composer = new Composer(options);
  let doc = null;
  for (const _doc of composer.compose(parser.parse(source), true, source.length)) {
    if (!doc)
      doc = _doc;
    else if (doc.options.logLevel !== "silent") {
      doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
      break;
    }
  }
  if (prettyErrors && lineCounter) {
    doc.errors.forEach(prettifyError(source, lineCounter));
    doc.warnings.forEach(prettifyError(source, lineCounter));
  }
  return doc;
}
function parse2(src, reviver, options) {
  let _reviver = void 0;
  if (typeof reviver === "function") {
    _reviver = reviver;
  } else if (options === void 0 && reviver && typeof reviver === "object") {
    options = reviver;
  }
  const doc = parseDocument(src, options);
  if (!doc)
    return null;
  doc.warnings.forEach((warning) => warn(doc.options.logLevel, warning));
  if (doc.errors.length > 0) {
    if (doc.options.logLevel !== "silent")
      throw doc.errors[0];
    else
      doc.errors = [];
  }
  return doc.toJS(Object.assign({ reviver: _reviver }, options));
}
var init_public_api = __esm({
  "node_modules/yaml/browser/dist/public-api.js"() {
    init_composer();
    init_Document();
    init_errors();
    init_log();
    init_identity();
    init_line_counter();
    init_parser();
  }
});

// node_modules/yaml/browser/dist/index.js
var init_dist = __esm({
  "node_modules/yaml/browser/dist/index.js"() {
    init_composer();
    init_Document();
    init_Schema();
    init_errors();
    init_Alias();
    init_identity();
    init_Pair();
    init_Scalar();
    init_YAMLMap();
    init_YAMLSeq();
    init_cst();
    init_lexer();
    init_line_counter();
    init_parser();
    init_public_api();
    init_visit();
  }
});

// node_modules/yaml/browser/index.js
var init_browser = __esm({
  "node_modules/yaml/browser/index.js"() {
    init_dist();
    init_dist();
  }
});

// ../differential-review/src/record.ts
function readFrontmatter(markdown2) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown2);
  if (!m) return {};
  const data = parse2(m[1]);
  return data && typeof data === "object" ? data : {};
}
function recordLocation(abs) {
  const parts = abs.split(import_node_path.sep);
  const i = parts.lastIndexOf("repositories");
  const parsed = i >= 0 ? parseRecordPath([...parts.slice(i), "index.md"].join("/")) : null;
  if (parsed?.rest !== "index.md" || !isReviewableRecordKind(parsed.kind)) return { repo: null, kind: null };
  return { repo: parsed.repo, kind: parsed.kind };
}
function readRecord(recordDir) {
  const abs = (0, import_node_path.resolve)(recordDir);
  const indexPath = (0, import_node_path.join)(abs, "index.md");
  if (!(0, import_node_fs.existsSync)(indexPath)) {
    throw new Error(
      `no record at ${abs} (no index.md); --record must be an existing vault/repositories/<repo>/{branches,reviews}/<status>/<name> dir`
    );
  }
  let fm;
  try {
    fm = readFrontmatter((0, import_node_fs.readFileSync)(indexPath, "utf8"));
  } catch (e) {
    throw new Error(`cannot parse frontmatter in ${indexPath}: ${e.message}`);
  }
  const str = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  return {
    ...recordLocation(abs),
    branch: (0, import_node_path.basename)(abs),
    upstreamBaseBranch: str(fm.upstream_base_branch),
    parentBranch: str(fm.parent_branch)
  };
}
var import_node_fs, import_node_path;
var init_record = __esm({
  "../differential-review/src/record.ts"() {
    "use strict";
    import_node_fs = require("node:fs");
    import_node_path = require("node:path");
    init_browser();
    init_records();
  }
});

// ../review-factory/src/parse.ts
function parseFindings(text2) {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text2, { lineCounter, prettyErrors: false });
  const at = (offset) => {
    const { line, col } = lineCounter.linePos(offset);
    return `line ${line}, column ${col}`;
  };
  if (doc.errors.length) return { file: null, errors: doc.errors.map((e) => `${at(e.pos[0])}: ${e.message.split("\n")[0]}`) };
  const errors = [];
  visit(doc, {
    Scalar(_key, node) {
      if (typeof node.value === "number" && node.source && HEXISH.test(node.source)) node.value = node.source;
      const multiLine = typeof node.value === "string" && node.value.trimEnd().includes("\n");
      if (multiLine && node.type !== "BLOCK_LITERAL" && node.type !== "BLOCK_FOLDED" && node.range) {
        errors.push(`${at(node.range[0])}: multi-line text must be a block scalar (\`|\`)`);
      }
    }
  });
  if (errors.length) return { file: null, errors };
  return decodeFindings(doc.toJS());
}
var HEXISH;
var init_parse = __esm({
  "../review-factory/src/parse.ts"() {
    "use strict";
    init_browser();
    init_model();
    HEXISH = /^[0-9a-f]{7,40}$/;
  }
});

// ../review-factory/src/record.ts
function latestRound(dir) {
  const rounds = (0, import_node_fs2.readdirSync)(dir).flatMap((name) => {
    const m = FINDINGS_FILE.exec(name);
    return m ? [Number(m[1])] : [];
  });
  return rounds.length ? Math.max(...rounds) : null;
}
function loadRecord(recordDir, prUrl) {
  const dir = (0, import_node_path2.resolve)(recordDir);
  const record = readRecord(dir);
  if (record.kind !== "reviews" || !record.repo || !/^\d+$/.test(record.branch)) throw new Error(`${dir} isn't a PR review record`);
  const round2 = latestRound(dir);
  if (round2 === null) throw new Error(`${dir} has no review_<N>_findings.yml`);
  const findingsPath = (0, import_node_path2.join)(dir, findingsName(round2));
  const { file, errors } = parseFindings((0, import_node_fs2.readFileSync)(findingsPath, "utf8"));
  if (file && file.round !== round2) errors.push(`${findingsName(round2)} says round ${file.round}`);
  if (!file || errors.length) return { dir, round: round2, findingsPath, ctx: null, errors };
  const roundDir = round2 === 0 ? dir : (0, import_node_path2.join)(dir, `round_${round2}`);
  const ctx = {
    file,
    repo: record.repo,
    pr: Number(record.branch),
    commentNote: readIf((0, import_node_path2.join)(dir, commentNoteName(round2))),
    prNote: readIf((0, import_node_path2.join)(dir, prNoteName(round2))),
    humanReview: readIf((0, import_node_path2.join)(dir, "human_review.md")),
    risks: readIf((0, import_node_path2.join)(roundDir, "risks.md")),
    followupIssue: readIf((0, import_node_path2.join)(roundDir, "followup_refactor_issue.md")),
    learningIssue: (0, import_node_fs2.existsSync)((0, import_node_path2.join)(roundDir, "learning_galaxy_followup_issue.md")),
    prUrl
  };
  return { dir, round: round2, findingsPath, ctx, errors: [] };
}
var import_node_fs2, import_node_path2, FINDINGS_FILE, findingsName, readIf;
var init_record2 = __esm({
  "../review-factory/src/record.ts"() {
    "use strict";
    import_node_fs2 = require("node:fs");
    import_node_path2 = require("node:path");
    init_record();
    init_gates();
    init_parse();
    FINDINGS_FILE = /^review_(\d+)_findings\.yml$/;
    findingsName = (round2) => `review_${round2}_findings.yml`;
    readIf = (path) => (0, import_node_fs2.existsSync)(path) ? (0, import_node_fs2.readFileSync)(path, "utf8") : null;
  }
});

// ../review-factory/src/toggle.ts
function load(text2, parse3) {
  const doc = parse3(text2, { keepSourceTokens: true });
  if (doc.errors.length) throw new Error(`findings YAML doesn't parse: ${doc.errors[0].message.split("\n")[0]}`);
  return doc;
}
function splice(text2, node, value, what) {
  const scalar = node;
  if (!scalar?.range || typeof scalar.value !== "boolean") throw new Error(`${what} isn't true or false`);
  if (scalar.value === value) return text2;
  return text2.slice(0, scalar.range[0]) + String(value) + text2.slice(scalar.range[1]);
}
function setInclude(text2, id, include, parse3) {
  const doc = load(text2, parse3);
  const findings = doc.toJS().findings ?? [];
  const index = findings.findIndex((f) => f?.id === id);
  if (index < 0) throw new Error(`no finding ${id}`);
  return splice(text2, doc.getIn(["findings", index, "include"], true), include, `${id} include`);
}
function setAction(text2, action, on, parse3) {
  const doc = load(text2, parse3);
  return splice(text2, doc.getIn(["actions", action], true), on, `action ${action}`);
}
var init_toggle = __esm({
  "../review-factory/src/toggle.ts"() {
    "use strict";
  }
});

// ../review-factory/src/panel.ts
var panel_exports = {};
__export(panel_exports, {
  findingsEdit: () => findingsEdit,
  findingsPanel: () => findingsPanel
});
function findingsPanel(dir) {
  const round2 = latestRound(dir);
  if (round2 === null) return null;
  const { ctx, errors } = loadRecord(dir);
  return { round: round2, file: findingsName(round2), landing: ctx && landing(ctx), errors };
}
function findingsEdit(dir, edit2) {
  const round2 = latestRound(dir);
  if (round2 !== edit2.round) throw new Error(`${round2 === null ? "there's no findings YAML" : `${findingsName(round2)} is the latest round`} now; reload`);
  if ("action" in edit2 && !ACTIONS.includes(edit2.action)) throw new Error(`unknown action ${edit2.action}`);
  const { ctx } = loadRecord(dir);
  if (!ctx) throw new Error(`fix ${findingsName(round2)} first`);
  const file = findingsName(round2);
  if ("action" in edit2) return { file, change: (text2) => setAction(text2, edit2.action, edit2.checked, parseDocument) };
  if (!ctx.file.findings.some((f) => f.id === edit2.id)) return void 0;
  return { file, change: (text2) => setInclude(text2, edit2.id, edit2.include, parseDocument) };
}
var init_panel = __esm({
  "../review-factory/src/panel.ts"() {
    "use strict";
    init_browser();
    init_landing();
    init_model();
    init_record2();
    init_toggle();
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GalaxyBrainPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian11 = require("obsidian");

// src/ci-status.ts
init_repository_tabs();

// src/record-frontmatter.ts
var STRING_FIELDS = ["upstream_base_branch", "parent_branch"];
var LIST_FIELDS = ["blockers", "blocking", "related_records", "child_branches"];
var unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");
function recordFrontmatter(body) {
  const block = /^---\n([\s\S]*?)^---$/m.exec(body);
  if (!block || block.index !== 0) return {};
  const raw = {};
  let listKey;
  for (const line of block[1].split("\n")) {
    const item2 = /^\s*-\s+(.+)$/.exec(line);
    if (item2 && listKey) {
      raw[listKey].push(unquote(item2[1]));
      continue;
    }
    listKey = void 0;
    const m = /^(\w+):\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const key2 = m[1];
    const value = m[2];
    const flow = /^\[(.*)\]$/.exec(value);
    if (flow) raw[key2] = flow[1].split(",").map(unquote).filter(Boolean);
    else if (value) raw[key2] = [unquote(value)];
    else raw[listKey = key2] = [];
  }
  const fields = {};
  for (const key2 of STRING_FIELDS) if (raw[key2]?.[0]) fields[key2] = raw[key2][0];
  for (const key2 of LIST_FIELDS) if (raw[key2]?.length) fields[key2] = raw[key2];
  const pr = raw.pr?.[0];
  if (pr && /^\d+$/.test(pr)) fields.pr = Number(pr);
  return fields;
}

// src/ci-status.ts
var PR_FIELDS = "name,state,bucket,link,workflow";
var isPrSource = (source) => source.args[0] === "pr";
function ciSources(record, body) {
  const upstream = `${upstreamOwner(record.repo, [body])}/${record.repo}`;
  const pr = record.kind === "reviews" ? record.name : record.kind === "branches" ? recordFrontmatter(body).pr?.toString() : void 0;
  const sources = [];
  if (pr) sources.push({ label: `PR #${pr}`, args: ["pr", "checks", pr, "--repo", upstream, "--json", PR_FIELDS], url: `https://github.com/${upstream}/pull/${pr}` });
  if (record.kind === "branches") {
    const fork = `${FORK_OWNER}/${record.repo}`;
    sources.push({
      label: "Fork branch",
      args: ["api", "--paginate", `repos/${fork}/commits/${encodeURIComponent(record.name)}/check-runs?per_page=100`, "--jq", ".check_runs[] | {name, status, conclusion, html_url}"],
      url: `https://github.com/${fork}/tree/${record.name}`
    });
  }
  return sources;
}
var empty = () => ({ failed: [], running: [], passed: 0, skipped: 0 });
function summarizePrChecks(json2) {
  const summary = empty();
  const checks = json2.trim() ? JSON.parse(json2) : [];
  for (const { name, bucket, link, workflow } of checks) {
    const check = { name, workflow, url: link };
    if (bucket === "fail" || bucket === "cancel") summary.failed.push(check);
    else if (bucket === "pending") summary.running.push(check);
    else if (bucket === "pass") summary.passed++;
    else summary.skipped++;
  }
  return summary;
}
function summarizeCheckRuns(lines) {
  const summary = empty();
  for (const line of lines.split("\n").filter((l) => l.trim())) {
    const { name, status, conclusion, html_url: url } = JSON.parse(line);
    if (status !== "completed") summary.running.push({ name, url });
    else if (conclusion === "success" || conclusion === "neutral") summary.passed++;
    else if (conclusion === "skipped") summary.skipped++;
    else summary.failed.push({ name, url });
  }
  return summary;
}

// src/ci-status-modal.ts
var import_obsidian = require("obsidian");
var REFRESH_MS = 3e4;
var CiStatusModal = class extends import_obsidian.Modal {
  constructor(app, title, sources, fetch, fixCi) {
    super(app);
    this.title = title;
    this.sources = sources;
    this.fetch = fetch;
    this.fixCi = fixCi;
  }
  onOpen() {
    this.setTitle(this.title);
    void this.render();
    this.timer = window.setInterval(() => void this.render(), REFRESH_MS);
  }
  onClose() {
    window.clearInterval(this.timer);
    this.contentEl.empty();
  }
  async render() {
    const results = await Promise.all(this.sources.map((source) => this.fetch(source).then((summary) => ({ summary }), (error) => ({ error }))));
    const el3 = this.contentEl;
    el3.empty();
    el3.addClass("gb-ci");
    const bar = el3.createDiv({ cls: "gb-ci-bar" });
    bar.createSpan({ cls: "gb-ci-updated", text: `Updated ${(/* @__PURE__ */ new Date()).toLocaleTimeString()} \xB7 refreshes every 30s` });
    const refresh = bar.createEl("button", { attr: { "aria-label": "Refresh" } });
    (0, import_obsidian.setIcon)(refresh, "refresh-cw");
    refresh.onclick = () => void this.render();
    this.sources.forEach((source, i) => {
      const section2 = el3.createDiv({ cls: "gb-ci-source" });
      const heading = section2.createEl("h4");
      heading.createEl("a", { text: source.label, href: source.url });
      const result = results[i];
      if ("error" in result) return void section2.createDiv({ cls: "gb-ci-error", text: result.error.message });
      const { failed, running, passed, skipped } = result.summary;
      if (!failed.length && !running.length && !passed && !skipped) return void section2.createDiv({ text: "No checks." });
      if (failed.length) {
        const head = section2.createDiv({ cls: "gb-ci-group-head", text: `\u2717 ${failed.length} failed` });
        if (this.fixCi) {
          const fix = head.createEl("button", { text: "\u{1F6A6} Fix CI" });
          fix.onclick = () => {
            this.close();
            this.fixCi();
          };
        }
        checkList(section2, failed, "gb-ci-failed");
      }
      if (running.length) {
        section2.createDiv({ cls: "gb-ci-group-head", text: `\u25CF ${running.length} running` });
        checkList(section2, running, "gb-ci-running");
      }
      section2.createDiv({ cls: "gb-ci-counts", text: `\u2713 ${passed} passed${skipped ? ` \xB7 ${skipped} skipped` : ""}` });
    });
  }
};
function checkList(el3, checks, cls) {
  const list3 = el3.createEl("ul", { cls });
  for (const check of checks) {
    const item2 = list3.createEl("li");
    item2.createEl("a", { text: check.name, href: check.url });
    if (check.workflow) item2.createSpan({ cls: "gb-ci-workflow", text: ` \xB7 ${check.workflow}` });
  }
}

// src/agents-view.ts
var import_obsidian5 = require("obsidian");

// src/launchers.ts
init_records();
var CLI_BIN_DIRS = ["/usr/local/bin", "/opt/homebrew/bin", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"];
var KEY_LINE = /^(status|agent_dir|name|profile|command|routine|icon):\s*(.*)$/;
var list = (value) => value.split(",").map((item2) => item2.trim()).filter(Boolean);
function launcherScope(path) {
  const [root, repo, kind, file, ...rest] = path.split("/");
  if (root !== "repositories" || file !== "LAUNCHERS.md" || rest.length || !repo) return null;
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: repo === DEFAULTS_REPO ? null : repo, kind };
}
function agentFromPath(path) {
  const [root, agent, ...rest] = path.split("/");
  return root === "agents" && agent && !agent.startsWith("_") && rest.length ? agent : null;
}
var agentLaunchersPath = (agent) => `agents/${agent}/LAUNCHERS.md`;
function quickEmoji(label3) {
  return /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s+(?!\p{Extended_Pictographic})/u.exec(label3)?.[1];
}
function parseAgentLaunchers(markdown2, agent) {
  return parseLaunchers(markdown2, { repo: null, kind: null }, agent).filter((launcher) => !launcher.command);
}
function fillAgentTemplate(template, agent, file) {
  const values = { agent, file };
  return template.replace(/\{(\w+)\}/g, (whole, key2) => values[key2] ?? whole);
}
function parseLaunchers(markdown2, scope, defaultAgentDir) {
  const launchers = [];
  for (const section2 of markdown2.split(/^## /m).slice(1)) {
    const [heading = "", ...lines] = section2.split("\n");
    const fields = {};
    let i = 0;
    for (; i < lines.length; i++) {
      const match = KEY_LINE.exec(lines[i].trim());
      if (!match) break;
      fields[match[1]] = match[2].trim();
    }
    const prompt = lines.slice(i).join("\n").trim();
    const label3 = heading.trim();
    if (!label3) continue;
    if (fields.command) {
      launchers.push({ label: label3, ...scope, statuses: list(fields.status ?? ""), agentDir: "", name: "", prompt: "", command: fields.command });
      continue;
    }
    const agentDir = fields.agent_dir || defaultAgentDir;
    if (!agentDir || !prompt) continue;
    launchers.push({
      label: label3,
      ...scope,
      statuses: list(fields.status ?? ""),
      agentDir,
      name: fields.name || agentDir,
      ...fields.profile ? { profile: fields.profile } : {},
      ...fields.routine === "true" ? { routine: true } : {},
      ...fields.icon ? { icon: fields.icon } : {},
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
var UNTRACKED = "untracked";
function untrackedRecord(repo, kind, number) {
  return { repo, kind, status: UNTRACKED, name: String(number), dir: "" };
}
function withSection(record, grouping) {
  const section2 = grouping?.find((s) => s.names.includes(record.name))?.key;
  return section2 ? { ...record, section: section2 } : record;
}
var queuePaths = (records) => [
  ...new Set(records.flatMap((record) => groupingFor(record.repo, record.kind) ?? []))
];
function withSections(records, read) {
  const groupings = /* @__PURE__ */ new Map();
  return records.map((record) => {
    const path = groupingFor(record.repo, record.kind);
    if (!path) return record;
    if (!groupings.has(path)) {
      const text2 = read(path);
      groupings.set(path, text2 === void 0 ? void 0 : parseGrouping(text2, path, record.repo, record.kind));
    }
    return withSection(record, groupings.get(path));
  });
}
function launchersFor(launchers, record) {
  const live = record.labels?.map((label3) => `label:${label3}`);
  const matches = (statuses) => statuses.includes(record.status) || (live ? live.some((label3) => statuses.includes(label3)) : record.section !== void 0 && statuses.includes(record.section));
  return launchers.filter(
    (launcher) => (launcher.repo ?? record.repo) === record.repo && launcher.kind === record.kind && (matches(launcher.statuses) || launcher.statuses.length === 0 && record.status !== UNTRACKED)
  );
}
function fillTemplate(template, record, vaultRoot) {
  const values = {
    repo: record.repo,
    kind: record.kind,
    status: record.status,
    name: record.name,
    record: record.dir ? `${vaultRoot}/${record.dir}` : ""
  };
  return template.replace(/\{(\w+)\}/g, (whole, key2) => values[key2] ?? whole);
}
function commandArgs(launcher, record, vaultRoot) {
  const [executable = "", ...args] = (launcher.command ?? "").trim().split(/\s+/);
  return [`${vaultRoot}/${executable}`, ...args.map((arg) => fillTemplate(arg, record, vaultRoot))];
}

// src/task-list.ts
init_records();
var RECORD_REF = new RegExp(`^([^/\\s]+)/(${RECORD_KINDS.join("|")})/([^/\\s]+)$`);
var FIELDS = ["prompt", "agent_dir", "profile", "description", "status", "priority", "kind", "link", "record", "suggested_by", "snoozed_until"];
var DAY = /^\d{4}-\d{2}-\d{2}$/;
var STATUSES = ["recommended", "idea"];
var PRIORITIES = ["high", "low"];
var KINDS = ["human"];
function parseTasks(data, known) {
  if (data === null || data === void 0) return [];
  if (!Array.isArray(data)) throw new Error("gb-tasks block must be a list of tasks");
  return data.map((entry, i) => {
    const fail = (message) => new Error(`task ${i + 1}: ${message}`);
    if (!entry || typeof entry !== "object") throw fail("not a mapping");
    const extra = Object.keys(entry).find((key2) => !FIELDS.includes(key2));
    if (extra) throw fail(`unknown field ${extra}`);
    const { prompt, agent_dir: agentDir, profile, description, status, priority, kind, link, record, suggested_by: suggestedBy, snoozed_until: snoozedRaw } = entry;
    if (typeof prompt !== "string" || !prompt.trim()) throw fail("missing prompt");
    if (typeof agentDir !== "string" || !agentDir) throw fail("missing agent_dir");
    if (!known.agentDirs.includes(agentDir)) throw fail(`unknown agent_dir ${agentDir}`);
    if (profile !== void 0 && (typeof profile !== "string" || !known.profiles.includes(profile))) throw fail(`unknown profile ${profile}`);
    if (description !== void 0 && typeof description !== "string") throw fail("description must be text");
    if (status !== void 0 && !STATUSES.includes(status)) throw fail(`unknown status ${status}`);
    if (priority !== void 0 && !PRIORITIES.includes(priority)) throw fail(`unknown priority ${priority}`);
    if (kind !== void 0 && !KINDS.includes(kind)) throw fail(`unknown kind ${kind}`);
    if (kind === "human" && profile !== void 0) throw fail("human task with a profile");
    if (link !== void 0 && (typeof link !== "string" || !/^https?:\/\/\S+$/.test(link))) throw fail("link must be an http(s) URL");
    const recordMatch = record === void 0 ? void 0 : typeof record === "string" ? RECORD_REF.exec(record) : null;
    if (recordMatch === null) throw fail(`record must be <repo>/<${RECORD_KINDS.join("|")}>/<name>`);
    if (suggestedBy !== void 0 && (typeof suggestedBy !== "string" || !/^[^\s#]+\.md(#.+)?$/.test(suggestedBy))) throw fail("suggested_by must be <path>.md#<heading>");
    const snoozedUntil = snoozedRaw instanceof Date ? snoozedRaw.toISOString().slice(0, 10) : snoozedRaw;
    if (snoozedUntil !== void 0 && (typeof snoozedUntil !== "string" || !DAY.test(snoozedUntil))) throw fail("snoozed_until must be YYYY-MM-DD");
    return {
      prompt,
      agentDir,
      ...profile ? { profile } : {},
      ...description ? { description } : {},
      ...status ? { status } : {},
      ...priority ? { priority } : {},
      ...kind ? { kind } : {},
      ...link ? { link } : {},
      ...recordMatch ? { record: { repo: recordMatch[1], kind: recordMatch[2], name: recordMatch[3] } } : {},
      ...suggestedBy ? { suggestedBy } : {},
      ...snoozedUntil ? { snoozedUntil } : {}
    };
  });
}
function parseAgentTasks(source, note, known, parse3) {
  if (note === null) return { source, tasks: [] };
  try {
    const tasks = taskBlocks(note).flatMap((block) => parseTasks(parse3(block.source), known));
    return { source, tasks: tasks.map((task) => ({ ...task, source })) };
  } catch (error) {
    return { source, tasks: [], error: error instanceof Error ? error.message : String(error) };
  }
}
var SNOOZES = [
  ["1 day", 1],
  ["3 days", 3],
  ["1 week", 7],
  ["2 weeks", 14]
];
function isSnoozed(task, day) {
  return task.snoozedUntil !== void 0 && task.snoozedUntil > day;
}
function linkLabel(url) {
  const item2 = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:pull|issues)\/(\d+)/.exec(url);
  return item2 ? `${item2[1]}#${item2[2]}` : url.replace(/^https?:\/\//, "");
}
function localDay(date = /* @__PURE__ */ new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(day, days) {
  const date = /* @__PURE__ */ new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function taskBlocks(note) {
  return fencedBlocks(note, "gb-tasks");
}
function fencedBlocks(note, language) {
  const lines = note.split("\n");
  const blocks2 = [];
  for (let start = 0; start < lines.length; start++) {
    if (lines[start].trim() !== `\`\`\`${language}`) continue;
    const end = lines.findIndex((line, i) => i > start && line.trim() === "```");
    if (end < 0) break;
    blocks2.push({ start, end, source: lines.slice(start + 1, end).join("\n") });
    start = end;
  }
  return blocks2;
}
function removeTask(note, task, parse3, stringify4) {
  return editBlockEntry(note, "gb-tasks", (entry) => entry?.prompt === task.prompt && entry?.agent_dir === task.agentDir, () => void 0, parse3, stringify4);
}
function snoozeTask(note, task, day, parse3, stringify4) {
  return editBlockEntry(note, "gb-tasks", (entry) => entry?.prompt === task.prompt && entry?.agent_dir === task.agentDir, (entry) => ({ ...entry, snoozed_until: day }), parse3, stringify4);
}
function editBlockEntry(note, language, matches, edit2, parse3, stringify4) {
  for (const block of fencedBlocks(note, language)) {
    const entries = parse3(block.source);
    if (!Array.isArray(entries)) continue;
    const index = entries.findIndex(matches);
    if (index < 0) continue;
    const edited = edit2(entries[index]);
    const rest = edited === void 0 ? entries.filter((_, i) => i !== index) : entries.map((entry, i) => i === index ? edited : entry);
    return replaceBlockBody(note, block.start, block.end, rest.length ? stringify4(rest) : "");
  }
  return void 0;
}
var PRIORITY_ORDER = { high: 0, none: 1, low: 2 };
var STATUS_ORDER2 = { recommended: 0, none: 1, idea: 2 };
function byPriority(tasks) {
  return [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority ?? "none"] - PRIORITY_ORDER[b.priority ?? "none"] || STATUS_ORDER2[a.status ?? "none"] - STATUS_ORDER2[b.status ?? "none"]
  );
}
function replaceBlockBody(note, fenceStart, fenceEnd, body) {
  const lines = note.split("\n");
  const bodyLines = body ? body.replace(/\n$/, "").split("\n") : [];
  lines.splice(fenceStart + 1, fenceEnd - fenceStart - 1, ...bodyLines);
  return lines.join("\n");
}
function recordIndexPath(record, paths) {
  const prefix = `repositories/${record.repo}/${record.kind}/`;
  const suffix = `/${record.name}/index.md`;
  return paths.find((path) => path.startsWith(prefix) && path.endsWith(suffix) && !path.slice(prefix.length, -suffix.length).includes("/"));
}
function refinementPrompt(task) {
  const lines = [
    "Let's discuss refining this task and, where it came from a SUGGESTED_TASKS.md section, that section. Don't edit anything until we agree.",
    "",
    `Agent: ${task.agentDir}`,
    `Suggested by: ${task.suggestedBy ? `vault/agents/${task.suggestedBy}` : "unknown (hand-written?)"}`
  ];
  if (task.description) lines.push("", "Description:", task.description.trim());
  lines.push("", "Prompt:", task.prompt.trim());
  return lines.join("\n");
}

// src/agent-routines.ts
function agentRoutines(launchers, agent) {
  return parseAgentLaunchers(launchers ?? "", agent).filter((launcher) => launcher.routine && !launcher.prompt.includes("{file}")).map(({ label: label3, icon, name, prompt, agentDir, profile }) => {
    const emoji = quickEmoji(label3);
    return {
      label: emoji ? label3.slice(emoji.length).trim() : label3,
      emoji: emoji ?? "\u25B6\uFE0F",
      ...icon ? { icon } : {},
      name: fillAgentTemplate(name, agent, ""),
      task: { prompt: fillAgentTemplate(prompt, agent, ""), agentDir, ...profile ? { profile } : {} }
    };
  });
}
function agentCounts(tasks, blockers, missed, today) {
  const counts = [
    ["tasks", tasks.filter((task) => !isSnoozed(task, today)).length, "task"],
    ["blockers", blockers, "blocker"],
    ["cracks", missed, "missed PR"]
  ];
  return counts.filter(([, count]) => count > 0).map(([tab, count, noun]) => ({ tab, count, label: `${count} ${noun}${count === 1 ? "" : "s"}` }));
}
var tasksPath = (agentDir) => `agents/${agentDir}/TASKS.md`;

// src/blockers.ts
init_records();
var blockersPath = (agentDir) => `agents/${agentDir}/blockers`;
var isAgentBlocker = (blocker) => "agentDir" in blocker;
var recordIdLabel = ({ repo, kind, name }) => `${repo}/${kind}/${name}`;
function blockerFromPath(path) {
  const m = path.match(/^agents\/([^/]+)\/blockers\/([^/]+)(?:\/|$)/);
  return m ? { agentDir: m[1], name: m[2] } : null;
}
function recordId(ref) {
  const m = /^([^\s/]+)\/([^\s/]+)\/([^\s/]+)$/.exec(ref);
  return m && RECORD_KINDS.includes(m[2]) ? { repo: m[1], kind: m[2], name: m[3] } : null;
}
function recordBlockers(body) {
  return (recordFrontmatter(body).blockers ?? []).flatMap((ref) => {
    const agent = /^([^\s/]+)\/([^\s/]+)$/.exec(ref);
    const blocker = agent ? { agentDir: agent[1], name: agent[2] } : recordId(ref);
    return blocker ? [blocker] : [];
  });
}
function recordRefs(body, field) {
  return (recordFrontmatter(body)[field] ?? []).flatMap((ref) => recordId(ref) ?? []);
}
function relatedBranches(body, repo) {
  const { parent_branch, child_branches = [] } = recordFrontmatter(body);
  const branch = (name) => ({ repo, kind: "branches", name });
  return { parents: parent_branch ? [branch(parent_branch)] : [], children: child_branches.map(branch) };
}
function recordLinks(body, repo) {
  const { parents, children } = relatedBranches(body, repo);
  return [
    ...recordBlockers(body).map((target) => {
      const name = isAgentBlocker(target) ? `${target.agentDir}/${target.name}` : recordIdLabel(target);
      return { target, text: `\u{1F512} ${name}`, label: isAgentBlocker(target) ? `Blocked: ${name}` : `Blocked by ${name}`, icon: "lock" };
    }),
    ...recordRefs(body, "blocking").map((target) => ({ target, text: `\u{1F6AB} ${recordIdLabel(target)}`, label: `Blocking ${recordIdLabel(target)}`, icon: "ban" })),
    ...recordRefs(body, "related_records").map((target) => ({ target, text: `\u{1F517} ${recordIdLabel(target)}`, label: `Related: ${recordIdLabel(target)}`, icon: "link" })),
    ...parents.map((target) => ({ target, text: `\u2191 ${target.name}`, label: `Parent branch: ${target.name}`, icon: "arrow-up" })),
    ...children.map((target) => ({ target, text: `\u2193 ${target.name}`, label: `Child branch: ${target.name}`, icon: "arrow-down" }))
  ];
}
function recordIndexPath2(paths, { repo, kind, name }) {
  return paths.find((path) => {
    const parsed = parseRecordPath(path);
    return parsed?.repo === repo && parsed.kind === kind && parsed.id === name && parsed.rest === "index.md";
  });
}

// src/cracks-feed.ts
var import_obsidian3 = require("obsidian");

// src/missed-pr-cards.ts
var import_obsidian2 = require("obsidian");

// src/missed-prs.ts
var cracksPath = (agentDir) => `agents/${agentDir}/the_cracks`;
var DATE_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;
function isCrackFile(path) {
  const m = /^agents\/[^/]+\/the_cracks\/([^/]+)$/.exec(path);
  return !!m && DATE_FILE.test(m[1]);
}
var TEXT_FIELDS = { author: "author", merged_by: "mergedBy", summary: "summary", discussion_summary: "discussionSummary", details: "details", discussion: "discussion" };
var FIELDS2 = ["pr", "title", "url", "merged_at", "approvers", "reviewed", ...Object.keys(TEXT_FIELDS)];
function parseMissedPrs(data) {
  if (data === null || data === void 0) return [];
  if (!Array.isArray(data)) throw new Error("gb-missed-prs block must be a list of PRs");
  return data.map((entry, i) => {
    const fail = (message) => new Error(`entry ${i + 1}: ${message}`);
    if (!entry || typeof entry !== "object") throw fail("not a mapping");
    const extra = Object.keys(entry).find((key2) => !FIELDS2.includes(key2));
    if (extra) throw fail(`unknown field ${extra}`);
    const { pr, title, url, merged_at: mergedAt, approvers = [], reviewed = false } = entry;
    if (typeof pr !== "number" || !Number.isInteger(pr)) throw fail("missing pr");
    if (typeof title !== "string" || !title.trim()) throw fail("missing title");
    if (typeof url !== "string" || !/^https?:\/\/\S+$/.test(url)) throw fail("url must be an http(s) URL");
    if (!Array.isArray(approvers) || approvers.some((login) => typeof login !== "string")) throw fail("approvers must be a list of logins");
    if (typeof reviewed !== "boolean") throw fail("reviewed must be true or false");
    const result = { pr, title, url, approvers, reviewed };
    for (const [key2, field] of Object.entries(TEXT_FIELDS)) {
      const value = entry[key2];
      if (value === void 0 || value === null) continue;
      if (typeof value !== "string") throw fail(`${key2} must be text`);
      result[field] = value;
    }
    if (mergedAt instanceof Date) result.mergedAt = mergedAt.toISOString();
    else if (typeof mergedAt === "string") result.mergedAt = mergedAt;
    else if (mergedAt !== void 0 && mergedAt !== null) throw fail("merged_at must be a timestamp");
    return result;
  });
}
function setMissedPrReviewed(note, pr, reviewed, parse3, stringify4) {
  return editBlockEntry(
    note,
    "gb-missed-prs",
    (entry) => entry?.pr === pr,
    (entry) => {
      const { reviewed: _, ...rest } = entry ?? {};
      return reviewed ? { ...rest, reviewed: true } : rest;
    },
    parse3,
    stringify4
  );
}
function parseCrackDay(file, note, parse3, agentDir) {
  const day = { ...file, prs: [], ...agentDir ? { agentDir } : {} };
  try {
    day.prs = fencedBlocks(note, "gb-missed-prs").flatMap((block) => parseMissedPrs(parse3(block.source)));
  } catch (error) {
    day.error = error instanceof Error ? error.message : String(error);
  }
  return day;
}
var unreviewedCount = (days) => days.reduce((count, day) => count + day.prs.filter((pr) => !pr.reviewed).length, 0);
function missedPrMeta(pr) {
  return [pr.author && `by ${pr.author}`, pr.mergedBy && `merged by ${pr.mergedBy}`, pr.approvers.length ? `approved by ${pr.approvers.join(", ")}` : "no approvals", pr.mergedAt?.slice(0, 10)].filter(Boolean).join(" \xB7 ");
}
function crackFiles(paths, dir) {
  return paths.filter((path) => path.startsWith(`${dir}/`)).map((path) => ({ path, match: DATE_FILE.exec(path.slice(dir.length + 1)) })).filter((file) => file.match).map(({ path, match }) => ({ path, date: match[1] })).sort((a, b) => b.date.localeCompare(a.date));
}

// src/missed-pr-cards.ts
function renderMissedPrCards(el3, prs, options = {}) {
  const list3 = el3.createDiv({ cls: "gb-missed-prs" });
  const empty2 = (text2) => list3.createDiv({ cls: "gb-missed-prs-empty", text: text2 });
  const shown = options.hideReviewed ? prs.filter((pr) => !pr.reviewed) : prs;
  if (prs.length === 0) empty2("No missed PRs.");
  else if (shown.length === 0) empty2("All reviewed.");
  for (const pr of shown) {
    let reviewed = pr.reviewed;
    const card = list3.createDiv({ cls: "gb-missed-pr" });
    card.toggleClass("gb-missed-pr-reviewed", reviewed);
    const head = card.createDiv({ cls: "gb-missed-pr-head" });
    head.createEl("a", { text: `#${pr.pr}`, href: pr.url, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
    head.createSpan({ cls: "gb-missed-pr-title", text: pr.title });
    const { setReviewed } = options;
    if (setReviewed) {
      const button2 = head.createEl("button", { cls: "clickable-icon" });
      const label3 = () => {
        (0, import_obsidian2.setIcon)(button2, reviewed ? "rotate-ccw" : "check");
        button2.setAttr("aria-label", reviewed ? "Mark unreviewed" : "Mark reviewed");
      };
      label3();
      button2.onclick = async () => {
        card.addClass("gb-missed-pr-pending");
        const ok = await setReviewed(pr, !reviewed);
        card.removeClass("gb-missed-pr-pending");
        if (!ok) return;
        reviewed = !reviewed;
        if (options.hideReviewed && reviewed) {
          card.remove();
          if (!list3.querySelector(".gb-missed-pr")) empty2("All reviewed.");
          return;
        }
        card.toggleClass("gb-missed-pr-reviewed", reviewed);
        label3();
      };
    }
    card.createDiv({ cls: "gb-missed-pr-meta", text: missedPrMeta(pr) });
    if (pr.summary) card.createDiv({ cls: "gb-missed-pr-summary", text: pr.summary.trim() });
    if (pr.discussionSummary) card.createDiv({ cls: "gb-missed-pr-discussion-summary", text: `\u{1F4AC} ${pr.discussionSummary.trim()}` });
    for (const [label3, text2] of [["Details", pr.details], ["Discussion", pr.discussion]]) {
      if (!text2) continue;
      const details3 = card.createEl("details", { cls: "gb-missed-pr-more" });
      details3.createEl("summary", { text: label3 });
      details3.createDiv({ cls: "gb-missed-pr-text", text: text2.trim() });
    }
  }
}

// src/cracks-feed.ts
async function readCrackDays(app, dir, agentDir) {
  const files = crackFiles(app.vault.getMarkdownFiles().map((file) => file.path), dir);
  return Promise.all(
    files.map(async (found) => {
      const file = app.vault.getFileByPath(found.path);
      return parseCrackDay(found, file ? await app.vault.cachedRead(file) : "", import_obsidian3.parseYaml, agentDir);
    })
  );
}
async function setReviewedInFile(app, path, pr, reviewed) {
  const file = app.vault.getFileByPath(path);
  let found = false;
  if (file) {
    await app.vault.process(file, (note) => {
      const updated = setMissedPrReviewed(note, pr.pr, reviewed, import_obsidian3.parseYaml, import_obsidian3.stringifyYaml);
      found = updated !== void 0;
      return updated ?? note;
    });
  }
  if (!found) new import_obsidian3.Notice(`#${pr.pr} not found in ${path}`);
  return found;
}
function renderMissedPrsError(el3, error) {
  el3.createDiv({ cls: "gb-missed-prs-error", text: `gb-missed-prs: ${error instanceof Error ? error.message : error}` });
}
function renderCrackDays(app, el3, days, sourcePath) {
  const pending = days.filter((day) => day.error || day.prs.some((pr) => !pr.reviewed));
  if (!pending.length) return void el3.createDiv({ cls: "gb-missed-prs-empty", text: "Nothing unreviewed." });
  for (const { path, date, agentDir, prs, error } of pending) {
    const section2 = el3.createDiv({ cls: "gb-missed-prs-day" });
    const heading = section2.createEl("h3");
    const link = heading.createEl("a", { text: date, cls: "internal-link", href: "#" });
    link.onclick = (event) => {
      event.preventDefault();
      void app.workspace.openLinkText(path, sourcePath, event.metaKey || event.ctrlKey);
    };
    if (agentDir) heading.createSpan({ text: agentDir, cls: "gbr-tag" });
    if (error) renderMissedPrsError(section2, error);
    else renderMissedPrCards(section2, prs, { hideReviewed: true, setReviewed: (pr, reviewed) => setReviewedInFile(app, path, pr, reviewed) });
  }
}

// src/task-cards.ts
var import_obsidian4 = require("obsidian");
function actionButton(el3, icon, label3, cls, onclick) {
  const button2 = el3.createEl("button", { cls: `clickable-icon gb-task-action ${cls}`, attr: { "aria-label": label3 } });
  (0, import_obsidian4.setIcon)(button2, icon);
  button2.onclick = onclick;
}
function renderTaskCards(el3, tasks, actions) {
  const today = localDay();
  const list3 = el3.createDiv({ cls: "gb-tasks" });
  const snoozed = tasks.filter((task) => isSnoozed(task, today)).length;
  if (tasks.length === snoozed) list3.createDiv({ cls: "gb-tasks-empty", text: "No tasks." });
  tasks.forEach((task, index) => {
    if (isSnoozed(task, today)) return;
    const human = task.kind === "human";
    const cls = ["gb-task", task.status && `gb-task-${task.status}`, task.priority && `gb-task-${task.priority}`, human && "gb-task-human"];
    const card = list3.createDiv({ cls: cls.filter(Boolean).join(" ") });
    const main = card.createDiv({ cls: "gb-task-main" });
    main.createDiv({ cls: "gb-task-title", text: (task.description ?? task.prompt).trim() });
    const buttons = main.createDiv({ cls: "gb-task-actions" });
    if (actions.launch && !human) {
      const launch = actions.launch;
      actionButton(buttons, "rocket", "Launch", "gb-task-launch", () => launch(task, index, (on) => card.toggleClass("gb-task-pending", on)));
    }
    if (actions.refine) {
      const refine = actions.refine;
      actionButton(buttons, "wand-sparkles", "Discuss task refinement", "", () => refine(task));
    }
    actionButton(buttons, "moon", "Snooze", "", (event) => {
      const menu = new import_obsidian4.Menu();
      for (const [title, days] of SNOOZES) menu.addItem((item2) => item2.setTitle(title).onClick(() => actions.snooze(task, index, addDays(today, days))));
      menu.showAtMouseEvent(event);
    });
    actionButton(buttons, human ? "check" : "x", human ? "Done" : "Remove", "", () => actions.remove(task, index));
    const meta = card.createDiv({ cls: "gb-task-meta" });
    if (task.priority) meta.createSpan({ cls: "gb-task-priority", text: task.priority });
    if (task.status) meta.createSpan({ cls: "gb-task-status", text: task.status });
    if (human) meta.createSpan({ cls: "gb-task-for", text: "for John" });
    meta.createSpan({ text: task.agentDir });
    if (!human) meta.createSpan({ text: task.profile ?? actions.defaultProfile });
    const { record } = task;
    if (record) {
      const open = meta.createEl("a", { text: `${record.repo}/${record.kind}/${record.name}`, cls: "internal-link", href: "#" });
      open.onclick = (event) => {
        event.preventDefault();
        actions.openRecord(record, event.metaKey || event.ctrlKey);
      };
    }
    if (task.link) meta.createEl("a", { text: linkLabel(task.link), href: task.link, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
    if (!task.description) return;
    const prompt = card.createDiv({ cls: "gb-task-prompt", text: task.prompt.trim() });
    if (human) return;
    prompt.addClass("gb-task-prompt-folded");
    prompt.onclick = () => {
      if (!activeWindow.getSelection()?.isCollapsed) return;
      prompt.toggleClass("gb-task-prompt-folded", !prompt.hasClass("gb-task-prompt-folded"));
    };
  });
  if (snoozed) list3.createDiv({ cls: "gb-tasks-empty", text: `${snoozed} snoozed` });
}

// src/agents-view.ts
var AGENTS_VIEW = "galaxy-brain-agents";
var ALL_AGENTS = "*";
var AgentsView = class extends import_obsidian5.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.agent = ALL_AGENTS;
    this.tab = "tasks";
    this.scheduleRender = (0, import_obsidian5.debounce)(() => void this.render(), 300, true);
  }
  getViewType() {
    return AGENTS_VIEW;
  }
  getDisplayText() {
    return this.agent === ALL_AGENTS ? "Agents" : `${this.agent} agent`;
  }
  getIcon() {
    return "bot";
  }
  getState() {
    return { agent: this.agent, tab: this.tab };
  }
  async setState(state, result) {
    if (typeof state.agent === "string") this.agent = state.agent;
    if (state.tab === "tasks" || state.tab === "blockers" || state.tab === "cracks") this.tab = state.tab;
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      const agent = agentFromPath(file.path);
      if (agent && (file.path === tasksPath(agent) || file.path === agentLaunchersPath(agent)) || blockerFromPath(file.path) || isCrackFile(file.path)) this.scheduleRender();
    };
    this.registerEvent(this.app.vault.on("create", onChange));
    this.registerEvent(this.app.vault.on("modify", onChange));
    this.registerEvent(this.app.vault.on("delete", onChange));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      onChange(file);
      onChange({ path: oldPath });
    }));
    await this.render();
  }
  async render() {
    const dirs = await this.host.agentDirs();
    const profiles = await this.host.loadProfiles();
    const known = { profiles: profiles.map((profile) => profile.name), agentDirs: dirs };
    const all = !dirs.includes(this.agent);
    const shown = all ? dirs : [this.agent];
    const lists = await Promise.all(shown.map((dir) => this.readTasks(dir, known)));
    const routines = await Promise.all(shown.map((dir) => this.routinesFor(dir)));
    const blockers = await Promise.all(shown.map((dir) => this.readBlockers(dir)));
    const cracks = await Promise.all(shown.map((dir) => this.readCracks(dir, all)));
    const today = localDay();
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository", "gb-agents");
    const header = root.createDiv({ cls: "gb-agents-header" });
    header.createEl("h1", { text: all ? "Agents" : this.agent });
    const select = header.createEl("select", { cls: "dropdown" });
    select.createEl("option", { text: "All agents", value: ALL_AGENTS }).selected = all;
    for (const dir of dirs) select.createEl("option", { text: dir, value: dir }).selected = dir === this.agent;
    select.onchange = () => void this.showAgent(select.value, this.tab);
    const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh" } });
    (0, import_obsidian5.setIcon)(refresh, "refresh-cw");
    refresh.onclick = () => void this.render();
    if (all) {
      const busy = root.createDiv({ cls: "gb-agents-grid" });
      const quiet = root.createDiv({ cls: "gb-agents-grid gb-agents-grid-quiet" });
      shown.forEach((dir, i) => {
        const counts = agentCounts(lists[i].tasks, blockers[i].length, cracks[i] ? unreviewedCount(cracks[i]) : 0, today);
        this.renderTile(counts.length ? busy : quiet, dir, routines[i], counts);
      });
    } else {
      const bar2 = root.createDiv({ cls: "gb-agents-routines" });
      this.renderRoutineButtons(bar2, this.agent, routines[0], true);
      const file = this.app.vault.getFileByPath(tasksPath(this.agent));
      if (file) {
        const open = bar2.createEl("a", { text: "Open TASKS.md", cls: "internal-link", href: "#" });
        open.onclick = (event) => {
          event.preventDefault();
          void this.app.workspace.openLinkText(file.path, "", event.metaKey || event.ctrlKey);
        };
      }
    }
    const tasks = byPriority(lists.flatMap((list3) => list3.tasks));
    const allBlockers = blockers.flat();
    const hasCracks = cracks.some((days) => days !== void 0);
    const crackDays = cracks.flatMap((days) => days ?? []).sort((a, b) => b.date.localeCompare(a.date));
    if (this.tab === "cracks" && !hasCracks) this.tab = "tasks";
    const bar = root.createDiv({ cls: "gb-agents-tabs" });
    const tabs = [["tasks", "Tasks", tasks.filter((task) => !isSnoozed(task, today)).length], ["blockers", "Blockers", allBlockers.length]];
    if (hasCracks) tabs.push(["cracks", "Fell Through the Cracks", unreviewedCount(crackDays)]);
    for (const [id, label3, count] of tabs) {
      const button2 = bar.createEl("button", { text: label3, cls: `gb-agents-tab${id === this.tab ? " is-active" : ""}` });
      button2.createSpan({ text: String(count), cls: "gb-agents-tab-count" });
      button2.onclick = () => {
        this.tab = id;
        void this.render();
      };
    }
    if (this.tab === "blockers") return this.renderBlockers(root, allBlockers, all);
    if (this.tab === "cracks") return renderCrackDays(this.app, root, crackDays, "");
    for (const { source, error } of lists) {
      if (error) root.createDiv({ cls: "gb-tasks-error", text: `${tasksPath(source)}: ${error}` });
    }
    renderTaskCards(root, tasks, {
      defaultProfile: profiles[0]?.name ?? "",
      ...import_obsidian5.Platform.isDesktopApp ? {
        launch: (_task, i, pending) => void this.host.confirmTask(tasks[i], () => void this.remove(tasks[i]), tasks[i].agentDir, pending),
        refine: (task) => void this.host.refineTask(task)
      } : {},
      remove: (_task, i) => void this.remove(tasks[i]),
      snooze: (_task, i, day) => void this.snooze(tasks[i], day),
      openRecord: (record, newLeaf) => this.host.openTaskRecord(record, newLeaf)
    });
  }
  showAgent(agent, tab) {
    return this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent, tab } });
  }
  /** An agent on the landing page: opens it when clicked, routine icons, and a chip opening each tab with anything in it. */
  renderTile(grid, dir, routines, pending) {
    const tile = grid.createDiv({ cls: "gb-agent-tile" });
    tile.onclick = () => void this.showAgent(dir, this.tab);
    const head = tile.createDiv({ cls: "gb-agent-tile-head" });
    const name = head.createEl("a", { text: dir, cls: "gb-agent-name", href: "#" });
    name.onclick = (event) => event.preventDefault();
    const icons = head.createDiv({ cls: "gb-agent-tile-routines" });
    icons.onclick = (event) => event.stopPropagation();
    this.renderRoutineButtons(icons, dir, routines, false);
    if (!pending.length) return;
    const chips = tile.createDiv({ cls: "gb-agent-counts" });
    for (const { tab, label: label3 } of pending) {
      const chip = chips.createEl("button", { text: label3, cls: `gb-agent-count gb-agent-count-${tab}` });
      chip.onclick = (event) => {
        event.stopPropagation();
        void this.showAgent(dir, tab);
      };
    }
  }
  /** One card per blocker: its name (opening index.md), agent dir on the landing page, and condition. */
  renderBlockers(root, blockers, all) {
    const list3 = root.createDiv({ cls: "gb-tasks" });
    if (!blockers.length) return void list3.createDiv({ text: "No blockers.", cls: "gb-tasks-empty" });
    for (const blocker of blockers) {
      const card = list3.createDiv({ cls: "gb-task" });
      const head = card.createDiv({ cls: "gb-task-meta gb-blocker-head" });
      const link = head.createEl("a", { text: blocker.name, cls: "internal-link gb-blocker-name", href: "#" });
      link.onclick = (event) => {
        event.preventDefault();
        void this.app.workspace.openLinkText(`${blockersPath(blocker.agentDir)}/${blocker.name}/index.md`, "", event.metaKey || event.ctrlKey);
      };
      if (all) head.createSpan({ text: blocker.agentDir });
      if (blocker.condition) card.createDiv({ text: blocker.condition, cls: "gb-task-prompt" });
    }
  }
  /** A button per routine, with its label or icon only; desktop only. */
  renderRoutineButtons(el3, dir, routines, labelled) {
    if (!import_obsidian5.Platform.isDesktopApp) return;
    for (const routine of routines) {
      const button2 = el3.createEl("button", { cls: labelled ? "gb-agents-routine" : "clickable-icon", attr: { "aria-label": `${routine.label} \xB7 ${dir}: ${routine.task.prompt}` } });
      if (routine.icon) (0, import_obsidian5.setIcon)(button2, routine.icon);
      else button2.createSpan({ text: routine.emoji });
      if (labelled) button2.createSpan({ text: routine.label });
      button2.onclick = () => void this.host.confirmTask(routine.task, () => {
      }, routine.name);
    }
  }
  async routinesFor(dir) {
    const file = this.app.vault.getFileByPath(agentLaunchersPath(dir));
    return agentRoutines(file ? await this.app.vault.cachedRead(file) : null, dir);
  }
  async readBlockers(dir) {
    const folder = this.app.vault.getFolderByPath(blockersPath(dir));
    const names = (folder?.children ?? []).filter((child) => child instanceof import_obsidian5.TFolder).map((child) => child.name).sort();
    return Promise.all(
      names.map(async (name) => {
        const file = this.app.vault.getFileByPath(`${blockersPath(dir)}/${name}/condition.md`);
        return { agentDir: dir, name, condition: file ? (await this.app.vault.cachedRead(file)).trim() : "" };
      })
    );
  }
  /** The agent dir's the_cracks/ days, tagged with the dir on the landing page; undefined without the directory. */
  async readCracks(dir, tagged) {
    if (!this.app.vault.getFolderByPath(cracksPath(dir))) return void 0;
    return readCrackDays(this.app, cracksPath(dir), tagged ? dir : void 0);
  }
  async readTasks(dir, known) {
    const file = this.app.vault.getFileByPath(tasksPath(dir));
    return parseAgentTasks(dir, file ? await this.app.vault.cachedRead(file) : null, known, import_obsidian5.parseYaml);
  }
  async remove(task) {
    const file = this.app.vault.getFileByPath(tasksPath(task.source));
    if (!file) return void new import_obsidian5.Notice(`${tasksPath(task.source)} is gone`);
    let found = false;
    await this.app.vault.process(file, (note) => {
      const updated = removeTask(note, task, import_obsidian5.parseYaml, import_obsidian5.stringifyYaml);
      found = updated !== void 0;
      return updated ?? note;
    });
    if (!found) new import_obsidian5.Notice("Task already removed");
  }
  async snooze(task, day) {
    const file = this.app.vault.getFileByPath(tasksPath(task.source));
    if (!file) return void new import_obsidian5.Notice(`${tasksPath(task.source)} is gone`);
    let found = false;
    await this.app.vault.process(file, (note) => {
      const updated = snoozeTask(note, task, day, import_obsidian5.parseYaml, import_obsidian5.stringifyYaml);
      found = updated !== void 0;
      return updated ?? note;
    });
    if (!found) new import_obsidian5.Notice("Task already removed");
  }
};

// src/profiles.ts
var FALLBACK_PROFILES = [
  { name: "Claude", agent: "claude", args: [] },
  { name: "Codex", agent: "codex", args: [] }
];
var text = (value) => typeof value === "string" || typeof value === "number" ? String(value) : void 0;
function parseProfiles(data) {
  const entries = data?.profiles;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const name = text(entry?.name);
    const agent = entry?.agent;
    if (!name || agent !== "claude" && agent !== "codex") return [];
    const model = text(entry.model);
    const effort = text(entry.effort);
    const args = Array.isArray(entry.args) ? entry.args.map(String) : [];
    return [{ name, agent, ...model ? { model } : {}, ...effort ? { effort } : {}, args }];
  });
}
function profileArgs(profile) {
  const args = [];
  if (profile.agent === "claude") {
    if (profile.model) args.push("--model", profile.model);
    if (profile.effort) args.push("--effort", profile.effort);
  } else {
    if (profile.model) args.push("-m", profile.model);
    if (profile.effort) args.push("-c", `model_reasoning_effort="${profile.effort}"`);
  }
  return [...args, ...profile.args];
}
function defaultProfile(profiles, launcher) {
  return profiles.find((profile) => profile.name === launcher.profile) ?? profiles[0] ?? FALLBACK_PROFILES[0];
}

// src/environments.ts
var LOCAL_ENVIRONMENT = { name: "Local" };
var LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
var SAFE_HOST = /^[A-Za-z0-9_.@][A-Za-z0-9_.@-]*$/;
function parseEnvironments(data) {
  const entries = data?.environments;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const name = typeof entry?.name === "string" ? entry.name : void 0;
    if (!name) return [];
    const icon = typeof entry.icon === "string" ? { icon: entry.icon } : {};
    if (entry.host === void 0) return [{ name, ...icon }];
    const { host, vault } = entry;
    if (typeof host !== "string" || !SAFE_HOST.test(host) || typeof vault !== "string" || !vault.startsWith("/")) return [];
    return [{ name, host, vault: vault.replace(/\/+$/, ""), ...icon }];
  });
}
function defaultEnvironment(environments) {
  return environments[0] ?? LOCAL_ENVIRONMENT;
}
function launchArgv(environment, vaultRoot, args) {
  const script = `${vaultRoot}/${LAUNCH_SCRIPT}`;
  const { host, vault } = environment;
  if (!host || !vault) return [script, ...args];
  const rerooted = args.map((arg) => arg.split(`${vaultRoot}/`).join(`${vault}/`));
  return [script, "--host", host, "--vault", vault, ...rerooted];
}

// src/main.ts
init_records();

// src/diff-review-view.ts
var import_obsidian6 = require("obsidian");

// ../differential-review-lib/src/core/types.ts
var SNAPSHOT_SCHEMA_VERSION = 1;
var REVIEW_STATE_SCHEMA_VERSION = 1;
var FINGERPRINT_VERSION = "h1";

// ../differential-review-lib/node_modules/diff/libesm/diff/base.js
var Diff = class {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function() {
          callback(value);
        }, 0);
        return void 0;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    }
    let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(void 0);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path, added, removed, oldPosInc, options) {
    const last = path.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
      };
    } else {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last }
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(value, options) {
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0, newPos = 0, oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function(value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
};

// ../differential-review-lib/node_modules/diff/libesm/diff/character.js
var CharacterDiff = class extends Diff {
};
var characterDiff = new CharacterDiff();
function diffChars(oldStr, newStr, options) {
  return characterDiff.diff(oldStr, newStr, options);
}

// ../differential-review-lib/node_modules/diff/libesm/diff/line.js
var LineDiff = class extends Diff {
  constructor() {
    super(...arguments);
    this.tokenize = tokenize;
  }
  equals(left, right, options) {
    if (options.ignoreWhitespace) {
      if (!options.newlineIsToken || !left.includes("\n")) {
        left = left.trim();
      }
      if (!options.newlineIsToken || !right.includes("\n")) {
        right = right.trim();
      }
    } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
      if (left.endsWith("\n")) {
        left = left.slice(0, -1);
      }
      if (right.endsWith("\n")) {
        right = right.slice(0, -1);
      }
    }
    return super.equals(left, right, options);
  }
};
var lineDiff = new LineDiff();
function diffLines(oldStr, newStr, options) {
  return lineDiff.diff(oldStr, newStr, options);
}
function tokenize(value, options) {
  if (options.stripTrailingCr) {
    value = value.replace(/\r\n/g, "\n");
  }
  const retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (let i = 0; i < linesAndNewlines.length; i++) {
    const line = linesAndNewlines[i];
    if (i % 2 && !options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      retLines.push(line);
    }
  }
  return retLines;
}

// ../differential-review-lib/node_modules/diff/libesm/diff/array.js
var ArrayDiff = class extends Diff {
  tokenize(value) {
    return value.slice();
  }
  join(value) {
    return value;
  }
  removeEmpty(value) {
    return value;
  }
};
var arrayDiff = new ArrayDiff();
function diffArrays(oldArr, newArr, options) {
  return arrayDiff.diff(oldArr, newArr, options);
}

// ../differential-review-lib/node_modules/diff/libesm/patch/parse.js
function parsePatch(uniDiff) {
  const diffstr = uniDiff.split(/\n/), list3 = [];
  let i = 0;
  function isGitDiffHeader(line) {
    return /^diff --git /.test(line);
  }
  function isDiffHeader(line) {
    return isGitDiffHeader(line) || /^Index:\s/.test(line) || /^diff(?: -r \w+)+\s/.test(line);
  }
  function isFileHeader(line) {
    return /^(---|\+\+\+)\s/.test(line);
  }
  function isHunkHeader(line) {
    return /^@@\s/.test(line);
  }
  function parseIndex() {
    var _a;
    const index = {};
    index.hunks = [];
    list3.push(index);
    let seenDiffHeader = false;
    while (i < diffstr.length) {
      const line = diffstr[i];
      if (isFileHeader(line) || isHunkHeader(line)) {
        break;
      }
      if (isGitDiffHeader(line)) {
        if (seenDiffHeader) {
          return;
        }
        seenDiffHeader = true;
        index.isGit = true;
        const paths = parseGitDiffHeader(line);
        if (paths) {
          index.oldFileName = paths.oldFileName;
          index.newFileName = paths.newFileName;
        }
        i++;
        while (i < diffstr.length) {
          const extLine = diffstr[i];
          if (isFileHeader(extLine) || isHunkHeader(extLine) || isDiffHeader(extLine)) {
            break;
          }
          const renameFromMatch = /^rename from (.*)/.exec(extLine);
          if (renameFromMatch) {
            index.oldFileName = "a/" + unquoteIfQuoted(renameFromMatch[1]);
            index.isRename = true;
          }
          const renameToMatch = /^rename to (.*)/.exec(extLine);
          if (renameToMatch) {
            index.newFileName = "b/" + unquoteIfQuoted(renameToMatch[1]);
            index.isRename = true;
          }
          const copyFromMatch = /^copy from (.*)/.exec(extLine);
          if (copyFromMatch) {
            index.oldFileName = "a/" + unquoteIfQuoted(copyFromMatch[1]);
            index.isCopy = true;
          }
          const copyToMatch = /^copy to (.*)/.exec(extLine);
          if (copyToMatch) {
            index.newFileName = "b/" + unquoteIfQuoted(copyToMatch[1]);
            index.isCopy = true;
          }
          const newFileModeMatch = /^new file mode (\d+)/.exec(extLine);
          if (newFileModeMatch) {
            index.isCreate = true;
            index.newMode = newFileModeMatch[1];
          }
          const deletedFileModeMatch = /^deleted file mode (\d+)/.exec(extLine);
          if (deletedFileModeMatch) {
            index.isDelete = true;
            index.oldMode = deletedFileModeMatch[1];
          }
          const oldModeMatch = /^old mode (\d+)/.exec(extLine);
          if (oldModeMatch) {
            index.oldMode = oldModeMatch[1];
          }
          const newModeMatch = /^new mode (\d+)/.exec(extLine);
          if (newModeMatch) {
            index.newMode = newModeMatch[1];
          }
          if (/^Binary files /.test(extLine)) {
            index.isBinary = true;
          }
          i++;
        }
        continue;
      } else if (isDiffHeader(line)) {
        if (seenDiffHeader) {
          return;
        }
        seenDiffHeader = true;
        const headerMatch = /^(?:Index:|diff(?: -r \w+)+)\s+/.exec(line);
        if (headerMatch) {
          index.index = line.substring(headerMatch[0].length).trim();
        }
      }
      i++;
    }
    parseFileHeader(index);
    parseFileHeader(index);
    if (index.oldFileName === void 0 !== (index.newFileName === void 0)) {
      throw new Error("Missing " + (index.oldFileName !== void 0 ? '"+++ ..."' : '"--- ..."') + " file header for " + ((_a = index.oldFileName) !== null && _a !== void 0 ? _a : index.newFileName));
    }
    while (i < diffstr.length) {
      const line = diffstr[i];
      if (isDiffHeader(line) || isFileHeader(line) || /^===================================================================/.test(line)) {
        break;
      } else if (isHunkHeader(line)) {
        index.hunks.push(parseHunk());
      } else {
        i++;
      }
    }
  }
  function parseGitDiffHeader(line) {
    const rest = line.substring("diff --git ".length);
    if (rest.startsWith('"')) {
      const oldPath = parseQuotedFileName(rest);
      if (oldPath === null) {
        return null;
      }
      const afterOld = rest.substring(oldPath.rawLength + 1);
      let newFileName;
      if (afterOld.startsWith('"')) {
        const newPath = parseQuotedFileName(afterOld);
        if (newPath === null) {
          return null;
        }
        newFileName = newPath.fileName;
      } else {
        newFileName = afterOld;
      }
      return {
        oldFileName: oldPath.fileName,
        newFileName
      };
    }
    const quoteIdx = rest.indexOf('"');
    if (quoteIdx > 0) {
      const oldFileName = rest.substring(0, quoteIdx - 1);
      const newPath = parseQuotedFileName(rest.substring(quoteIdx));
      if (newPath === null) {
        return null;
      }
      return {
        oldFileName,
        newFileName: newPath.fileName
      };
    }
    if (rest.startsWith("a/")) {
      const splits = [];
      let idx = 0;
      while (true) {
        idx = rest.indexOf(" b/", idx + 1);
        if (idx === -1) {
          break;
        }
        splits.push(idx);
      }
      if (splits.length > 0) {
        const mid = splits[Math.floor(splits.length / 2)];
        return {
          oldFileName: rest.substring(0, mid),
          newFileName: rest.substring(mid + 1)
        };
      }
    }
    return null;
  }
  function unquoteIfQuoted(s) {
    if (s.startsWith('"')) {
      const parsed = parseQuotedFileName(s);
      if (parsed) {
        return parsed.fileName;
      }
    }
    return s;
  }
  function parseQuotedFileName(s) {
    if (!s.startsWith('"')) {
      return null;
    }
    let result = "";
    let j = 1;
    while (j < s.length) {
      if (s[j] === '"') {
        return { fileName: result, rawLength: j + 1 };
      }
      if (s[j] === "\\" && j + 1 < s.length) {
        j++;
        switch (s[j]) {
          case "a":
            result += "\x07";
            break;
          case "b":
            result += "\b";
            break;
          case "f":
            result += "\f";
            break;
          case "n":
            result += "\n";
            break;
          case "r":
            result += "\r";
            break;
          case "t":
            result += "	";
            break;
          case "v":
            result += "\v";
            break;
          case "\\":
            result += "\\";
            break;
          case '"':
            result += '"';
            break;
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7": {
            if (j + 2 >= s.length || s[j + 1] < "0" || s[j + 1] > "7" || s[j + 2] < "0" || s[j + 2] > "7") {
              return null;
            }
            const bytes = [parseInt(s.substring(j, j + 3), 8)];
            j += 3;
            while (s[j] === "\\" && s[j + 1] >= "0" && s[j + 1] <= "7") {
              if (j + 3 >= s.length || s[j + 2] < "0" || s[j + 2] > "7" || s[j + 3] < "0" || s[j + 3] > "7") {
                return null;
              }
              bytes.push(parseInt(s.substring(j + 1, j + 4), 8));
              j += 4;
            }
            result += new TextDecoder("utf-8").decode(new Uint8Array(bytes));
            continue;
          }
          // Note that in C, there are also three kinds of hex escape sequences:
          // - \xhh
          // - \uhhhh
          // - \Uhhhhhhhh
          // We do not bother to parse them here because, so far as we know,
          // they are never emitted by any tools that generate unified diff
          // format diffs, and so for now jsdiff does not consider them legal.
          default:
            return null;
        }
      } else {
        result += s[j];
      }
      j++;
    }
    return null;
  }
  function parseFileHeader(index) {
    const fileHeaderMatch = /^(---|\+\+\+)\s+/.exec(diffstr[i]);
    if (fileHeaderMatch) {
      const prefix = fileHeaderMatch[1], data = diffstr[i].substring(3).trim().split("	", 2), header = (data[1] || "").trim();
      let fileName = data[0];
      if (fileName.startsWith('"')) {
        fileName = unquoteIfQuoted(fileName);
      } else {
        fileName = fileName.replace(/\\\\/g, "\\");
      }
      if (prefix === "---") {
        index.oldFileName = fileName;
        index.oldHeader = header;
      } else {
        index.newFileName = fileName;
        index.newHeader = header;
      }
      i++;
    }
  }
  function parseHunk() {
    var _a;
    const chunkHeaderIndex = i, chunkHeaderLine = diffstr[i++], chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    const hunk = {
      oldStart: +chunkHeader[1],
      oldLines: typeof chunkHeader[2] === "undefined" ? 1 : +chunkHeader[2],
      newStart: +chunkHeader[3],
      newLines: typeof chunkHeader[4] === "undefined" ? 1 : +chunkHeader[4],
      lines: []
    };
    if (hunk.oldLines === 0) {
      hunk.oldStart += 1;
    }
    if (hunk.newLines === 0) {
      hunk.newStart += 1;
    }
    let addCount = 0, removeCount = 0;
    for (; i < diffstr.length && (removeCount < hunk.oldLines || addCount < hunk.newLines || ((_a = diffstr[i]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"))); i++) {
      const operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? " " : diffstr[i][0];
      if (operation === "+" || operation === "-" || operation === " " || operation === "\\") {
        hunk.lines.push(diffstr[i]);
        if (operation === "+") {
          addCount++;
        } else if (operation === "-") {
          removeCount++;
        } else if (operation === " ") {
          addCount++;
          removeCount++;
        }
      } else {
        throw new Error(`Hunk at line ${chunkHeaderIndex + 1} contained invalid line ${diffstr[i]}`);
      }
    }
    if (!addCount && hunk.newLines === 1) {
      hunk.newLines = 0;
    }
    if (!removeCount && hunk.oldLines === 1) {
      hunk.oldLines = 0;
    }
    if (addCount !== hunk.newLines) {
      throw new Error("Added line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    }
    if (removeCount !== hunk.oldLines) {
      throw new Error("Removed line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    }
    if (i < diffstr.length && diffstr[i] && /^[+ -]/.test(diffstr[i]) && !isFileHeader(diffstr[i])) {
      throw new Error("Hunk at line " + (chunkHeaderIndex + 1) + " has more lines than expected (expected " + hunk.oldLines + " old lines and " + hunk.newLines + " new lines)");
    }
    return hunk;
  }
  while (i < diffstr.length) {
    parseIndex();
  }
  return list3;
}

// ../differential-review-lib/node_modules/diff/libesm/patch/create.js
function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  let optionsObj;
  if (!options) {
    optionsObj = {};
  } else if (typeof options === "function") {
    optionsObj = { callback: options };
  } else {
    optionsObj = options;
  }
  if (typeof optionsObj.context === "undefined") {
    optionsObj.context = 4;
  }
  const context = optionsObj.context;
  if (optionsObj.newlineIsToken) {
    throw new Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");
  }
  if (!optionsObj.callback) {
    return diffLinesResultToPatch(diffLines(oldStr, newStr, optionsObj));
  } else {
    const { callback } = optionsObj;
    diffLines(oldStr, newStr, Object.assign(Object.assign({}, optionsObj), { callback: (diff) => {
      const patch = diffLinesResultToPatch(diff);
      callback(patch);
    } }));
  }
  function diffLinesResultToPatch(diff) {
    if (!diff) {
      return;
    }
    diff.push({ value: "", lines: [] });
    function contextLines(lines) {
      return lines.map(function(entry) {
        return " " + entry;
      });
    }
    const hunks = [];
    let oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
    for (let i = 0; i < diff.length; i++) {
      const current = diff[i], lines = current.lines || splitLines(current.value);
      current.lines = lines;
      if (current.added || current.removed) {
        if (!oldRangeStart) {
          const prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;
          if (prev) {
            curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        }
        for (const line of lines) {
          curRange.push((current.added ? "+" : "-") + line);
        }
        if (current.added) {
          newLine += lines.length;
        } else {
          oldLine += lines.length;
        }
      } else {
        if (oldRangeStart) {
          if (lines.length <= context * 2 && i < diff.length - 2) {
            for (const line of contextLines(lines)) {
              curRange.push(line);
            }
          } else {
            const contextSize = Math.min(lines.length, context);
            for (const line of contextLines(lines.slice(0, contextSize))) {
              curRange.push(line);
            }
            const hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange
            };
            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        }
        oldLine += lines.length;
        newLine += lines.length;
      }
    }
    for (const hunk of hunks) {
      for (let i = 0; i < hunk.lines.length; i++) {
        if (hunk.lines[i].endsWith("\n")) {
          hunk.lines[i] = hunk.lines[i].slice(0, -1);
        } else {
          hunk.lines.splice(i + 1, 0, "\\ No newline at end of file");
          i++;
        }
      }
    }
    return {
      oldFileName,
      newFileName,
      oldHeader,
      newHeader,
      hunks
    };
  }
}
function splitLines(text2) {
  const hasTrailingNl = text2.endsWith("\n");
  const result = text2.split("\n").map((line) => line + "\n");
  if (hasTrailingNl) {
    result.pop();
  } else {
    result.push(result.pop().slice(0, -1));
  }
  return result;
}

// ../differential-review-lib/src/core/sha256.ts
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function utf8(text2) {
  const out = [];
  for (const ch of text2) {
    let cp = ch.codePointAt(0);
    if (cp >= 55296 && cp <= 57343) cp = 65533;
    if (cp < 128) out.push(cp);
    else if (cp < 2048) out.push(192 | cp >> 6, 128 | cp & 63);
    else if (cp < 65536) out.push(224 | cp >> 12, 128 | cp >> 6 & 63, 128 | cp & 63);
    else out.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63);
  }
  return out;
}
function sha256Hex(text2) {
  const bytes = utf8(text2);
  const bitLength = bytes.length * 8;
  bytes.push(128);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLength / 4294967296);
  const lo = bitLength >>> 0;
  bytes.push(hi >>> 24 & 255, hi >>> 16 & 255, hi >>> 8 & 255, hi & 255);
  bytes.push(lo >>> 24 & 255, lo >>> 16 & 255, lo >>> 8 & 255, lo & 255);
  const h = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => x >>> n | x << 32 - n;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = bytes[j] << 24 | bytes[j + 1] << 16 | bytes[j + 2] << 8 | bytes[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const t1 = hh + s1 + ch + K[i] + w[i] >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = s0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}

// ../differential-review-lib/src/core/diff.ts
var HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
var INDEX_LINE = /^index ([0-9a-f]+)\.\.([0-9a-f]+)/m;
function hash(text2) {
  return `${FINGERPRINT_VERSION}:${sha256Hex(text2).slice(0, 16)}`;
}
function splitDiffSections(diffText) {
  if (!diffText.trim()) return [];
  const lines = diffText.split("\n");
  const sections = [];
  for (const line of lines) {
    if (line.startsWith("diff --git ") || sections.length === 0) sections.push([]);
    sections[sections.length - 1].push(line);
  }
  return sections.map((s) => s.join("\n").replace(/\n+$/, "") + "\n");
}
function stripPrefix(name, prefix) {
  if (!name || name === "/dev/null") return null;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
function normalizeChangedLines(lines) {
  const out = [];
  let afterChange = false;
  for (const line of lines) {
    const marker = line[0];
    if (marker === "+" || marker === "-") {
      out.push(marker + line.slice(1).replace(/\s+$/, ""));
      afterChange = true;
    } else if (marker === "\\") {
      if (afterChange) out.push("\\ No newline at end of file");
    } else {
      afterChange = false;
    }
  }
  return out;
}
function contentHashOf(changed) {
  return hash(changed.join("\n"));
}
function hunkId(path, contentHash, occurrence) {
  return hash(`${path}\0${contentHash}\0${occurrence}`);
}
function isWhitespaceOnly(changed) {
  const squash = (marker) => changed.filter((l) => l[0] === marker).map((l) => l.slice(1).replace(/\s+/g, "")).join("");
  return squash("-") === squash("+");
}
function fileStatus(p) {
  if (p.isCreate) return "added";
  if (p.isDelete) return "deleted";
  if (p.isRename) return "renamed";
  if (p.isCopy) return "copied";
  return "modified";
}
function metaUnit(file, hasText) {
  const modeChanged = !!file.oldMode && !!file.newMode && file.oldMode !== file.newMode;
  const moved = file.status === "renamed" || file.status === "copied";
  if (!file.binary && !moved && !modeChanged && hasText) return null;
  const lines = [
    `# status ${file.status}`,
    `# old ${file.oldPath ?? "-"} ${file.oldMode ?? "-"}`,
    `# new ${file.newPath ?? "-"} ${file.newMode ?? "-"}`
  ];
  const parts = [];
  if (moved) parts.push(`${file.status} ${file.oldPath} \u2192 ${file.newPath}`);
  if (modeChanged) parts.push(`mode ${file.oldMode} \u2192 ${file.newMode}`);
  if (file.binary) {
    lines.push(`# binary ${file.oldBlob ?? "-"}..${file.newBlob ?? "-"}`);
    parts.push("binary file changed");
  }
  if (!parts.length) parts.push(file.status === "deleted" ? "deleted empty file" : `${file.status} empty file`);
  return { header: parts.join(", "), oldStart: 0, oldLines: 0, newStart: 0, newLines: 0, lines, kind: "meta" };
}
function parseSection(text2) {
  const patches = parsePatch(text2);
  if (patches.length !== 1) throw new Error(`expected one file per diff section, got ${patches.length}`);
  const p = patches[0];
  const oldPath = stripPrefix(p.oldFileName, "a/");
  const newPath = stripPrefix(p.newFileName, "b/");
  const blobs = INDEX_LINE.exec(text2);
  const status = fileStatus(p);
  const base = {
    path: newPath ?? oldPath,
    oldPath: status === "added" ? null : oldPath,
    newPath: status === "deleted" ? null : newPath,
    status,
    binary: !!p.isBinary,
    oldMode: p.oldMode ?? null,
    newMode: p.newMode ?? null,
    oldBlob: blobs?.[1] ?? null,
    newBlob: blobs?.[2] ?? null
  };
  const headers = text2.split("\n").filter((l) => l.startsWith("@@"));
  if (headers.length !== p.hunks.length) throw new Error(`hunk header mismatch in ${base.path}`);
  const raw = p.hunks.map((h, i) => {
    const m = HUNK_HEADER.exec(headers[i]);
    if (!m) throw new Error(`bad hunk header: ${headers[i]}`);
    return {
      header: headers[i],
      oldStart: Number(m[1]),
      oldLines: m[2] === void 0 ? 1 : Number(m[2]),
      newStart: Number(m[3]),
      newLines: m[4] === void 0 ? 1 : Number(m[4]),
      lines: h.lines,
      kind: "text"
    };
  });
  const meta = metaUnit(base, raw.length > 0);
  if (meta) raw.unshift(meta);
  const seen = /* @__PURE__ */ new Map();
  const hunks = raw.map((h) => {
    const changed = h.kind === "meta" ? h.lines : normalizeChangedLines(h.lines);
    const contentHash = contentHashOf(changed);
    const occurrence = seen.get(contentHash) ?? 0;
    seen.set(contentHash, occurrence + 1);
    return {
      id: hunkId(base.path, contentHash, occurrence),
      contentHash,
      occurrence,
      kind: h.kind,
      header: h.header,
      oldStart: h.oldStart,
      oldLines: h.oldLines,
      newStart: h.newStart,
      newLines: h.newLines,
      added: changed.filter((l) => l[0] === "+").length,
      removed: changed.filter((l) => l[0] === "-").length,
      whitespaceOnly: h.kind === "text" && isWhitespaceOnly(changed),
      lines: h.lines,
      changed
    };
  });
  return { ...base, basePath: base.oldPath, text: text2, hunks };
}
function parseDiff(diffText) {
  return splitDiffSections(diffText).map(parseSection);
}

// ../differential-review-lib/src/core/match.ts
var FUZZY_THRESHOLD = 0.6;
var CHAR_DIFF_LIMIT = 2e4;
var MAX_EDIT_LENGTH = 2e3;
function hunkRefs(files) {
  return files.flatMap(
    (f) => f.hunks.map((h) => ({
      id: h.id,
      contentHash: h.contentHash,
      kind: h.kind,
      path: f.path,
      basePath: f.basePath,
      changed: h.changed
    }))
  );
}
function sameFile(a, b) {
  return a.path === b.path || a.basePath !== null && a.basePath === b.basePath;
}
function dice(common, a, b) {
  return a + b === 0 ? 1 : 2 * common / (a + b);
}
function lineSimilarity(a, b) {
  const parts = diffArrays(a, b, { maxEditLength: MAX_EDIT_LENGTH });
  if (!parts) return 0;
  const common = parts.filter((p) => !p.added && !p.removed).reduce((n, p) => n + p.count, 0);
  return dice(common, a.length, b.length);
}
function similarity(a, b) {
  const ta = a.join("\n");
  const tb = b.join("\n");
  if (ta === tb) return 1;
  if (ta.length + tb.length > CHAR_DIFF_LIMIT) return lineSimilarity(a, b);
  const parts = diffChars(ta, tb, { maxEditLength: MAX_EDIT_LENGTH });
  if (!parts) return lineSimilarity(a, b);
  const common = parts.filter((p) => !p.added && !p.removed).reduce((n, p) => n + p.value.length, 0);
  return dice(common, ta.length, tb.length);
}
var similarityCache = /* @__PURE__ */ new Map();
var SIMILARITY_CACHE_LIMIT = 1e5;
function cachedSimilarity(a, b) {
  if (!a.contentHash || !b.contentHash) return similarity(a.changed, b.changed);
  const key2 = `${a.contentHash}\0${b.contentHash}`;
  let sim = similarityCache.get(key2);
  if (sim === void 0) {
    if (similarityCache.size >= SIMILARITY_CACHE_LIMIT) similarityCache.clear();
    sim = similarity(a.changed, b.changed);
    similarityCache.set(key2, sim);
  }
  return sim;
}
function matchHunks(oldRefs, newRefs, threshold = FUZZY_THRESHOLD) {
  const pairs2 = [];
  const usedOld = /* @__PURE__ */ new Set();
  const usedNew = /* @__PURE__ */ new Set();
  const take = (i, j, match, sim) => {
    usedOld.add(i);
    usedNew.add(j);
    pairs2.push({ oldId: oldRefs[i].id, newId: newRefs[j].id, match, similarity: sim });
  };
  const oldById = /* @__PURE__ */ new Map();
  oldRefs.forEach((r, i) => oldById.set(r.id, i));
  newRefs.forEach((r, j) => {
    const i = oldById.get(r.id);
    if (i !== void 0 && !usedOld.has(i)) take(i, j, "exact", 1);
  });
  newRefs.forEach((r, j) => {
    if (usedNew.has(j)) return;
    const i = oldRefs.findIndex((o, k) => !usedOld.has(k) && o.contentHash === r.contentHash && sameFile(o, r));
    if (i >= 0) take(i, j, "moved", 1);
  });
  const candidates = [];
  newRefs.forEach((r, j) => {
    if (usedNew.has(j)) return;
    oldRefs.forEach((o, i) => {
      if (usedOld.has(i) || o.kind !== r.kind || !sameFile(o, r) || !o.changed || !r.changed) return;
      const sim = cachedSimilarity(o, r);
      if (sim >= threshold || r.kind === "meta") candidates.push({ i, j, sim });
    });
  });
  candidates.sort((a, b) => b.sim - a.sim || a.j - b.j || a.i - b.i);
  for (const c of candidates) {
    if (!usedOld.has(c.i) && !usedNew.has(c.j)) take(c.i, c.j, "fuzzy", c.sim);
  }
  return {
    pairs: pairs2,
    added: newRefs.filter((_, j) => !usedNew.has(j)).map((r) => r.id),
    removed: oldRefs.filter((_, i) => !usedOld.has(i)).map((r) => r.id)
  };
}
function toHunkMatches(newRefs, result) {
  const byNew = new Map(result.pairs.map((p) => [p.newId, p]));
  return newRefs.map((r) => {
    const p = byNew.get(r.id);
    return p ? { id: r.id, previousId: p.oldId, match: p.match, similarity: round(p.similarity) } : { id: r.id, previousId: null, match: "new", similarity: 0 };
  });
}
function round(n) {
  return Math.round(n * 1e3) / 1e3;
}

// ../differential-review-lib/src/core/snapshot.ts
var parsedCache = /* @__PURE__ */ new WeakMap();
function verifyFingerprints(stored, parsed) {
  const ids = (files) => files.flatMap((f) => f.hunks.map((h) => h.id)).join(",");
  if (ids(stored) !== ids(parsed)) {
    throw new Error(`stored fingerprints don't match this parser (${FINGERPRINT_VERSION}); rebuild or bump the fingerprint version`);
  }
}
function cachedParse(owner) {
  let files = parsedCache.get(owner);
  if (!files) {
    files = parseDiff(owner.diff);
    if (owner.files) verifyFingerprints(owner.files, files);
    parsedCache.set(owner, files);
  }
  return files;
}
function snapshotFiles(snapshot) {
  return cachedParse(snapshot);
}
function commitFiles(commit) {
  return cachedParse(commit);
}
function commitKey(commit) {
  return commit.patchId ?? `sha:${commit.sha}`;
}
function sortSnapshots(snapshots) {
  return [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

// ../differential-review-lib/src/core/queries.ts
function commitLineage(snapshots, from, sha) {
  const byId2 = new Map(snapshots.map((s) => [s.id, s]));
  const steps = [];
  let snapshot = from;
  let current = sha;
  while (snapshot.mapping) {
    const entry = snapshot.mapping.commits.find((c) => c.sha === current);
    const prev = byId2.get(snapshot.mapping.previousSnapshotId);
    if (!entry?.previousSha || !prev) break;
    const commit = prev.commits.find((c) => c.sha === entry.previousSha);
    if (!commit) break;
    steps.push({ snapshot: prev, commit });
    snapshot = prev;
    current = commit.sha;
  }
  return steps;
}
function changesBetween(snapshots, from, to) {
  const oldRefs = hunkRefs(snapshotFiles(from));
  const newRefs = hunkRefs(snapshotFiles(to));
  const result = matchHunks(oldRefs, newRefs);
  const used = /* @__PURE__ */ new Set();
  const commits = to.commits.map((c) => {
    const same = from.commits.find((p) => !used.has(p.sha) && p.sha === c.sha) ?? (c.patchId !== null && from.commits.find((p) => !used.has(p.sha) && p.patchId === c.patchId));
    if (same) {
      used.add(same.sha);
      return { sha: c.sha, change: "unchanged", previousSha: same.sha };
    }
    const ancestor = commitLineage(snapshots, to, c.sha).find((step) => step.snapshot.id === from.id);
    if (ancestor && !used.has(ancestor.commit.sha)) {
      used.add(ancestor.commit.sha);
      return { sha: c.sha, change: "modified", previousSha: ancestor.commit.sha };
    }
    return { sha: c.sha, change: "added", previousSha: null };
  });
  return {
    from: from.id,
    to: to.id,
    hunks: toHunkMatches(newRefs, result),
    droppedHunks: result.removed,
    commits,
    droppedCommits: from.commits.filter((c) => !used.has(c.sha)).map((c) => c.sha)
  };
}
var HUNK_DELTA = { exact: "carried", moved: "carried", fuzzy: "changed", new: "new" };
function commitDelta(entry) {
  if (!entry?.method) return "new";
  if (entry.patchIdChanged) return "changed";
  return entry.method === "sha" ? "same" : "rebased";
}
function summarizeSnapshot(snapshot) {
  const mapping = snapshot.mapping;
  const commits = { same: 0, rebased: 0, changed: 0, new: 0, dropped: mapping?.droppedCommits.length ?? 0 };
  const flaggedCommits = [];
  for (const commit of snapshot.commits) {
    const entry = mapping?.commits.find((c) => c.sha === commit.sha);
    const delta = commitDelta(entry);
    commits[delta]++;
    if (delta === "changed" || delta === "new") {
      const differing = entry?.hunks?.filter((h) => HUNK_DELTA[h.match] !== "carried").length ?? null;
      flaggedCommits.push({ sha: commit.sha, subject: commit.subject, change: delta, differingHunks: differing });
    }
  }
  const hunks = { carried: 0, changed: 0, new: 0, dropped: mapping?.droppedHunks.length ?? 0 };
  if (mapping) {
    for (const h of mapping.hunks) hunks[HUNK_DELTA[h.match]]++;
  } else {
    hunks.new = snapshot.files.reduce((n, f) => n + f.hunks.length, 0);
  }
  return { previousSnapshotId: mapping?.previousSnapshotId ?? null, commits, hunks, flaggedCommits };
}

// ../differential-review-lib/src/core/review-state.ts
function emptyReviewState() {
  return { schemaVersion: REVIEW_STATE_SCHEMA_VERSION, kind: "differential-review-state", updatedAt: null, hunks: {}, commits: {} };
}
function parseReviewState(json2) {
  const s = json2;
  if (!s || s.kind !== "differential-review-state") throw new Error("not a differential-review state file");
  if (s.schemaVersion !== REVIEW_STATE_SCHEMA_VERSION) {
    throw new Error(`unsupported review-state schemaVersion ${s.schemaVersion}`);
  }
  return { ...emptyReviewState(), ...s, hunks: { ...s.hunks }, commits: { ...s.commits } };
}
function findHunkPath(snapshot, id) {
  for (const f of snapshot.files) if (f.hunks.some((h) => h.id === id)) return f.path;
  throw new Error(`hunk ${id} not in snapshot ${snapshot.id}`);
}
function markHunksReviewed(state, snapshot, ids, now) {
  const hunks = { ...state.hunks };
  for (const id of ids) hunks[id] = { snapshotId: snapshot.id, path: findHunkPath(snapshot, id), reviewedAt: now };
  return { ...state, updatedAt: now, hunks };
}
function unmarkHunks(state, ids, now) {
  const hunks = { ...state.hunks };
  for (const id of ids) delete hunks[id];
  return { ...state, updatedAt: now, hunks };
}
function markFileReviewed(state, snapshot, path, now) {
  const file = snapshot.files.find((f) => f.path === path);
  if (!file) throw new Error(`file ${path} not in snapshot ${snapshot.id}`);
  return markHunksReviewed(state, snapshot, file.hunks.map((h) => h.id), now);
}
function signOffCommit(state, snapshot, sha, now, note) {
  const commit = snapshot.commits.find((c) => c.sha === sha);
  if (!commit) throw new Error(`commit ${sha} not in snapshot ${snapshot.id}`);
  const record = { sha, subject: commit.subject, snapshotId: snapshot.id, signedOffAt: now, ...note ? { note } : {} };
  return { ...state, updatedAt: now, commits: { ...state.commits, [commitKey(commit)]: record } };
}
function revokeCommitSignoff(state, key2, now) {
  const commits = { ...state.commits };
  delete commits[key2];
  return { ...state, updatedAt: now, commits };
}

// ../differential-review-lib/src/core/derive.ts
function zero() {
  return { reviewed: 0, new: 0, changed: 0 };
}
function reviewedRefs(state, byId2) {
  return Object.entries(state.hunks).map(([id, rec]) => {
    const snap = byId2.get(rec.snapshotId);
    for (const file of snap ? snapshotFiles(snap) : []) {
      const hunk = file.hunks.find((h) => h.id === id);
      if (hunk) {
        return { id, contentHash: hunk.contentHash, kind: hunk.kind, path: file.path, basePath: file.basePath, changed: hunk.changed };
      }
    }
    return { id, contentHash: "", kind: "text", path: rec.path, basePath: null, changed: null };
  });
}
function fileState(counts, total) {
  if (counts.reviewed === total) return "reviewed";
  if (counts.new === total) return "new";
  return "changed";
}
function deriveReview(current, state, snapshots) {
  const byId2 = new Map(snapshots.map((s) => [s.id, s]));
  byId2.set(current.id, current);
  const all = [...byId2.values()];
  const counts = { hunks: zero(), files: zero(), commits: zero() };
  const parsed = snapshotFiles(current);
  const refs = hunkRefs(parsed);
  const old = reviewedRefs(state, byId2);
  const result = matchHunks(old, refs);
  const pairByNew = new Map(result.pairs.map((p) => [p.newId, p]));
  const files = parsed.map((file) => {
    const fileCounts = zero();
    const hunks = file.hunks.map((h) => {
      const pair = pairByNew.get(h.id);
      const hunkState = !pair ? "new" : pair.match === "fuzzy" ? "changed" : "reviewed";
      fileCounts[hunkState]++;
      counts.hunks[hunkState]++;
      const reviewedAs = pair ? { hunkId: pair.oldId, snapshotId: state.hunks[pair.oldId].snapshotId, similarity: pair.similarity } : null;
      return { id: h.id, path: file.path, kind: h.kind, state: hunkState, reviewedAs };
    });
    const fs = fileState(fileCounts, hunks.length);
    counts.files[fs]++;
    return { path: file.path, state: fs, hunks, counts: fileCounts };
  });
  const commits = current.commits.map((commit) => {
    const key2 = commitKey(commit);
    let review = { sha: commit.sha, subject: commit.subject, key: key2, state: "new", signoff: null, differingHunks: null };
    if (state.commits[key2]) {
      review = { ...review, state: "reviewed", signoff: { ...state.commits[key2], key: key2 } };
    } else {
      const signed = commitLineage(all, current, commit.sha).find((step) => state.commits[commitKey(step.commit)]);
      if (signed) {
        const signedKey = commitKey(signed.commit);
        const n = hunkRefs(commitFiles(commit));
        const m = matchHunks(hunkRefs(commitFiles(signed.commit)), n);
        const same = new Set(m.pairs.filter((p) => p.match !== "fuzzy").map((p) => p.newId));
        review = {
          ...review,
          state: "changed",
          signoff: { ...state.commits[signedKey], key: signedKey },
          differingHunks: n.map((r) => r.id).filter((id) => !same.has(id))
        };
      }
    }
    counts.commits[review.state]++;
    return review;
  });
  return { snapshotId: current.id, files, commits, counts };
}

// ../differential-review-lib/src/core/storage.ts
var SNAPSHOTS_DIR = "snapshots";
var REVIEW_STATE_FILE = "review-state.json";
function join(...parts) {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}
function snapshotsDir(reviewDir) {
  return join(reviewDir, SNAPSHOTS_DIR);
}
function snapshotPath(reviewDir, id) {
  return join(snapshotsDir(reviewDir), `${id}.json`);
}
function reviewStatePath(reviewDir) {
  return join(reviewDir, REVIEW_STATE_FILE);
}
function parseSnapshot(json2) {
  const s = json2;
  if (!s || s.kind !== "differential-review-snapshot") throw new Error("not a differential-review snapshot");
  if (s.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new Error(`unsupported snapshot schemaVersion ${s.schemaVersion}`);
  if (s.fingerprintVersion !== FINGERPRINT_VERSION) throw new Error(`unsupported fingerprintVersion ${s.fingerprintVersion}`);
  return s;
}
function snapshotReader(adapter, reviewDir) {
  return {
    async listSnapshotIds() {
      const names = await adapter.listFiles(snapshotsDir(reviewDir));
      return names.filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
    },
    async readSnapshot(id) {
      const path = snapshotPath(reviewDir, id);
      try {
        return parseSnapshot(JSON.parse(await adapter.read(path)));
      } catch (e) {
        throw new Error(`unreadable snapshot ${path}: ${e.message}`);
      }
    }
  };
}
async function readReviewState(adapter, reviewDir) {
  const path = reviewStatePath(reviewDir);
  if (!await adapter.exists(path)) return null;
  return parseReviewState(JSON.parse(await adapter.read(path)));
}
function reviewStateStore(adapter, reviewDir) {
  return {
    readReviewState: () => readReviewState(adapter, reviewDir),
    async writeReviewState(state) {
      await adapter.write(reviewStatePath(reviewDir), JSON.stringify(state, null, 2) + "\n");
    }
  };
}
async function updateReviewState(store, mutate) {
  const next = mutate(await store.readReviewState() ?? emptyReviewState());
  await store.writeReviewState(next);
  return next;
}

// ../differential-review-lib/src/core/annotations.ts
function sourceLines(hunk, side) {
  let line = side === "old" ? hunk.oldStart : hunk.newStart;
  const out = [];
  for (const text2 of hunk.lines) {
    if (text2[0] === " " || text2[0] === (side === "old" ? "-" : "+")) out.push({ line: line++, text: text2.slice(1) });
  }
  return out;
}
function validRange(range) {
  return Array.isArray(range) && range.length === 2 && range.every((n) => Number.isSafeInteger(n) && n > 0) && range[0] <= range[1];
}
function annotationId(id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id)) throw new Error("invalid annotation id");
  return id;
}
function nonempty(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`annotation ${field} must be non-empty text`);
}
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid annotation object");
  return value;
}
function parseOrigin(value) {
  const o = object(value);
  for (const key2 of ["snapshotId", "path", "hunkId"]) nonempty(o[key2], key2);
  if (o.basePath !== null && typeof o.basePath !== "string") throw new Error("invalid annotation basePath");
  if (o.side !== "old" && o.side !== "new") throw new Error("invalid annotation side");
  if (!validRange(o.range)) throw new Error("invalid annotation range");
  if (typeof o.quote !== "string" || o.quote.split("\n").length !== o.range[1] - o.range[0] + 1) throw new Error("invalid annotation quote");
  for (const key2 of ["contextBefore", "contextAfter"]) {
    if (!Array.isArray(o[key2]) || !o[key2].every((v) => typeof v === "string")) throw new Error(`invalid annotation ${key2}`);
  }
  return o;
}
function parseReviewThread(value) {
  const t = object(value);
  if (t.kind !== "differential-review-thread") throw new Error("not a differential-review thread");
  if (t.schemaVersion !== 1) throw new Error(`unsupported thread schemaVersion ${t.schemaVersion}`);
  nonempty(t.id, "id");
  annotationId(t.id);
  for (const key2 of ["body", "author", "createdAt"]) nonempty(t[key2], key2);
  parseOrigin(t.origin);
  if (t.status !== "open" && t.status !== "resolved") throw new Error("invalid thread status");
  if (t.resolvedAt !== null && typeof t.resolvedAt !== "string") throw new Error("invalid resolvedAt");
  return t;
}
function parseReviewReply(value) {
  const r = object(value);
  if (r.kind !== "differential-review-reply") throw new Error("not a differential-review reply");
  if (r.schemaVersion !== 1) throw new Error(`unsupported reply schemaVersion ${r.schemaVersion}`);
  for (const key2 of ["id", "threadId", "body", "author", "createdAt"]) nonempty(r[key2], key2);
  annotationId(r.id);
  annotationId(r.threadId);
  if (r.source !== "human" && r.source !== "agent") throw new Error("invalid reply source");
  if (r.snapshotId !== void 0) nonempty(r.snapshotId, "snapshotId");
  return r;
}
function captureReviewOrigin(snapshot, target) {
  if (!validRange(target.range)) throw new Error("invalid annotation range");
  const file = snapshotFiles(snapshot).find((f) => f.path === target.path);
  const hunk = file?.hunks.find((h) => h.id === target.hunkId && h.kind === "text");
  if (!file || !hunk) throw new Error("annotation target is not a text hunk in this snapshot");
  const lines = sourceLines(hunk, target.side);
  const start = lines.findIndex((l) => l.line === target.range[0]);
  const end = lines.findIndex((l) => l.line === target.range[1]);
  if (start < 0 || end < start) throw new Error("annotation range must be within one diff hunk");
  return {
    snapshotId: snapshot.id,
    path: file.path,
    basePath: file.basePath,
    hunkId: hunk.id,
    side: target.side,
    range: [...target.range],
    quote: lines.slice(start, end + 1).map((l) => l.text).join("\n"),
    contextBefore: lines.slice(Math.max(0, start - 3), start).map((l) => l.text),
    contextAfter: lines.slice(end + 1, end + 4).map((l) => l.text)
  };
}
function createReviewThread(input) {
  return parseReviewThread({ ...input, schemaVersion: 1, kind: "differential-review-thread", status: "open", resolvedAt: null });
}
function setThreadResolved(thread, resolved, now) {
  return { ...thread, status: resolved ? "resolved" : "open", resolvedAt: resolved ? now : null };
}
function locateThread(thread, current, snapshots) {
  const o = thread.origin;
  const file = snapshotFiles(current).find((f) => f.path === o.path || o.basePath !== null && f.basePath === o.basePath);
  if (!file) return { state: "unmapped", path: null, hunkId: null, range: null };
  const quoted = o.quote.split("\n");
  const previous = snapshots.find((s) => s.id === o.snapshotId);
  if (current.id === o.snapshotId || previous && previous.diff === current.diff) {
    const hunk = file.hunks.find((h) => h.id === o.hunkId);
    const selected = hunk && sourceLines(hunk, o.side).filter((l) => l.line >= o.range[0] && l.line <= o.range[1]);
    if (selected && selected.length === quoted.length && selected.every((l, i) => l.text === quoted[i])) {
      return { state: current.id === o.snapshotId ? "active" : "moved", path: file.path, hunkId: o.hunkId, range: [...o.range] };
    }
  }
  const matches = [];
  for (const h of file.hunks.filter((h2) => h2.kind === "text")) {
    const lines = sourceLines(h, o.side);
    for (let i = 0; i + quoted.length <= lines.length; i++) {
      if (!quoted.every((text2, j) => lines[i + j].text === text2)) continue;
      const before = lines.slice(Math.max(0, i - o.contextBefore.length), i).map((l) => l.text);
      const after = lines.slice(i + quoted.length, i + quoted.length + o.contextAfter.length).map((l) => l.text);
      matches.push({ hunkId: h.id, range: [lines[i].line, lines[i + quoted.length - 1].line], context: JSON.stringify(before) === JSON.stringify(o.contextBefore) && JSON.stringify(after) === JSON.stringify(o.contextAfter) });
    }
  }
  const contextual = matches.filter((m) => m.context);
  const certain = matches.length === 1 ? matches[0] : contextual.length === 1 ? contextual[0] : null;
  if (certain) return {
    state: current.id === o.snapshotId ? "active" : "moved",
    path: file.path,
    hunkId: certain.hunkId,
    range: certain.range
  };
  const oldFile = previous && snapshotFiles(previous).find((f) => f.path === o.path);
  const pair = oldFile && matchHunks(hunkRefs([oldFile]), hunkRefs([file])).pairs.find((p) => p.oldId === o.hunkId);
  return { state: "outdated", path: file.path, hunkId: pair?.newId ?? null, range: null };
}
function deriveThreads(annotations, current, snapshots) {
  return annotations.threads.map((thread) => ({
    thread,
    replies: annotations.replies.filter((r) => r.threadId === thread.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    placement: locateThread(thread, current, snapshots)
  })).sort((a, b) => a.thread.createdAt.localeCompare(b.thread.createdAt) || a.thread.id.localeCompare(b.thread.id));
}

// ../differential-review-lib/src/core/view.ts
function snapshotLabel(s) {
  return `${s.phase} @ ${s.head.slice(0, 8)} (${s.createdAt.slice(0, 16).replace("T", " ")}Z)`;
}
var HUNK_DELTA2 = { exact: "carried", moved: "carried", fuzzy: "changed", new: "new" };
function buildReviewView(snapshots, state, options = {}) {
  const ordered = sortSnapshots(snapshots);
  const current = ordered[ordered.length - 1];
  if (!current) return null;
  const hideReviewed = options.hideReviewed ?? false;
  const requested = options.baseline?.kind === "snapshot" ? options.baseline.snapshotId : null;
  const baselineSnapshot = requested && ordered.find((s) => s.id === requested && s !== current) || null;
  const baseline = baselineSnapshot ? { kind: "snapshot", snapshotId: baselineSnapshot.id } : { kind: "review" };
  const review = deriveReview(current, state ?? emptyReviewState(), ordered);
  const changes = baselineSnapshot ? changesBetween(ordered, baselineSnapshot, current) : null;
  const hunkChange = new Map(changes?.hunks.map((h) => [h.id, h]));
  const commitChange = new Map(changes?.commits.map((c) => [c.sha, c.change]));
  const threads = deriveThreads(options.annotations ?? { threads: [], replies: [] }, current, ordered);
  const openHunks = new Set(threads.filter((t) => t.thread.status === "open").map((t) => t.placement.hunkId));
  const hidden = { files: 0, hunks: 0, commits: 0 };
  const parsed = new Map(snapshotFiles(current).map((f) => [f.path, f]));
  const files = review.files.map((file) => {
    const source = parsed.get(file.path);
    const hunks = file.hunks.map((h, i) => {
      const index = source.hunks[i];
      const match = hunkChange.get(h.id);
      const sinceBaseline = match ? HUNK_DELTA2[match.match] : null;
      const visible2 = openHunks.has(h.id) || !(hideReviewed && h.state === "reviewed") && sinceBaseline !== "carried";
      if (!visible2) hidden.hunks++;
      return {
        ...h,
        header: index.header,
        added: index.added,
        removed: index.removed,
        whitespaceOnly: index.whitespaceOnly,
        sinceBaseline,
        baselineHunkId: match?.match === "fuzzy" ? match.previousId : null,
        visible: visible2
      };
    });
    const visible = hunks.some((h) => h.visible);
    if (!visible) hidden.files++;
    const { path, oldPath, status, binary: binary2 } = source;
    return { path, oldPath, status, binary: binary2, state: file.state, counts: file.counts, hunks, visible };
  });
  const bySha = new Map(current.commits.map((c) => [c.sha, c]));
  const commits = review.commits.map((c) => {
    const commit = bySha.get(c.sha);
    const sinceBaseline = commitChange.get(c.sha) ?? null;
    const visible = !(hideReviewed && c.state === "reviewed") && sinceBaseline !== "unchanged";
    if (!visible) hidden.commits++;
    return {
      ...c,
      message: commit.message,
      author: commit.author,
      authorDate: commit.authorDate,
      sinceBaseline,
      contextOnly: c.state === "changed" && c.differingHunks?.length === 0,
      visible
    };
  });
  return {
    threads,
    snapshot: current,
    snapshots: ordered,
    summary: summarizeSnapshot(current),
    baseline,
    baselineSnapshot,
    baselineOptions: ordered.filter((s) => s !== current).reverse().map((s) => ({ id: s.id, label: snapshotLabel(s) })),
    files,
    commits,
    counts: review.counts,
    needsRelook: commits.some((c) => c.state === "changed"),
    hidden
  };
}
function findHunk(files, id) {
  for (const file of files) {
    const hunk = file.hunks.find((h) => h.id === id);
    if (hunk) return { file, hunk };
  }
  return null;
}
function fileHeader(file) {
  const lines = file.text.split("\n");
  const end = lines.findIndex((l) => l.startsWith("@@"));
  return lines.slice(0, end < 0 ? lines.length : end).join("\n").replace(/\n+$/, "");
}
function hunkPatch({ file, hunk }) {
  if (hunk.kind === "meta") return null;
  return `${fileHeader(file)}
${hunk.header}
${hunk.lines.join("\n")}
`;
}
function previousHunk(view, hunk, against) {
  const ref = against === "reviewed" ? hunk.state === "changed" && hunk.reviewedAs && { snapshotId: hunk.reviewedAs.snapshotId, id: hunk.reviewedAs.hunkId } : view.baselineSnapshot && hunk.baselineHunkId && { snapshotId: view.baselineSnapshot.id, id: hunk.baselineHunkId };
  const snapshot = ref && view.snapshots.find((s) => s.id === ref.snapshotId);
  return snapshot && ref ? findHunk(snapshotFiles(snapshot), ref.id) : null;
}
function interdiffPatch(path, before, after) {
  const text2 = (h) => h.lines.filter((l) => l[0] === "+" || l[0] === "-").join("\n") + "\n";
  const patch = structuredPatch(path, path, text2(before), text2(after), "", "", { context: 3 });
  const out = [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`];
  for (const h of patch.hunks) {
    out.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`, ...h.lines);
  }
  return out.join("\n") + "\n";
}
function commitHunks(commit, ids) {
  const files = commitFiles(commit);
  if (!ids) return files;
  const keep = new Set(ids);
  return files.map((f) => ({ ...f, hunks: f.hunks.filter((h) => keep.has(h.id)) })).filter((f) => f.hunks.length > 0);
}

// ../differential-review-lib/src/core/annotation-storage.ts
function annotationDir(reviewDir, kind) {
  return `${reviewDir.replace(/\/$/, "")}/annotations/${kind}`;
}
function annotationPath(reviewDir, kind, id) {
  return `${annotationDir(reviewDir, kind)}/${annotationId(id)}.json`;
}
async function readAnnotations(adapter, reviewDir) {
  async function read(kind, parse3) {
    const names = (await adapter.listFiles(annotationDir(reviewDir, kind))).filter((name) => name.endsWith(".json")).sort();
    return Promise.all(names.map(async (name) => {
      const path = annotationPath(reviewDir, kind, name.slice(0, -5));
      try {
        const value = parse3(JSON.parse(await adapter.read(path)));
        if (value.id !== name.slice(0, -5)) throw new Error("id does not match filename");
        return value;
      } catch (e) {
        throw new Error(`unreadable annotation ${path}: ${e.message}`);
      }
    }));
  }
  const [threads, replies] = await Promise.all([read("threads", parseReviewThread), read("replies", parseReviewReply)]);
  return { threads, replies };
}
function annotationStore(adapter, reviewDir) {
  return {
    read: () => readAnnotations(adapter, reviewDir),
    writeThread: (thread) => adapter.write(annotationPath(reviewDir, "threads", thread.id), JSON.stringify(parseReviewThread(thread), null, 2) + "\n"),
    async writeReply(reply) {
      const path = annotationPath(reviewDir, "replies", reply.id);
      if (await adapter.exists(path)) throw new Error(`reply already exists: ${reply.id}`);
      await adapter.write(path, JSON.stringify(parseReviewReply(reply), null, 2) + "\n");
    }
  };
}

// src/diff-review-view.ts
init_records();

// src/diff-review-model.ts
var AUTO_EXPAND_LINES = 400;
function visibleLineCount(view) {
  const files = snapshotFiles(view.snapshot);
  let n = 0;
  for (const file of view.files) {
    for (const hunk of file.hunks) if (hunk.visible) n += findHunk(files, hunk.id)?.hunk.lines.length ?? 0;
  }
  return n;
}
function summaryText(summary, previousLabel) {
  const { commits, hunks } = summary;
  if (!summary.previousSnapshotId) return null;
  if (!commits.changed && !commits.new && !commits.dropped && !hunks.changed && !hunks.new && !hunks.dropped) return null;
  const parts = (counts) => Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ");
  return `Since ${previousLabel ?? summary.previousSnapshotId}: commits ${parts(commits) || "none"}; hunks ${parts(hunks) || "none"}.`;
}
function reviewMetaText(view) {
  const { snapshot } = view;
  return `${snapshotLabel(snapshot)} vs ${snapshot.base.ref} (merge-base ${snapshot.base.mergeBase.slice(0, 8)}) \xB7 ${view.snapshots.length} snapshot(s)`;
}
function hunkShown(view, hunk, openThreadsOnly) {
  return hunk.visible && (!openThreadsOnly || view.threads.some((t) => t.thread.status === "open" && t.placement.hunkId === hunk.id));
}
function fileShown(view, file, openThreadsOnly) {
  return file.visible && (!openThreadsOnly || view.threads.some((t) => t.thread.status === "open" && t.placement.path === file.path && t.placement.hunkId));
}
function toggleHunkReview(state, snapshot, hunk, now) {
  return hunk.state === "reviewed" ? unmarkHunks(state, [hunk.id, ...hunk.reviewedAs ? [hunk.reviewedAs.hunkId] : []], now) : markHunksReviewed(state, snapshot, [hunk.id], now);
}
function toggleFileReview(state, snapshot, file, now) {
  return file.state === "reviewed" ? unmarkHunks(state, file.hunks.flatMap((h) => [h.id, ...h.reviewedAs ? [h.reviewedAs.hunkId] : []]), now) : markFileReviewed(state, snapshot, file.path, now);
}
function toggleCommitReview(state, snapshot, commit, now) {
  return commit.state === "reviewed" && commit.signoff ? revokeCommitSignoff(state, commit.signoff.key, now) : signOffCommit(state, snapshot, commit.sha, now);
}
async function refreshSnapshots(reader, known) {
  const snapshots = new Map(known);
  const ids = await reader.listSnapshotIds();
  for (const id of [...snapshots.keys()]) if (!ids.includes(id)) snapshots.delete(id);
  for (const id of ids) if (!snapshots.has(id)) snapshots.set(id, await reader.readSnapshot(id));
  return snapshots;
}
async function saveNewThread(store, origin, body) {
  await store.writeThread(createReviewThread({ id: crypto.randomUUID(), origin, body, author: "John", createdAt: (/* @__PURE__ */ new Date()).toISOString() }));
}
async function saveReply(store, threadId, body, snapshotId) {
  const annotations = await store.read();
  if (!annotations.threads.some((t) => t.id === threadId)) throw new Error("This thread no longer exists; reload the review.");
  await store.writeReply(parseReviewReply({ schemaVersion: 1, kind: "differential-review-reply", id: crypto.randomUUID(), threadId, body, author: "John", source: "human", createdAt: (/* @__PURE__ */ new Date()).toISOString(), ...snapshotId ? { snapshotId } : {} }));
}
async function saveResolved(store, threadId, resolved) {
  const annotations = await store.read();
  const thread = annotations.threads.find((t) => t.id === threadId);
  if (!thread) throw new Error("This thread no longer exists; reload the review.");
  await store.writeThread(setThreadResolved(thread, resolved, (/* @__PURE__ */ new Date()).toISOString()));
}

// node_modules/diff2html/lib-esm/types.js
var LineType;
(function(LineType2) {
  LineType2["INSERT"] = "insert";
  LineType2["DELETE"] = "delete";
  LineType2["CONTEXT"] = "context";
})(LineType || (LineType = {}));
var OutputFormatType = {
  LINE_BY_LINE: "line-by-line",
  SIDE_BY_SIDE: "side-by-side"
};
var LineMatchingType = {
  LINES: "lines",
  WORDS: "words",
  NONE: "none"
};
var DiffStyleType = {
  WORD: "word",
  CHAR: "char"
};
var ColorSchemeType;
(function(ColorSchemeType2) {
  ColorSchemeType2["AUTO"] = "auto";
  ColorSchemeType2["DARK"] = "dark";
  ColorSchemeType2["LIGHT"] = "light";
})(ColorSchemeType || (ColorSchemeType = {}));

// node_modules/diff2html/lib-esm/utils.js
var specials = [
  "-",
  "[",
  "]",
  "/",
  "{",
  "}",
  "(",
  ")",
  "*",
  "+",
  "?",
  ".",
  "\\",
  "^",
  "$",
  "|"
];
var regex = RegExp("[" + specials.join("\\") + "]", "g");
function escapeForRegExp(str) {
  return str.replace(regex, "\\$&");
}
function unifyPath(path) {
  return path ? path.replace(/\\/g, "/") : path;
}
function hashCode(text2) {
  let i, chr, len;
  let hash2 = 0;
  for (i = 0, len = text2.length; i < len; i++) {
    chr = text2.charCodeAt(i);
    hash2 = (hash2 << 5) - hash2 + chr;
    hash2 |= 0;
  }
  return hash2;
}
function max(arr) {
  const length = arr.length;
  let max2 = -Infinity;
  for (let i = 0; i < length; i++) {
    max2 = Math.max(max2, arr[i]);
  }
  return max2;
}

// node_modules/diff2html/lib-esm/diff-parser.js
function getExtension(filename, language) {
  const filenameParts = filename.split(".");
  return filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : language;
}
function startsWithAny(str, prefixes) {
  return prefixes.reduce((startsWith, prefix) => startsWith || str.startsWith(prefix), false);
}
var baseDiffFilenamePrefixes = ["a/", "b/", "i/", "w/", "c/", "o/"];
function getFilename(line, linePrefix, extraPrefix) {
  const prefixes = extraPrefix !== void 0 ? [...baseDiffFilenamePrefixes, extraPrefix] : baseDiffFilenamePrefixes;
  const FilenameRegExp = linePrefix ? new RegExp(`^${escapeForRegExp(linePrefix)} "?(.+?)"?$`) : new RegExp('^"?(.+?)"?$');
  const [, filename = ""] = FilenameRegExp.exec(line) || [];
  const matchingPrefix = prefixes.find((p) => filename.indexOf(p) === 0);
  const fnameWithoutPrefix = matchingPrefix ? filename.slice(matchingPrefix.length) : filename;
  return fnameWithoutPrefix.replace(/\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? [+-]\d{4}.*$/, "");
}
function getSrcFilename(line, srcPrefix) {
  return getFilename(line, "---", srcPrefix);
}
function getDstFilename(line, dstPrefix) {
  return getFilename(line, "+++", dstPrefix);
}
function parse(diffInput, config = {}) {
  const files = [];
  let currentFile = null;
  let currentBlock = null;
  let oldLine = null;
  let oldLine2 = null;
  let newLine = null;
  let possibleOldName = null;
  let possibleNewName = null;
  const oldFileNameHeader = "--- ";
  const newFileNameHeader = "+++ ";
  const hunkHeaderPrefix = "@@";
  const oldMode = /^old mode (\d{6})/;
  const newMode = /^new mode (\d{6})/;
  const deletedFileMode = /^deleted file mode (\d{6})/;
  const newFileMode = /^new file mode (\d{6})/;
  const copyFrom = /^copy from "?(.+)"?/;
  const copyTo = /^copy to "?(.+)"?/;
  const renameFrom = /^rename from "?(.+)"?/;
  const renameTo = /^rename to "?(.+)"?/;
  const similarityIndex = /^similarity index (\d+)%/;
  const dissimilarityIndex = /^dissimilarity index (\d+)%/;
  const index = /^index ([\da-z]+)\.\.([\da-z]+)\s*(\d{6})?/;
  const binaryFiles = /^Binary files (.*) and (.*) differ/;
  const binaryDiff = /^GIT binary patch/;
  const combinedIndex = /^index ([\da-z]+),([\da-z]+)\.\.([\da-z]+)/;
  const combinedMode = /^mode (\d{6}),(\d{6})\.\.(\d{6})/;
  const combinedNewFile = /^new file mode (\d{6})/;
  const combinedDeletedFile = /^deleted file mode (\d{6}),(\d{6})/;
  const diffLines2 = diffInput.replace(/\\ No newline at end of file/g, "").replace(/\r\n?/g, "\n").split("\n");
  function saveBlock() {
    if (currentBlock !== null && currentFile !== null) {
      currentFile.blocks.push(currentBlock);
      currentBlock = null;
    }
  }
  function saveFile() {
    if (currentFile !== null) {
      if (!currentFile.oldName && possibleOldName !== null) {
        currentFile.oldName = possibleOldName;
      }
      if (!currentFile.newName && possibleNewName !== null) {
        currentFile.newName = possibleNewName;
      }
      if (currentFile.newName) {
        files.push(currentFile);
        currentFile = null;
      }
    }
    possibleOldName = null;
    possibleNewName = null;
  }
  function startFile() {
    saveBlock();
    saveFile();
    currentFile = {
      blocks: [],
      deletedLines: 0,
      addedLines: 0
    };
  }
  function startBlock(line) {
    saveBlock();
    let values;
    if (currentFile !== null) {
      if (values = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@.*/.exec(line)) {
        currentFile.isCombined = false;
        oldLine = parseInt(values[1], 10);
        newLine = parseInt(values[2], 10);
      } else if (values = /^@@@ -(\d+)(?:,\d+)? -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@@.*/.exec(line)) {
        currentFile.isCombined = true;
        oldLine = parseInt(values[1], 10);
        oldLine2 = parseInt(values[2], 10);
        newLine = parseInt(values[3], 10);
      } else {
        if (line.startsWith(hunkHeaderPrefix)) {
          console.error("Failed to parse lines, starting in 0!");
        }
        oldLine = 0;
        newLine = 0;
        currentFile.isCombined = false;
      }
    }
    currentBlock = {
      lines: [],
      oldStartLine: oldLine,
      oldStartLine2: oldLine2,
      newStartLine: newLine,
      header: line
    };
  }
  function createLine(line) {
    if (currentFile === null || currentBlock === null || oldLine === null || newLine === null)
      return;
    const currentLine = {
      content: line
    };
    const addedPrefixes = currentFile.isCombined ? ["+ ", " +", "++"] : ["+"];
    const deletedPrefixes = currentFile.isCombined ? ["- ", " -", "--"] : ["-"];
    if (startsWithAny(line, addedPrefixes)) {
      currentFile.addedLines++;
      currentLine.type = LineType.INSERT;
      currentLine.oldNumber = void 0;
      currentLine.newNumber = newLine++;
    } else if (startsWithAny(line, deletedPrefixes)) {
      currentFile.deletedLines++;
      currentLine.type = LineType.DELETE;
      currentLine.oldNumber = oldLine++;
      currentLine.newNumber = void 0;
    } else {
      currentLine.type = LineType.CONTEXT;
      currentLine.oldNumber = oldLine++;
      currentLine.newNumber = newLine++;
    }
    currentBlock.lines.push(currentLine);
  }
  function existHunkHeader(line, lineIdx) {
    let idx = lineIdx;
    while (idx < diffLines2.length - 3) {
      if (line.startsWith("diff")) {
        return false;
      }
      if (diffLines2[idx].startsWith(oldFileNameHeader) && diffLines2[idx + 1].startsWith(newFileNameHeader) && diffLines2[idx + 2].startsWith(hunkHeaderPrefix)) {
        return true;
      }
      idx++;
    }
    return false;
  }
  diffLines2.forEach((line, lineIndex) => {
    if (!line || line.startsWith("*")) {
      return;
    }
    let values;
    const prevLine = diffLines2[lineIndex - 1];
    const nxtLine = diffLines2[lineIndex + 1];
    const afterNxtLine = diffLines2[lineIndex + 2];
    if (line.startsWith("diff --git") || line.startsWith("diff --combined")) {
      startFile();
      const gitDiffStart = /^diff --git "?([a-ciow]\/.+)"? "?([a-ciow]\/.+)"?/;
      if (values = gitDiffStart.exec(line)) {
        possibleOldName = getFilename(values[1], void 0, config.dstPrefix);
        possibleNewName = getFilename(values[2], void 0, config.srcPrefix);
      }
      if (currentFile === null) {
        throw new Error("Where is my file !!!");
      }
      currentFile.isGitDiff = true;
      return;
    }
    if (line.startsWith("Binary files") && !(currentFile === null || currentFile === void 0 ? void 0 : currentFile.isGitDiff)) {
      startFile();
      const unixDiffBinaryStart = /^Binary files "?([a-ciow]\/.+)"? and "?([a-ciow]\/.+)"? differ/;
      if (values = unixDiffBinaryStart.exec(line)) {
        possibleOldName = getFilename(values[1], void 0, config.dstPrefix);
        possibleNewName = getFilename(values[2], void 0, config.srcPrefix);
      }
      if (currentFile === null) {
        throw new Error("Where is my file !!!");
      }
      currentFile.isBinary = true;
      return;
    }
    if (!currentFile || !currentFile.isGitDiff && currentFile && line.startsWith(oldFileNameHeader) && nxtLine.startsWith(newFileNameHeader) && afterNxtLine.startsWith(hunkHeaderPrefix)) {
      startFile();
    }
    if (currentFile === null || currentFile === void 0 ? void 0 : currentFile.isTooBig) {
      return;
    }
    if (currentFile && (typeof config.diffMaxChanges === "number" && currentFile.addedLines + currentFile.deletedLines > config.diffMaxChanges || typeof config.diffMaxLineLength === "number" && line.length > config.diffMaxLineLength)) {
      currentFile.isTooBig = true;
      currentFile.addedLines = 0;
      currentFile.deletedLines = 0;
      currentFile.blocks = [];
      currentBlock = null;
      const message = typeof config.diffTooBigMessage === "function" ? config.diffTooBigMessage(files.length) : "Diff too big to be displayed";
      startBlock(message);
      return;
    }
    if (line.startsWith(oldFileNameHeader) && nxtLine.startsWith(newFileNameHeader) || line.startsWith(newFileNameHeader) && prevLine.startsWith(oldFileNameHeader)) {
      if (currentFile && !currentFile.oldName && line.startsWith("--- ") && (values = getSrcFilename(line, config.srcPrefix))) {
        currentFile.oldName = values;
        currentFile.language = getExtension(currentFile.oldName, currentFile.language);
        return;
      }
      if (currentFile && !currentFile.newName && line.startsWith("+++ ") && (values = getDstFilename(line, config.dstPrefix))) {
        currentFile.newName = values;
        currentFile.language = getExtension(currentFile.newName, currentFile.language);
        return;
      }
    }
    if (currentFile && (line.startsWith(hunkHeaderPrefix) || currentFile.isGitDiff && currentFile.oldName && currentFile.newName && !currentBlock)) {
      startBlock(line);
      return;
    }
    if (currentBlock && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
      createLine(line);
      return;
    }
    const doesNotExistHunkHeader = !existHunkHeader(line, lineIndex);
    if (currentFile === null) {
      throw new Error("Where is my file !!!");
    }
    if (values = oldMode.exec(line)) {
      currentFile.oldMode = values[1];
    } else if (values = newMode.exec(line)) {
      currentFile.newMode = values[1];
    } else if (values = deletedFileMode.exec(line)) {
      currentFile.deletedFileMode = values[1];
      currentFile.isDeleted = true;
    } else if (values = newFileMode.exec(line)) {
      currentFile.newFileMode = values[1];
      currentFile.isNew = true;
    } else if (values = copyFrom.exec(line)) {
      if (doesNotExistHunkHeader) {
        currentFile.oldName = values[1];
      }
      currentFile.isCopy = true;
    } else if (values = copyTo.exec(line)) {
      if (doesNotExistHunkHeader) {
        currentFile.newName = values[1];
      }
      currentFile.isCopy = true;
    } else if (values = renameFrom.exec(line)) {
      if (doesNotExistHunkHeader) {
        currentFile.oldName = values[1];
      }
      currentFile.isRename = true;
    } else if (values = renameTo.exec(line)) {
      if (doesNotExistHunkHeader) {
        currentFile.newName = values[1];
      }
      currentFile.isRename = true;
    } else if (values = binaryFiles.exec(line)) {
      currentFile.isBinary = true;
      currentFile.oldName = getFilename(values[1], void 0, config.srcPrefix);
      currentFile.newName = getFilename(values[2], void 0, config.dstPrefix);
      startBlock("Binary file");
    } else if (binaryDiff.test(line)) {
      currentFile.isBinary = true;
      startBlock(line);
    } else if (values = similarityIndex.exec(line)) {
      currentFile.unchangedPercentage = parseInt(values[1], 10);
    } else if (values = dissimilarityIndex.exec(line)) {
      currentFile.changedPercentage = parseInt(values[1], 10);
    } else if (values = index.exec(line)) {
      currentFile.checksumBefore = values[1];
      currentFile.checksumAfter = values[2];
      if (values[3])
        currentFile.mode = values[3];
    } else if (values = combinedIndex.exec(line)) {
      currentFile.checksumBefore = [values[2], values[3]];
      currentFile.checksumAfter = values[1];
    } else if (values = combinedMode.exec(line)) {
      currentFile.oldMode = [values[2], values[3]];
      currentFile.newMode = values[1];
    } else if (values = combinedNewFile.exec(line)) {
      currentFile.newFileMode = values[1];
      currentFile.isNew = true;
    } else if (values = combinedDeletedFile.exec(line)) {
      currentFile.deletedFileMode = values[1];
      currentFile.isDeleted = true;
    }
  });
  saveBlock();
  saveFile();
  return files;
}

// node_modules/diff/libesm/diff/base.js
var Diff2 = class {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function() {
          callback(value);
        }, 0);
        return void 0;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    }
    let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(void 0);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path, added, removed, oldPosInc, options) {
    const last = path.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
      };
    } else {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last }
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(value, options) {
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0, newPos = 0, oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function(value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
};

// node_modules/diff/libesm/diff/character.js
var CharacterDiff2 = class extends Diff2 {
};
var characterDiff2 = new CharacterDiff2();
function diffChars2(oldStr, newStr, options) {
  return characterDiff2.diff(oldStr, newStr, options);
}

// node_modules/diff/libesm/util/string.js
function longestCommonPrefix(str1, str2) {
  let i;
  for (i = 0; i < str1.length && i < str2.length; i++) {
    if (str1[i] != str2[i]) {
      return str1.slice(0, i);
    }
  }
  return str1.slice(0, i);
}
function longestCommonSuffix(str1, str2) {
  let i;
  if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
    return "";
  }
  for (i = 0; i < str1.length && i < str2.length; i++) {
    if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) {
      return str1.slice(-i);
    }
  }
  return str1.slice(-i);
}
function replacePrefix(string2, oldPrefix, newPrefix) {
  if (string2.slice(0, oldPrefix.length) != oldPrefix) {
    throw Error(`string ${JSON.stringify(string2)} doesn't start with prefix ${JSON.stringify(oldPrefix)}; this is a bug`);
  }
  return newPrefix + string2.slice(oldPrefix.length);
}
function replaceSuffix(string2, oldSuffix, newSuffix) {
  if (!oldSuffix) {
    return string2 + newSuffix;
  }
  if (string2.slice(-oldSuffix.length) != oldSuffix) {
    throw Error(`string ${JSON.stringify(string2)} doesn't end with suffix ${JSON.stringify(oldSuffix)}; this is a bug`);
  }
  return string2.slice(0, -oldSuffix.length) + newSuffix;
}
function removePrefix(string2, oldPrefix) {
  return replacePrefix(string2, oldPrefix, "");
}
function removeSuffix(string2, oldSuffix) {
  return replaceSuffix(string2, oldSuffix, "");
}
function maximumOverlap(string1, string2) {
  return string2.slice(0, overlapCount(string1, string2));
}
function overlapCount(a, b) {
  let startA = 0;
  if (a.length > b.length) {
    startA = a.length - b.length;
  }
  let endB = b.length;
  if (a.length < b.length) {
    endB = a.length;
  }
  const map2 = Array(endB);
  let k = 0;
  map2[0] = 0;
  for (let j = 1; j < endB; j++) {
    if (b[j] == b[k]) {
      map2[j] = map2[k];
    } else {
      map2[j] = k;
    }
    while (k > 0 && b[j] != b[k]) {
      k = map2[k];
    }
    if (b[j] == b[k]) {
      k++;
    }
  }
  k = 0;
  for (let i = startA; i < a.length; i++) {
    while (k > 0 && a[i] != b[k]) {
      k = map2[k];
    }
    if (a[i] == b[k]) {
      k++;
    }
  }
  return k;
}
function segment(string2, segmenter) {
  const parts = [];
  for (const segmentObj of Array.from(segmenter.segment(string2))) {
    const segment2 = segmentObj.segment;
    if (parts.length && /\s/.test(parts[parts.length - 1]) && /\s/.test(segment2)) {
      parts[parts.length - 1] += segment2;
    } else {
      parts.push(segment2);
    }
  }
  return parts;
}
function trailingWs(string2, segmenter) {
  if (segmenter) {
    return leadingAndTrailingWs(string2, segmenter)[1];
  }
  let i;
  for (i = string2.length - 1; i >= 0; i--) {
    if (!string2[i].match(/\s/)) {
      break;
    }
  }
  return string2.substring(i + 1);
}
function leadingWs(string2, segmenter) {
  if (segmenter) {
    return leadingAndTrailingWs(string2, segmenter)[0];
  }
  const match = string2.match(/^\s*/);
  return match ? match[0] : "";
}
function leadingAndTrailingWs(string2, segmenter) {
  if (!segmenter) {
    return [leadingWs(string2), trailingWs(string2)];
  }
  if (segmenter.resolvedOptions().granularity != "word") {
    throw new Error('The segmenter passed must have a granularity of "word"');
  }
  const segments = segment(string2, segmenter);
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const head = /\s/.test(firstSeg) ? firstSeg : "";
  const tail = /\s/.test(lastSeg) ? lastSeg : "";
  return [head, tail];
}

// node_modules/diff/libesm/diff/word.js
var extendedWordChars = "a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
var tokenizeIncludingWhitespace = new RegExp(`[${extendedWordChars}]+|\\s+|[^${extendedWordChars}]`, "ug");
var WordDiff = class extends Diff2 {
  equals(left, right, options) {
    if (options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }
    return left.trim() === right.trim();
  }
  tokenize(value, options = {}) {
    let parts;
    if (options.intlSegmenter) {
      const segmenter = options.intlSegmenter;
      if (segmenter.resolvedOptions().granularity != "word") {
        throw new Error('The segmenter passed must have a granularity of "word"');
      }
      parts = segment(value, segmenter);
    } else {
      parts = value.match(tokenizeIncludingWhitespace) || [];
    }
    const tokens = [];
    let prevPart = null;
    parts.forEach((part) => {
      if (/\s/.test(part)) {
        if (prevPart == null) {
          tokens.push(part);
        } else {
          tokens.push(tokens.pop() + part);
        }
      } else if (prevPart != null && /\s/.test(prevPart)) {
        if (tokens[tokens.length - 1] == prevPart) {
          tokens.push(tokens.pop() + part);
        } else {
          tokens.push(prevPart + part);
        }
      } else {
        tokens.push(part);
      }
      prevPart = part;
    });
    return tokens;
  }
  join(tokens) {
    return tokens.map((token, i) => {
      if (i == 0) {
        return token;
      } else {
        return token.replace(/^\s+/, "");
      }
    }).join("");
  }
  postProcess(changes, options) {
    if (!changes || options.oneChangePerToken) {
      return changes;
    }
    let lastKeep = null;
    let insertion = null;
    let deletion = null;
    changes.forEach((change) => {
      if (change.added) {
        insertion = change;
      } else if (change.removed) {
        deletion = change;
      } else {
        if (insertion || deletion) {
          dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change, options.intlSegmenter);
        }
        lastKeep = change;
        insertion = null;
        deletion = null;
      }
    });
    if (insertion || deletion) {
      dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null, options.intlSegmenter);
    }
    return changes;
  }
};
var wordDiff = new WordDiff();
function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep, segmenter) {
  if (deletion && insertion) {
    const [oldWsPrefix, oldWsSuffix] = leadingAndTrailingWs(deletion.value, segmenter);
    const [newWsPrefix, newWsSuffix] = leadingAndTrailingWs(insertion.value, segmenter);
    if (startKeep) {
      const commonWsPrefix = longestCommonPrefix(oldWsPrefix, newWsPrefix);
      startKeep.value = replaceSuffix(startKeep.value, newWsPrefix, commonWsPrefix);
      deletion.value = removePrefix(deletion.value, commonWsPrefix);
      insertion.value = removePrefix(insertion.value, commonWsPrefix);
    }
    if (endKeep) {
      const commonWsSuffix = longestCommonSuffix(oldWsSuffix, newWsSuffix);
      endKeep.value = replacePrefix(endKeep.value, newWsSuffix, commonWsSuffix);
      deletion.value = removeSuffix(deletion.value, commonWsSuffix);
      insertion.value = removeSuffix(insertion.value, commonWsSuffix);
    }
  } else if (insertion) {
    if (startKeep) {
      const ws = leadingWs(insertion.value, segmenter);
      insertion.value = insertion.value.substring(ws.length);
    }
    if (endKeep) {
      const ws = leadingWs(endKeep.value, segmenter);
      endKeep.value = endKeep.value.substring(ws.length);
    }
  } else if (startKeep && endKeep) {
    const newWsFull = leadingWs(endKeep.value, segmenter), [delWsStart, delWsEnd] = leadingAndTrailingWs(deletion.value, segmenter);
    const newWsStart = longestCommonPrefix(newWsFull, delWsStart);
    deletion.value = removePrefix(deletion.value, newWsStart);
    const newWsEnd = longestCommonSuffix(removePrefix(newWsFull, newWsStart), delWsEnd);
    deletion.value = removeSuffix(deletion.value, newWsEnd);
    endKeep.value = replacePrefix(endKeep.value, newWsFull, newWsEnd);
    startKeep.value = replaceSuffix(startKeep.value, newWsFull, newWsFull.slice(0, newWsFull.length - newWsEnd.length));
  } else if (endKeep) {
    const endKeepWsPrefix = leadingWs(endKeep.value, segmenter);
    const deletionWsSuffix = trailingWs(deletion.value, segmenter);
    const overlap = maximumOverlap(deletionWsSuffix, endKeepWsPrefix);
    deletion.value = removeSuffix(deletion.value, overlap);
  } else if (startKeep) {
    const startKeepWsSuffix = trailingWs(startKeep.value, segmenter);
    const deletionWsPrefix = leadingWs(deletion.value, segmenter);
    const overlap = maximumOverlap(startKeepWsSuffix, deletionWsPrefix);
    deletion.value = removePrefix(deletion.value, overlap);
  }
}
var WordsWithSpaceDiff = class extends Diff2 {
  tokenize(value) {
    const regex2 = new RegExp(`(\\r?\\n)|[${extendedWordChars}]+|[^\\S\\n\\r]+|[^${extendedWordChars}]`, "ug");
    return value.match(regex2) || [];
  }
};
var wordsWithSpaceDiff = new WordsWithSpaceDiff();
function diffWordsWithSpace(oldStr, newStr, options) {
  return wordsWithSpaceDiff.diff(oldStr, newStr, options);
}

// node_modules/diff2html/lib-esm/rematch.js
function levenshtein(a, b) {
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }
  const matrix = [];
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}
function newDistanceFn(str) {
  return (x, y) => {
    const xValue = str(x).trim();
    const yValue = str(y).trim();
    const lev = levenshtein(xValue, yValue);
    return lev / (xValue.length + yValue.length);
  };
}
function newMatcherFn(distance2) {
  function findBestMatch(a, b, cache = /* @__PURE__ */ new Map()) {
    let bestMatchDist = Infinity;
    let bestMatch;
    for (let i = 0; i < a.length; ++i) {
      for (let j = 0; j < b.length; ++j) {
        const cacheKey = JSON.stringify([a[i], b[j]]);
        let md;
        if (!(cache.has(cacheKey) && (md = cache.get(cacheKey)))) {
          md = distance2(a[i], b[j]);
          cache.set(cacheKey, md);
        }
        if (md < bestMatchDist) {
          bestMatchDist = md;
          bestMatch = { indexA: i, indexB: j, score: bestMatchDist };
        }
      }
    }
    return bestMatch;
  }
  function group(a, b, level = 0, cache = /* @__PURE__ */ new Map()) {
    const bm = findBestMatch(a, b, cache);
    if (!bm || a.length + b.length < 3) {
      return [[a, b]];
    }
    const a1 = a.slice(0, bm.indexA);
    const b1 = b.slice(0, bm.indexB);
    const aMatch = [a[bm.indexA]];
    const bMatch = [b[bm.indexB]];
    const tailA = bm.indexA + 1;
    const tailB = bm.indexB + 1;
    const a2 = a.slice(tailA);
    const b2 = b.slice(tailB);
    const group1 = group(a1, b1, level + 1, cache);
    const groupMatch = group(aMatch, bMatch, level + 1, cache);
    const group2 = group(a2, b2, level + 1, cache);
    let result = groupMatch;
    if (bm.indexA > 0 || bm.indexB > 0) {
      result = group1.concat(result);
    }
    if (a.length > tailA || b.length > tailB) {
      result = result.concat(group2);
    }
    return result;
  }
  return group;
}

// node_modules/diff2html/lib-esm/render-utils.js
var CSSLineClass = {
  INSERTS: "d2h-ins",
  DELETES: "d2h-del",
  CONTEXT: "d2h-cntx",
  INFO: "d2h-info",
  INSERT_CHANGES: "d2h-ins d2h-change",
  DELETE_CHANGES: "d2h-del d2h-change"
};
var defaultRenderConfig = {
  matching: LineMatchingType.NONE,
  matchWordsThreshold: 0.25,
  maxLineLengthHighlight: 1e4,
  diffStyle: DiffStyleType.WORD,
  colorScheme: ColorSchemeType.LIGHT
};
var separator = "/";
var distance = newDistanceFn((change) => change.value);
var matcher = newMatcherFn(distance);
function isDevNullName(name) {
  return name.indexOf("dev/null") !== -1;
}
function removeInsElements(line) {
  return line.replace(/(<ins[^>]*>((.|\n)*?)<\/ins>)/g, "");
}
function removeDelElements(line) {
  return line.replace(/(<del[^>]*>((.|\n)*?)<\/del>)/g, "");
}
function toCSSClass(lineType) {
  switch (lineType) {
    case LineType.CONTEXT:
      return CSSLineClass.CONTEXT;
    case LineType.INSERT:
      return CSSLineClass.INSERTS;
    case LineType.DELETE:
      return CSSLineClass.DELETES;
  }
}
function colorSchemeToCss(colorScheme) {
  switch (colorScheme) {
    case ColorSchemeType.DARK:
      return "d2h-dark-color-scheme";
    case ColorSchemeType.AUTO:
      return "d2h-auto-color-scheme";
    case ColorSchemeType.LIGHT:
    default:
      return "d2h-light-color-scheme";
  }
}
function prefixLength(isCombined) {
  return isCombined ? 2 : 1;
}
function escapeForHtml(str) {
  return str.slice(0).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
}
function deconstructLine(line, isCombined, escape = true) {
  const indexToSplit = prefixLength(isCombined);
  return {
    prefix: line.substring(0, indexToSplit),
    content: escape ? escapeForHtml(line.substring(indexToSplit)) : line.substring(indexToSplit)
  };
}
function filenameDiff(file) {
  const oldFilename = unifyPath(file.oldName);
  const newFilename = unifyPath(file.newName);
  if (oldFilename !== newFilename && !isDevNullName(oldFilename) && !isDevNullName(newFilename)) {
    const prefixPaths = [];
    const suffixPaths = [];
    const oldFilenameParts = oldFilename.split(separator);
    const newFilenameParts = newFilename.split(separator);
    const oldFilenamePartsSize = oldFilenameParts.length;
    const newFilenamePartsSize = newFilenameParts.length;
    let i = 0;
    let j = oldFilenamePartsSize - 1;
    let k = newFilenamePartsSize - 1;
    while (i < j && i < k) {
      if (oldFilenameParts[i] === newFilenameParts[i]) {
        prefixPaths.push(newFilenameParts[i]);
        i += 1;
      } else {
        break;
      }
    }
    while (j > i && k > i) {
      if (oldFilenameParts[j] === newFilenameParts[k]) {
        suffixPaths.unshift(newFilenameParts[k]);
        j -= 1;
        k -= 1;
      } else {
        break;
      }
    }
    const finalPrefix = prefixPaths.join(separator);
    const finalSuffix = suffixPaths.join(separator);
    const oldRemainingPath = oldFilenameParts.slice(i, j + 1).join(separator);
    const newRemainingPath = newFilenameParts.slice(i, k + 1).join(separator);
    if (finalPrefix.length && finalSuffix.length) {
      return finalPrefix + separator + "{" + oldRemainingPath + " \u2192 " + newRemainingPath + "}" + separator + finalSuffix;
    } else if (finalPrefix.length) {
      return finalPrefix + separator + "{" + oldRemainingPath + " \u2192 " + newRemainingPath + "}";
    } else if (finalSuffix.length) {
      return "{" + oldRemainingPath + " \u2192 " + newRemainingPath + "}" + separator + finalSuffix;
    }
    return oldFilename + " \u2192 " + newFilename;
  } else if (!isDevNullName(newFilename)) {
    return newFilename;
  } else {
    return oldFilename;
  }
}
function getHtmlId(file) {
  return `d2h-${hashCode(filenameDiff(file)).toString().slice(-6)}`;
}
function getFileIcon(file) {
  let templateName = "file-changed";
  if (file.isRename) {
    templateName = "file-renamed";
  } else if (file.isCopy) {
    templateName = "file-renamed";
  } else if (file.isNew) {
    templateName = "file-added";
  } else if (file.isDeleted) {
    templateName = "file-deleted";
  } else if (file.newName !== file.oldName) {
    templateName = "file-renamed";
  }
  return templateName;
}
function diffHighlight(diffLine1, diffLine2, isCombined, config = {}) {
  const { matching, maxLineLengthHighlight, matchWordsThreshold, diffStyle } = Object.assign(Object.assign({}, defaultRenderConfig), config);
  const line1 = deconstructLine(diffLine1, isCombined, false);
  const line2 = deconstructLine(diffLine2, isCombined, false);
  if (line1.content.length > maxLineLengthHighlight || line2.content.length > maxLineLengthHighlight) {
    return {
      oldLine: {
        prefix: line1.prefix,
        content: escapeForHtml(line1.content)
      },
      newLine: {
        prefix: line2.prefix,
        content: escapeForHtml(line2.content)
      }
    };
  }
  const diff = diffStyle === "char" ? diffChars2(line1.content, line2.content) : diffWordsWithSpace(line1.content, line2.content);
  const changedWords = [];
  if (diffStyle === "word" && matching === "words") {
    const removed = diff.filter((element) => element.removed);
    const added = diff.filter((element) => element.added);
    const chunks = matcher(added, removed);
    chunks.forEach((chunk) => {
      if (chunk[0].length === 1 && chunk[1].length === 1) {
        const dist = distance(chunk[0][0], chunk[1][0]);
        if (dist < matchWordsThreshold) {
          changedWords.push(chunk[0][0]);
          changedWords.push(chunk[1][0]);
        }
      }
    });
  }
  const highlightedLine = diff.reduce((highlightedLine2, part) => {
    const elemType = part.added ? "ins" : part.removed ? "del" : null;
    const addClass = changedWords.indexOf(part) > -1 ? ' class="d2h-change"' : "";
    const escapedValue = escapeForHtml(part.value);
    return elemType !== null ? `${highlightedLine2}<${elemType}${addClass}>${escapedValue}</${elemType}>` : `${highlightedLine2}${escapedValue}`;
  }, "");
  return {
    oldLine: {
      prefix: line1.prefix,
      content: removeInsElements(highlightedLine)
    },
    newLine: {
      prefix: line2.prefix,
      content: removeDelElements(highlightedLine)
    }
  };
}

// node_modules/diff2html/lib-esm/file-list-renderer.js
var baseTemplatesPath = "file-summary";
var iconsBaseTemplatesPath = "icon";
var defaultFileListRendererConfig = {
  colorScheme: defaultRenderConfig.colorScheme
};
var FileListRenderer = class {
  constructor(hoganUtils, config = {}) {
    this.hoganUtils = hoganUtils;
    this.config = Object.assign(Object.assign({}, defaultFileListRendererConfig), config);
  }
  render(diffFiles) {
    const files = diffFiles.map((file) => this.hoganUtils.render(baseTemplatesPath, "line", {
      fileHtmlId: getHtmlId(file),
      oldName: file.oldName,
      newName: file.newName,
      fileName: filenameDiff(file),
      deletedLines: "-" + file.deletedLines,
      addedLines: "+" + file.addedLines
    }, {
      fileIcon: this.hoganUtils.template(iconsBaseTemplatesPath, getFileIcon(file))
    })).join("\n");
    return this.hoganUtils.render(baseTemplatesPath, "wrapper", {
      colorScheme: colorSchemeToCss(this.config.colorScheme),
      filesNumber: diffFiles.length,
      files
    });
  }
};

// node_modules/diff2html/lib-esm/line-by-line-renderer.js
var defaultLineByLineRendererConfig = Object.assign(Object.assign({}, defaultRenderConfig), { renderNothingWhenEmpty: false, matchingMaxComparisons: 2500, maxLineSizeInBlockForComparison: 200 });
var genericTemplatesPath = "generic";
var baseTemplatesPath2 = "line-by-line";
var iconsBaseTemplatesPath2 = "icon";
var tagsBaseTemplatesPath = "tag";
var LineByLineRenderer = class {
  constructor(hoganUtils, config = {}) {
    this.hoganUtils = hoganUtils;
    this.config = Object.assign(Object.assign({}, defaultLineByLineRendererConfig), config);
  }
  render(diffFiles) {
    const diffsHtml = diffFiles.map((file) => {
      let diffs;
      if (file.blocks.length) {
        diffs = this.generateFileHtml(file);
      } else {
        diffs = this.generateEmptyDiff();
      }
      return this.makeFileDiffHtml(file, diffs);
    }).join("\n");
    return this.hoganUtils.render(genericTemplatesPath, "wrapper", {
      colorScheme: colorSchemeToCss(this.config.colorScheme),
      content: diffsHtml
    });
  }
  makeFileDiffHtml(file, diffs) {
    if (this.config.renderNothingWhenEmpty && Array.isArray(file.blocks) && file.blocks.length === 0)
      return "";
    const fileDiffTemplate = this.hoganUtils.template(baseTemplatesPath2, "file-diff");
    const filePathTemplate = this.hoganUtils.template(genericTemplatesPath, "file-path");
    const fileIconTemplate = this.hoganUtils.template(iconsBaseTemplatesPath2, "file");
    const fileTagTemplate = this.hoganUtils.template(tagsBaseTemplatesPath, getFileIcon(file));
    return fileDiffTemplate.render({
      file,
      fileHtmlId: getHtmlId(file),
      diffs,
      filePath: filePathTemplate.render({
        fileDiffName: filenameDiff(file)
      }, {
        fileIcon: fileIconTemplate,
        fileTag: fileTagTemplate
      })
    });
  }
  generateEmptyDiff() {
    return this.hoganUtils.render(genericTemplatesPath, "empty-diff", {
      contentClass: "d2h-code-line",
      CSSLineClass
    });
  }
  generateFileHtml(file) {
    const matcher2 = newMatcherFn(newDistanceFn((e) => deconstructLine(e.content, file.isCombined).content));
    return file.blocks.map((block) => {
      let lines = this.hoganUtils.render(genericTemplatesPath, "block-header", {
        CSSLineClass,
        blockHeader: file.isTooBig ? block.header : escapeForHtml(block.header),
        lineClass: "d2h-code-linenumber",
        contentClass: "d2h-code-line"
      });
      this.applyLineGroupping(block).forEach(([contextLines, oldLines, newLines]) => {
        if (oldLines.length && newLines.length && !contextLines.length) {
          this.applyRematchMatching(oldLines, newLines, matcher2).map(([oldLines2, newLines2]) => {
            const { left, right } = this.processChangedLines(file, file.isCombined, oldLines2, newLines2);
            lines += left;
            lines += right;
          });
        } else if (contextLines.length) {
          contextLines.forEach((line) => {
            const { prefix, content } = deconstructLine(line.content, file.isCombined);
            lines += this.generateSingleLineHtml(file, {
              type: CSSLineClass.CONTEXT,
              prefix,
              content,
              oldNumber: line.oldNumber,
              newNumber: line.newNumber
            });
          });
        } else if (oldLines.length || newLines.length) {
          const { left, right } = this.processChangedLines(file, file.isCombined, oldLines, newLines);
          lines += left;
          lines += right;
        } else {
          console.error("Unknown state reached while processing groups of lines", contextLines, oldLines, newLines);
        }
      });
      return lines;
    }).join("\n");
  }
  applyLineGroupping(block) {
    const blockLinesGroups = [];
    let oldLines = [];
    let newLines = [];
    for (let i = 0; i < block.lines.length; i++) {
      const diffLine = block.lines[i];
      if (diffLine.type !== LineType.INSERT && newLines.length || diffLine.type === LineType.CONTEXT && oldLines.length > 0) {
        blockLinesGroups.push([[], oldLines, newLines]);
        oldLines = [];
        newLines = [];
      }
      if (diffLine.type === LineType.CONTEXT) {
        blockLinesGroups.push([[diffLine], [], []]);
      } else if (diffLine.type === LineType.INSERT && oldLines.length === 0) {
        blockLinesGroups.push([[], [], [diffLine]]);
      } else if (diffLine.type === LineType.INSERT && oldLines.length > 0) {
        newLines.push(diffLine);
      } else if (diffLine.type === LineType.DELETE) {
        oldLines.push(diffLine);
      }
    }
    if (oldLines.length || newLines.length) {
      blockLinesGroups.push([[], oldLines, newLines]);
      oldLines = [];
      newLines = [];
    }
    return blockLinesGroups;
  }
  applyRematchMatching(oldLines, newLines, matcher2) {
    const comparisons = oldLines.length * newLines.length;
    const maxLineSizeInBlock = max(oldLines.concat(newLines).map((elem) => elem.content.length));
    const doMatching = comparisons < this.config.matchingMaxComparisons && maxLineSizeInBlock < this.config.maxLineSizeInBlockForComparison && (this.config.matching === "lines" || this.config.matching === "words");
    return doMatching ? matcher2(oldLines, newLines) : [[oldLines, newLines]];
  }
  processChangedLines(file, isCombined, oldLines, newLines) {
    const fileHtml = {
      right: "",
      left: ""
    };
    const maxLinesNumber = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLinesNumber; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      const diff = oldLine !== void 0 && newLine !== void 0 ? diffHighlight(oldLine.content, newLine.content, isCombined, this.config) : void 0;
      const preparedOldLine = oldLine !== void 0 && oldLine.oldNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
        prefix: diff.oldLine.prefix,
        content: diff.oldLine.content,
        type: CSSLineClass.DELETE_CHANGES
      } : Object.assign(Object.assign({}, deconstructLine(oldLine.content, isCombined)), { type: toCSSClass(oldLine.type) })), { oldNumber: oldLine.oldNumber, newNumber: oldLine.newNumber }) : void 0;
      const preparedNewLine = newLine !== void 0 && newLine.newNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
        prefix: diff.newLine.prefix,
        content: diff.newLine.content,
        type: CSSLineClass.INSERT_CHANGES
      } : Object.assign(Object.assign({}, deconstructLine(newLine.content, isCombined)), { type: toCSSClass(newLine.type) })), { oldNumber: newLine.oldNumber, newNumber: newLine.newNumber }) : void 0;
      const { left, right } = this.generateLineHtml(file, preparedOldLine, preparedNewLine);
      fileHtml.left += left;
      fileHtml.right += right;
    }
    return fileHtml;
  }
  generateLineHtml(file, oldLine, newLine) {
    return {
      left: this.generateSingleLineHtml(file, oldLine),
      right: this.generateSingleLineHtml(file, newLine)
    };
  }
  generateSingleLineHtml(file, line) {
    if (line === void 0)
      return "";
    const lineNumberHtml = this.hoganUtils.render(baseTemplatesPath2, "numbers", {
      oldNumber: line.oldNumber || "",
      newNumber: line.newNumber || ""
    });
    return this.hoganUtils.render(genericTemplatesPath, "line", {
      type: line.type,
      lineClass: "d2h-code-linenumber",
      contentClass: "d2h-code-line",
      prefix: line.prefix === " " ? "&nbsp;" : line.prefix,
      content: line.content,
      lineNumber: lineNumberHtml,
      line,
      file
    });
  }
};

// node_modules/diff2html/lib-esm/side-by-side-renderer.js
var defaultSideBySideRendererConfig = Object.assign(Object.assign({}, defaultRenderConfig), { renderNothingWhenEmpty: false, matchingMaxComparisons: 2500, maxLineSizeInBlockForComparison: 200 });
var genericTemplatesPath2 = "generic";
var baseTemplatesPath3 = "side-by-side";
var iconsBaseTemplatesPath3 = "icon";
var tagsBaseTemplatesPath2 = "tag";
var SideBySideRenderer = class {
  constructor(hoganUtils, config = {}) {
    this.hoganUtils = hoganUtils;
    this.config = Object.assign(Object.assign({}, defaultSideBySideRendererConfig), config);
  }
  render(diffFiles) {
    const diffsHtml = diffFiles.map((file) => {
      let diffs;
      if (file.blocks.length) {
        diffs = this.generateFileHtml(file);
      } else {
        diffs = this.generateEmptyDiff();
      }
      return this.makeFileDiffHtml(file, diffs);
    }).join("\n");
    return this.hoganUtils.render(genericTemplatesPath2, "wrapper", {
      colorScheme: colorSchemeToCss(this.config.colorScheme),
      content: diffsHtml
    });
  }
  makeFileDiffHtml(file, diffs) {
    if (this.config.renderNothingWhenEmpty && Array.isArray(file.blocks) && file.blocks.length === 0)
      return "";
    const fileDiffTemplate = this.hoganUtils.template(baseTemplatesPath3, "file-diff");
    const filePathTemplate = this.hoganUtils.template(genericTemplatesPath2, "file-path");
    const fileIconTemplate = this.hoganUtils.template(iconsBaseTemplatesPath3, "file");
    const fileTagTemplate = this.hoganUtils.template(tagsBaseTemplatesPath2, getFileIcon(file));
    return fileDiffTemplate.render({
      file,
      fileHtmlId: getHtmlId(file),
      diffs,
      filePath: filePathTemplate.render({
        fileDiffName: filenameDiff(file)
      }, {
        fileIcon: fileIconTemplate,
        fileTag: fileTagTemplate
      })
    });
  }
  generateEmptyDiff() {
    return {
      right: "",
      left: this.hoganUtils.render(genericTemplatesPath2, "empty-diff", {
        contentClass: "d2h-code-side-line",
        CSSLineClass
      })
    };
  }
  generateFileHtml(file) {
    const matcher2 = newMatcherFn(newDistanceFn((e) => deconstructLine(e.content, file.isCombined).content));
    return file.blocks.map((block) => {
      const fileHtml = {
        left: this.makeHeaderHtml(block.header, file),
        right: this.makeHeaderHtml("")
      };
      this.applyLineGroupping(block).forEach(([contextLines, oldLines, newLines]) => {
        if (oldLines.length && newLines.length && !contextLines.length) {
          this.applyRematchMatching(oldLines, newLines, matcher2).map(([oldLines2, newLines2]) => {
            const { left, right } = this.processChangedLines(file.isCombined, oldLines2, newLines2);
            fileHtml.left += left;
            fileHtml.right += right;
          });
        } else if (contextLines.length) {
          contextLines.forEach((line) => {
            const { prefix, content } = deconstructLine(line.content, file.isCombined);
            const { left, right } = this.generateLineHtml({
              type: CSSLineClass.CONTEXT,
              prefix,
              content,
              number: line.oldNumber
            }, {
              type: CSSLineClass.CONTEXT,
              prefix,
              content,
              number: line.newNumber
            });
            fileHtml.left += left;
            fileHtml.right += right;
          });
        } else if (oldLines.length || newLines.length) {
          const { left, right } = this.processChangedLines(file.isCombined, oldLines, newLines);
          fileHtml.left += left;
          fileHtml.right += right;
        } else {
          console.error("Unknown state reached while processing groups of lines", contextLines, oldLines, newLines);
        }
      });
      return fileHtml;
    }).reduce((accomulated, html2) => {
      return { left: accomulated.left + html2.left, right: accomulated.right + html2.right };
    }, { left: "", right: "" });
  }
  applyLineGroupping(block) {
    const blockLinesGroups = [];
    let oldLines = [];
    let newLines = [];
    for (let i = 0; i < block.lines.length; i++) {
      const diffLine = block.lines[i];
      if (diffLine.type !== LineType.INSERT && newLines.length || diffLine.type === LineType.CONTEXT && oldLines.length > 0) {
        blockLinesGroups.push([[], oldLines, newLines]);
        oldLines = [];
        newLines = [];
      }
      if (diffLine.type === LineType.CONTEXT) {
        blockLinesGroups.push([[diffLine], [], []]);
      } else if (diffLine.type === LineType.INSERT && oldLines.length === 0) {
        blockLinesGroups.push([[], [], [diffLine]]);
      } else if (diffLine.type === LineType.INSERT && oldLines.length > 0) {
        newLines.push(diffLine);
      } else if (diffLine.type === LineType.DELETE) {
        oldLines.push(diffLine);
      }
    }
    if (oldLines.length || newLines.length) {
      blockLinesGroups.push([[], oldLines, newLines]);
      oldLines = [];
      newLines = [];
    }
    return blockLinesGroups;
  }
  applyRematchMatching(oldLines, newLines, matcher2) {
    const comparisons = oldLines.length * newLines.length;
    const maxLineSizeInBlock = max(oldLines.concat(newLines).map((elem) => elem.content.length));
    const doMatching = comparisons < this.config.matchingMaxComparisons && maxLineSizeInBlock < this.config.maxLineSizeInBlockForComparison && (this.config.matching === "lines" || this.config.matching === "words");
    return doMatching ? matcher2(oldLines, newLines) : [[oldLines, newLines]];
  }
  makeHeaderHtml(blockHeader, file) {
    return this.hoganUtils.render(genericTemplatesPath2, "block-header", {
      CSSLineClass,
      blockHeader: (file === null || file === void 0 ? void 0 : file.isTooBig) ? blockHeader : escapeForHtml(blockHeader),
      lineClass: "d2h-code-side-linenumber",
      contentClass: "d2h-code-side-line"
    });
  }
  processChangedLines(isCombined, oldLines, newLines) {
    const fileHtml = {
      right: "",
      left: ""
    };
    const maxLinesNumber = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLinesNumber; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      const diff = oldLine !== void 0 && newLine !== void 0 ? diffHighlight(oldLine.content, newLine.content, isCombined, this.config) : void 0;
      const preparedOldLine = oldLine !== void 0 && oldLine.oldNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
        prefix: diff.oldLine.prefix,
        content: diff.oldLine.content,
        type: CSSLineClass.DELETE_CHANGES
      } : Object.assign(Object.assign({}, deconstructLine(oldLine.content, isCombined)), { type: toCSSClass(oldLine.type) })), { number: oldLine.oldNumber }) : void 0;
      const preparedNewLine = newLine !== void 0 && newLine.newNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
        prefix: diff.newLine.prefix,
        content: diff.newLine.content,
        type: CSSLineClass.INSERT_CHANGES
      } : Object.assign(Object.assign({}, deconstructLine(newLine.content, isCombined)), { type: toCSSClass(newLine.type) })), { number: newLine.newNumber }) : void 0;
      const { left, right } = this.generateLineHtml(preparedOldLine, preparedNewLine);
      fileHtml.left += left;
      fileHtml.right += right;
    }
    return fileHtml;
  }
  generateLineHtml(oldLine, newLine) {
    return {
      left: this.generateSingleHtml(oldLine),
      right: this.generateSingleHtml(newLine)
    };
  }
  generateSingleHtml(line) {
    const lineClass = "d2h-code-side-linenumber";
    const contentClass = "d2h-code-side-line";
    return this.hoganUtils.render(genericTemplatesPath2, "line", {
      type: (line === null || line === void 0 ? void 0 : line.type) || `${CSSLineClass.CONTEXT} d2h-emptyplaceholder`,
      lineClass: line !== void 0 ? lineClass : `${lineClass} d2h-code-side-emptyplaceholder`,
      contentClass: line !== void 0 ? contentClass : `${contentClass} d2h-code-side-emptyplaceholder`,
      prefix: (line === null || line === void 0 ? void 0 : line.prefix) === " " ? "&nbsp;" : line === null || line === void 0 ? void 0 : line.prefix,
      content: line === null || line === void 0 ? void 0 : line.content,
      lineNumber: line === null || line === void 0 ? void 0 : line.number
    });
  }
};

// node_modules/diff2html/lib-esm/hoganjs-utils.js
var Hogan3 = __toESM(require_hogan());

// node_modules/diff2html/lib-esm/diff2html-templates.js
var Hogan2 = __toESM(require_hogan());
var defaultTemplates = {};
defaultTemplates["file-summary-line"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<li class="d2h-file-list-line">');
  t.b("\n" + i);
  t.b('    <span class="d2h-file-name-wrapper">');
  t.b("\n" + i);
  t.b(t.rp("<fileIcon0", c, p, "      "));
  t.b('      <a href="#');
  t.b(t.v(t.f("fileHtmlId", c, p, 0)));
  t.b('" class="d2h-file-name">');
  t.b(t.v(t.f("fileName", c, p, 0)));
  t.b("</a>");
  t.b("\n" + i);
  t.b('      <span class="d2h-file-stats">');
  t.b("\n" + i);
  t.b('          <span class="d2h-lines-added">');
  t.b(t.v(t.f("addedLines", c, p, 0)));
  t.b("</span>");
  t.b("\n" + i);
  t.b('          <span class="d2h-lines-deleted">');
  t.b(t.v(t.f("deletedLines", c, p, 0)));
  t.b("</span>");
  t.b("\n" + i);
  t.b("      </span>");
  t.b("\n" + i);
  t.b("    </span>");
  t.b("\n" + i);
  t.b("</li>");
  return t.fl();
}, partials: { "<fileIcon0": { name: "fileIcon", partials: {}, subs: {} } }, subs: {} });
defaultTemplates["file-summary-wrapper"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<div class="d2h-file-list-wrapper ');
  t.b(t.v(t.f("colorScheme", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b('    <div class="d2h-file-list-header">');
  t.b("\n" + i);
  t.b('        <span class="d2h-file-list-title">Files changed (');
  t.b(t.v(t.f("filesNumber", c, p, 0)));
  t.b(")</span>");
  t.b("\n" + i);
  t.b('        <a class="d2h-file-switch d2h-hide">hide</a>');
  t.b("\n" + i);
  t.b('        <a class="d2h-file-switch d2h-show">show</a>');
  t.b("\n" + i);
  t.b("    </div>");
  t.b("\n" + i);
  t.b('    <ol class="d2h-file-list">');
  t.b("\n" + i);
  t.b("    ");
  t.b(t.t(t.f("files", c, p, 0)));
  t.b("\n" + i);
  t.b("    </ol>");
  t.b("\n" + i);
  t.b("</div>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["generic-block-header"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b("<tr>");
  t.b("\n" + i);
  t.b('    <td class="');
  t.b(t.v(t.f("lineClass", c, p, 0)));
  t.b(" ");
  t.b(t.v(t.d("CSSLineClass.INFO", c, p, 0)));
  t.b('"></td>');
  t.b("\n" + i);
  t.b('    <td class="');
  t.b(t.v(t.d("CSSLineClass.INFO", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b('        <div class="');
  t.b(t.v(t.f("contentClass", c, p, 0)));
  t.b('">');
  if (t.s(t.f("blockHeader", c, p, 1), c, p, 0, 156, 173, "{{ }}")) {
    t.rs(c, p, function(c2, p2, t2) {
      t2.b(t2.t(t2.f("blockHeader", c2, p2, 0)));
    });
    c.pop();
  }
  if (!t.s(t.f("blockHeader", c, p, 1), c, p, 1, 0, 0, "")) {
    t.b("&nbsp;");
  }
  ;
  t.b("</div>");
  t.b("\n" + i);
  t.b("    </td>");
  t.b("\n" + i);
  t.b("</tr>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["generic-empty-diff"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b("<tr>");
  t.b("\n" + i);
  t.b('    <td class="');
  t.b(t.v(t.d("CSSLineClass.INFO", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b('        <div class="');
  t.b(t.v(t.f("contentClass", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b("            File without changes");
  t.b("\n" + i);
  t.b("        </div>");
  t.b("\n" + i);
  t.b("    </td>");
  t.b("\n" + i);
  t.b("</tr>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["generic-file-path"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<span class="d2h-file-name-wrapper">');
  t.b("\n" + i);
  t.b(t.rp("<fileIcon0", c, p, "    "));
  t.b('    <span class="d2h-file-name">');
  t.b(t.v(t.f("fileDiffName", c, p, 0)));
  t.b("</span>");
  t.b("\n" + i);
  t.b(t.rp("<fileTag1", c, p, "    "));
  t.b("</span>");
  t.b("\n" + i);
  t.b('<label class="d2h-file-collapse">');
  t.b("\n" + i);
  t.b('    <input class="d2h-file-collapse-input" type="checkbox" name="viewed" value="viewed">');
  t.b("\n" + i);
  t.b("    Viewed");
  t.b("\n" + i);
  t.b("</label>");
  return t.fl();
}, partials: { "<fileIcon0": { name: "fileIcon", partials: {}, subs: {} }, "<fileTag1": { name: "fileTag", partials: {}, subs: {} } }, subs: {} });
defaultTemplates["generic-line"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b("<tr>");
  t.b("\n" + i);
  t.b('    <td class="');
  t.b(t.v(t.f("lineClass", c, p, 0)));
  t.b(" ");
  t.b(t.v(t.f("type", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b("      ");
  t.b(t.t(t.f("lineNumber", c, p, 0)));
  t.b("\n" + i);
  t.b("    </td>");
  t.b("\n" + i);
  t.b('    <td class="');
  t.b(t.v(t.f("type", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b('        <div class="');
  t.b(t.v(t.f("contentClass", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  if (t.s(t.f("prefix", c, p, 1), c, p, 0, 162, 238, "{{ }}")) {
    t.rs(c, p, function(c2, p2, t2) {
      t2.b('            <span class="d2h-code-line-prefix">');
      t2.b(t2.t(t2.f("prefix", c2, p2, 0)));
      t2.b("</span>");
      t2.b("\n" + i);
    });
    c.pop();
  }
  if (!t.s(t.f("prefix", c, p, 1), c, p, 1, 0, 0, "")) {
    t.b('            <span class="d2h-code-line-prefix">&nbsp;</span>');
    t.b("\n" + i);
  }
  ;
  if (t.s(t.f("content", c, p, 1), c, p, 0, 371, 445, "{{ }}")) {
    t.rs(c, p, function(c2, p2, t2) {
      t2.b('            <span class="d2h-code-line-ctn">');
      t2.b(t2.t(t2.f("content", c2, p2, 0)));
      t2.b("</span>");
      t2.b("\n" + i);
    });
    c.pop();
  }
  if (!t.s(t.f("content", c, p, 1), c, p, 1, 0, 0, "")) {
    t.b('            <span class="d2h-code-line-ctn"><br></span>');
    t.b("\n" + i);
  }
  ;
  t.b("        </div>");
  t.b("\n" + i);
  t.b("    </td>");
  t.b("\n" + i);
  t.b("</tr>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["generic-wrapper"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<div class="d2h-wrapper ');
  t.b(t.v(t.f("colorScheme", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b("    ");
  t.b(t.t(t.f("content", c, p, 0)));
  t.b("\n" + i);
  t.b("</div>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["icon-file-added"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<svg aria-hidden="true" class="d2h-icon d2h-added" height="16" title="added" version="1.1" viewBox="0 0 14 16"');
  t.b("\n" + i);
  t.b('     width="14">');
  t.b("\n" + i);
  t.b('    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM6 9H3V7h3V4h2v3h3v2H8v3H6V9z"></path>');
  t.b("\n" + i);
  t.b("</svg>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["icon-file-changed"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<svg aria-hidden="true" class="d2h-icon d2h-changed" height="16" title="modified" version="1.1"');
  t.b("\n" + i);
  t.b('     viewBox="0 0 14 16" width="14">');
  t.b("\n" + i);
  t.b('    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM4 8c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"></path>');
  t.b("\n" + i);
  t.b("</svg>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["icon-file-deleted"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<svg aria-hidden="true" class="d2h-icon d2h-deleted" height="16" title="removed" version="1.1"');
  t.b("\n" + i);
  t.b('     viewBox="0 0 14 16" width="14">');
  t.b("\n" + i);
  t.b('    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM11 9H3V7h8v2z"></path>');
  t.b("\n" + i);
  t.b("</svg>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["icon-file-renamed"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<svg aria-hidden="true" class="d2h-icon d2h-moved" height="16" title="renamed" version="1.1"');
  t.b("\n" + i);
  t.b('     viewBox="0 0 14 16" width="14">');
  t.b("\n" + i);
  t.b('    <path d="M6 9H3V7h3V4l5 4-5 4V9z m8-7v12c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h12c0.55 0 1 0.45 1 1z m-1 0H1v12h12V2z"></path>');
  t.b("\n" + i);
  t.b("</svg>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["icon-file"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<svg aria-hidden="true" class="d2h-icon" height="16" version="1.1" viewBox="0 0 12 16" width="12">');
  t.b("\n" + i);
  t.b('    <path d="M6 5H2v-1h4v1zM2 8h7v-1H2v1z m0 2h7v-1H2v1z m0 2h7v-1H2v1z m10-7.5v9.5c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h7.5l3.5 3.5z m-1 0.5L8 2H1v12h10V5z"></path>');
  t.b("\n" + i);
  t.b("</svg>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["line-by-line-file-diff"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<div id="');
  t.b(t.v(t.f("fileHtmlId", c, p, 0)));
  t.b('" class="d2h-file-wrapper" data-lang="');
  t.b(t.v(t.d("file.language", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b('    <div class="d2h-file-header">');
  t.b("\n" + i);
  t.b("    ");
  t.b(t.t(t.f("filePath", c, p, 0)));
  t.b("\n" + i);
  t.b("    </div>");
  t.b("\n" + i);
  t.b('    <div class="d2h-file-diff">');
  t.b("\n" + i);
  t.b('        <div class="d2h-code-wrapper">');
  t.b("\n" + i);
  t.b('            <table class="d2h-diff-table">');
  t.b("\n" + i);
  t.b('                <tbody class="d2h-diff-tbody">');
  t.b("\n" + i);
  t.b("                ");
  t.b(t.t(t.f("diffs", c, p, 0)));
  t.b("\n" + i);
  t.b("                </tbody>");
  t.b("\n" + i);
  t.b("            </table>");
  t.b("\n" + i);
  t.b("        </div>");
  t.b("\n" + i);
  t.b("    </div>");
  t.b("\n" + i);
  t.b("</div>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["line-by-line-numbers"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<div class="line-num1">');
  t.b(t.v(t.f("oldNumber", c, p, 0)));
  t.b("</div>");
  t.b("\n" + i);
  t.b('<div class="line-num2">');
  t.b(t.v(t.f("newNumber", c, p, 0)));
  t.b("</div>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["side-by-side-file-diff"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<div id="');
  t.b(t.v(t.f("fileHtmlId", c, p, 0)));
  t.b('" class="d2h-file-wrapper" data-lang="');
  t.b(t.v(t.d("file.language", c, p, 0)));
  t.b('">');
  t.b("\n" + i);
  t.b('    <div class="d2h-file-header">');
  t.b("\n" + i);
  t.b("      ");
  t.b(t.t(t.f("filePath", c, p, 0)));
  t.b("\n" + i);
  t.b("    </div>");
  t.b("\n" + i);
  t.b('    <div class="d2h-files-diff">');
  t.b("\n" + i);
  t.b('        <div class="d2h-file-side-diff">');
  t.b("\n" + i);
  t.b('            <div class="d2h-code-wrapper">');
  t.b("\n" + i);
  t.b('                <table class="d2h-diff-table">');
  t.b("\n" + i);
  t.b('                    <tbody class="d2h-diff-tbody">');
  t.b("\n" + i);
  t.b("                    ");
  t.b(t.t(t.d("diffs.left", c, p, 0)));
  t.b("\n" + i);
  t.b("                    </tbody>");
  t.b("\n" + i);
  t.b("                </table>");
  t.b("\n" + i);
  t.b("            </div>");
  t.b("\n" + i);
  t.b("        </div>");
  t.b("\n" + i);
  t.b('        <div class="d2h-file-side-diff">');
  t.b("\n" + i);
  t.b('            <div class="d2h-code-wrapper">');
  t.b("\n" + i);
  t.b('                <table class="d2h-diff-table">');
  t.b("\n" + i);
  t.b('                    <tbody class="d2h-diff-tbody">');
  t.b("\n" + i);
  t.b("                    ");
  t.b(t.t(t.d("diffs.right", c, p, 0)));
  t.b("\n" + i);
  t.b("                    </tbody>");
  t.b("\n" + i);
  t.b("                </table>");
  t.b("\n" + i);
  t.b("            </div>");
  t.b("\n" + i);
  t.b("        </div>");
  t.b("\n" + i);
  t.b("    </div>");
  t.b("\n" + i);
  t.b("</div>");
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["tag-file-added"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<span class="d2h-tag d2h-added d2h-added-tag">ADDED</span>');
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["tag-file-changed"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<span class="d2h-tag d2h-changed d2h-changed-tag">CHANGED</span>');
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["tag-file-deleted"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<span class="d2h-tag d2h-deleted d2h-deleted-tag">DELETED</span>');
  return t.fl();
}, partials: {}, subs: {} });
defaultTemplates["tag-file-renamed"] = new Hogan2.Template({ code: function(c, p, i) {
  var t = this;
  t.b(i = i || "");
  t.b('<span class="d2h-tag d2h-moved d2h-moved-tag">RENAMED</span>');
  return t.fl();
}, partials: {}, subs: {} });

// node_modules/diff2html/lib-esm/hoganjs-utils.js
var HoganJsUtils = class {
  constructor({ compiledTemplates = {}, rawTemplates = {} }) {
    const compiledRawTemplates = Object.entries(rawTemplates).reduce((previousTemplates, [name, templateString]) => {
      const compiledTemplate = Hogan3.compile(templateString, { asString: false });
      return Object.assign(Object.assign({}, previousTemplates), { [name]: compiledTemplate });
    }, {});
    this.preCompiledTemplates = Object.assign(Object.assign(Object.assign({}, defaultTemplates), compiledTemplates), compiledRawTemplates);
  }
  static compile(templateString) {
    return Hogan3.compile(templateString, { asString: false });
  }
  render(namespace, view, params, partials, indent) {
    const templateKey = this.templateKey(namespace, view);
    try {
      const template = this.preCompiledTemplates[templateKey];
      return template.render(params, partials, indent);
    } catch (_e) {
      throw new Error(`Could not find template to render '${templateKey}'`);
    }
  }
  template(namespace, view) {
    return this.preCompiledTemplates[this.templateKey(namespace, view)];
  }
  templateKey(namespace, view) {
    return `${namespace}-${view}`;
  }
};

// node_modules/diff2html/lib-esm/diff2html.js
var defaultDiff2HtmlConfig = Object.assign(Object.assign(Object.assign({}, defaultLineByLineRendererConfig), defaultSideBySideRendererConfig), { outputFormat: OutputFormatType.LINE_BY_LINE, drawFileList: true });
function html(diffInput, configuration = {}) {
  const config = Object.assign(Object.assign({}, defaultDiff2HtmlConfig), configuration);
  const diffJson = typeof diffInput === "string" ? parse(diffInput, config) : diffInput;
  const hoganUtils = new HoganJsUtils(config);
  const { colorScheme } = config;
  const fileListRendererConfig = { colorScheme };
  const fileList = config.drawFileList ? new FileListRenderer(hoganUtils, fileListRendererConfig).render(diffJson) : "";
  const diffOutput = config.outputFormat === "side-by-side" ? new SideBySideRenderer(hoganUtils, config).render(diffJson) : new LineByLineRenderer(hoganUtils, config).render(diffJson);
  return fileList + diffOutput;
}

// node_modules/highlight.js/es/core.js
var import_core2 = __toESM(require_core(), 1);
var core_default = import_core2.default;

// node_modules/highlight.js/es/languages/bash.js
function bash(hljs) {
  const regex2 = hljs.regex;
  const VAR = {};
  const BRACED_VAR = {
    begin: /\$\{/,
    end: /\}/,
    contains: [
      "self",
      {
        begin: /:-/,
        contains: [VAR]
      }
      // default values
    ]
  };
  Object.assign(VAR, {
    className: "variable",
    variants: [
      { begin: regex2.concat(
        /\$[\w\d#@][\w\d_]*/,
        // negative look-ahead tries to avoid matching patterns that are not
        // Perl at all like $ident$, @ident@, etc.
        `(?![\\w\\d])(?![$])`
      ) },
      BRACED_VAR
    ]
  });
  const SUBST = {
    className: "subst",
    begin: /\$\(/,
    end: /\)/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  const COMMENT = hljs.inherit(
    hljs.COMMENT(),
    {
      match: [
        /(^|\s)/,
        /#.*$/
      ],
      scope: {
        2: "comment"
      }
    }
  );
  const HERE_DOC = {
    begin: /<<-?\s*(?=\w+)/,
    starts: { contains: [
      hljs.END_SAME_AS_BEGIN({
        begin: /(\w+)/,
        end: /(\w+)/,
        className: "string"
      })
    ] }
  };
  const QUOTE_STRING = {
    className: "string",
    begin: /"/,
    end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VAR,
      SUBST
    ]
  };
  SUBST.contains.push(QUOTE_STRING);
  const ESCAPED_QUOTE = {
    match: /\\"/
  };
  const APOS_STRING = {
    className: "string",
    begin: /'/,
    end: /'/
  };
  const ESCAPED_APOS = {
    match: /\\'/
  };
  const ARITHMETIC = {
    begin: /\$?\(\(/,
    end: /\)\)/,
    contains: [
      {
        begin: /\d+#[0-9a-f]+/,
        className: "number"
      },
      hljs.NUMBER_MODE,
      VAR
    ]
  };
  const SH_LIKE_SHELLS = [
    "fish",
    "bash",
    "zsh",
    "sh",
    "csh",
    "ksh",
    "tcsh",
    "dash",
    "scsh"
  ];
  const KNOWN_SHEBANG = hljs.SHEBANG({
    binary: `(${SH_LIKE_SHELLS.join("|")})`,
    relevance: 10
  });
  const FUNCTION = {
    className: "function",
    begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
    returnBegin: true,
    contains: [hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
    relevance: 0
  };
  const KEYWORDS3 = [
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "time",
    "for",
    "while",
    "until",
    "in",
    "do",
    "done",
    "case",
    "esac",
    "coproc",
    "function",
    "select"
  ];
  const LITERALS3 = [
    "true",
    "false"
  ];
  const PATH_MODE = { match: /(\/[a-z._-]+)+/ };
  const SHELL_BUILT_INS = [
    "break",
    "cd",
    "continue",
    "eval",
    "exec",
    "exit",
    "export",
    "getopts",
    "hash",
    "pwd",
    "readonly",
    "return",
    "shift",
    "test",
    "times",
    "trap",
    "umask",
    "unset"
  ];
  const BASH_BUILT_INS = [
    "alias",
    "bind",
    "builtin",
    "caller",
    "command",
    "declare",
    "echo",
    "enable",
    "help",
    "let",
    "local",
    "logout",
    "mapfile",
    "printf",
    "read",
    "readarray",
    "source",
    "sudo",
    "type",
    "typeset",
    "ulimit",
    "unalias"
  ];
  const ZSH_BUILT_INS = [
    "autoload",
    "bg",
    "bindkey",
    "bye",
    "cap",
    "chdir",
    "clone",
    "comparguments",
    "compcall",
    "compctl",
    "compdescribe",
    "compfiles",
    "compgroups",
    "compquote",
    "comptags",
    "comptry",
    "compvalues",
    "dirs",
    "disable",
    "disown",
    "echotc",
    "echoti",
    "emulate",
    "fc",
    "fg",
    "float",
    "functions",
    "getcap",
    "getln",
    "history",
    "integer",
    "jobs",
    "kill",
    "limit",
    "log",
    "noglob",
    "popd",
    "print",
    "pushd",
    "pushln",
    "rehash",
    "sched",
    "setcap",
    "setopt",
    "stat",
    "suspend",
    "ttyctl",
    "unfunction",
    "unhash",
    "unlimit",
    "unsetopt",
    "vared",
    "wait",
    "whence",
    "where",
    "which",
    "zcompile",
    "zformat",
    "zftp",
    "zle",
    "zmodload",
    "zparseopts",
    "zprof",
    "zpty",
    "zregexparse",
    "zsocket",
    "zstyle",
    "ztcp"
  ];
  const GNU_CORE_UTILS = [
    "chcon",
    "chgrp",
    "chown",
    "chmod",
    "cp",
    "dd",
    "df",
    "dir",
    "dircolors",
    "ln",
    "ls",
    "mkdir",
    "mkfifo",
    "mknod",
    "mktemp",
    "mv",
    "realpath",
    "rm",
    "rmdir",
    "shred",
    "sync",
    "touch",
    "truncate",
    "vdir",
    "b2sum",
    "base32",
    "base64",
    "cat",
    "cksum",
    "comm",
    "csplit",
    "cut",
    "expand",
    "fmt",
    "fold",
    "head",
    "join",
    "md5sum",
    "nl",
    "numfmt",
    "od",
    "paste",
    "ptx",
    "pr",
    "sha1sum",
    "sha224sum",
    "sha256sum",
    "sha384sum",
    "sha512sum",
    "shuf",
    "sort",
    "split",
    "sum",
    "tac",
    "tail",
    "tr",
    "tsort",
    "unexpand",
    "uniq",
    "wc",
    "arch",
    "basename",
    "chroot",
    "date",
    "dirname",
    "du",
    "echo",
    "env",
    "expr",
    "factor",
    // "false", // keyword literal already
    "groups",
    "hostid",
    "id",
    "link",
    "logname",
    "nice",
    "nohup",
    "nproc",
    "pathchk",
    "pinky",
    "printenv",
    "printf",
    "pwd",
    "readlink",
    "runcon",
    "seq",
    "sleep",
    "stat",
    "stdbuf",
    "stty",
    "tee",
    "test",
    "timeout",
    // "true", // keyword literal already
    "tty",
    "uname",
    "unlink",
    "uptime",
    "users",
    "who",
    "whoami",
    "yes"
  ];
  return {
    name: "Bash",
    aliases: [
      "sh",
      "zsh"
    ],
    keywords: {
      $pattern: /\b[a-z][a-z0-9._-]+\b/,
      keyword: KEYWORDS3,
      literal: LITERALS3,
      built_in: [
        ...SHELL_BUILT_INS,
        ...BASH_BUILT_INS,
        // Shell modifiers
        "set",
        "shopt",
        ...ZSH_BUILT_INS,
        ...GNU_CORE_UTILS
      ]
    },
    contains: [
      KNOWN_SHEBANG,
      // to catch known shells and boost relevancy
      hljs.SHEBANG(),
      // to catch unknown shells but still highlight the shebang
      FUNCTION,
      ARITHMETIC,
      COMMENT,
      HERE_DOC,
      PATH_MODE,
      QUOTE_STRING,
      ESCAPED_QUOTE,
      APOS_STRING,
      ESCAPED_APOS,
      VAR
    ]
  };
}

// node_modules/highlight.js/es/languages/css.js
var MODES = (hljs) => {
  return {
    IMPORTANT: {
      scope: "meta",
      begin: "!important"
    },
    BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
    HEXCOLOR: {
      scope: "number",
      begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
    },
    FUNCTION_DISPATCH: {
      className: "built_in",
      begin: /[\w-]+(?=\()/
    },
    ATTRIBUTE_SELECTOR_MODE: {
      scope: "selector-attr",
      begin: /\[/,
      end: /\]/,
      illegal: "$",
      contains: [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    },
    CSS_NUMBER_MODE: {
      scope: "number",
      begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
      relevance: 0
    },
    CSS_VARIABLE: {
      className: "attr",
      begin: /--[A-Za-z_][A-Za-z0-9_-]*/
    }
  };
};
var HTML_TAGS = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "mark",
  "menu",
  "nav",
  "object",
  "ol",
  "optgroup",
  "option",
  "p",
  "picture",
  "q",
  "quote",
  "samp",
  "section",
  "select",
  "source",
  "span",
  "strong",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "ul",
  "var",
  "video"
];
var SVG_TAGS = [
  "defs",
  "g",
  "marker",
  "mask",
  "pattern",
  "svg",
  "switch",
  "symbol",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feFlood",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence",
  "linearGradient",
  "radialGradient",
  "stop",
  "circle",
  "ellipse",
  "image",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "use",
  "textPath",
  "tspan",
  "foreignObject",
  "clipPath"
];
var TAGS = [
  ...HTML_TAGS,
  ...SVG_TAGS
];
var MEDIA_FEATURES = [
  "any-hover",
  "any-pointer",
  "aspect-ratio",
  "color",
  "color-gamut",
  "color-index",
  "device-aspect-ratio",
  "device-height",
  "device-width",
  "display-mode",
  "forced-colors",
  "grid",
  "height",
  "hover",
  "inverted-colors",
  "monochrome",
  "orientation",
  "overflow-block",
  "overflow-inline",
  "pointer",
  "prefers-color-scheme",
  "prefers-contrast",
  "prefers-reduced-motion",
  "prefers-reduced-transparency",
  "resolution",
  "scan",
  "scripting",
  "update",
  "width",
  // TODO: find a better solution?
  "min-width",
  "max-width",
  "min-height",
  "max-height"
].sort().reverse();
var PSEUDO_CLASSES = [
  "active",
  "any-link",
  "blank",
  "checked",
  "current",
  "default",
  "defined",
  "dir",
  // dir()
  "disabled",
  "drop",
  "empty",
  "enabled",
  "first",
  "first-child",
  "first-of-type",
  "fullscreen",
  "future",
  "focus",
  "focus-visible",
  "focus-within",
  "has",
  // has()
  "host",
  // host or host()
  "host-context",
  // host-context()
  "hover",
  "indeterminate",
  "in-range",
  "invalid",
  "is",
  // is()
  "lang",
  // lang()
  "last-child",
  "last-of-type",
  "left",
  "link",
  "local-link",
  "not",
  // not()
  "nth-child",
  // nth-child()
  "nth-col",
  // nth-col()
  "nth-last-child",
  // nth-last-child()
  "nth-last-col",
  // nth-last-col()
  "nth-last-of-type",
  //nth-last-of-type()
  "nth-of-type",
  //nth-of-type()
  "only-child",
  "only-of-type",
  "optional",
  "out-of-range",
  "past",
  "placeholder-shown",
  "read-only",
  "read-write",
  "required",
  "right",
  "root",
  "scope",
  "target",
  "target-within",
  "user-invalid",
  "valid",
  "visited",
  "where"
  // where()
].sort().reverse();
var PSEUDO_ELEMENTS = [
  "after",
  "backdrop",
  "before",
  "cue",
  "cue-region",
  "first-letter",
  "first-line",
  "grammar-error",
  "marker",
  "part",
  "placeholder",
  "selection",
  "slotted",
  "spelling-error"
].sort().reverse();
var ATTRIBUTES = [
  "accent-color",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "all",
  "anchor-name",
  "animation",
  "animation-composition",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-range",
  "animation-range-end",
  "animation-range-start",
  "animation-timeline",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backdrop-filter",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "block-size",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-style",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-style",
  "border-block-start-width",
  "border-block-style",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end-end-radius",
  "border-end-start-radius",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-style",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-style",
  "border-inline-start-width",
  "border-inline-style",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "caret-color",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "color-scheme",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "contain",
  "contain-intrinsic-block-size",
  "contain-intrinsic-height",
  "contain-intrinsic-inline-size",
  "contain-intrinsic-size",
  "contain-intrinsic-width",
  "container",
  "container-name",
  "container-type",
  "content",
  "content-visibility",
  "counter-increment",
  "counter-reset",
  "counter-set",
  "cue",
  "cue-after",
  "cue-before",
  "cursor",
  "cx",
  "cy",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "field-sizing",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "flow",
  "font",
  "font-display",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-optical-sizing",
  "font-palette",
  "font-size",
  "font-size-adjust",
  "font-smooth",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-synthesis-position",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-emoji",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-variation-settings",
  "font-weight",
  "forced-color-adjust",
  "gap",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid",
  "grid-area",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-column",
  "grid-column-end",
  "grid-column-start",
  "grid-gap",
  "grid-row",
  "grid-row-end",
  "grid-row-start",
  "grid-template",
  "grid-template-areas",
  "grid-template-columns",
  "grid-template-rows",
  "hanging-punctuation",
  "height",
  "hyphenate-character",
  "hyphenate-limit-chars",
  "hyphens",
  "icon",
  "image-orientation",
  "image-rendering",
  "image-resolution",
  "ime-mode",
  "initial-letter",
  "initial-letter-align",
  "inline-size",
  "inset",
  "inset-area",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "isolation",
  "justify-content",
  "justify-items",
  "justify-self",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "line-height-step",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-trim",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marks",
  "mask",
  "mask-border",
  "mask-border-mode",
  "mask-border-outset",
  "mask-border-repeat",
  "mask-border-slice",
  "mask-border-source",
  "mask-border-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-mode",
  "mask-origin",
  "mask-position",
  "mask-repeat",
  "mask-size",
  "mask-type",
  "masonry-auto-flow",
  "math-depth",
  "math-shift",
  "math-style",
  "max-block-size",
  "max-height",
  "max-inline-size",
  "max-width",
  "min-block-size",
  "min-height",
  "min-inline-size",
  "min-width",
  "mix-blend-mode",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "none",
  "normal",
  "object-fit",
  "object-position",
  "offset",
  "offset-anchor",
  "offset-distance",
  "offset-path",
  "offset-position",
  "offset-rotate",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-anchor",
  "overflow-block",
  "overflow-clip-margin",
  "overflow-inline",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "overlay",
  "overscroll-behavior",
  "overscroll-behavior-block",
  "overscroll-behavior-inline",
  "overscroll-behavior-x",
  "overscroll-behavior-y",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "pause",
  "pause-after",
  "pause-before",
  "perspective",
  "perspective-origin",
  "place-content",
  "place-items",
  "place-self",
  "pointer-events",
  "position",
  "position-anchor",
  "position-visibility",
  "print-color-adjust",
  "quotes",
  "r",
  "resize",
  "rest",
  "rest-after",
  "rest-before",
  "right",
  "rotate",
  "row-gap",
  "ruby-align",
  "ruby-position",
  "scale",
  "scroll-behavior",
  "scroll-margin",
  "scroll-margin-block",
  "scroll-margin-block-end",
  "scroll-margin-block-start",
  "scroll-margin-bottom",
  "scroll-margin-inline",
  "scroll-margin-inline-end",
  "scroll-margin-inline-start",
  "scroll-margin-left",
  "scroll-margin-right",
  "scroll-margin-top",
  "scroll-padding",
  "scroll-padding-block",
  "scroll-padding-block-end",
  "scroll-padding-block-start",
  "scroll-padding-bottom",
  "scroll-padding-inline",
  "scroll-padding-inline-end",
  "scroll-padding-inline-start",
  "scroll-padding-left",
  "scroll-padding-right",
  "scroll-padding-top",
  "scroll-snap-align",
  "scroll-snap-stop",
  "scroll-snap-type",
  "scroll-timeline",
  "scroll-timeline-axis",
  "scroll-timeline-name",
  "scrollbar-color",
  "scrollbar-gutter",
  "scrollbar-width",
  "shape-image-threshold",
  "shape-margin",
  "shape-outside",
  "shape-rendering",
  "speak",
  "speak-as",
  "src",
  // @font-face
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "text-align",
  "text-align-all",
  "text-align-last",
  "text-anchor",
  "text-combine-upright",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-skip",
  "text-decoration-skip-ink",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-indent",
  "text-justify",
  "text-orientation",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-transform",
  "text-underline-offset",
  "text-underline-position",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
  "timeline-scope",
  "top",
  "touch-action",
  "transform",
  "transform-box",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-behavior",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "translate",
  "unicode-bidi",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "view-timeline",
  "view-timeline-axis",
  "view-timeline-inset",
  "view-timeline-name",
  "view-transition-name",
  "visibility",
  "voice-balance",
  "voice-duration",
  "voice-family",
  "voice-pitch",
  "voice-range",
  "voice-rate",
  "voice-stress",
  "voice-volume",
  "white-space",
  "white-space-collapse",
  "widows",
  "width",
  "will-change",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "x",
  "y",
  "z-index",
  "zoom"
].sort().reverse();
function css(hljs) {
  const regex2 = hljs.regex;
  const modes = MODES(hljs);
  const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
  const AT_MODIFIERS = "and or not only";
  const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/;
  const IDENT_RE3 = "[a-zA-Z-][a-zA-Z0-9_-]*";
  const STRINGS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE
  ];
  return {
    name: "CSS",
    case_insensitive: true,
    illegal: /[=|'\$]/,
    keywords: { keyframePosition: "from to" },
    classNameAliases: {
      // for visual continuity with `tag {}` and because we
      // don't have a great class for this?
      keyframePosition: "selector-tag"
    },
    contains: [
      modes.BLOCK_COMMENT,
      VENDOR_PREFIX,
      // to recognize keyframe 40% etc which are outside the scope of our
      // attribute value mode
      modes.CSS_NUMBER_MODE,
      {
        className: "selector-id",
        begin: /#[A-Za-z0-9_-]+/,
        relevance: 0
      },
      {
        className: "selector-class",
        begin: "\\." + IDENT_RE3,
        relevance: 0
      },
      modes.ATTRIBUTE_SELECTOR_MODE,
      {
        className: "selector-pseudo",
        variants: [
          { begin: ":(" + PSEUDO_CLASSES.join("|") + ")" },
          { begin: ":(:)?(" + PSEUDO_ELEMENTS.join("|") + ")" }
        ]
      },
      // we may actually need this (12/2020)
      // { // pseudo-selector params
      //   begin: /\(/,
      //   end: /\)/,
      //   contains: [ hljs.CSS_NUMBER_MODE ]
      // },
      modes.CSS_VARIABLE,
      {
        className: "attribute",
        begin: "\\b(" + ATTRIBUTES.join("|") + ")\\b"
      },
      // attribute values
      {
        begin: /:/,
        end: /[;}{]/,
        contains: [
          modes.BLOCK_COMMENT,
          modes.HEXCOLOR,
          modes.IMPORTANT,
          modes.CSS_NUMBER_MODE,
          ...STRINGS,
          // needed to highlight these as strings and to avoid issues with
          // illegal characters that might be inside urls that would tigger the
          // languages illegal stack
          {
            begin: /(url|data-uri)\(/,
            end: /\)/,
            relevance: 0,
            // from keywords
            keywords: { built_in: "url data-uri" },
            contains: [
              ...STRINGS,
              {
                className: "string",
                // any character other than `)` as in `url()` will be the start
                // of a string, which ends with `)` (from the parent mode)
                begin: /[^)]/,
                endsWithParent: true,
                excludeEnd: true
              }
            ]
          },
          modes.FUNCTION_DISPATCH
        ]
      },
      {
        begin: regex2.lookahead(/@/),
        end: "[{;]",
        relevance: 0,
        illegal: /:/,
        // break on Less variables @var: ...
        contains: [
          {
            className: "keyword",
            begin: AT_PROPERTY_RE
          },
          {
            begin: /\s/,
            endsWithParent: true,
            excludeEnd: true,
            relevance: 0,
            keywords: {
              $pattern: /[a-z-]+/,
              keyword: AT_MODIFIERS,
              attribute: MEDIA_FEATURES.join(" ")
            },
            contains: [
              {
                begin: /[a-z-]+(?=:)/,
                className: "attribute"
              },
              ...STRINGS,
              modes.CSS_NUMBER_MODE
            ]
          }
        ]
      },
      {
        className: "selector-tag",
        begin: "\\b(" + TAGS.join("|") + ")\\b"
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/ini.js
function ini(hljs) {
  const regex2 = hljs.regex;
  const NUMBERS = {
    className: "number",
    relevance: 0,
    variants: [
      { begin: /([+-]+)?[\d]+_[\d_]+/ },
      { begin: hljs.NUMBER_RE }
    ]
  };
  const COMMENTS = hljs.COMMENT();
  COMMENTS.variants = [
    {
      begin: /;/,
      end: /$/
    },
    {
      begin: /#/,
      end: /$/
    }
  ];
  const VARIABLES = {
    className: "variable",
    variants: [
      { begin: /\$[\w\d"][\w\d_]*/ },
      { begin: /\$\{(.*?)\}/ }
    ]
  };
  const LITERALS3 = {
    className: "literal",
    begin: /\bon|off|true|false|yes|no\b/
  };
  const STRINGS = {
    className: "string",
    contains: [hljs.BACKSLASH_ESCAPE],
    variants: [
      {
        begin: "'''",
        end: "'''",
        relevance: 10
      },
      {
        begin: '"""',
        end: '"""',
        relevance: 10
      },
      {
        begin: '"',
        end: '"'
      },
      {
        begin: "'",
        end: "'"
      }
    ]
  };
  const ARRAY = {
    begin: /\[/,
    end: /\]/,
    contains: [
      COMMENTS,
      LITERALS3,
      VARIABLES,
      STRINGS,
      NUMBERS,
      "self"
    ],
    relevance: 0
  };
  const BARE_KEY = /[A-Za-z0-9_-]+/;
  const QUOTED_KEY_DOUBLE_QUOTE = /"(\\"|[^"])*"/;
  const QUOTED_KEY_SINGLE_QUOTE = /'[^']*'/;
  const ANY_KEY = regex2.either(
    BARE_KEY,
    QUOTED_KEY_DOUBLE_QUOTE,
    QUOTED_KEY_SINGLE_QUOTE
  );
  const DOTTED_KEY = regex2.concat(
    ANY_KEY,
    "(\\s*\\.\\s*",
    ANY_KEY,
    ")*",
    regex2.lookahead(/\s*=\s*[^#\s]/)
  );
  return {
    name: "TOML, also INI",
    aliases: ["toml"],
    case_insensitive: true,
    illegal: /\S/,
    contains: [
      COMMENTS,
      {
        className: "section",
        begin: /\[+/,
        end: /\]+/
      },
      {
        begin: DOTTED_KEY,
        className: "attr",
        starts: {
          end: /$/,
          contains: [
            COMMENTS,
            ARRAY,
            LITERALS3,
            VARIABLES,
            STRINGS,
            NUMBERS
          ]
        }
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/javascript.js
var IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
var KEYWORDS = [
  "as",
  // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
var LITERALS = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];
var TYPES = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];
var ERROR_TYPES = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];
var BUILT_IN_GLOBALS = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",
  "require",
  "exports",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];
var BUILT_IN_VARIABLES = [
  "arguments",
  "this",
  "super",
  "console",
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "module",
  "global"
  // Node.js
];
var BUILT_INS = [].concat(
  BUILT_IN_GLOBALS,
  TYPES,
  ERROR_TYPES
);
function javascript(hljs) {
  const regex2 = hljs.regex;
  const hasClosingTag = (match, { after }) => {
    const tag = "</" + match[0].slice(1);
    const pos = match.input.indexOf(tag, after);
    return pos !== -1;
  };
  const IDENT_RE$1 = IDENT_RE;
  const FRAGMENT = {
    begin: "<>",
    end: "</>"
  };
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    /**
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    isTrulyOpeningTag: (match, response) => {
      const afterMatchIndex = match[0].length + match.index;
      const nextChar = match.input[afterMatchIndex];
      if (
        // HTML should not include another raw `<` inside a tag
        // nested type?
        // `<Array<Array<number>>`, etc.
        nextChar === "<" || // the , gives away that this is not HTML
        // `<T, A extends keyof T, V>`
        nextChar === ","
      ) {
        response.ignoreMatch();
        return;
      }
      if (nextChar === ">") {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }
      }
      let m;
      const afterMatch = match.input.substring(afterMatchIndex);
      if (m = afterMatch.match(/^\s*=/)) {
        response.ignoreMatch();
        return;
      }
      if (m = afterMatch.match(/^\s+extends\s+/)) {
        if (m.index === 0) {
          response.ignoreMatch();
          return;
        }
      }
    }
  };
  const KEYWORDS$1 = {
    $pattern: IDENT_RE,
    keyword: KEYWORDS,
    literal: LITERALS,
    built_in: BUILT_INS,
    "variable.language": BUILT_IN_VARIABLES
  };
  const decimalDigits = "[0-9](_?[0-9])*";
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
  const NUMBER = {
    className: "number",
    variants: [
      // DecimalLiteral
      { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      // DecimalBigIntegerLiteral
      { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
      // NonDecimalIntegerLiteral
      { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
      { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
      { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
      // LegacyOctalIntegerLiteral (does not include underscore separators)
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      { begin: "\\b0[0-7]+n?\\b" }
    ],
    relevance: 0
  };
  const SUBST = {
    className: "subst",
    begin: "\\$\\{",
    end: "\\}",
    keywords: KEYWORDS$1,
    contains: []
    // defined later
  };
  const HTML_TEMPLATE = {
    begin: ".?html`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "xml"
    }
  };
  const CSS_TEMPLATE = {
    begin: ".?css`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "css"
    }
  };
  const GRAPHQL_TEMPLATE = {
    begin: ".?gql`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "graphql"
    }
  };
  const TEMPLATE_STRING = {
    className: "string",
    begin: "`",
    end: "`",
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  const JSDOC_COMMENT = hljs.COMMENT(
    /\/\*\*(?!\/)/,
    "\\*/",
    {
      relevance: 0,
      contains: [
        {
          begin: "(?=@[A-Za-z]+)",
          relevance: 0,
          contains: [
            {
              className: "doctag",
              begin: "@[A-Za-z]+"
            },
            {
              className: "type",
              begin: "\\{",
              end: "\\}",
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0
            },
            {
              className: "variable",
              begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
              endsParent: true,
              relevance: 0
            },
            // eat spaces (not newlines) so we can find
            // types or variables
            {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }
          ]
        }
      ]
    }
  );
  const COMMENT = {
    className: "comment",
    variants: [
      JSDOC_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE
    ]
  };
  const SUBST_INTERNALS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    GRAPHQL_TEMPLATE,
    TEMPLATE_STRING,
    // Skip numbers when they are part of a variable name
    { match: /\$\d+/ },
    NUMBER
    // This is intentional:
    // See https://github.com/highlightjs/highlight.js/issues/3288
    // hljs.REGEXP_MODE
  ];
  SUBST.contains = SUBST_INTERNALS.concat({
    // we need to pair up {} inside our subst to prevent
    // it from ending too early by matching another }
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS$1,
    contains: [
      "self"
    ].concat(SUBST_INTERNALS)
  });
  const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
    // eat recursive parens in sub expressions
    {
      begin: /(\s*)\(/,
      end: /\)/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_AND_COMMENTS)
    }
  ]);
  const PARAMS = {
    className: "params",
    // convert this to negative lookbehind in v12
    begin: /(\s*)\(/,
    // to match the parms with
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS$1,
    contains: PARAMS_CONTAINS
  };
  const CLASS_OR_EXTENDS = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1,
          /\s+/,
          /extends/,
          /\s+/,
          regex2.concat(IDENT_RE$1, "(", regex2.concat(/\./, IDENT_RE$1), ")*")
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          5: "keyword",
          7: "title.class.inherited"
        }
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1
        ],
        scope: {
          1: "keyword",
          3: "title.class"
        }
      }
    ]
  };
  const CLASS_REFERENCE = {
    relevance: 0,
    match: regex2.either(
      // Hard coded exceptions
      /\bJSON/,
      // Float32Array, OutT
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      // CSSFactory, CSSFactoryT
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      // FPs, FPsT
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
      // P
      // single letters are not highlighted
      // BLAH
      // this will be flagged as a UPPER_CASE_CONSTANT instead
    ),
    className: "title.class",
    keywords: {
      _: [
        // se we still get relevance credit for JS library classes
        ...TYPES,
        ...ERROR_TYPES
      ]
    }
  };
  const USE_STRICT = {
    label: "use_strict",
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/
  };
  const FUNCTION_DEFINITION = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          IDENT_RE$1,
          /(?=\s*\()/
        ]
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/
        ]
      }
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    label: "func.def",
    contains: [PARAMS],
    illegal: /%/
  };
  const UPPER_CASE_CONSTANT = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: "variable.constant"
  };
  function noneOf(list3) {
    return regex2.concat("(?!", list3.join("|"), ")");
  }
  const FUNCTION_CALL = {
    match: regex2.concat(
      /\b/,
      noneOf([
        ...BUILT_IN_GLOBALS,
        "super",
        "import"
      ].map((x) => `${x}\\s*\\(`)),
      IDENT_RE$1,
      regex2.lookahead(/\s*\(/)
    ),
    className: "title.function",
    relevance: 0
  };
  const PROPERTY_ACCESS = {
    begin: regex2.concat(/\./, regex2.lookahead(
      regex2.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
    )),
    end: IDENT_RE$1,
    excludeBegin: true,
    keywords: "prototype",
    className: "property",
    relevance: 0
  };
  const GETTER_OR_SETTER = {
    match: [
      /get|set/,
      /\s+/,
      IDENT_RE$1,
      /(?=\()/
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        // eat to avoid empty params
        begin: /\(\)/
      },
      PARAMS
    ]
  };
  const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
  const FUNCTION_VARIABLE = {
    match: [
      /const|var|let/,
      /\s+/,
      IDENT_RE$1,
      /\s*/,
      /=\s*/,
      /(async\s*)?/,
      // async is optional
      regex2.lookahead(FUNC_LEAD_IN_RE)
    ],
    keywords: "async",
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      PARAMS
    ]
  };
  return {
    name: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    keywords: KEYWORDS$1,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-z])/,
    contains: [
      hljs.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }),
      USE_STRICT,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      COMMENT,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      CLASS_REFERENCE,
      {
        scope: "attr",
        match: IDENT_RE$1 + regex2.lookahead(":"),
        relevance: 0
      },
      FUNCTION_VARIABLE,
      {
        // "value" container
        begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        relevance: 0,
        contains: [
          COMMENT,
          hljs.REGEXP_MODE,
          {
            className: "function",
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: "\\s*=>",
            contains: [
              {
                className: "params",
                variants: [
                  {
                    begin: hljs.UNDERSCORE_IDENT_RE,
                    relevance: 0
                  },
                  {
                    className: null,
                    begin: /\(\s*\)/,
                    skip: true
                  },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS$1,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          },
          {
            match: /\s+/,
            relevance: 0
          },
          {
            // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                // we carefully check the opening tag to see if it truly
                // is a tag and not a false positive
                "on:begin": XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end
              }
            ],
            subLanguage: "xml",
            contains: [
              {
                begin: XML_TAG.begin,
                end: XML_TAG.end,
                skip: true,
                contains: ["self"]
              }
            ]
          }
        ]
      },
      FUNCTION_DEFINITION,
      {
        // prevent this from getting swallowed up by function
        // since they appear "function like"
        beginKeywords: "while if switch catch for"
      },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        // end parens
        returnBegin: true,
        label: "func.def",
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
        ]
      },
      // catch ... so it won't trigger the property rule below
      {
        match: /\.\.\./,
        relevance: 0
      },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      {
        match: "\\$" + IDENT_RE$1,
        relevance: 0
      },
      {
        match: [/\bconstructor(?=\s*\()/],
        className: { 1: "title.function" },
        contains: [PARAMS]
      },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      {
        match: /\$[(.]/
        // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/json.js
function json(hljs) {
  const ATTRIBUTE = {
    className: "attr",
    begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
    relevance: 1.01
  };
  const PUNCTUATION = {
    match: /[{}[\],:]/,
    className: "punctuation",
    relevance: 0
  };
  const LITERALS3 = [
    "true",
    "false",
    "null"
  ];
  const LITERALS_MODE = {
    scope: "literal",
    beginKeywords: LITERALS3.join(" ")
  };
  return {
    name: "JSON",
    aliases: ["jsonc"],
    keywords: {
      literal: LITERALS3
    },
    contains: [
      ATTRIBUTE,
      PUNCTUATION,
      hljs.QUOTE_STRING_MODE,
      LITERALS_MODE,
      hljs.C_NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE
    ],
    illegal: "\\S"
  };
}

// node_modules/highlight.js/es/languages/markdown.js
function markdown(hljs) {
  const regex2 = hljs.regex;
  const INLINE_HTML = {
    begin: /<\/?[A-Za-z_]/,
    end: ">",
    subLanguage: "xml",
    relevance: 0
  };
  const HORIZONTAL_RULE = {
    begin: "^[-\\*]{3,}",
    end: "$"
  };
  const CODE2 = {
    className: "code",
    variants: [
      // TODO: fix to allow these to work with sublanguage also
      { begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*" },
      { begin: "(~{3,})[^~](.|\\n)*?\\1~*[ ]*" },
      // needed to allow markdown as a sublanguage to work
      {
        begin: "```",
        end: "```+[ ]*$"
      },
      {
        begin: "~~~",
        end: "~~~+[ ]*$"
      },
      { begin: "`.+?`" },
      {
        begin: "(?=^( {4}|\\t))",
        // use contains to gobble up multiple lines to allow the block to be whatever size
        // but only have a single open/close tag vs one per line
        contains: [
          {
            begin: "^( {4}|\\t)",
            end: "(\\n)$"
          }
        ],
        relevance: 0
      }
    ]
  };
  const LIST = {
    className: "bullet",
    begin: "^[ 	]*([*+-]|(\\d+\\.))(?=\\s+)",
    end: "\\s+",
    excludeEnd: true
  };
  const LINK_REFERENCE = {
    begin: /^\[[^\n]+\]:/,
    returnBegin: true,
    contains: [
      {
        className: "symbol",
        begin: /\[/,
        end: /\]/,
        excludeBegin: true,
        excludeEnd: true
      },
      {
        className: "link",
        begin: /:\s*/,
        end: /$/,
        excludeBegin: true
      }
    ]
  };
  const URL_SCHEME = /[A-Za-z][A-Za-z0-9+.-]*/;
  const LINK = {
    variants: [
      // too much like nested array access in so many languages
      // to have any real relevance
      {
        begin: /\[.+?\]\[.*?\]/,
        relevance: 0
      },
      // popular internet URLs
      {
        begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
        relevance: 2
      },
      {
        begin: regex2.concat(/\[.+?\]\(/, URL_SCHEME, /:\/\/.*?\)/),
        relevance: 2
      },
      // relative urls
      {
        begin: /\[.+?\]\([./?&#].*?\)/,
        relevance: 1
      },
      // whatever else, lower relevance (might not be a link at all)
      {
        begin: /\[.*?\]\(.*?\)/,
        relevance: 0
      }
    ],
    returnBegin: true,
    contains: [
      {
        // empty strings for alt or link text
        match: /\[(?=\])/
      },
      {
        className: "string",
        relevance: 0,
        begin: "\\[",
        end: "\\]",
        excludeBegin: true,
        returnEnd: true
      },
      {
        className: "link",
        relevance: 0,
        begin: "\\]\\(",
        end: "\\)",
        excludeBegin: true,
        excludeEnd: true
      },
      {
        className: "symbol",
        relevance: 0,
        begin: "\\]\\[",
        end: "\\]",
        excludeBegin: true,
        excludeEnd: true
      }
    ]
  };
  const BOLD = {
    className: "strong",
    contains: [],
    // defined later
    variants: [
      {
        begin: /_{2}(?!\s)/,
        end: /_{2}/
      },
      {
        begin: /\*{2}(?!\s)/,
        end: /\*{2}/
      }
    ]
  };
  const ITALIC = {
    className: "emphasis",
    contains: [],
    // defined later
    variants: [
      {
        begin: /\*(?![*\s])/,
        end: /\*/
      },
      {
        begin: /_(?![_\s])/,
        end: /_/,
        relevance: 0
      }
    ]
  };
  const BOLD_WITHOUT_ITALIC = hljs.inherit(BOLD, { contains: [] });
  const ITALIC_WITHOUT_BOLD = hljs.inherit(ITALIC, { contains: [] });
  BOLD.contains.push(ITALIC_WITHOUT_BOLD);
  ITALIC.contains.push(BOLD_WITHOUT_ITALIC);
  let CONTAINABLE = [
    INLINE_HTML,
    LINK
  ];
  [
    BOLD,
    ITALIC,
    BOLD_WITHOUT_ITALIC,
    ITALIC_WITHOUT_BOLD
  ].forEach((m) => {
    m.contains = m.contains.concat(CONTAINABLE);
  });
  CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);
  const HEADER = {
    className: "section",
    variants: [
      {
        begin: "^#{1,6}",
        end: "$",
        contains: CONTAINABLE
      },
      {
        begin: "(?=^.+?\\n[=-]{2,}$)",
        contains: [
          { begin: "^[=-]*$" },
          {
            begin: "^",
            end: "\\n",
            contains: CONTAINABLE
          }
        ]
      }
    ]
  };
  const BLOCKQUOTE = {
    className: "quote",
    begin: "^>\\s+",
    contains: CONTAINABLE,
    end: "$"
  };
  const ENTITY = {
    //https://spec.commonmark.org/0.31.2/#entity-references
    scope: "literal",
    match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/
  };
  return {
    name: "Markdown",
    aliases: [
      "md",
      "mkdown",
      "mkd"
    ],
    contains: [
      HEADER,
      INLINE_HTML,
      LIST,
      BOLD,
      ITALIC,
      BLOCKQUOTE,
      CODE2,
      HORIZONTAL_RULE,
      LINK,
      LINK_REFERENCE,
      ENTITY
    ]
  };
}

// node_modules/highlight.js/es/languages/python.js
function python(hljs) {
  const regex2 = hljs.regex;
  const IDENT_RE3 = /[\p{XID_Start}_]\p{XID_Continue}*/u;
  const RESERVED_WORDS = [
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "case",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "match",
    "nonlocal|10",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield"
  ];
  const BUILT_INS3 = [
    "__import__",
    "abs",
    "all",
    "any",
    "ascii",
    "bin",
    "bool",
    "breakpoint",
    "bytearray",
    "bytes",
    "callable",
    "chr",
    "classmethod",
    "compile",
    "complex",
    "delattr",
    "dict",
    "dir",
    "divmod",
    "enumerate",
    "eval",
    "exec",
    "filter",
    "float",
    "format",
    "frozenset",
    "getattr",
    "globals",
    "hasattr",
    "hash",
    "help",
    "hex",
    "id",
    "input",
    "int",
    "isinstance",
    "issubclass",
    "iter",
    "len",
    "list",
    "locals",
    "map",
    "max",
    "memoryview",
    "min",
    "next",
    "object",
    "oct",
    "open",
    "ord",
    "pow",
    "print",
    "property",
    "range",
    "repr",
    "reversed",
    "round",
    "set",
    "setattr",
    "slice",
    "sorted",
    "staticmethod",
    "str",
    "sum",
    "super",
    "tuple",
    "type",
    "vars",
    "zip"
  ];
  const LITERALS3 = [
    "__debug__",
    "Ellipsis",
    "False",
    "None",
    "NotImplemented",
    "True"
  ];
  const TYPES3 = [
    "Any",
    "Callable",
    "Coroutine",
    "Dict",
    "List",
    "Literal",
    "Generic",
    "Optional",
    "Sequence",
    "Set",
    "Tuple",
    "Type",
    "Union"
  ];
  const KEYWORDS3 = {
    $pattern: /[A-Za-z]\w+|__\w+__/,
    keyword: RESERVED_WORDS,
    built_in: BUILT_INS3,
    literal: LITERALS3,
    type: TYPES3
  };
  const PROMPT = {
    className: "meta",
    begin: /^(>>>|\.\.\.) /
  };
  const SUBST = {
    className: "subst",
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS3,
    illegal: /#/
  };
  const LITERAL_BRACKET = {
    begin: /\{\{/,
    relevance: 0
  };
  const STRING = {
    className: "string",
    contains: [hljs.BACKSLASH_ESCAPE],
    variants: [
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
        end: /'''/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT
        ],
        relevance: 10
      },
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
        end: /"""/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT
        ],
        relevance: 10
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])'''/,
        end: /'''/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])"""/,
        end: /"""/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([uU]|[rR])'/,
        end: /'/,
        relevance: 10
      },
      {
        begin: /([uU]|[rR])"/,
        end: /"/,
        relevance: 10
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])'/,
        end: /'/
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])"/,
        end: /"/
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])'/,
        end: /'/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])"/,
        end: /"/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ]
  };
  const digitpart = "[0-9](_?[0-9])*";
  const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
  const lookahead = `\\b|${RESERVED_WORDS.join("|")}`;
  const NUMBER = {
    className: "number",
    relevance: 0,
    variants: [
      // exponentfloat, pointfloat
      // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
      // optionally imaginary
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      // Note: no leading \b because floats can start with a decimal point
      // and we don't want to mishandle e.g. `fn(.5)`,
      // no trailing \b for pointfloat because it can end with a decimal point
      // and we don't want to mishandle e.g. `0..hex()`; this should be safe
      // because both MUST contain a decimal point and so cannot be confused with
      // the interior part of an identifier
      {
        begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
      },
      {
        begin: `(${pointfloat})[jJ]?`
      },
      // decinteger, bininteger, octinteger, hexinteger
      // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
      // optionally "long" in Python 2
      // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
      // decinteger is optionally imaginary
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      {
        begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
      },
      {
        begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
      },
      {
        begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
      },
      {
        begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
      },
      // imagnumber (digitpart-based)
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      {
        begin: `\\b(${digitpart})[jJ](?=${lookahead})`
      }
    ]
  };
  const COMMENT_TYPE = {
    className: "comment",
    begin: regex2.lookahead(/# type:/),
    end: /$/,
    keywords: KEYWORDS3,
    contains: [
      {
        // prevent keywords from coloring `type`
        begin: /# type:/
      },
      // comment within a datatype comment includes no keywords
      {
        begin: /#/,
        end: /\b\B/,
        endsWithParent: true
      }
    ]
  };
  const PARAMS = {
    className: "params",
    variants: [
      // Exclude params in functions without params
      {
        className: "",
        begin: /\(\s*\)/,
        skip: true
      },
      {
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS3,
        contains: [
          "self",
          PROMPT,
          NUMBER,
          STRING,
          hljs.HASH_COMMENT_MODE
        ]
      }
    ]
  };
  SUBST.contains = [
    STRING,
    NUMBER,
    PROMPT
  ];
  return {
    name: "Python",
    aliases: [
      "py",
      "gyp",
      "ipython"
    ],
    unicodeRegex: true,
    keywords: KEYWORDS3,
    illegal: /(<\/|\?)|=>/,
    contains: [
      PROMPT,
      NUMBER,
      {
        // very common convention
        scope: "variable.language",
        match: /\bself\b/
      },
      {
        // eat "if" prior to string so that it won't accidentally be
        // labeled as an f-string
        beginKeywords: "if",
        relevance: 0
      },
      { match: /\bor\b/, scope: "keyword" },
      STRING,
      COMMENT_TYPE,
      hljs.HASH_COMMENT_MODE,
      {
        match: [
          /\bdef/,
          /\s+/,
          IDENT_RE3
        ],
        scope: {
          1: "keyword",
          3: "title.function"
        },
        contains: [PARAMS]
      },
      {
        variants: [
          {
            match: [
              /\bclass/,
              /\s+/,
              IDENT_RE3,
              /\s*/,
              /\(\s*/,
              IDENT_RE3,
              /\s*\)/
            ]
          },
          {
            match: [
              /\bclass/,
              /\s+/,
              IDENT_RE3
            ]
          }
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          6: "title.class.inherited"
        }
      },
      {
        className: "meta",
        begin: /^[\t ]*@/,
        end: /(?=#)|$/,
        contains: [
          NUMBER,
          PARAMS,
          STRING
        ]
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/scss.js
var MODES2 = (hljs) => {
  return {
    IMPORTANT: {
      scope: "meta",
      begin: "!important"
    },
    BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
    HEXCOLOR: {
      scope: "number",
      begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
    },
    FUNCTION_DISPATCH: {
      className: "built_in",
      begin: /[\w-]+(?=\()/
    },
    ATTRIBUTE_SELECTOR_MODE: {
      scope: "selector-attr",
      begin: /\[/,
      end: /\]/,
      illegal: "$",
      contains: [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    },
    CSS_NUMBER_MODE: {
      scope: "number",
      begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
      relevance: 0
    },
    CSS_VARIABLE: {
      className: "attr",
      begin: /--[A-Za-z_][A-Za-z0-9_-]*/
    }
  };
};
var HTML_TAGS2 = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "mark",
  "menu",
  "nav",
  "object",
  "ol",
  "optgroup",
  "option",
  "p",
  "picture",
  "q",
  "quote",
  "samp",
  "section",
  "select",
  "source",
  "span",
  "strong",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "ul",
  "var",
  "video"
];
var SVG_TAGS2 = [
  "defs",
  "g",
  "marker",
  "mask",
  "pattern",
  "svg",
  "switch",
  "symbol",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feFlood",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence",
  "linearGradient",
  "radialGradient",
  "stop",
  "circle",
  "ellipse",
  "image",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "use",
  "textPath",
  "tspan",
  "foreignObject",
  "clipPath"
];
var TAGS2 = [
  ...HTML_TAGS2,
  ...SVG_TAGS2
];
var MEDIA_FEATURES2 = [
  "any-hover",
  "any-pointer",
  "aspect-ratio",
  "color",
  "color-gamut",
  "color-index",
  "device-aspect-ratio",
  "device-height",
  "device-width",
  "display-mode",
  "forced-colors",
  "grid",
  "height",
  "hover",
  "inverted-colors",
  "monochrome",
  "orientation",
  "overflow-block",
  "overflow-inline",
  "pointer",
  "prefers-color-scheme",
  "prefers-contrast",
  "prefers-reduced-motion",
  "prefers-reduced-transparency",
  "resolution",
  "scan",
  "scripting",
  "update",
  "width",
  // TODO: find a better solution?
  "min-width",
  "max-width",
  "min-height",
  "max-height"
].sort().reverse();
var PSEUDO_CLASSES2 = [
  "active",
  "any-link",
  "blank",
  "checked",
  "current",
  "default",
  "defined",
  "dir",
  // dir()
  "disabled",
  "drop",
  "empty",
  "enabled",
  "first",
  "first-child",
  "first-of-type",
  "fullscreen",
  "future",
  "focus",
  "focus-visible",
  "focus-within",
  "has",
  // has()
  "host",
  // host or host()
  "host-context",
  // host-context()
  "hover",
  "indeterminate",
  "in-range",
  "invalid",
  "is",
  // is()
  "lang",
  // lang()
  "last-child",
  "last-of-type",
  "left",
  "link",
  "local-link",
  "not",
  // not()
  "nth-child",
  // nth-child()
  "nth-col",
  // nth-col()
  "nth-last-child",
  // nth-last-child()
  "nth-last-col",
  // nth-last-col()
  "nth-last-of-type",
  //nth-last-of-type()
  "nth-of-type",
  //nth-of-type()
  "only-child",
  "only-of-type",
  "optional",
  "out-of-range",
  "past",
  "placeholder-shown",
  "read-only",
  "read-write",
  "required",
  "right",
  "root",
  "scope",
  "target",
  "target-within",
  "user-invalid",
  "valid",
  "visited",
  "where"
  // where()
].sort().reverse();
var PSEUDO_ELEMENTS2 = [
  "after",
  "backdrop",
  "before",
  "cue",
  "cue-region",
  "first-letter",
  "first-line",
  "grammar-error",
  "marker",
  "part",
  "placeholder",
  "selection",
  "slotted",
  "spelling-error"
].sort().reverse();
var ATTRIBUTES2 = [
  "accent-color",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "all",
  "anchor-name",
  "animation",
  "animation-composition",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-range",
  "animation-range-end",
  "animation-range-start",
  "animation-timeline",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backdrop-filter",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "block-size",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-style",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-style",
  "border-block-start-width",
  "border-block-style",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end-end-radius",
  "border-end-start-radius",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-style",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-style",
  "border-inline-start-width",
  "border-inline-style",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "caret-color",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "color-scheme",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "contain",
  "contain-intrinsic-block-size",
  "contain-intrinsic-height",
  "contain-intrinsic-inline-size",
  "contain-intrinsic-size",
  "contain-intrinsic-width",
  "container",
  "container-name",
  "container-type",
  "content",
  "content-visibility",
  "counter-increment",
  "counter-reset",
  "counter-set",
  "cue",
  "cue-after",
  "cue-before",
  "cursor",
  "cx",
  "cy",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "field-sizing",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "flow",
  "font",
  "font-display",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-optical-sizing",
  "font-palette",
  "font-size",
  "font-size-adjust",
  "font-smooth",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-synthesis-position",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-emoji",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-variation-settings",
  "font-weight",
  "forced-color-adjust",
  "gap",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid",
  "grid-area",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-column",
  "grid-column-end",
  "grid-column-start",
  "grid-gap",
  "grid-row",
  "grid-row-end",
  "grid-row-start",
  "grid-template",
  "grid-template-areas",
  "grid-template-columns",
  "grid-template-rows",
  "hanging-punctuation",
  "height",
  "hyphenate-character",
  "hyphenate-limit-chars",
  "hyphens",
  "icon",
  "image-orientation",
  "image-rendering",
  "image-resolution",
  "ime-mode",
  "initial-letter",
  "initial-letter-align",
  "inline-size",
  "inset",
  "inset-area",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "isolation",
  "justify-content",
  "justify-items",
  "justify-self",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "line-height-step",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-trim",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marks",
  "mask",
  "mask-border",
  "mask-border-mode",
  "mask-border-outset",
  "mask-border-repeat",
  "mask-border-slice",
  "mask-border-source",
  "mask-border-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-mode",
  "mask-origin",
  "mask-position",
  "mask-repeat",
  "mask-size",
  "mask-type",
  "masonry-auto-flow",
  "math-depth",
  "math-shift",
  "math-style",
  "max-block-size",
  "max-height",
  "max-inline-size",
  "max-width",
  "min-block-size",
  "min-height",
  "min-inline-size",
  "min-width",
  "mix-blend-mode",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "none",
  "normal",
  "object-fit",
  "object-position",
  "offset",
  "offset-anchor",
  "offset-distance",
  "offset-path",
  "offset-position",
  "offset-rotate",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-anchor",
  "overflow-block",
  "overflow-clip-margin",
  "overflow-inline",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "overlay",
  "overscroll-behavior",
  "overscroll-behavior-block",
  "overscroll-behavior-inline",
  "overscroll-behavior-x",
  "overscroll-behavior-y",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "pause",
  "pause-after",
  "pause-before",
  "perspective",
  "perspective-origin",
  "place-content",
  "place-items",
  "place-self",
  "pointer-events",
  "position",
  "position-anchor",
  "position-visibility",
  "print-color-adjust",
  "quotes",
  "r",
  "resize",
  "rest",
  "rest-after",
  "rest-before",
  "right",
  "rotate",
  "row-gap",
  "ruby-align",
  "ruby-position",
  "scale",
  "scroll-behavior",
  "scroll-margin",
  "scroll-margin-block",
  "scroll-margin-block-end",
  "scroll-margin-block-start",
  "scroll-margin-bottom",
  "scroll-margin-inline",
  "scroll-margin-inline-end",
  "scroll-margin-inline-start",
  "scroll-margin-left",
  "scroll-margin-right",
  "scroll-margin-top",
  "scroll-padding",
  "scroll-padding-block",
  "scroll-padding-block-end",
  "scroll-padding-block-start",
  "scroll-padding-bottom",
  "scroll-padding-inline",
  "scroll-padding-inline-end",
  "scroll-padding-inline-start",
  "scroll-padding-left",
  "scroll-padding-right",
  "scroll-padding-top",
  "scroll-snap-align",
  "scroll-snap-stop",
  "scroll-snap-type",
  "scroll-timeline",
  "scroll-timeline-axis",
  "scroll-timeline-name",
  "scrollbar-color",
  "scrollbar-gutter",
  "scrollbar-width",
  "shape-image-threshold",
  "shape-margin",
  "shape-outside",
  "shape-rendering",
  "speak",
  "speak-as",
  "src",
  // @font-face
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "text-align",
  "text-align-all",
  "text-align-last",
  "text-anchor",
  "text-combine-upright",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-skip",
  "text-decoration-skip-ink",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-indent",
  "text-justify",
  "text-orientation",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-transform",
  "text-underline-offset",
  "text-underline-position",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
  "timeline-scope",
  "top",
  "touch-action",
  "transform",
  "transform-box",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-behavior",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "translate",
  "unicode-bidi",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "view-timeline",
  "view-timeline-axis",
  "view-timeline-inset",
  "view-timeline-name",
  "view-transition-name",
  "visibility",
  "voice-balance",
  "voice-duration",
  "voice-family",
  "voice-pitch",
  "voice-range",
  "voice-rate",
  "voice-stress",
  "voice-volume",
  "white-space",
  "white-space-collapse",
  "widows",
  "width",
  "will-change",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "x",
  "y",
  "z-index",
  "zoom"
].sort().reverse();
function scss(hljs) {
  const modes = MODES2(hljs);
  const PSEUDO_ELEMENTS$1 = PSEUDO_ELEMENTS2;
  const PSEUDO_CLASSES$1 = PSEUDO_CLASSES2;
  const AT_IDENTIFIER = "@[a-z-]+";
  const AT_MODIFIERS = "and or not only";
  const IDENT_RE3 = "[a-zA-Z-][a-zA-Z0-9_-]*";
  const VARIABLE = {
    className: "variable",
    begin: "(\\$" + IDENT_RE3 + ")\\b",
    relevance: 0
  };
  return {
    name: "SCSS",
    case_insensitive: true,
    illegal: "[=/|']",
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      // to recognize keyframe 40% etc which are outside the scope of our
      // attribute value mode
      modes.CSS_NUMBER_MODE,
      {
        className: "selector-id",
        begin: "#[A-Za-z0-9_-]+",
        relevance: 0
      },
      {
        className: "selector-class",
        begin: "\\.[A-Za-z0-9_-]+",
        relevance: 0
      },
      modes.ATTRIBUTE_SELECTOR_MODE,
      {
        className: "selector-tag",
        begin: "\\b(" + TAGS2.join("|") + ")\\b",
        // was there, before, but why?
        relevance: 0
      },
      {
        className: "selector-pseudo",
        begin: ":(" + PSEUDO_CLASSES$1.join("|") + ")"
      },
      {
        className: "selector-pseudo",
        begin: ":(:)?(" + PSEUDO_ELEMENTS$1.join("|") + ")"
      },
      VARIABLE,
      {
        // pseudo-selector params
        begin: /\(/,
        end: /\)/,
        contains: [modes.CSS_NUMBER_MODE]
      },
      modes.CSS_VARIABLE,
      {
        className: "attribute",
        begin: "\\b(" + ATTRIBUTES2.join("|") + ")\\b"
      },
      { begin: "\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b" },
      {
        begin: /:/,
        end: /[;}{]/,
        relevance: 0,
        contains: [
          modes.BLOCK_COMMENT,
          VARIABLE,
          modes.HEXCOLOR,
          modes.CSS_NUMBER_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          modes.IMPORTANT,
          modes.FUNCTION_DISPATCH
        ]
      },
      // matching these here allows us to treat them more like regular CSS
      // rules so everything between the {} gets regular rule highlighting,
      // which is what we want for page and font-face
      {
        begin: "@(page|font-face)",
        keywords: {
          $pattern: AT_IDENTIFIER,
          keyword: "@page @font-face"
        }
      },
      {
        begin: "@",
        end: "[{;]",
        returnBegin: true,
        keywords: {
          $pattern: /[a-z-]+/,
          keyword: AT_MODIFIERS,
          attribute: MEDIA_FEATURES2.join(" ")
        },
        contains: [
          {
            begin: AT_IDENTIFIER,
            className: "keyword"
          },
          {
            begin: /[a-z-]+(?=:)/,
            className: "attribute"
          },
          VARIABLE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          modes.HEXCOLOR,
          modes.CSS_NUMBER_MODE
        ]
      },
      modes.FUNCTION_DISPATCH
    ]
  };
}

// node_modules/highlight.js/es/languages/typescript.js
var IDENT_RE2 = "[A-Za-z$_][0-9A-Za-z$_]*";
var KEYWORDS2 = [
  "as",
  // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
var LITERALS2 = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];
var TYPES2 = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];
var ERROR_TYPES2 = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];
var BUILT_IN_GLOBALS2 = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",
  "require",
  "exports",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];
var BUILT_IN_VARIABLES2 = [
  "arguments",
  "this",
  "super",
  "console",
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "module",
  "global"
  // Node.js
];
var BUILT_INS2 = [].concat(
  BUILT_IN_GLOBALS2,
  TYPES2,
  ERROR_TYPES2
);
function javascript2(hljs) {
  const regex2 = hljs.regex;
  const hasClosingTag = (match, { after }) => {
    const tag = "</" + match[0].slice(1);
    const pos = match.input.indexOf(tag, after);
    return pos !== -1;
  };
  const IDENT_RE$1 = IDENT_RE2;
  const FRAGMENT = {
    begin: "<>",
    end: "</>"
  };
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    /**
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    isTrulyOpeningTag: (match, response) => {
      const afterMatchIndex = match[0].length + match.index;
      const nextChar = match.input[afterMatchIndex];
      if (
        // HTML should not include another raw `<` inside a tag
        // nested type?
        // `<Array<Array<number>>`, etc.
        nextChar === "<" || // the , gives away that this is not HTML
        // `<T, A extends keyof T, V>`
        nextChar === ","
      ) {
        response.ignoreMatch();
        return;
      }
      if (nextChar === ">") {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }
      }
      let m;
      const afterMatch = match.input.substring(afterMatchIndex);
      if (m = afterMatch.match(/^\s*=/)) {
        response.ignoreMatch();
        return;
      }
      if (m = afterMatch.match(/^\s+extends\s+/)) {
        if (m.index === 0) {
          response.ignoreMatch();
          return;
        }
      }
    }
  };
  const KEYWORDS$1 = {
    $pattern: IDENT_RE2,
    keyword: KEYWORDS2,
    literal: LITERALS2,
    built_in: BUILT_INS2,
    "variable.language": BUILT_IN_VARIABLES2
  };
  const decimalDigits = "[0-9](_?[0-9])*";
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
  const NUMBER = {
    className: "number",
    variants: [
      // DecimalLiteral
      { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      // DecimalBigIntegerLiteral
      { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
      // NonDecimalIntegerLiteral
      { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
      { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
      { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
      // LegacyOctalIntegerLiteral (does not include underscore separators)
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      { begin: "\\b0[0-7]+n?\\b" }
    ],
    relevance: 0
  };
  const SUBST = {
    className: "subst",
    begin: "\\$\\{",
    end: "\\}",
    keywords: KEYWORDS$1,
    contains: []
    // defined later
  };
  const HTML_TEMPLATE = {
    begin: ".?html`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "xml"
    }
  };
  const CSS_TEMPLATE = {
    begin: ".?css`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "css"
    }
  };
  const GRAPHQL_TEMPLATE = {
    begin: ".?gql`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "graphql"
    }
  };
  const TEMPLATE_STRING = {
    className: "string",
    begin: "`",
    end: "`",
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  const JSDOC_COMMENT = hljs.COMMENT(
    /\/\*\*(?!\/)/,
    "\\*/",
    {
      relevance: 0,
      contains: [
        {
          begin: "(?=@[A-Za-z]+)",
          relevance: 0,
          contains: [
            {
              className: "doctag",
              begin: "@[A-Za-z]+"
            },
            {
              className: "type",
              begin: "\\{",
              end: "\\}",
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0
            },
            {
              className: "variable",
              begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
              endsParent: true,
              relevance: 0
            },
            // eat spaces (not newlines) so we can find
            // types or variables
            {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }
          ]
        }
      ]
    }
  );
  const COMMENT = {
    className: "comment",
    variants: [
      JSDOC_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE
    ]
  };
  const SUBST_INTERNALS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    GRAPHQL_TEMPLATE,
    TEMPLATE_STRING,
    // Skip numbers when they are part of a variable name
    { match: /\$\d+/ },
    NUMBER
    // This is intentional:
    // See https://github.com/highlightjs/highlight.js/issues/3288
    // hljs.REGEXP_MODE
  ];
  SUBST.contains = SUBST_INTERNALS.concat({
    // we need to pair up {} inside our subst to prevent
    // it from ending too early by matching another }
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS$1,
    contains: [
      "self"
    ].concat(SUBST_INTERNALS)
  });
  const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
    // eat recursive parens in sub expressions
    {
      begin: /(\s*)\(/,
      end: /\)/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_AND_COMMENTS)
    }
  ]);
  const PARAMS = {
    className: "params",
    // convert this to negative lookbehind in v12
    begin: /(\s*)\(/,
    // to match the parms with
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS$1,
    contains: PARAMS_CONTAINS
  };
  const CLASS_OR_EXTENDS = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1,
          /\s+/,
          /extends/,
          /\s+/,
          regex2.concat(IDENT_RE$1, "(", regex2.concat(/\./, IDENT_RE$1), ")*")
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          5: "keyword",
          7: "title.class.inherited"
        }
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1
        ],
        scope: {
          1: "keyword",
          3: "title.class"
        }
      }
    ]
  };
  const CLASS_REFERENCE = {
    relevance: 0,
    match: regex2.either(
      // Hard coded exceptions
      /\bJSON/,
      // Float32Array, OutT
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      // CSSFactory, CSSFactoryT
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      // FPs, FPsT
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
      // P
      // single letters are not highlighted
      // BLAH
      // this will be flagged as a UPPER_CASE_CONSTANT instead
    ),
    className: "title.class",
    keywords: {
      _: [
        // se we still get relevance credit for JS library classes
        ...TYPES2,
        ...ERROR_TYPES2
      ]
    }
  };
  const USE_STRICT = {
    label: "use_strict",
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/
  };
  const FUNCTION_DEFINITION = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          IDENT_RE$1,
          /(?=\s*\()/
        ]
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/
        ]
      }
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    label: "func.def",
    contains: [PARAMS],
    illegal: /%/
  };
  const UPPER_CASE_CONSTANT = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: "variable.constant"
  };
  function noneOf(list3) {
    return regex2.concat("(?!", list3.join("|"), ")");
  }
  const FUNCTION_CALL = {
    match: regex2.concat(
      /\b/,
      noneOf([
        ...BUILT_IN_GLOBALS2,
        "super",
        "import"
      ].map((x) => `${x}\\s*\\(`)),
      IDENT_RE$1,
      regex2.lookahead(/\s*\(/)
    ),
    className: "title.function",
    relevance: 0
  };
  const PROPERTY_ACCESS = {
    begin: regex2.concat(/\./, regex2.lookahead(
      regex2.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
    )),
    end: IDENT_RE$1,
    excludeBegin: true,
    keywords: "prototype",
    className: "property",
    relevance: 0
  };
  const GETTER_OR_SETTER = {
    match: [
      /get|set/,
      /\s+/,
      IDENT_RE$1,
      /(?=\()/
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        // eat to avoid empty params
        begin: /\(\)/
      },
      PARAMS
    ]
  };
  const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
  const FUNCTION_VARIABLE = {
    match: [
      /const|var|let/,
      /\s+/,
      IDENT_RE$1,
      /\s*/,
      /=\s*/,
      /(async\s*)?/,
      // async is optional
      regex2.lookahead(FUNC_LEAD_IN_RE)
    ],
    keywords: "async",
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      PARAMS
    ]
  };
  return {
    name: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    keywords: KEYWORDS$1,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-z])/,
    contains: [
      hljs.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }),
      USE_STRICT,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      COMMENT,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      CLASS_REFERENCE,
      {
        scope: "attr",
        match: IDENT_RE$1 + regex2.lookahead(":"),
        relevance: 0
      },
      FUNCTION_VARIABLE,
      {
        // "value" container
        begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        relevance: 0,
        contains: [
          COMMENT,
          hljs.REGEXP_MODE,
          {
            className: "function",
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: "\\s*=>",
            contains: [
              {
                className: "params",
                variants: [
                  {
                    begin: hljs.UNDERSCORE_IDENT_RE,
                    relevance: 0
                  },
                  {
                    className: null,
                    begin: /\(\s*\)/,
                    skip: true
                  },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS$1,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          },
          {
            match: /\s+/,
            relevance: 0
          },
          {
            // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                // we carefully check the opening tag to see if it truly
                // is a tag and not a false positive
                "on:begin": XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end
              }
            ],
            subLanguage: "xml",
            contains: [
              {
                begin: XML_TAG.begin,
                end: XML_TAG.end,
                skip: true,
                contains: ["self"]
              }
            ]
          }
        ]
      },
      FUNCTION_DEFINITION,
      {
        // prevent this from getting swallowed up by function
        // since they appear "function like"
        beginKeywords: "while if switch catch for"
      },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        // end parens
        returnBegin: true,
        label: "func.def",
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
        ]
      },
      // catch ... so it won't trigger the property rule below
      {
        match: /\.\.\./,
        relevance: 0
      },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      {
        match: "\\$" + IDENT_RE$1,
        relevance: 0
      },
      {
        match: [/\bconstructor(?=\s*\()/],
        className: { 1: "title.function" },
        contains: [PARAMS]
      },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      {
        match: /\$[(.]/
        // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      }
    ]
  };
}
function typescript(hljs) {
  const regex2 = hljs.regex;
  const tsLanguage = javascript2(hljs);
  const IDENT_RE$1 = IDENT_RE2;
  const TYPES3 = [
    "any",
    "void",
    "number",
    "boolean",
    "string",
    "object",
    "never",
    "symbol",
    "bigint",
    "unknown"
  ];
  const NAMESPACE = {
    begin: [
      /namespace/,
      /\s+/,
      hljs.IDENT_RE
    ],
    beginScope: {
      1: "keyword",
      3: "title.class"
    }
  };
  const INTERFACE = {
    beginKeywords: "interface",
    end: /\{/,
    excludeEnd: true,
    keywords: {
      keyword: "interface extends",
      built_in: TYPES3
    },
    contains: [tsLanguage.exports.CLASS_REFERENCE]
  };
  const USE_STRICT = {
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use strict['"]/
  };
  const TS_SPECIFIC_KEYWORDS = [
    "type",
    // "namespace",
    "interface",
    "public",
    "private",
    "protected",
    "implements",
    "declare",
    "abstract",
    "readonly",
    "enum",
    "override",
    "satisfies"
  ];
  const KEYWORDS$1 = {
    $pattern: IDENT_RE2,
    keyword: KEYWORDS2.concat(TS_SPECIFIC_KEYWORDS),
    literal: LITERALS2,
    built_in: BUILT_INS2.concat(TYPES3),
    "variable.language": BUILT_IN_VARIABLES2
  };
  const DECORATOR = {
    className: "meta",
    begin: "@" + IDENT_RE$1
  };
  const swapMode = (mode, label3, replacement) => {
    const indx = mode.contains.findIndex((m) => m.label === label3);
    if (indx === -1) {
      throw new Error("can not find mode to replace");
    }
    mode.contains.splice(indx, 1, replacement);
  };
  Object.assign(tsLanguage.keywords, KEYWORDS$1);
  tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
  const ATTRIBUTE_HIGHLIGHT = tsLanguage.contains.find((c) => c.scope === "attr");
  const OPTIONAL_KEY_OR_ARGUMENT = Object.assign(
    {},
    ATTRIBUTE_HIGHLIGHT,
    { match: regex2.concat(IDENT_RE$1, regex2.lookahead(/\s*\?:/)) }
  );
  tsLanguage.exports.PARAMS_CONTAINS.push([
    tsLanguage.exports.CLASS_REFERENCE,
    // class reference for highlighting the params types
    ATTRIBUTE_HIGHLIGHT,
    // highlight the params key
    OPTIONAL_KEY_OR_ARGUMENT
    // Added for optional property assignment highlighting
  ]);
  tsLanguage.contains = tsLanguage.contains.concat([
    DECORATOR,
    NAMESPACE,
    INTERFACE,
    OPTIONAL_KEY_OR_ARGUMENT
    // Added for optional property assignment highlighting
  ]);
  swapMode(tsLanguage, "shebang", hljs.SHEBANG());
  swapMode(tsLanguage, "use_strict", USE_STRICT);
  const functionDeclaration = tsLanguage.contains.find((m) => m.label === "func.def");
  functionDeclaration.relevance = 0;
  Object.assign(tsLanguage, {
    name: "TypeScript",
    aliases: [
      "ts",
      "tsx",
      "mts",
      "cts"
    ]
  });
  return tsLanguage;
}

// node_modules/highlight.js/es/languages/xml.js
function xml(hljs) {
  const regex2 = hljs.regex;
  const TAG_NAME_RE = regex2.concat(/[\p{L}_]/u, regex2.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
  const XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
  const XML_ENTITIES = {
    className: "symbol",
    begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
  };
  const XML_META_KEYWORDS = {
    begin: /\s/,
    contains: [
      {
        className: "keyword",
        begin: /#?[a-z_][a-z1-9_-]+/,
        illegal: /\n/
      }
    ]
  };
  const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
    begin: /\(/,
    end: /\)/
  });
  const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, { className: "string" });
  const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, { className: "string" });
  const TAG_INTERNALS = {
    endsWithParent: true,
    illegal: /</,
    relevance: 0,
    contains: [
      {
        className: "attr",
        begin: XML_IDENT_RE,
        relevance: 0
      },
      {
        begin: /=\s*/,
        relevance: 0,
        contains: [
          {
            className: "string",
            endsParent: true,
            variants: [
              {
                begin: /"/,
                end: /"/,
                contains: [XML_ENTITIES]
              },
              {
                begin: /'/,
                end: /'/,
                contains: [XML_ENTITIES]
              },
              { begin: /[^\s"'=<>`]+/ }
            ]
          }
        ]
      }
    ]
  };
  return {
    name: "HTML, XML",
    aliases: [
      "html",
      "xhtml",
      "rss",
      "atom",
      "xjb",
      "xsd",
      "xsl",
      "plist",
      "wsf",
      "svg"
    ],
    case_insensitive: true,
    unicodeRegex: true,
    contains: [
      {
        className: "meta",
        begin: /<![a-z]/,
        end: />/,
        relevance: 10,
        contains: [
          XML_META_KEYWORDS,
          QUOTE_META_STRING_MODE,
          APOS_META_STRING_MODE,
          XML_META_PAR_KEYWORDS,
          {
            begin: /\[/,
            end: /\]/,
            contains: [
              {
                className: "meta",
                begin: /<![a-z]/,
                end: />/,
                contains: [
                  XML_META_KEYWORDS,
                  XML_META_PAR_KEYWORDS,
                  QUOTE_META_STRING_MODE,
                  APOS_META_STRING_MODE
                ]
              }
            ]
          }
        ]
      },
      hljs.COMMENT(
        /<!--/,
        /-->/,
        { relevance: 10 }
      ),
      {
        begin: /<!\[CDATA\[/,
        end: /\]\]>/,
        relevance: 10
      },
      XML_ENTITIES,
      // xml processing instructions
      {
        className: "meta",
        end: /\?>/,
        variants: [
          {
            begin: /<\?xml/,
            relevance: 10,
            contains: [
              QUOTE_META_STRING_MODE
            ]
          },
          {
            begin: /<\?[a-z][a-z0-9]+/
          }
        ]
      },
      {
        className: "tag",
        /*
        The lookahead pattern (?=...) ensures that 'begin' only matches
        '<style' as a single word, followed by a whitespace or an
        ending bracket.
        */
        begin: /<style(?=\s|>)/,
        end: />/,
        keywords: { name: "style" },
        contains: [TAG_INTERNALS],
        starts: {
          end: /<\/style>/,
          returnEnd: true,
          subLanguage: [
            "css",
            "xml"
          ]
        }
      },
      {
        className: "tag",
        // See the comment in the <style tag about the lookahead pattern
        begin: /<script(?=\s|>)/,
        end: />/,
        keywords: { name: "script" },
        contains: [TAG_INTERNALS],
        starts: {
          end: /<\/script>/,
          returnEnd: true,
          subLanguage: [
            "javascript",
            "handlebars",
            "xml"
          ]
        }
      },
      // we need this for now for jSX
      {
        className: "tag",
        begin: /<>|<\/>/
      },
      // open tag
      {
        className: "tag",
        begin: regex2.concat(
          /</,
          regex2.lookahead(regex2.concat(
            TAG_NAME_RE,
            // <tag/>
            // <tag>
            // <tag ...
            regex2.either(/\/>/, />/, /\s/)
          ))
        ),
        end: /\/?>/,
        contains: [
          {
            className: "name",
            begin: TAG_NAME_RE,
            relevance: 0,
            starts: TAG_INTERNALS
          }
        ]
      },
      // close tag
      {
        className: "tag",
        begin: regex2.concat(
          /<\//,
          regex2.lookahead(regex2.concat(
            TAG_NAME_RE,
            />/
          ))
        ),
        contains: [
          {
            className: "name",
            begin: TAG_NAME_RE,
            relevance: 0
          },
          {
            begin: />/,
            relevance: 0,
            endsParent: true
          }
        ]
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/yaml.js
function yaml(hljs) {
  const LITERALS3 = "true false yes no null";
  const URI_CHARACTERS = "[\\w#;/?:@&=+$,.~*'()[\\]]+";
  const KEY = {
    className: "attr",
    variants: [
      // added brackets support and special char support
      { begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
      {
        // double quoted keys - with brackets and special char support
        begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/
      },
      {
        // single quoted keys - with brackets and special char support
        begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/
      }
    ]
  };
  const TEMPLATE_VARIABLES = {
    className: "template-variable",
    variants: [
      {
        // jinja templates Ansible
        begin: /\{\{/,
        end: /\}\}/
      },
      {
        // Ruby i18n
        begin: /%\{/,
        end: /\}/
      }
    ]
  };
  const SINGLE_QUOTE_STRING = {
    className: "string",
    relevance: 0,
    begin: /'/,
    end: /'/,
    contains: [
      {
        match: /''/,
        scope: "char.escape",
        relevance: 0
      }
    ]
  };
  const STRING = {
    className: "string",
    relevance: 0,
    variants: [
      {
        begin: /"/,
        end: /"/
      },
      { begin: /\S+/ }
    ],
    contains: [
      hljs.BACKSLASH_ESCAPE,
      TEMPLATE_VARIABLES
    ]
  };
  const CONTAINER_STRING = hljs.inherit(STRING, { variants: [
    {
      begin: /'/,
      end: /'/,
      contains: [
        {
          begin: /''/,
          relevance: 0
        }
      ]
    },
    {
      begin: /"/,
      end: /"/
    },
    { begin: /[^\s,{}[\]]+/ }
  ] });
  const DATE_RE = "[0-9]{4}(-[0-9][0-9]){0,2}";
  const TIME_RE = "([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?";
  const FRACTION_RE = "(\\.[0-9]*)?";
  const ZONE_RE = "([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?";
  const TIMESTAMP = {
    className: "number",
    begin: "\\b" + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + "\\b"
  };
  const VALUE_CONTAINER = {
    end: ",",
    endsWithParent: true,
    excludeEnd: true,
    keywords: LITERALS3,
    relevance: 0
  };
  const OBJECT = {
    begin: /\{/,
    end: /\}/,
    contains: [VALUE_CONTAINER],
    illegal: "\\n",
    relevance: 0
  };
  const ARRAY = {
    begin: "\\[",
    end: "\\]",
    contains: [VALUE_CONTAINER],
    illegal: "\\n",
    relevance: 0
  };
  const MODES3 = [
    KEY,
    {
      className: "meta",
      begin: "^---\\s*$",
      relevance: 10
    },
    {
      // multi line string
      // Blocks start with a | or > followed by a newline
      //
      // Indentation of subsequent lines must be the same to
      // be considered part of the block
      className: "string",
      begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"
    },
    {
      // Ruby/Rails erb
      begin: "<%[%=-]?",
      end: "[%-]?%>",
      subLanguage: "ruby",
      excludeBegin: true,
      excludeEnd: true,
      relevance: 0
    },
    {
      // named tags
      className: "type",
      begin: "!\\w+!" + URI_CHARACTERS
    },
    // https://yaml.org/spec/1.2/spec.html#id2784064
    {
      // verbatim tags
      className: "type",
      begin: "!<" + URI_CHARACTERS + ">"
    },
    {
      // primary tags
      className: "type",
      begin: "!" + URI_CHARACTERS
    },
    {
      // secondary tags
      className: "type",
      begin: "!!" + URI_CHARACTERS
    },
    {
      // fragment id &ref
      className: "meta",
      begin: "&" + hljs.UNDERSCORE_IDENT_RE + "$"
    },
    {
      // fragment reference *ref
      className: "meta",
      begin: "\\*" + hljs.UNDERSCORE_IDENT_RE + "$"
    },
    {
      // array listing
      className: "bullet",
      // TODO: remove |$ hack when we have proper look-ahead support
      begin: "-(?=[ ]|$)",
      relevance: 0
    },
    hljs.HASH_COMMENT_MODE,
    {
      beginKeywords: LITERALS3,
      keywords: { literal: LITERALS3 }
    },
    TIMESTAMP,
    // numbers are any valid C-style number that
    // sit isolated from other words
    {
      className: "number",
      begin: hljs.C_NUMBER_RE + "\\b",
      relevance: 0
    },
    OBJECT,
    ARRAY,
    SINGLE_QUOTE_STRING,
    STRING
  ];
  const VALUE_MODES = [...MODES3];
  VALUE_MODES.pop();
  VALUE_MODES.push(CONTAINER_STRING);
  VALUE_CONTAINER.contains = VALUE_MODES;
  return {
    name: "YAML",
    case_insensitive: true,
    aliases: ["yml"],
    contains: MODES3
  };
}

// src/diff-highlight.ts
var LANGUAGES = { bash, css, ini, javascript, json, markdown, python, scss, typescript, xml, yaml };
for (const [name, language] of Object.entries(LANGUAGES)) core_default.registerLanguage(name, language);
var BY_EXTENSION = {
  bash: "bash",
  sh: "bash",
  cfg: "ini",
  ini: "ini",
  toml: "ini",
  css: "css",
  scss: "scss",
  cjs: "javascript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  ga: "json",
  json: "json",
  md: "markdown",
  py: "python",
  cts: "typescript",
  mts: "typescript",
  ts: "typescript",
  tsx: "typescript",
  html: "xml",
  svg: "xml",
  vue: "xml",
  xml: "xml",
  xsd: "xml",
  cwl: "yaml",
  yaml: "yaml",
  yml: "yaml"
};
var MAX_CHARS = 2e5;
function languageForPath(path, lines = []) {
  const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.sample$/, "");
  const dot = name.lastIndexOf(".");
  if (dot < 1) return null;
  const extension = name.slice(dot + 1).toLowerCase();
  if (extension === "vue" && !lines.some((line) => line.trimStart().startsWith("<"))) return "typescript";
  return BY_EXTENSION[extension] ?? null;
}
var ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'" };
var decode = (text2) => text2.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity]);
function tokensByLine(markup) {
  const lines = [[]];
  const open = [];
  for (const part of markup.split(/(<span class="[^"]*">|<\/span>)/)) {
    if (part.startsWith("<span")) open.push(part.slice('<span class="'.length, -2));
    else if (part === "</span>") open.pop();
    else if (part) {
      decode(part).split("\n").forEach((text2, i) => {
        if (i) lines.push([]);
        if (text2) lines[lines.length - 1].push(open.length ? { text: text2, scope: open[open.length - 1] } : { text: text2 });
      });
    }
  }
  return lines;
}
function runsOn(top) {
  for (let mode = top; mode; mode = mode.parent) {
    if (mode.scope === "string" || mode.scope === "comment") return true;
  }
  return false;
}
var highlight = (language, code) => core_default.highlight(code, { language, ignoreIllegals: true });
function vueOpener(path, lines) {
  if (!path.endsWith(".vue")) return [];
  const close = lines.findIndex((line) => line.trim() === "<\/script>");
  const open = lines.findIndex((line) => line.trimStart().startsWith("<script"));
  return close >= 0 && (open < 0 || open > close) ? ["<script>"] : [];
}
function highlightLines(language, lines, before = []) {
  const whole = highlight(language, [...before, ...lines].join("\n"));
  if (!runsOn(whole._top)) return tokensByLine(whole.value).slice(before.length);
  return lines.map((line) => tokensByLine(highlight(language, line).value)[0]);
}
function highlightDiff(path, rows, maxChars = MAX_CHARS) {
  if (!rows.length || rows.reduce((n, row) => n + row.text.length, 0) > maxChars) return null;
  const language = languageForPath(path, rows.map((row) => row.text));
  if (!language) return null;
  const side = (kind) => {
    const lines = rows.filter((row) => row.kind === kind || row.kind === "context").map((row) => row.text);
    return highlightLines(language, lines, vueOpener(path, lines));
  };
  const after = side("add");
  const before = rows.some((row) => row.kind === "del") ? side("del") : [];
  let oldLine = 0;
  let newLine = 0;
  return rows.map((row) => {
    if (row.kind === "del") return before[oldLine++] ?? [];
    if (row.kind === "context") oldLine++;
    return after[newLine++] ?? [];
  });
}
function splitHunkHeader(header) {
  const end = header.indexOf("@@", 2);
  if (!header.startsWith("@@") || end < 0) return { range: header, context: "" };
  return { range: header.slice(0, end + 2), context: header.slice(end + 2).trim() };
}

// src/diff-review-threads.ts
function newThreadUi() {
  return { draft: null, replyDrafts: /* @__PURE__ */ new Map(), openThreadsOnly: false, showResolved: false, activeThreadId: null };
}
function el(parent, tag, cls, text2) {
  const node = document.createElement(tag);
  node.className = cls;
  if (text2 !== void 0) node.textContent = text2;
  parent.appendChild(node);
  return node;
}
function button(parent, text2, click) {
  const b = el(parent, "button", "gbdr-thread-button", text2);
  b.type = "button";
  b.onclick = click;
  return b;
}
var errorText = (e) => e instanceof Error ? e.message : String(e);
function editor(parent, state, label3, save, saved, redraw) {
  const form = el(parent, "form", "gbdr-comment-form");
  const input = el(form, "textarea", "gbdr-comment-input");
  input.setAttribute("aria-label", label3);
  input.placeholder = label3;
  input.value = state.body;
  input.disabled = state.saving;
  input.oninput = () => {
    state.body = input.value;
  };
  const submit = el(form, "button", "mod-cta", state.saving ? "Saving\u2026" : "Save");
  submit.type = "submit";
  submit.disabled = state.saving;
  if (state.error) el(form, "p", "gbdr-comment-error", state.error);
  form.onsubmit = (event) => {
    event.preventDefault();
    if (state.saving || !state.body.trim()) return;
    state.saving = true;
    state.error = void 0;
    input.disabled = submit.disabled = true;
    void save().then(saved).catch((error) => {
      state.error = errorText(error);
    }).finally(() => {
      state.saving = false;
      redraw();
    });
  };
}
function renderCommentDraft(parent, ui, actions, redraw) {
  const draft = ui.draft;
  if (!draft) return;
  const box = el(parent, "div", "gbdr-comment-draft");
  const o = draft.origin;
  el(box, "strong", "", `Comment on ${o.path} \xB7 ${o.side} lines ${o.range.join("\u2013")}`);
  el(box, "div", "gbdr-meta", `Original snapshot: ${o.snapshotId}`);
  el(box, "pre", "gbdr-comment-quote", o.quote);
  editor(box, draft, "Review comment", () => actions.createThread(o, draft.body), () => {
    if (ui.draft === draft) ui.draft = null;
  }, () => actions.refresh());
  const cancel = button(box, "Cancel", () => {
    ui.draft = null;
    redraw();
  });
  cancel.disabled = draft.saving;
}
function renderThread(parent, item2, view, ui, actions, redraw) {
  const { thread: t, replies, placement: p } = item2;
  const card = el(parent, "article", `gbdr-thread gbdr-thread-${p.state}`);
  card.dataset.threadId = t.id;
  card.tabIndex = 0;
  el(card, "strong", "", `${t.author} \xB7 ${t.status}`);
  el(card, "div", "gbdr-meta", `${t.origin.path} \xB7 ${t.origin.side} ${t.origin.range.join("\u2013")} \xB7 ${t.createdAt}`);
  el(card, "p", "gbdr-comment-body", t.body);
  if (p.range && p.state === "moved") el(card, "div", "gbdr-meta", `Current location: ${p.path} \xB7 ${t.origin.side} ${p.range.join("\u2013")}`);
  if (p.state === "outdated" || p.state === "unmapped") el(card, "p", "gbdr-comment-warning", p.state === "outdated" ? "Code changed or placement is ambiguous. Inspect the original excerpt before responding." : "The original location is absent from this diff. Inspect the original excerpt before responding.");
  const original = el(card, "details", "gbdr-comment-original");
  original.open = p.state === "outdated" || p.state === "unmapped";
  el(original, "summary", "", `Original excerpt \xB7 ${t.origin.snapshotId}`);
  el(original, "pre", "gbdr-comment-quote", t.origin.quote);
  for (const r of replies) {
    const reply = el(card, "div", "gbdr-reply");
    el(reply, "strong", "", `${r.author} (${r.source})`);
    el(reply, "p", "gbdr-comment-body", r.body);
    if (r.snapshotId) {
      const snapshot = view.snapshots.find((s) => s.id === r.snapshotId);
      el(reply, "div", "gbdr-meta", snapshot ? `Response revision: ${snapshot.phase} @ ${snapshot.head.slice(0, 8)}${snapshot.id === view.snapshot?.id ? " (current)" : ""}` : `Response revision: ${r.snapshotId} (snapshot unavailable)`);
    }
  }
  const controls = el(card, "div", "gbdr-thread-controls");
  button(controls, "Reply", () => {
    if (!ui.replyDrafts.has(t.id)) ui.replyDrafts.set(t.id, { body: "", saving: false });
    redraw();
  });
  const resolve3 = button(controls, t.status === "open" ? "Resolve" : "Reopen", () => {
    resolve3.disabled = true;
    void actions.resolve(t.id, t.status === "open").then(() => actions.refresh()).catch((e) => {
      el(card, "p", "gbdr-comment-error", errorText(e));
      resolve3.disabled = false;
    });
  });
  const draft = ui.replyDrafts.get(t.id);
  if (draft) editor(card, draft, "Reply to review comment", () => actions.reply(t.id, draft.body), () => {
    ui.replyDrafts.delete(t.id);
  }, () => actions.refresh());
}
function annotateHunk(parent, source, view, ui, actions, redraw) {
  const { file, hunk } = source;
  const rows = [...parent.querySelectorAll(":scope > .gbdr-diff tr")];
  for (const row of rows) {
    for (const side of ["old", "new"]) {
      const cell = row.querySelector(side === "old" ? ".line-num1" : ".line-num2");
      const line = Number(cell?.textContent?.trim());
      if (!cell || !Number.isSafeInteger(line) || line < 1) continue;
      cell.replaceChildren();
      const b = button(cell, String(line), () => {
      });
      b.className = "gbdr-comment-line";
      b.dataset.side = side;
      b.dataset.line = String(line);
      b.setAttribute("aria-label", `Comment on ${side} line ${line}; Shift-click to select a range`);
      b.onclick = (event) => {
        if (ui.draft?.saving) return;
        const previous = ui.draft?.origin;
        const extend = event.shiftKey && previous?.snapshotId === view.snapshot.id && previous?.hunkId === hunk.id && previous?.side === side;
        const start = extend ? previous.range[0] : line;
        const origin = captureReviewOrigin(view.snapshot, { path: file.path, hunkId: hunk.id, side, range: [Math.min(start, line), Math.max(start, line)] });
        ui.draft = { origin, body: ui.draft?.body ?? "", saving: false };
        redraw();
      };
      const o = ui.draft?.origin;
      if (o?.snapshotId === view.snapshot.id && o.hunkId === hunk.id && o.side === side && line >= o.range[0] && line <= o.range[1]) b.classList.add("is-selected");
    }
  }
  const insertAfter = /* @__PURE__ */ new Map();
  const anchoredPanel = (side, line) => {
    const row = line && rows.find((r) => Number(r.querySelector(side === "old" ? ".line-num1" : ".line-num2")?.textContent) === line);
    if (!row) return parent;
    const tr = document.createElement("tr");
    tr.className = "gbdr-thread-row";
    const td = document.createElement("td");
    td.colSpan = 2;
    tr.appendChild(td);
    (insertAfter.get(row) ?? row).after(tr);
    insertAfter.set(row, tr);
    return td;
  };
  if (ui.draft?.origin.snapshotId === view.snapshot.id && ui.draft.origin.hunkId === hunk.id) {
    renderCommentDraft(anchoredPanel(ui.draft.origin.side, ui.draft.origin.range[1]), ui, actions, redraw);
  }
  for (const item2 of view.threads.filter((t) => t.placement.hunkId === hunk.id && t.thread.status === "open")) {
    renderThread(anchoredPanel(item2.thread.origin.side, item2.placement.range?.[1]), item2, view, ui, actions, redraw);
  }
}

// src/diff-review-render.ts
function newReviewUi(hideReviewed = true) {
  return { ...newThreadUi(), hideReviewed, expanded: /* @__PURE__ */ new Set(), interdiffs: /* @__PURE__ */ new Set(), htmlCache: /* @__PURE__ */ new Map() };
}
var STATE_LABELS = { reviewed: "reviewed", new: "new", changed: "changed" };
function el2(parent, tag, cls, text2) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text2 !== void 0) node.textContent = text2;
  parent?.appendChild(node);
  return node;
}
function badge(parent, state) {
  el2(parent, "span", `gbdr-badge gbdr-${state}`, STATE_LABELS[state]);
}
function checkbox(parent, checked, label3, onChange) {
  const box = el2(parent, "input", "gbdr-check");
  box.type = "checkbox";
  box.checked = checked;
  box.title = label3;
  box.setAttribute("aria-label", label3);
  box.onclick = (event) => event.stopPropagation();
  box.onchange = onChange;
  return box;
}
function paintTokens(line, tokens) {
  let index = 0;
  let used = 0;
  const walk = (node) => {
    if (node.nodeType !== 3) {
      [...node.childNodes].forEach(walk);
      return;
    }
    const pieces = document.createDocumentFragment();
    let rest = node.textContent ?? "";
    while (rest && index < tokens.length) {
      const token = tokens[index];
      const take = rest.slice(0, token.text.length - used);
      pieces.append(token.scope ? el2(null, "span", token.scope, take) : take);
      rest = rest.slice(take.length);
      used += take.length;
      if (used === token.text.length) {
        index++;
        used = 0;
      }
    }
    if (rest) pieces.append(rest);
    node.replaceWith(pieces);
  };
  [...line.childNodes].forEach(walk);
}
var ROW_KINDS = [
  ["d2h-ins", "add"],
  ["d2h-del", "del"],
  ["d2h-cntx", "context"]
];
function highlightPatch(root, path) {
  const rows = [];
  for (const line of root.querySelectorAll(".d2h-code-line-ctn")) {
    const cell = line.closest("td");
    const kind = ROW_KINDS.find(([cls]) => cell?.classList.contains(cls))?.[1];
    if (kind) rows.push({ kind, text: line.textContent ?? "", line });
  }
  highlightDiff(path, rows)?.forEach((tokens, i) => paintTokens(rows[i].line, tokens));
}
function renderPatch(parent, patch, path, ui) {
  const box = el2(parent, "div", "gbdr-diff");
  const cached = ui.htmlCache.get(patch);
  if (cached !== void 0) {
    box.innerHTML = cached;
    return;
  }
  box.innerHTML = html(patch, { drawFileList: false, outputFormat: "line-by-line", matching: "lines", diffStyle: "word" });
  highlightPatch(box, path);
  ui.htmlCache.set(patch, box.innerHTML);
}
function renderHunkBody(parent, source, ui) {
  const patch = hunkPatch(source);
  if (patch) renderPatch(parent, patch, source.file.path, ui);
  else el2(parent, "pre", "gbdr-meta-lines", source.hunk.lines.join("\n"));
}
function progress(parent, label3, counts) {
  const total = counts.reviewed + counts.new + counts.changed;
  const item2 = el2(parent, "span", "gbdr-progress-item");
  el2(item2, "strong", void 0, `${label3} `);
  item2.append(`${counts.reviewed}/${total}`);
  if (counts.changed) el2(item2, "span", "gbdr-badge gbdr-changed", `${counts.changed} changed`);
  if (counts.new) el2(item2, "span", "gbdr-badge gbdr-new", `${counts.new} new`);
}
function snapshotButton(parent, action, label3) {
  const button2 = el2(parent, "button", void 0, action.busy ? "Taking snapshot\u2026" : label3);
  button2.disabled = action.busy;
  button2.onclick = () => action.take();
}
function renderNoSnapshots(root, action) {
  root.replaceChildren();
  el2(root, "p", "gbdr-empty", action ? "This record has no snapshot yet." : "This record has no snapshot yet. Take one from the desktop app.");
  if (action) snapshotButton(root, action, "Take snapshot");
}
function renderHeader(root, view, ui, actions) {
  const { snapshot } = view;
  const header = el2(root, "div", "gbdr-header");
  el2(header, "h2", void 0, `Review ${snapshot.branch}`);
  el2(header, "div", "gbdr-meta", reviewMetaText(view));
  const bar = el2(header, "div", "gbdr-progress");
  progress(bar, "Hunks", view.counts.hunks);
  progress(bar, "Files", view.counts.files);
  progress(bar, "Commits", view.counts.commits);
  const total = view.counts.hunks.reviewed + view.counts.hunks.new + view.counts.hunks.changed;
  const meter = el2(header, "div", "gbdr-meter");
  el2(meter, "div", "gbdr-meter-fill").style.width = `${total ? 100 * view.counts.hunks.reviewed / total : 100}%`;
  const controls = el2(header, "div", "gbdr-controls");
  const label3 = el2(controls, "label", void 0, "Show ");
  const select = el2(label3, "select", "dropdown gbdr-baseline");
  const review = el2(select, "option", void 0, "everything, badged since my last review");
  review.value = "";
  for (const option of view.baselineOptions) {
    const node = el2(select, "option", void 0, `only changes since ${option.label}`);
    node.value = option.id;
  }
  select.value = view.baseline.kind === "snapshot" ? view.baseline.snapshotId : "";
  select.onchange = () => actions.setBaseline(select.value ? { kind: "snapshot", snapshotId: select.value } : { kind: "review" });
  const hide = el2(controls, "label", "gbdr-hide");
  checkbox(hide, ui.hideReviewed, "Hide reviewed", () => actions.setHideReviewed(!ui.hideReviewed));
  hide.append(" Hide reviewed");
  if (actions.snapshot) snapshotButton(controls, actions.snapshot, "New snapshot");
  const previous = view.snapshots.find((s) => s.id === view.summary.previousSnapshotId);
  const summary = summaryText(view.summary, previous ? snapshotLabel(previous) : null);
  if (summary) el2(header, "div", "gbdr-summary", summary);
  if (view.needsRelook) {
    const n = view.commits.filter((c) => c.state === "changed").length;
    el2(header, "div", "gbdr-callout", `${n} commit(s) changed since you signed them off: re-look below under Commits.`);
  }
}
function renderPath(parent, file) {
  if (file.oldPath && file.oldPath !== file.path) parent.append(`${file.oldPath} \u2192 `);
  const slash = file.path.lastIndexOf("/") + 1;
  if (slash) el2(parent, "span", "gbdr-dir", file.path.slice(0, slash));
  el2(parent, "span", "gbdr-name", file.path.slice(slash));
}
function changeStat(parent, added, removed) {
  const stat = el2(parent, "span", "gbdr-stat");
  if (added) el2(stat, "span", "gbdr-added", `+${added}`);
  if (removed) el2(stat, "span", "gbdr-removed", `\u2212${removed}`);
  return stat;
}
function renderHunkHeader(parent, path, header) {
  const code = el2(parent, "code", "gbdr-hunk-header");
  const { range, context } = splitHunkHeader(header);
  code.append(range);
  if (!context) return;
  code.append(" ");
  const name = el2(code, "span", "gbdr-hunk-context", context);
  const language = languageForPath(path);
  if (language) paintTokens(name, highlightLines(language, [context])[0]);
}
function hiddenNote(parent, n, what) {
  if (n > 0) el2(parent, "p", "gbdr-hidden", `${n} ${what} hidden (reviewed or unchanged since the baseline).`);
}
function interdiffToggle(parent, body, view, file, hunk, against, ui) {
  const before = previousHunk(view, hunk, against);
  const after = findHunk(snapshotFiles(view.snapshot), hunk.id);
  if (!before || !after || hunk.kind === "meta") return;
  const key2 = `${hunk.id}:${against}`;
  const text2 = against === "reviewed" ? "since reviewed" : "since baseline";
  const button2 = el2(parent, "button", "gbdr-link", `\u0394 ${text2}`);
  const panel = el2(null, "div", "gbdr-interdiff");
  const show = () => {
    panel.replaceChildren();
    el2(panel, "div", "gbdr-caption", `How this hunk's changed lines differ from the version ${against === "reviewed" ? "you reviewed" : "in the baseline"}:`);
    renderPatch(panel, interdiffPatch(file.path, before.hunk, after.hunk), file.path, ui);
    body.prepend(panel);
  };
  button2.onclick = (event) => {
    event.stopPropagation();
    if (ui.interdiffs.delete(key2)) panel.remove();
    else {
      ui.interdiffs.add(key2);
      show();
    }
  };
  if (ui.interdiffs.has(key2)) show();
}
function renderHunk(parent, view, file, hunk, ui, actions) {
  const source = findHunk(snapshotFiles(view.snapshot), hunk.id);
  const box = el2(parent, "div", `gbdr-hunk gbdr-state-${hunk.state}`);
  const bar = el2(box, "div", "gbdr-hunk-bar gbdr-nav");
  bar.tabIndex = 0;
  bar.dataset.key = `hunk:${hunk.id}`;
  checkbox(bar, hunk.state === "reviewed", "Hunk reviewed (x)", () => actions.toggleHunk(file, hunk));
  badge(bar, hunk.state);
  renderHunkHeader(bar, file.path, hunk.header);
  if (hunk.kind === "text") changeStat(bar, hunk.added, hunk.removed);
  if (hunk.whitespaceOnly) el2(bar, "span", "gbdr-tag", "whitespace only");
  if (hunk.sinceBaseline && hunk.sinceBaseline !== "carried") el2(bar, "span", "gbdr-tag", `${hunk.sinceBaseline} since baseline`);
  const body = el2(box, "div", "gbdr-hunk-body");
  if (hunk.state === "changed") interdiffToggle(bar, body, view, file, hunk, "reviewed", ui);
  if (hunk.sinceBaseline === "changed") interdiffToggle(bar, body, view, file, hunk, "baseline", ui);
  if (source) {
    renderHunkBody(body, source, ui);
    if (actions.annotations && hunk.kind === "text") annotateHunk(body, source, view, ui, actions.annotations, () => renderReview(parent.closest(".gbdr"), view, ui, actions));
  }
}
function section(parent, key2, ui, fill) {
  const details3 = el2(parent, "details", "gbdr-section");
  const summary = el2(details3, "summary", "gbdr-nav");
  summary.dataset.key = key2;
  let filled = false;
  const body = el2(details3, "div", "gbdr-section-body");
  const fillOnce = () => {
    if (filled) return;
    filled = true;
    fill(body);
  };
  details3.open = ui.expanded.has(key2);
  if (details3.open) fillOnce();
  details3.ontoggle = () => {
    if (details3.open) {
      ui.expanded.add(key2);
      fillOnce();
    } else ui.expanded.delete(key2);
  };
  return { details: details3, summary };
}
function renderFile(parent, view, file, ui, actions) {
  const { summary } = section(parent, `file:${file.path}`, ui, (body) => {
    for (const hunk of file.hunks) if (hunkShown(view, hunk, ui.openThreadsOnly)) renderHunk(body, view, file, hunk, ui, actions);
    hiddenNote(body, file.hunks.filter((h) => !h.visible).length, "hunk(s)");
  });
  summary.classList.add(`gbdr-state-${file.state}`);
  checkbox(summary, file.state === "reviewed", "File reviewed (x)", () => actions.toggleFile(file));
  badge(summary, file.state);
  renderPath(el2(summary, "span", "gbdr-path"), file);
  if (file.status !== "modified") el2(summary, "span", "gbdr-tag", file.status);
  if (file.binary) el2(summary, "span", "gbdr-tag", "binary");
  const stat = changeStat(summary, file.hunks.reduce((n, h) => n + h.added, 0), file.hunks.reduce((n, h) => n + h.removed, 0));
  stat.prepend(`${file.counts.reviewed}/${file.hunks.length} hunk(s) reviewed `);
}
function renderCommit(parent, view, commit, ui, actions) {
  const source = view.snapshot.commits.find((c) => c.sha === commit.sha);
  const { summary } = section(parent, `commit:${commit.sha}`, ui, (body) => {
    el2(body, "pre", "gbdr-message", commit.message.trim());
    el2(body, "div", "gbdr-caption", `${commit.author} \xB7 ${commit.authorDate}`);
    if (commit.signoff && commit.state !== "reviewed") {
      el2(body, "div", "gbdr-caption", `You signed off ${commit.signoff.sha.slice(0, 8)} "${commit.signoff.subject}" at ${commit.signoff.signedOffAt}.`);
    }
    if (commit.contextOnly) {
      el2(body, "p", "gbdr-callout", "Its patch-id changed but every hunk carried over (e.g. rebase context). Re-look at the commit as a whole and sign off again.");
      return;
    }
    const ids = commit.state === "changed" ? commit.differingHunks : null;
    if (ids) el2(body, "div", "gbdr-caption", "Only the hunks that differ from the signed-off version:");
    for (const file of commitHunks(source, ids)) {
      el2(body, "div", "gbdr-commit-file", file.path);
      for (const hunk of file.hunks) renderHunkBody(body, { file, hunk }, ui);
    }
  });
  summary.classList.add(`gbdr-state-${commit.state}`);
  const label3 = commit.state === "reviewed" ? "Revoke sign-off (x)" : "Sign off commit (x)";
  checkbox(summary, commit.state === "reviewed", label3, () => actions.toggleCommit(commit));
  badge(summary, commit.state);
  el2(summary, "code", "gbdr-sha", commit.sha.slice(0, 8));
  el2(summary, "span", "gbdr-path", commit.subject);
  if (commit.contextOnly) el2(summary, "span", "gbdr-tag", "rebased, context only");
  else if (commit.state === "changed") el2(summary, "span", "gbdr-tag", `${commit.differingHunks?.length ?? 0} differing hunk(s)`);
  if (commit.sinceBaseline && commit.sinceBaseline !== "unchanged") el2(summary, "span", "gbdr-tag", `${commit.sinceBaseline} since baseline`);
}
function renderReview(root, view, ui, actions) {
  const scroll = root.scrollTop;
  root.replaceChildren();
  root.classList.add("gbdr");
  renderHeader(root, view, ui, actions);
  const redraw = () => renderReview(root, view, ui, actions);
  if (actions.annotations) {
    const threads = view.threads.filter((t) => t.thread.status === "open");
    const tools = el2(root, "div", "gbdr-thread-toolbar");
    el2(tools, "strong", void 0, `${threads.length} open review thread(s)`);
    const only = el2(tools, "label", void 0, " Open threads only ");
    checkbox(only, ui.openThreadsOnly, "Open threads only", () => {
      ui.openThreadsOnly = !ui.openThreadsOnly;
      redraw();
    });
    el2(tools, "span", "gbdr-meta", "Click a line number to comment; Shift-click another for a range.");
    const index = el2(root, "nav", "gbdr-thread-index");
    for (const t of threads) {
      const link = el2(index, "button", "gbdr-thread-link", `${t.thread.origin.path}: ${t.thread.body.split("\n")[0]}`);
      link.dataset.threadId = t.thread.id;
      link.onclick = () => {
        ui.activeThreadId = t.thread.id;
        if (t.placement.path) ui.expanded.add(`file:${t.placement.path}`);
        redraw();
        const card = [...root.querySelectorAll(".gbdr-thread")].find((n) => n.dataset.threadId === t.thread.id);
        card?.focus();
        card?.scrollIntoView({ block: "center" });
      };
    }
    const draft = ui.draft?.origin;
    if (draft && (ui.openThreadsOnly && !view.threads.some((t) => t.thread.status === "open" && t.placement.hunkId === draft.hunkId) || draft.snapshotId !== view.snapshot.id || !view.files.some((f) => f.visible && f.hunks.some((h) => h.visible && h.id === draft.hunkId)))) renderCommentDraft(root, ui, actions.annotations, redraw);
  }
  el2(root, "h3", void 0, "Files");
  const files = el2(root, "div", "gbdr-files");
  for (const file of view.files) if (fileShown(view, file, ui.openThreadsOnly)) renderFile(files, view, file, ui, actions);
  if (!view.files.some((f) => f.visible)) el2(files, "p", "gbdr-empty", "Nothing to review in the branch diff.");
  hiddenNote(files, view.hidden.files, "file(s)");
  if (actions.annotations) {
    const detached = view.threads.filter((t) => t.thread.status === "open" && !t.placement.hunkId);
    if (detached.length) {
      el2(root, "h3", void 0, "Threads needing placement review");
      for (const t of detached) renderThread(root, t, view, ui, actions.annotations, redraw);
    }
    const resolved = view.threads.filter((t) => t.thread.status === "resolved");
    if (resolved.length) {
      const label3 = el2(root, "label", void 0, ` Show resolved threads (${resolved.length}) `);
      checkbox(label3, ui.showResolved, "Show resolved threads", () => {
        ui.showResolved = !ui.showResolved;
        redraw();
      });
      if (ui.showResolved) for (const t of resolved) renderThread(root, t, view, ui, actions.annotations, redraw);
    }
  }
  if (ui.openThreadsOnly) {
    root.scrollTop = scroll;
    return;
  }
  el2(root, "h3", void 0, "Commits");
  const commits = el2(root, "div", "gbdr-commits");
  for (const commit of view.commits) if (commit.visible) renderCommit(commits, view, commit, ui, actions);
  if (!view.commits.some((c) => c.visible)) el2(commits, "p", "gbdr-empty", "No commits to sign off.");
  hiddenNote(commits, view.hidden.commits, "commit(s)");
  el2(root, "p", "gbdr-keys", "Keys: j/k move \xB7 x check off \xB7 o open/close \xB7 h hide reviewed \xB7 e expand all \xB7 c collapse all \xB7 [/] previous/next thread");
  root.scrollTop = scroll;
}
function handleReviewKey(root, event, view, ui, keys) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.target;
  if (target && (target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.tagName === "INPUT" && target.type !== "checkbox")) return false;
  const items = [...root.querySelectorAll(".gbdr-nav")];
  const current = document.activeElement?.closest(".gbdr-nav") ?? null;
  const index = current ? items.indexOf(current) : -1;
  const focus = (node) => {
    node?.focus();
    node?.scrollIntoView({ block: "nearest" });
  };
  switch (event.key) {
    case "[":
    case "]": {
      const links = [...root.querySelectorAll(".gbdr-thread-link")];
      if (!links.length) return false;
      const index2 = links.findIndex((link) => link.dataset.threadId === ui.activeThreadId);
      const next = index2 < 0 ? event.key === "]" ? 0 : links.length - 1 : (index2 + (event.key === "]" ? 1 : -1) + links.length) % links.length;
      links[next].click();
      return true;
    }
    case "j":
      focus(items[Math.min(items.length - 1, index + 1)]);
      return true;
    case "k":
      focus(items[Math.max(0, index - 1)]);
      return true;
    case "x":
      current?.querySelector(":scope > .gbdr-check")?.click();
      return !!current;
    case "o":
      if (current?.tagName === "SUMMARY") current.parentElement.open = !current.parentElement.open;
      return !!current;
    case "h":
      keys.setHideReviewed(!ui.hideReviewed);
      return true;
    case "e":
    case "c":
      ui.expanded.clear();
      if (event.key === "e") {
        for (const f of view.files) if (f.visible) ui.expanded.add(`file:${f.path}`);
        for (const c of view.commits) if (c.visible) ui.expanded.add(`commit:${c.sha}`);
      }
      keys.rerender();
      return true;
  }
  return false;
}
function focusedItem(root) {
  const node = document.activeElement?.closest(".gbdr-nav");
  if (!node || !root.contains(node)) return null;
  return { key: node.dataset.key ?? "", index: [...root.querySelectorAll(".gbdr-nav")].indexOf(node) };
}
function restoreFocus(root, item2) {
  if (!item2) return;
  const items = [...root.querySelectorAll(".gbdr-nav")];
  (items.find((n) => n.dataset.key === item2.key) ?? items[Math.min(item2.index, items.length - 1)])?.focus({ preventScroll: true });
}

// src/diff-review-status.ts
var DIFFERENTIAL_REVIEW_URL = "https://galaxy-brain.jmchilton.net/factory/differential-review/";
var HUMAN_REVIEW_FILE = "human_review.md";
function humanReviewStatus(view) {
  const all = (counts) => counts.reviewed > 0 && counts.new === 0 && counts.changed === 0;
  const commits = all(view.counts.commits);
  const diffs = all(view.counts.hunks);
  const what = commits && diffs ? "commits and diffs" : commits ? "commits" : diffs ? "diffs" : null;
  if (!what) return null;
  return `John (the human) has reviewed all ${what} using [John's Galaxy Brain Differential Review](${DIFFERENTIAL_REVIEW_URL}) at sha1 ${view.snapshot.head}.
`;
}

// src/diff-review-storage.ts
function vaultFileAdapter(adapter, onWrite) {
  return {
    exists: (path) => adapter.exists(path),
    read: (path) => adapter.read(path),
    async write(path, data) {
      const parent = path.slice(0, Math.max(0, path.lastIndexOf("/")));
      if (parent && !await adapter.exists(parent)) {
        let dir = "";
        for (const part of parent.split("/")) {
          dir = dir ? `${dir}/${part}` : part;
          if (!await adapter.exists(dir)) await adapter.mkdir(dir);
        }
      }
      onWrite?.(path, data);
      await adapter.write(path, data);
    },
    async listFiles(dir) {
      if (!await adapter.exists(dir)) return [];
      const { files } = await adapter.list(dir);
      return files.map((file) => file.slice(file.lastIndexOf("/") + 1));
    }
  };
}

// src/diff-review-view.ts
var DIFF_REVIEW_VIEW = "galaxy-brain-differential-review";
async function openDifferentialReview(app, recordDir, newTab = true) {
  const existing = app.workspace.getLeavesOfType(DIFF_REVIEW_VIEW).find((leaf2) => leaf2.getViewState().state?.recordDir === recordDir);
  const leaf = existing ?? app.workspace.getLeaf(newTab ? "tab" : false);
  await leaf.setViewState({ type: DIFF_REVIEW_VIEW, state: { recordDir }, active: true });
  void app.workspace.revealLeaf(leaf);
}
function registerDifferentialReview(plugin) {
  plugin.registerView(DIFF_REVIEW_VIEW, (leaf) => new DiffReviewView(leaf));
  plugin.addCommand({
    id: "open-differential-review",
    name: "Open differential review for this record",
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      const record = file && recordFromPath(file.path);
      if (!record || !isReviewableRecordKind(record.kind)) return false;
      if (!checking) void openDifferentialReview(plugin.app, record.dir);
      return true;
    }
  });
}
var DiffReviewView = class extends import_obsidian6.ItemView {
  constructor(leaf) {
    super(leaf);
    this.baseline = { kind: "review" };
    this.ui = newReviewUi();
    /** Parsed snapshots by id; snapshots are immutable, so each is read once. */
    this.snapshots = /* @__PURE__ */ new Map();
    this.reviewState = null;
    this.annotations = { threads: [], replies: [] };
    this.view = null;
    /** Serializes review-state writes from this view. */
    this.writes = Promise.resolve();
    this.expandedOnce = false;
    this.snapshotting = false;
    this.loadToken = 0;
    this.scheduleLoad = (0, import_obsidian6.debounce)(() => void this.reload(), 300, true);
    this.contentEl.tabIndex = 0;
  }
  getViewType() {
    return DIFF_REVIEW_VIEW;
  }
  getDisplayText() {
    return `Review: ${this.recordDir?.split("/").pop() ?? "branch"}`;
  }
  getIcon() {
    return "git-compare";
  }
  getState() {
    return {
      ...this.recordDir ? { recordDir: this.recordDir } : {},
      ...this.baseline.kind === "snapshot" ? { baseline: this.baseline.snapshotId } : {},
      hideReviewed: this.ui.hideReviewed
    };
  }
  async setState(state, result) {
    if (state.recordDir && state.recordDir !== this.recordDir) {
      this.recordDir = state.recordDir;
      const adapter = vaultFileAdapter(this.app.vault.adapter, (path, data) => {
        if (path === reviewStatePath(recordReviewDir(state.recordDir))) this.lastWritten = data;
      });
      this.reader = snapshotReader(adapter, recordReviewDir(state.recordDir));
      this.store = reviewStateStore(adapter, recordReviewDir(state.recordDir));
      this.annotationsStore = annotationStore(adapter, recordReviewDir(state.recordDir));
      this.lastWritten = void 0;
      this.snapshots.clear();
      this.view = null;
      this.reviewState = null;
      this.annotations = { threads: [], replies: [] };
      this.ui = newReviewUi(this.ui.hideReviewed);
      this.expandedOnce = false;
    }
    this.baseline = state.baseline ? { kind: "snapshot", snapshotId: state.baseline } : { kind: "review" };
    if (typeof state.hideReviewed === "boolean") this.ui.hideReviewed = state.hideReviewed;
    await super.setState(state, result);
    await this.reload();
  }
  async onOpen() {
    const onChange = async (path) => {
      if (!this.recordDir || !path.startsWith(`${recordReviewDir(this.recordDir)}/`)) return;
      if (path === reviewStatePath(recordReviewDir(this.recordDir)) && this.lastWritten !== void 0) {
        const text2 = await this.app.vault.adapter.read(path).catch(() => void 0);
        if (text2 === this.lastWritten) return;
      }
      this.scheduleLoad();
    };
    this.registerEvent(this.app.vault.on("create", (file) => void onChange(file.path)));
    this.registerEvent(this.app.vault.on("modify", (file) => void onChange(file.path)));
    this.registerEvent(this.app.vault.on("delete", (file) => void onChange(file.path)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      void onChange(file.path);
      void onChange(oldPath);
    }));
    this.registerDomEvent(this.contentEl, "keydown", (event) => {
      if (!this.view) return;
      const handled = handleReviewKey(this.contentEl, event, this.view, this.ui, {
        setHideReviewed: (hide) => this.setHideReviewed(hide),
        rerender: () => this.render()
      });
      if (handled) event.preventDefault();
    });
  }
  /** Re-read the snapshot list (reading only new ones) and review state, then render. */
  async reload() {
    const { reader, store, annotationsStore, recordDir } = this;
    if (!reader || !store || !annotationsStore || !recordDir) return;
    const token = ++this.loadToken;
    try {
      const snapshots = await refreshSnapshots(reader, this.snapshots);
      const reviewState = await store.readReviewState();
      const annotations = await annotationsStore.read();
      if (token !== this.loadToken || recordDir !== this.recordDir) return;
      this.snapshots = snapshots;
      this.reviewState = reviewState;
      this.annotations = annotations;
      this.rebuild();
    } catch (error) {
      if (token !== this.loadToken || recordDir !== this.recordDir) return;
      this.view = null;
      this.showMessage(`Could not load the differential review for ${recordDir}: ${error instanceof Error ? error.message : error}`);
    }
  }
  rebuild() {
    this.view = buildReviewView([...this.snapshots.values()], this.reviewState, { baseline: this.baseline, hideReviewed: this.ui.hideReviewed, annotations: this.annotations });
    if (this.view && !this.expandedOnce) {
      this.expandedOnce = true;
      if (visibleLineCount(this.view) <= AUTO_EXPAND_LINES) {
        for (const f of this.view.files) if (f.visible) this.ui.expanded.add(`file:${f.path}`);
      }
    }
    this.render();
  }
  render() {
    const root = this.contentEl;
    root.classList.add("gbdr");
    if (!this.view) {
      renderNoSnapshots(root, this.snapshotAction());
      for (const thread of this.annotations.threads) {
        renderThread(root, { thread, replies: this.annotations.replies.filter((r) => r.threadId === thread.id), placement: { state: "unmapped", path: null, hunkId: null, range: null } }, { snapshots: [], snapshot: null }, this.ui, this.annotationActions(), () => this.render());
      }
      return;
    }
    const scroll = root.scrollTop;
    const focused = focusedItem(root);
    const active = document.activeElement;
    const editing = active?.tagName === "TEXTAREA" && root.contains(active) ? {
      threadId: active.closest(".gbdr-thread")?.dataset.threadId ?? null,
      start: active.selectionStart,
      end: active.selectionEnd
    } : null;
    renderReview(root, this.view, this.ui, {
      annotations: this.annotationActions(),
      snapshot: this.snapshotAction(),
      toggleHunk: (_file, hunk) => this.mutate((state, snapshot, now) => toggleHunkReview(state, snapshot, hunk, now)),
      toggleFile: (file) => this.mutate((state, snapshot, now) => toggleFileReview(state, snapshot, file, now)),
      toggleCommit: (commit) => this.mutate((state, snapshot, now) => toggleCommitReview(state, snapshot, commit, now)),
      setBaseline: (baseline) => {
        this.baseline = baseline;
        this.app.workspace.requestSaveLayout();
        this.rebuild();
      },
      setHideReviewed: (hide) => this.setHideReviewed(hide)
    });
    root.scrollTop = scroll;
    restoreFocus(root, focused);
    if (editing) {
      const input = [...root.querySelectorAll(".gbdr-comment-input")].find((node) => (node.closest(".gbdr-thread")?.dataset.threadId ?? null) === editing.threadId);
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(editing.start, editing.end);
    }
  }
  snapshotAction() {
    if (!(this.app.vault.adapter instanceof import_obsidian6.FileSystemAdapter)) return void 0;
    return { busy: this.snapshotting, take: () => this.takeSnapshot() };
  }
  /** Runs the snapshot CLI, which fetches the record's head and base. */
  takeSnapshot() {
    const adapter = this.app.vault.adapter;
    const { recordDir } = this;
    if (this.snapshotting || !recordDir || !(adapter instanceof import_obsidian6.FileSystemAdapter)) return;
    const vaultRoot = adapter.getBasePath();
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    this.snapshotting = true;
    this.render();
    execFile(`${vaultRoot}/../differential-review/bin/differential-review`, ["capture", "--record", `${vaultRoot}/${recordDir}`], { env: { ...process.env, PATH }, timeout: 18e4 }, (error, stdout, stderr) => {
      this.snapshotting = false;
      if (error) new import_obsidian6.Notice(`No snapshot taken: ${(stderr || error.message).trim()}`, 0);
      else new import_obsidian6.Notice(stdout.trim(), 1e4);
      void this.reload();
    });
  }
  annotationActions() {
    return {
      createThread: (origin, body) => this.writeAnnotation((store) => saveNewThread(store, origin, body)),
      reply: (threadId, body) => {
        const snapshotId = this.view?.snapshot.id;
        return this.writeAnnotation((store) => saveReply(store, threadId, body, snapshotId));
      },
      resolve: (threadId, resolved) => this.writeAnnotation((store) => saveResolved(store, threadId, resolved)),
      refresh: () => {
        void this.reload();
      }
    };
  }
  setHideReviewed(hide) {
    this.ui.hideReviewed = hide;
    this.app.workspace.requestSaveLayout();
    this.rebuild();
  }
  /** Queue a check-off change: fresh read of review-state.json, apply, write, re-render. */
  mutate(change) {
    const { store, view } = this;
    if (!store || !view) return;
    this.writes = this.writes.then(async () => {
      const next = await updateReviewState(store, (state) => change(state, view.snapshot, (/* @__PURE__ */ new Date()).toISOString()));
      if (this.store !== store) return;
      this.reviewState = next;
      this.rebuild();
      await this.writeHumanReviewStatus();
    }).catch((error) => {
      new import_obsidian6.Notice(`Could not update review-state.json: ${error instanceof Error ? error.message : error}`, 1e4);
      void this.reload();
    });
  }
  /** Write `<record>/human_review.md` when commits or diffs are all reviewed; remove it when that stops being true. */
  async writeHumanReviewStatus() {
    const { view, recordDir } = this;
    if (!view || !recordDir) return;
    const path = `${recordDir}/${HUMAN_REVIEW_FILE}`;
    const status = humanReviewStatus(view);
    const adapter = this.app.vault.adapter;
    const exists = await adapter.exists(path);
    if (status === null) {
      if (exists) await adapter.remove(path);
    } else if (!exists || await adapter.read(path) !== status) await adapter.write(path, status);
  }
  /** UI thread edits serialize independently of immutable CLI replies. */
  writeAnnotation(write) {
    const store = this.annotationsStore;
    if (!store) return Promise.reject(new Error("No review record is open"));
    const next = this.writes.then(() => write(store));
    this.writes = next.catch(() => void 0);
    return next;
  }
  showMessage(text2) {
    this.contentEl.replaceChildren();
    this.contentEl.createEl("p", { text: text2, cls: "gbdr-empty" });
  }
};

// src/record-links.ts
init_repository_tabs();
function githubUrl(record, body) {
  const all = githubLinks(body);
  const id = escapeRegExp(record.name);
  const find = (pattern, label3) => all.find((link) => pattern.test(link.url) && (!label3 || label3.test(link.label)))?.url;
  const upstream = `https://github.com/${upstreamOwner(record.repo, [body])}/${record.repo}`;
  if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
  if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
  if (record.kind === "issues_incubator") return void 0;
  const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
  const pr = recordFrontmatter(body).pr;
  return (pr ? `${upstream}/pull/${pr}` : void 0) ?? find(/\/pull\/\d+$/, /^(View )?PR #\d+$/) ?? (statusPr ? `${upstream}/pull/${statusPr}` : void 0) ?? find(new RegExp(`/tree/${id}$`)) ?? `https://github.com/${FORK_OWNER}/${record.repo}/tree/${record.name}`;
}
function compareUrl(record, body) {
  if (record.kind !== "branches") return void 0;
  const base = recordFrontmatter(body).upstream_base_branch;
  if (!base) return void 0;
  const upstream = upstreamOwner(record.repo, [body]);
  return `https://github.com/${upstream}/${record.repo}/compare/${base}...${FORK_OWNER}:${record.repo}:${record.name}`;
}
function worktreeCandidates(record, body, home) {
  const root = `${home}/projects/worktrees/${record.repo}`;
  if (record.kind === "reviews") return [`${root}/pr/${record.name}`];
  if (record.kind !== "branches") return [];
  const listed = /Worktree:\**\s*`([^`]+)`/.exec(body)?.[1]?.replace(/^~(?=\/)/, home);
  return [...listed ? [listed] : [], `${root}/branch/${record.name}`];
}

// src/record-agents.ts
init_records();
var SYNC_PROCESSES = {
  issues: "PROCESS_SYNC_ISSUE_STATE.md",
  reviews: "PROCESS_SYNC_REVIEW_STATE.md"
};
var SYNC_PROFILE = "Sonnet (medium)";
function parseRecordAgents(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const map2 = {};
  for (const [repo, kinds] of Object.entries(data)) {
    map2[repo] = {};
    if (!kinds || typeof kinds !== "object") continue;
    for (const [kind, agent] of Object.entries(kinds)) {
      if (RECORD_KINDS.includes(kind) && typeof agent === "string") map2[repo][kind] = agent;
    }
  }
  return map2;
}

// src/repository.ts
init_records();
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
    if (!ref || (repo === void 0 ? ref.repo === DEFAULTS_REPO : ref.repo !== repo)) continue;
    let record = records.get(ref.dir);
    if (!record) {
      record = { ...ref, title: ref.name, mtime: 0, created: file.ctime };
      records.set(ref.dir, record);
    }
    record.mtime = Math.max(record.mtime, file.mtime);
    record.created = Math.min(record.created, file.ctime);
    if (file.path === `${ref.dir}/index.md`) {
      record.indexPath = file.path;
      record.indexMtime = file.mtime;
      record.title = recordTitle(readIndex(file.path)) ?? ref.name;
    }
  }
  return [...records.values()];
}
function recentRecords(records, { by, kind, limit = 25 }) {
  const time = (record) => by === "created" ? record.created : record.indexMtime;
  return records.filter((record) => (!kind || record.kind === kind) && time(record) !== void 0).sort((a, b) => time(b) - time(a)).slice(0, limit);
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
  })).filter((section2) => section2.groups.length > 0);
}

// src/repository-view.ts
var import_obsidian8 = require("obsidian");
init_records();
init_repository_tabs();

// src/github-feed.ts
var FIELDS3 = "number title url createdAt author { login } labels(first: 20) { nodes { name } }";
var feedQuery = (searches) => {
  const ids = Array.from({ length: searches }, (_, i) => `s${i}`);
  const params = ["$owner: String!", "$name: String!", "$mine: String!", ...ids.map((id) => `$${id}: String!`)].join(", ");
  const fields = ids.map((id) => `
  ${id}: search(query: $${id}, type: ISSUE, first: 100) { issueCount nodes { ... on Issue { ${FIELDS3} } } }`).join("");
  return `query(${params}) {${FEED_FIELDS}${fields}
}`;
};
var FEED_FIELDS = `
  repository(owner: $owner, name: $name) {
    created: pullRequests(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS3} isDraft headRefName }
    }
    updated: pullRequests(states: OPEN, first: 60, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { ${FIELDS3} isDraft headRefName timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], last: 1) { nodes { ... on ReadyForReviewEvent { createdAt } } } }
    }
    issues(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS3} }
    }
  }
  mine: search(query: $mine, type: ISSUE, first: 100) {
    nodes { ... on PullRequest { ${FIELDS3} isDraft headRefName mergeable } }
  }`;
var item = (node, at = node.createdAt) => ({
  number: node.number,
  title: node.title,
  url: node.url,
  author: node.author?.login ?? "ghost",
  at,
  isDraft: node.isDraft ?? false,
  labels: node.labels?.nodes.map((label3) => label3.name) ?? [],
  ...node.headRefName ? { branch: node.headRefName } : {}
});
function feedArgs(owner, name, searches = []) {
  const mine = `repo:${owner}/${name} is:pr is:open author:@me sort:updated-desc`;
  const searchArgs = searches.flatMap((query, i) => ["-f", `s${i}=repo:${owner}/${name} ${query}`]);
  return ["api", "graphql", "-f", `owner=${owner}`, "-f", `name=${name}`, "-f", `mine=${mine}`, ...searchArgs, "-f", `query=${feedQuery(searches.length)}`];
}
function parseFeeds(json2) {
  const data = JSON.parse(json2).data;
  const repository = data.repository;
  const mine = data.mine.nodes;
  const undraftedPrs = repository.updated.nodes.filter((node) => !node.isDraft).flatMap((node) => {
    const readyAt = node.timelineItems?.nodes[0]?.createdAt;
    return readyAt ? [item(node, readyAt)] : [];
  }).sort((a, b) => b.at.localeCompare(a.at));
  return {
    newPrs: repository.created.nodes.map((node) => item(node)),
    undraftedPrs,
    issues: repository.issues.nodes.map((node) => item(node)),
    myDrafts: mine.filter((node) => node.isDraft).map((node) => item(node)),
    conflicting: mine.filter((node) => node.mergeable === "CONFLICTING").map((node) => item(node)),
    unchecked: mine.filter((node) => node.mergeable === "UNKNOWN").length,
    searches: searchResults(data)
  };
}
function searchResults(data) {
  const results = [];
  for (let i = 0; `s${i}` in data; i++) {
    const search = data[`s${i}`];
    results.push({ items: search.nodes.map((node) => item(node)), total: search.issueCount });
  }
  return results;
}
function matchRecords(item2, isIssue, records, bodyOf) {
  const number = String(item2.number);
  return records.filter((record) => {
    if (isIssue) return record.kind === "issues" && record.name === number;
    if (record.kind === "reviews") return record.name === number;
    return record.kind === "branches" && (record.name === item2.branch || githubUrl(record, bodyOf(record)) === item2.url);
  });
}

// src/blocker-modal.ts
var import_obsidian7 = require("obsidian");
function openRecordLink(app, { target }, event) {
  if (isAgentBlocker(target)) return void new BlockerModal(app, target).open();
  const path = recordIndexPath2(app.vault.getMarkdownFiles().map((file) => file.path), target);
  if (path) void app.workspace.openLinkText(path, "", event.metaKey || event.ctrlKey);
  else new import_obsidian7.Notice(`${recordIdLabel(target)} not found`);
}
var BlockerModal = class extends import_obsidian7.Modal {
  constructor(app, blocker) {
    super(app);
    this.blocker = blocker;
    this.markdown = new import_obsidian7.Component();
  }
  async onOpen() {
    const { agentDir, name } = this.blocker;
    const dir = `${blockersPath(agentDir)}/${name}`;
    this.setTitle(`\u{1F512} ${agentDir}/${name}`);
    this.markdown.load();
    if (!this.app.vault.getFolderByPath(dir)) return void this.contentEl.createEl("p", { text: `${dir} not found.`, cls: "gbr-empty" });
    const open = this.contentEl.createEl("a", { text: "Open blocker", cls: "internal-link", href: "#" });
    open.onclick = (event) => {
      event.preventDefault();
      this.close();
      void this.app.workspace.openLinkText(`${dir}/index.md`, "", event.metaKey || event.ctrlKey);
    };
    for (const [file, heading] of [["condition.md", "Condition"], ["follow_up.md", "Follow up"]]) {
      const path = `${dir}/${file}`;
      const note = this.app.vault.getFileByPath(path);
      this.contentEl.createEl("h4", { text: heading });
      const body = this.contentEl.createDiv();
      if (note) await import_obsidian7.MarkdownRenderer.render(this.app, await this.app.vault.cachedRead(note), body, path, this.markdown);
      else body.createEl("p", { text: `No ${file}.`, cls: "gbr-empty" });
    }
  }
  onClose() {
    this.markdown.unload();
    this.contentEl.empty();
  }
};

// src/record-groups.ts
init_records();
function groupRecords(records, kind, grouping) {
  const { sections, rest } = groupBySections(records, kind, grouping);
  const groups = sections.map(({ key: key2, label: label3, records: records2 }) => ({ status: key2, label: label3, collapsed: false, records: records2 }));
  return [...groups, ...repositorySections(rest).find((section2) => section2.kind === kind)?.groups ?? []];
}

// src/repository-view.ts
var REPOSITORY_VIEW = "galaxy-brain-repository";
var ALL_REPOS = "*";
var RECENT = "recent";
var RECENT_TAB = { id: RECENT, label: "Recent" };
var isRecordTab = (tab) => RECORD_KINDS.includes(tab);
var isMine = (tab) => tab === "my-drafts" || tab === "conflicting";
var RECENT_BY = { created: "Newest", updated: "Recently updated" };
var RECORD_ICONS = { branches: "git-branch", reviews: "file-search", issues: "file-text", issues_incubator: "sprout" };
var RECORD_NOUNS = { branches: "branch", reviews: "review", issues: "issue", issues_incubator: "issue draft" };
var FEED_KEYS = {
  "new-prs": "newPrs",
  "undrafted-prs": "undraftedPrs",
  "new-issues": "issues",
  "my-drafts": "myDrafts",
  conflicting: "conflicting"
};
var RECHECK_MS = 5e3;
var RepositoryView = class extends import_obsidian8.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.repo = "galaxy";
    this.tab = "branches";
    this.recentBy = "created";
    /** GitHub feeds by repository, fetched on first view and on refresh. */
    this.feeds = /* @__PURE__ */ new Map();
    this.launchers = [];
    /** Status groups toggled away from their default, kept across re-renders. */
    this.toggled = /* @__PURE__ */ new Set();
    this.scheduleRender = (0, import_obsidian8.debounce)(() => void this.render(), 300, true);
  }
  getViewType() {
    return REPOSITORY_VIEW;
  }
  getDisplayText() {
    return this.repo === ALL_REPOS ? "Recent records" : `${this.repo} records`;
  }
  getIcon() {
    return "library";
  }
  getState() {
    return { repo: this.repo, tab: this.tab, recentBy: this.recentBy, ...this.recentKind ? { recentKind: this.recentKind } : {} };
  }
  async setState(state, result) {
    if (state.repo && state.repo !== this.repo) {
      this.repo = state.repo;
      this.toggled.clear();
    }
    if (state.tab && (state.tab === RECENT || repositoryTabs(this.repo).some((tab) => tab.id === state.tab))) this.tab = state.tab;
    else if (state.tab === "records") this.tab = "branches";
    if (state.recentBy && state.recentBy in RECENT_BY) this.recentBy = state.recentBy;
    if ("recentKind" in state) this.recentKind = RECORD_KINDS.find((kind) => kind === state.recentKind);
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      const grouped = isRecordTab(this.tab) && file.path === groupingFor(this.repo, this.tab);
      if (grouped || file.path.startsWith(this.prefix())) this.scheduleRender();
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
    const files = this.app.vault.getMarkdownFiles().map(({ path, stat }) => ({ path, mtime: stat.mtime, ctime: stat.ctime }));
    const all = this.repo === ALL_REPOS;
    const bodies = all ? /* @__PURE__ */ new Map() : await this.readIndexes(files.map((file) => file.path));
    const records = collectRecords(files, all ? void 0 : this.repo, (path) => bodies.get(path));
    this.launchers = import_obsidian8.Platform.isDesktopApp ? await this.host.loadLaunchers() : [];
    const sectioned = import_obsidian8.Platform.isDesktopApp ? await this.host.withSections(records) : [];
    const launchable = new Set(sectioned.filter((record) => this.canLaunch(record)).map((record) => record.dir));
    if (this.embed) this.removeChild(this.embed);
    this.embed = this.addChild(new import_obsidian8.Component());
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository");
    const header = root.createDiv({ cls: "gbr-header" });
    header.createEl("h1", { text: all ? "All repositories" : this.repo });
    const select = header.createEl("select", { cls: "dropdown" });
    select.createEl("option", { text: "All repositories", value: ALL_REPOS }).selected = all;
    for (const name of repositoryNames(files)) {
      select.createEl("option", { text: name, value: name }).selected = name === this.repo;
    }
    select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value, tab: this.tab } });
    const repoTabs = repositoryTabs(this.repo);
    const recordTabs = repoTabs.filter((tab) => isRecordTab(tab.id));
    const githubTabs = import_obsidian8.Platform.isDesktopApp ? repoTabs.filter((tab) => !isRecordTab(tab.id)) : [];
    const tabs = all ? [RECENT_TAB] : [...recordTabs, RECENT_TAB, ...githubTabs];
    const current = tabs.some((tab) => tab.id === this.tab) ? this.tab : tabs[0].id;
    const onFeed = current !== RECENT && !isRecordTab(current);
    const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": onFeed ? "Refresh from GitHub" : "Refresh" } });
    (0, import_obsidian8.setIcon)(refresh, "refresh-cw");
    refresh.onclick = () => void (onFeed ? this.fetchFeeds(true) : this.render());
    const bar = root.createDiv({ cls: "gbr-tabs" });
    for (const tab of tabs) {
      const count = isRecordTab(tab.id) ? ` (${records.filter((record) => record.kind === tab.id).length})` : "";
      const button2 = bar.createEl("button", { text: tab.label + count, cls: tab.id === current ? "mod-cta" : "" });
      button2.onclick = () => {
        this.tab = tab.id;
        this.app.workspace.requestSaveLayout();
        void this.render();
      };
    }
    if (current === RECENT) await this.renderRecent(root, records, bodies, launchable, all);
    else if (isRecordTab(current)) {
      await this.renderSync(root, current);
      this.renderRecords(root, current, records, bodies, launchable, await this.readQueue(current));
    } else this.renderFeed(root, current, records, bodies, header);
  }
  async renderRecent(root, records, bodies, launchable, all) {
    const controls = root.createDiv({ cls: "gbr-tabs" });
    const choose = (options, value, onChange) => {
      const select = controls.createEl("select", { cls: "dropdown" });
      for (const [key2, label3] of Object.entries(options)) {
        select.createEl("option", { text: label3, value: key2 }).selected = key2 === value;
      }
      select.onchange = () => {
        onChange(select.value);
        this.app.workspace.requestSaveLayout();
        void this.render();
      };
    };
    choose(RECENT_BY, this.recentBy, (by) => this.recentBy = by);
    const kinds = { all: "All kinds", ...KIND_LABELS };
    choose(kinds, this.recentKind ?? "all", (kind) => this.recentKind = kind === "all" ? void 0 : kind);
    const recent = recentRecords(records, { by: this.recentBy, kind: this.recentKind });
    const unread = recent.flatMap((record) => record.indexPath && !bodies.has(record.indexPath) ? [record.indexPath] : []);
    for (const [path, body] of await this.readIndexes(unread)) bodies.set(path, body);
    if (recent.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
    const list3 = root.createEl("ul");
    for (const record of recent) {
      const body = record.indexPath && bodies.get(record.indexPath) || "";
      const tags = [...all ? [record.repo] : [], ...this.recentKind ? [] : [RECORD_NOUNS[record.kind]], statusLabel(record.status)];
      this.renderRecord(list3, { ...record, title: recordTitle(body) ?? record.title }, body, launchable.has(record.dir), {
        time: this.recentBy === "created" ? record.created : record.indexMtime,
        tags
      });
    }
  }
  renderRecords(root, kind, records, bodies, launchable, queue) {
    const groups = groupRecords(records, kind, queue?.sections);
    if (groups.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
    for (const group of groups) {
      const key2 = `${kind}/${group.status}`;
      const details3 = root.createEl("details", { cls: "gbr-group" });
      details3.open = group.collapsed === this.toggled.has(key2);
      details3.ontoggle = () => {
        if (details3.open === group.collapsed) this.toggled.add(key2);
        else this.toggled.delete(key2);
      };
      details3.createEl("summary", { text: `${group.label ?? statusLabel(group.status)} (${group.records.length})` });
      const list3 = details3.createEl("ul");
      for (const record of group.records) {
        const body = record.indexPath && bodies.get(record.indexPath) || "";
        this.renderRecord(list3, record, body, launchable.has(record.dir));
      }
    }
    if (queue) void this.renderQueue(root, queue);
  }
  /** 🔄 Sync button and the last SYNC_REPORT.md, above an issues or reviews tab. */
  async renderSync(root, kind) {
    if (!SYNC_PROCESSES[kind]) return;
    const agent = import_obsidian8.Platform.isDesktopApp ? await this.host.syncAgent(this.repo, kind) : void 0;
    if (agent) {
      const bar = root.createDiv({ cls: "gbr-sync" });
      const button2 = bar.createEl("button", { text: `\u{1F504} Sync ${kind}`, attr: { "aria-label": `Launch ${agent} to sync ${kind}` } });
      button2.onclick = () => void this.host.launchSync(this.repo, kind, agent);
      bar.createSpan({ cls: "gbr-time", text: `${agent} \xB7 ${SYNC_PROFILE}` });
    }
    const report = this.app.vault.getFileByPath(`repositories/${this.repo}/${kind}/SYNC_REPORT.md`);
    if (report) void this.renderQueue(root, { path: report.path, text: await this.app.vault.cachedRead(report), sections: [] });
  }
  /** A note rendered inline: the queue file below its groups, or the sync report. */
  async renderQueue(root, queue) {
    const section2 = root.createDiv({ cls: "gbr-queue" });
    const heading = section2.createDiv({ cls: "gbr-queue-heading" });
    heading.createSpan({ text: queue.path.split("/").pop() });
    const open = heading.createEl("a", { text: "Open note", cls: "internal-link", href: "#" });
    const body = section2.createDiv({ cls: "gbr-queue-body markdown-rendered" });
    const openLink = (event, link) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(link, queue.path, event.metaKey || event.ctrlKey);
    };
    open.onclick = (event) => openLink(event, queue.path);
    body.onclick = (event) => {
      const link = event.target.closest("a.internal-link");
      const href = link?.getAttribute("data-href") ?? link?.getAttribute("href");
      if (href) openLink(event, href);
    };
    await import_obsidian8.MarkdownRenderer.render(this.app, queue.text, body, queue.path, this.embed);
  }
  renderFeed(root, tab, records, bodies, header) {
    const state = this.feedState();
    if (state.fetchedAt) header.createSpan({ text: `fetched ${timeAgo(state.fetchedAt, Date.now())}`, cls: "gbr-time" });
    const owner = upstreamOwner(this.repo, [...bodies.values()]);
    root.createEl("p", { cls: "gbr-github-link" }).createEl("a", {
      text: githubListTitle(this.repo, tab),
      href: githubListUrl(owner, this.repo, tab),
      cls: "external-link"
    });
    if (!state.feeds) {
      if (state.error) root.createEl("p", { text: `Could not fetch from GitHub: ${state.error}`, cls: "gbr-empty" });
      else root.createEl("p", { text: "Fetching from GitHub\u2026", cls: "gbr-empty" });
      if (!state.loading && !state.error) void this.fetchFeeds(false);
      return;
    }
    const bodyOf = (record) => record.indexPath && bodies.get(record.indexPath) || "";
    if (tab === "conflicting" && state.checking) {
      root.createEl("p", { text: "Checking for conflicts\u2026", cls: "gbr-empty" });
      return;
    }
    const searchIndex = searchTabs(this.repo).findIndex((search2) => search2.id === tab);
    const search = searchIndex >= 0 ? state.feeds.searches[searchIndex] : void 0;
    const items = search ? search.items : state.feeds[FEED_KEYS[tab]];
    const isIssue = searchIndex >= 0 || tab === "new-issues";
    const unchecked = tab === "conflicting" ? state.feeds.unchecked : 0;
    if (unchecked) root.createEl("p", { text: `GitHub hasn't checked ${unchecked} PR(s) yet; refresh to recheck.`, cls: "gbr-empty" });
    if (search && search.total > search.items.length) root.createEl("p", { text: `Showing ${search.items.length} of ${search.total}.`, cls: "gbr-empty" });
    if (items.length === 0) root.createEl("p", { text: isMine(tab) || search ? "None." : "Nothing recent.", cls: "gbr-empty" });
    const list3 = root.createEl("ul");
    for (const item2 of items) {
      const matched = matchRecords(item2, isIssue, records, bodyOf);
      this.renderFeedItem(list3, item2, isIssue, matched, bodyOf);
    }
  }
  renderFeedItem(list3, item2, isIssue, matched, bodyOf) {
    const row = list3.createEl("li", { cls: "gbr-record" });
    const actions = row.createSpan({ cls: "gbr-actions" });
    const live = (record) => ({ ...record, labels: item2.labels });
    row.createEl("a", { text: `#${item2.number} ${item2.title}`, href: item2.url, cls: "external-link" });
    if (item2.isDraft) row.createSpan({ text: "draft", cls: "gbr-tag" });
    row.createSpan({ text: `${item2.author} \xB7 ${timeAgo(Date.parse(item2.at), Date.now())}`, cls: "gbr-time" });
    const action = (icon, label3, onClick) => {
      const button2 = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label3 } });
      (0, import_obsidian8.setIcon)(button2, icon);
      button2.onclick = onClick;
    };
    if (matched.length === 0) {
      const untracked = live(untrackedRecord(this.repo, isIssue ? "issues" : "reviews", item2.number));
      if (this.canLaunch(untracked)) action("bot", "Launch agent (no record yet)", () => void this.host.pickLauncher(untracked));
    }
    for (const record of matched) {
      const kind = RECORD_NOUNS[record.kind];
      action(
        RECORD_ICONS[record.kind],
        `Open ${kind} record ${record.name} (${statusLabel(record.status)})`,
        (event) => void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey)
      );
      this.recordRefActions(record.repo, bodyOf(record), action);
      if (this.canLaunch(live(record))) action("bot", `Launch agent for ${kind} record`, () => void this.host.pickLauncher(live(record)));
      const worktree = this.host.worktreeFor(record, bodyOf(record));
      if (worktree) action("code", `Open ${kind} worktree with Code`, () => this.host.openInCode(worktree));
    }
  }
  feedState() {
    let state = this.feeds.get(this.repo);
    if (!state) this.feeds.set(this.repo, state = {});
    return state;
  }
  async fetchFeeds(force) {
    const state = this.feedState();
    if (state.loading) return state.loading;
    if (!force && state.feeds) return;
    const repo = this.repo;
    state.loading = (async () => {
      try {
        const prefix = `repositories/${repo}/`;
        const bodies = await this.readIndexes(this.app.vault.getMarkdownFiles().map((f) => f.path).filter((p) => p.startsWith(prefix)));
        const owner = upstreamOwner(repo, [...bodies.values()]);
        const args = feedArgs(owner, repo, searchTabs(repo).map((search) => search.query));
        state.feeds = parseFeeds(await this.host.runGh(args));
        state.fetchedAt = Date.now();
        state.error = void 0;
        if (state.feeds.unchecked) {
          state.checking = true;
          if (this.repo === repo) await this.render();
          await sleep(RECHECK_MS);
          state.feeds = parseFeeds(await this.host.runGh(args));
          state.fetchedAt = Date.now();
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
      } finally {
        state.loading = void 0;
        state.checking = void 0;
      }
      if (this.repo === repo) await this.render();
    })();
    if (force) await this.render();
    return state.loading;
  }
  /** The repository's queue file for this kind, if it has one. */
  async readQueue(kind) {
    const path = groupingFor(this.repo, kind);
    const file = path ? this.app.vault.getFileByPath(path) : null;
    if (!file) return void 0;
    const text2 = await this.app.vault.cachedRead(file);
    return { path: file.path, text: text2, sections: parseGrouping(text2, file.path, this.repo, kind) };
  }
  /** Vault path prefix of the records this view shows. */
  prefix() {
    return this.repo === ALL_REPOS ? "repositories/" : `repositories/${this.repo}/`;
  }
  async readIndexes(paths) {
    const prefix = this.prefix();
    const indexes = paths.filter((path) => path.startsWith(prefix) && path.endsWith("/index.md"));
    const bodies = /* @__PURE__ */ new Map();
    await Promise.all(indexes.map(async (path) => {
      const file = this.app.vault.getFileByPath(path);
      if (file) bodies.set(path, await this.app.vault.cachedRead(file));
    }));
    return bodies;
  }
  /** 🔒 per blocker (agent blockers open their condition, records their index.md), 🚫 per record this one blocks, 🔗 per related record, ↑/↓ per parent/child branch. */
  recordRefActions(repo, body, action) {
    for (const link of recordLinks(body, repo)) action(link.icon, link.label, (event) => openRecordLink(this.app, link, event));
  }
  renderRecord(list3, record, body, launchable, { time = record.mtime, tags = [] } = {}) {
    const item2 = list3.createEl("li", { cls: "gbr-record" });
    const actions = item2.createSpan({ cls: "gbr-actions" });
    const link = item2.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
    link.onclick = (event) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
    };
    if (record.title !== record.name) item2.createSpan({ text: record.name, cls: "gbr-name" });
    for (const tag of tags) item2.createSpan({ text: tag, cls: "gbr-tag" });
    item2.createSpan({ text: timeAgo(time, Date.now()), cls: "gbr-time" });
    const action = (icon, label3, onClick) => {
      const button2 = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label3 } });
      (0, import_obsidian8.setIcon)(button2, icon);
      button2.onclick = onClick;
    };
    this.recordRefActions(record.repo, body, action);
    if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
    const github = githubUrl(record, body);
    if (github) action("github", "Open on GitHub", () => window.open(github));
    const compare = compareUrl(record, body);
    if (compare) action("git-compare-arrows", "Compare to upstream base", () => window.open(compare));
    const worktree = import_obsidian8.Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
    if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
    if (isReviewableRecordKind(record.kind)) action("git-compare", "Differential review", () => void openDifferentialReview(this.app, record.dir));
  }
  canLaunch(record) {
    return launchersFor(this.launchers, record).length > 0;
  }
};

// src/record-strip.ts
var import_obsidian9 = require("obsidian");

// ../site/src/lib/file-docs.ts
init_records();
init_records();
function parseFileDocs(text2) {
  let title = null;
  const sections = [];
  let current = null;
  let inFence = false;
  const flush = () => {
    if (!current) return;
    const patterns = current.heading.split(",").map((p) => p.trim().replace(/^`(.*)`$/, "$1")).filter(Boolean);
    sections.push({ heading: current.heading, patterns, body: current.lines.join("\n").trim() });
  };
  for (const line of text2.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h2 = !inFence && line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      flush();
      current = { heading: h2[1], lines: [] };
      continue;
    }
    const h1 = !inFence && !current && title === null && line.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      title = h1[1];
      continue;
    }
    current?.lines.push(line);
  }
  flush();
  return { title, sections };
}
function globToRegExp(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      i++;
      if (pattern[i + 1] === "/") {
        i++;
        re += "(?:.*/)?";
      } else {
        re += ".*";
      }
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}
function resolveFileDoc(sources, rel) {
  for (const { source, docs } of sources) {
    for (const section2 of docs.sections) {
      if (section2.patterns.some((p) => globToRegExp(p).test(rel))) return { source, section: section2 };
    }
  }
  return null;
}
function fileDocSummary(body) {
  const paragraph = body.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
  const plain = paragraph.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`([^`]*)`/g, "$1").replace(/(\*\*|\*)(\S(?:.*?\S)?)\1/g, "$2");
  const sentence = plain.match(/^(.*?[.!?])(?:\s|$)/);
  return sentence ? sentence[1] : plain;
}
function fileDocPath(repo, kind) {
  return `repositories/${repo}/${kind}/FILE_DOCS`;
}
function fileDocSources(repo, kind) {
  return (repo === DEFAULTS_REPO ? [repo] : [repo, DEFAULTS_REPO]).map((r) => fileDocPath(r, kind));
}
function recordFileLinks(files, sources) {
  const sections = sources.flatMap(({ docs }) => docs.sections);
  const links = /* @__PURE__ */ new Map();
  for (const file of [...files].sort()) {
    if (file === "index.md") continue;
    const slash = file.indexOf("/");
    if (slash < 0) {
      links.set(file, { path: file });
    } else {
      const path = file.slice(0, slash + 1);
      const folder = links.get(path) ?? { path, files: [] };
      folder.files.push(file);
      links.set(path, folder);
    }
  }
  const documented = [];
  const other = [];
  for (const link of links.values()) {
    const doc = [link.path, ...link.files ?? []].map((rel) => resolveFileDoc(sources, rel)).find(Boolean);
    if (doc) documented.push({ link: { ...link, hint: fileDocSummary(doc.section.body) }, order: sections.indexOf(doc.section) });
    else other.push(link);
  }
  return { documented: documented.sort((a, b) => a.order - b.order).map(({ link }) => link), other };
}
function recordFileLabel({ path, files }) {
  return files ? `${path} (${files.length})` : path.replace(/\.md$/, "");
}

// src/record-strip.ts
var OPENABLE = /* @__PURE__ */ new Set(["md", "png", "jpg", "jpeg", "gif", "webp", "svg"]);
async function loadSources(app, record) {
  const loaded = await Promise.all(
    fileDocSources(record.repo, record.kind).map(async (source) => {
      const file = app.vault.getFileByPath(`${source}.md`);
      return file ? [{ source, docs: parseFileDocs(await app.vault.cachedRead(file)) }] : [];
    })
  );
  return loaded.flat();
}
function recordFiles(app, record) {
  const folder = app.vault.getFolderByPath(record.dir);
  const files = [];
  if (folder) {
    import_obsidian9.Vault.recurseChildren(folder, (child) => {
      if (child instanceof import_obsidian9.TFile && OPENABLE.has(child.extension)) files.push(child.path.slice(record.dir.length + 1));
    });
  }
  return files;
}
async function renderRecordStrip(app, el3, record, launchers) {
  const { documented, other } = recordFileLinks(recordFiles(app, record), await loadSources(app, record));
  const open = (path, event) => void app.workspace.openLinkText(`${record.dir}/${path}`, "", event.metaKey || event.ctrlKey);
  const chip = (row, label3, tooltip, onClick, cls = "") => {
    const button2 = row.createEl("button", { text: label3, cls: `gb-record-chip ${cls}`.trim() });
    if (tooltip) (0, import_obsidian9.setTooltip)(button2, tooltip, { placement: "bottom" });
    button2.onclick = onClick;
  };
  const menu = (event, paths) => {
    const list3 = new import_obsidian9.Menu();
    for (const path of paths) list3.addItem((item2) => item2.setTitle(path).onClick((clicked) => open(path, clicked)));
    list3.showAtMouseEvent(event);
  };
  const link = (row, one) => chip(row, recordFileLabel(one), one.hint, (event) => one.files ? menu(event, one.files) : open(one.path, event));
  const index = app.vault.getFileByPath(`${record.dir}/index.md`);
  const related = recordLinks(index ? await app.vault.cachedRead(index) : "", record.repo);
  if (related.length) {
    const row = el3.createDiv({ cls: "gb-record-row" });
    for (const one of related) chip(row, one.text, one.label, (event) => openRecordLink(app, one, event), "gb-record-chip-launch");
  }
  const files = el3.createDiv({ cls: "gb-record-row" });
  files.createSpan({ text: `${record.kind} \xB7 ${record.status}`, cls: "gb-record-where" });
  for (const one of documented) link(files, one);
  if (other.length) chip(files, `Other (${other.length})`, "Files File Docs doesn't describe", (event) => menu(event, other.flatMap((one) => one.files ?? [one.path])), "gb-record-chip-quiet");
  if (!launchers.length) return;
  const actions = el3.createDiv({ cls: "gb-record-row" });
  for (const launcher of launchers) chip(actions, launcher.label, launcher.tooltip, launcher.run, "gb-record-chip-launch");
}

// src/findings-strip.ts
var import_obsidian10 = require("obsidian");
init_landing();
var panelModel = () => (init_panel(), __toCommonJS(panel_exports));
var FILTERED = "filtered";
async function edit(app, record, dir, panel, change) {
  try {
    const found = panelModel().findingsEdit(dir, { round: panel.round, ...change });
    const file = found && app.vault.getFileByPath(`${record.dir}/${found.file}`);
    if (!found || !file) return void new import_obsidian10.Notice("id" in change ? `${change.id} is no longer in ${panel.file}` : `${panel.file} is gone`);
    await app.vault.process(file, found.change);
  } catch (error) {
    new import_obsidian10.Notice(`${panel.file} not updated: ${error instanceof Error ? error.message : error}`);
  }
}
var toneLine = (el3, line, cls = "") => el3.createDiv({ text: line, cls: `gb-findings-${statusTone(line)} ${cls}`.trim() });
function details2(el3, key2, label3, hooks, fill) {
  const box = el3.createEl("details", { cls: "gb-findings-details" });
  box.createEl("summary", { text: label3 });
  const body = box.createDiv({ cls: "gb-findings-body" });
  let filled = false;
  const sync = () => {
    if (box.open && !filled) {
      filled = true;
      fill(body);
    }
  };
  box.open = hooks.state.opened.has(key2);
  sync();
  box.addEventListener("toggle", () => {
    if (box.open) hooks.state.opened.add(key2);
    else hooks.state.opened.delete(key2);
    sync();
  });
  return box;
}
function checkbox2(el3, checked, tooltip, onChange) {
  const input = el3.createEl("input", { type: "checkbox", attr: { "aria-label": tooltip, title: tooltip } });
  input.checked = checked;
  input.onchange = () => onChange(input.checked);
  return input;
}
function renderFindings(app, el3, record, hooks) {
  const dir = `${hooks.vaultRoot}/${record.dir}`;
  let panel;
  try {
    panel = panelModel().findingsPanel(dir);
  } catch (error) {
    el3.createDiv({ text: `\u26D4 Findings: ${error instanceof Error ? error.message : error}`, cls: "gb-findings-blocked" });
    return;
  }
  if (!panel) return;
  const root = el3.createDiv({ cls: "gb-findings" });
  root.createDiv({ text: `Findings \xB7 ${panel.file}`, cls: "gb-findings-title" });
  const { landing: landing2 } = panel;
  if (!landing2) {
    root.createDiv({ text: `\u26A0\uFE0F ${panel.file} has errors; fix them to see the findings`, cls: "gb-findings-blocked" });
    for (const error of panel.errors) root.createDiv({ text: error, cls: "gb-findings-blocked" });
    return;
  }
  const markdown2 = (body, text2) => void import_obsidian10.MarkdownRenderer.render(app, text2, body, `${record.dir}/index.md`, hooks.component);
  const change = (one) => void edit(app, record, dir, panel, one);
  toneLine(root, landing2.status, "gb-findings-status");
  for (const error of landing2.errors.slice(1)) toneLine(root, `\u26D4 ${error}`);
  for (const warning of landing2.warnings) toneLine(root, `\u26A0\uFE0F ${warning}`);
  const notes = root.createDiv({ cls: "gb-record-row" });
  for (const note of landing2.notes) {
    const button2 = notes.createEl("button", { text: noteLabel(note), cls: "gb-record-chip", attr: { title: `Edit ${note.name}` } });
    button2.onclick = (event) => void app.workspace.openLinkText(`${record.dir}/${note.name}`, "", event.metaKey || event.ctrlKey);
  }
  const actions = root.createDiv({ cls: "gb-record-row gb-findings-actions" });
  for (const one of landing2.actions) {
    const label3 = actions.createEl("label");
    checkbox2(label3, one.checked, one.checked ? `Uncheck ${one.label}` : `Check ${one.label}`, (checked) => change({ action: one.action, checked }));
    label3.appendText(one.label);
  }
  const checkRow = root.createDiv({ cls: "gb-record-row" });
  const { check, checking } = hooks.state;
  const run = checkRow.createEl("button", { text: checking ? "\u{1F50D} Checking\u2026" : "\u{1F50D} Check before posting", cls: "gb-record-chip gb-record-chip-launch", attr: { title: "Every refusal Respond would give, with git: fetches the PR and the review branch" } });
  run.disabled = checking;
  run.onclick = () => hooks.runCheck();
  for (const line of check?.message.split("\n").filter(Boolean) ?? []) toneLine(root, line, "gb-findings-check");
  const row = (list4, f) => {
    const item2 = list4.createDiv({ cls: "gb-findings-item" });
    checkbox2(item2, f.include, f.include ? `Leave ${f.id} out` : `Include ${f.id}`, (include) => change({ id: f.id, include }));
    const main = item2.createDiv({ cls: "gb-findings-main" });
    const label3 = `${f.id} ${f.title}${f.fixedIn.length ? ` \u{1F33F} ${f.fixedIn.join(", ")}` : ""}`;
    const head = f.text ? details2(main, f.id, label3, hooks, (body) => markdown2(body, f.text)) : main.createDiv({ text: label3 });
    head.toggleClass("gb-findings-out", !f.include);
    main.createDiv({ text: f.filtered ? `${f.filtered.category}: ${f.filtered.reason}` : f.summary, cls: "gb-findings-summary" });
  };
  const list3 = root.createDiv({ cls: "gb-findings-list" });
  for (const f of landing2.findings) row(list3, f);
  if (landing2.filtered.length) {
    details2(root, FILTERED, `Filtered (${landing2.filtered.length})`, hooks, (body) => {
      for (const f of landing2.filtered) row(body, f);
    });
  }
  details2(root, "preview:comment", "Preview comment", hooks, (body) => markdown2(body, landing2.previews.comment));
  if (landing2.previews.pr !== null) details2(root, "preview:pr", "Preview PR body", hooks, (body) => markdown2(body, landing2.previews.pr));
}

// src/main.ts
var PROFILES_PATH = "agents/_shared/AGENT_PROFILES.yml";
var ENVIRONMENTS_PATH = "agents/_shared/ENVIRONMENTS.yml";
var RECORD_AGENTS_PATH = "agents/_shared/RECORD_AGENTS.yml";
var FACTORY_AGENT_DIR = "factory";
var GalaxyBrainPlugin = class extends import_obsidian11.Plugin {
  constructor() {
    super(...arguments);
    this.recordActions = /* @__PURE__ */ new WeakMap();
    this.agentActions = /* @__PURE__ */ new WeakMap();
    this.recordStrips = /* @__PURE__ */ new WeakMap();
    /** Findings panels' state, by record dir. */
    this.findingsStates = /* @__PURE__ */ new Map();
  }
  async onload() {
    registerDifferentialReview(this);
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian11.TFile)) return;
        menu.addItem(
          (item2) => item2.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file))
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
    this.addRibbonIcon("library", "Open a repository's records", () => void this.pickRepository());
    this.addRibbonIcon("layers", "All repository records", () => void this.openRepository(ALL_REPOS));
    this.addCommand({
      id: "open-repository",
      name: "Open a repository's records",
      callback: () => void this.pickRepository()
    });
    this.addCommand({
      id: "open-recent-records",
      name: "All repository records",
      callback: () => void this.openRepository(ALL_REPOS)
    });
    this.registerView(AGENTS_VIEW, (leaf) => new AgentsView(leaf, this));
    this.addRibbonIcon("bot", "Agents: routines and tasks", () => void this.openAgents());
    this.addCommand({
      id: "open-agents",
      name: "Agents: routines and tasks",
      callback: () => void this.openAgents()
    });
    this.registerMarkdownCodeBlockProcessor("gb-tasks", (source, el3, ctx) => this.renderTasks(source, el3, ctx));
    this.registerMarkdownCodeBlockProcessor("gb-missed-prs", (source, el3, ctx) => this.renderMissedPrs(source, el3, ctx.sourcePath));
    this.registerMarkdownCodeBlockProcessor("gb-missed-prs-feed", (source, el3, ctx) => this.renderMissedPrsFeed(source, el3, ctx));
    this.registerRecordStrips();
    if (!import_obsidian11.Platform.isDesktopApp) return;
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
    const refresh = () => {
      this.refreshRecordActions();
      this.refreshAgentActions();
    };
    this.registerEvent(this.app.workspace.on("file-open", refresh));
    this.registerEvent(this.app.workspace.on("layout-change", refresh));
    this.app.workspace.onLayoutReady(refresh);
  }
  async copyContents(file) {
    try {
      await navigator.clipboard.writeText(await this.app.vault.read(file));
      new import_obsidian11.Notice(`Copied ${file.name}`);
    } catch (error) {
      new import_obsidian11.Notice(`Could not copy ${file.name}: ${error}`);
    }
  }
  /** Keeps the landing strips on open record index.md notes current. */
  registerRecordStrips() {
    const refresh = () => this.refreshRecordStrips();
    this.registerEvent(this.app.workspace.on("file-open", refresh));
    this.registerEvent(this.app.workspace.on("layout-change", refresh));
    this.register(() => {
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        if (leaf.view instanceof import_obsidian11.MarkdownView) this.recordStrips.get(leaf.view)?.el.remove();
      }
    });
    const redraw = (0, import_obsidian11.debounce)(() => this.refreshRecordStrips(true), 300, true);
    const onFile = ({ path }) => {
      if (path.startsWith("repositories/")) redraw();
    };
    const onModify = ({ path }) => {
      if (path.startsWith("repositories/") && /\/((FILE_DOCS|LAUNCHERS|MY_[A-Z]+|index|human_review|johns_review_\d+_(comment|pr)_note)\.md|review_\d+_findings\.yml)$/.test(path)) redraw();
    };
    this.app.workspace.onLayoutReady(() => {
      refresh();
      this.registerEvent(this.app.vault.on("create", onFile));
      this.registerEvent(this.app.vault.on("delete", onFile));
      this.registerEvent(this.app.vault.on("rename", onFile));
      this.registerEvent(this.app.vault.on("modify", onModify));
    });
  }
  /** A record's index.md gets its landing strip above the note; redraw refills strips already showing. */
  refreshRecordStrips(redraw = false) {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian11.MarkdownView)) continue;
      const path = view.file?.path;
      const record = path ? recordFromPath(path) : null;
      const landing2 = record && path === `${record.dir}/index.md` ? path : null;
      const existing = this.recordStrips.get(view);
      if (existing && existing.path === landing2) {
        if (redraw && record) void this.fillRecordStrip(existing.el, record);
        continue;
      }
      existing?.el.remove();
      this.recordStrips.delete(view);
      if (!record || !landing2) continue;
      const el3 = createDiv({ cls: "gb-record-strip" });
      view.contentEl.before(el3);
      this.recordStrips.set(view, { path: landing2, el: el3 });
      void this.fillRecordStrip(el3, record);
    }
  }
  async fillRecordStrip(el3, record) {
    const launchers = import_obsidian11.Platform.isDesktopApp ? await this.launchersFor(record) : [];
    const filled = createDiv();
    await renderRecordStrip(
      this.app,
      filled,
      record,
      launchers.map((launcher) => ({ label: launcher.label, tooltip: launcher.command ?? launcher.prompt, run: () => void this.confirmLaunch(launcher, record) }))
    );
    const adapter = this.app.vault.adapter;
    if (record.kind === "reviews" && adapter instanceof import_obsidian11.FileSystemAdapter) {
      const vaultRoot = adapter.getBasePath();
      const state = this.findingsState(record);
      renderFindings(this.app, filled, record, { vaultRoot, component: this, state, runCheck: () => this.runFindingsCheck(vaultRoot, record, state) });
    }
    el3.replaceChildren(...Array.from(filled.childNodes));
  }
  findingsState(record) {
    let state = this.findingsStates.get(record.dir);
    if (!state) this.findingsStates.set(record.dir, state = { opened: /* @__PURE__ */ new Set(), check: null, checking: false });
    return state;
  }
  /** Runs review-factory check, which fetches; git can't prompt, since no one would answer. */
  runFindingsCheck(vaultRoot, record, state) {
    if (state.checking) return;
    const { execFile } = require("child_process");
    const { homedir } = require("os");
    const PATH = [`${homedir()}/.local/bin`, ...CLI_BIN_DIRS, process.env.PATH].join(":");
    const env = { ...process.env, PATH, GIT_TERMINAL_PROMPT: "0", GIT_SSH_COMMAND: "ssh -o BatchMode=yes" };
    const redraw = () => this.refreshRecordStrips(true);
    state.checking = true;
    state.check = null;
    redraw();
    execFile(`${vaultRoot}/../review-factory/bin/review-factory`, ["check", "--record", `${vaultRoot}/${record.dir}`], { env, timeout: 18e4 }, (error, stdout, stderr) => {
      const message = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      state.check = { ok: !error, message: message || `\u26D4 ${error?.message ?? "no output"}` };
      state.checking = false;
      redraw();
    });
  }
  /** Code, GitHub (not issue incubator), agent, (branches/reviews) differential review and (branches) compare icons in the header of notes inside a repository record. */
  refreshRecordActions() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian11.MarkdownView)) continue;
      const record = view.file && recordFromPath(view.file.path);
      const reviewable = !!record && isReviewableRecordKind(record.kind);
      const hasCi = record?.kind === "branches" || record?.kind === "reviews";
      const existing = this.recordActions.get(view);
      if (existing && (!record || existing.kind !== record.kind)) {
        existing.actions.forEach((action) => action.remove());
        this.recordActions.delete(view);
      }
      if (record && !this.recordActions.has(view)) {
        const withRecord = (act) => () => {
          const current = view.file && recordFromPath(view.file.path);
          if (current) void act(current);
        };
        const actions = [
          ...hasCi ? [view.addAction("circle-dot", "CI status", withRecord((r) => this.openCiStatus(r)))] : [],
          ...reviewable ? [view.addAction("git-compare", "Differential review", withRecord((r) => openDifferentialReview(this.app, r.dir)))] : [],
          view.addAction("code", "Open with Code", withRecord((r) => this.openRecordInCode(r))),
          ...record.kind === "branches" ? [view.addAction("git-compare-arrows", "Compare to upstream base", withRecord((r) => this.openRecordCompare(r)))] : [],
          ...record.kind !== "issues_incubator" ? [view.addAction("github", "Open on GitHub", withRecord((r) => this.openRecordOnGithub(r)))] : [],
          view.addAction("bot", "Launch agent", withRecord((r) => this.pickLauncher(r)))
        ];
        this.recordActions.set(view, { kind: record.kind, actions });
        this.register(() => actions.forEach((action) => action.remove()));
      }
    }
  }
  /** Agent launcher and agents-view icons in the header of notes under `agents/<agent>/`. */
  refreshAgentActions() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian11.MarkdownView)) continue;
      const agent = view.file && agentFromPath(view.file.path);
      const existing = this.agentActions.get(view);
      if (existing && existing.agent !== agent) {
        existing.actions.forEach((action) => action.remove());
        this.agentActions.delete(view);
      }
      if (agent && !this.agentActions.has(view)) {
        const actions = [
          view.addAction("layout-list", "Agents: routines and tasks", () => void this.openAgents(agent)),
          view.addAction("bot", "Launch agent", () => void this.pickAgentLauncher(agent, view.file?.path ?? ""))
        ];
        this.agentActions.set(view, { agent, actions });
        this.register(() => actions.forEach((action) => action.remove()));
      }
    }
  }
  async pickAgentLauncher(agent, path) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    const file = this.app.vault.getFileByPath(agentLaunchersPath(agent));
    const launchers = file ? parseAgentLaunchers(await this.app.vault.cachedRead(file), agent) : [];
    if (launchers.length === 0) return void new import_obsidian11.Notice(`No launchers in ${agentLaunchersPath(agent)}`);
    const absolute = path ? `${vaultRoot}/${path}` : "";
    new LauncherSuggest(this.app, launchers, (launcher) => {
      const name = fillAgentTemplate(launcher.name, agent, absolute);
      const prompt = fillAgentTemplate(launcher.prompt, agent, absolute);
      void this.confirmTask({ prompt, agentDir: launcher.agentDir, ...launcher.profile ? { profile: launcher.profile } : {} }, () => {
      }, name);
    }).open();
  }
  async indexBody(record) {
    const index = this.app.vault.getFileByPath(`${record.dir}/index.md`);
    return index ? this.app.vault.cachedRead(index) : "";
  }
  /** The record's worktree, if one exists on disk. */
  worktreeFor(record, body) {
    const { existsSync: existsSync3 } = require("fs");
    const { homedir } = require("os");
    return worktreeCandidates(record, body, homedir()).find((path) => existsSync3(path)) ?? null;
  }
  openInCode(path) {
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    execFile("code", [path], { env: { ...process.env, PATH } }, (error) => {
      if (error) new import_obsidian11.Notice(`Could not run the VS Code \`code\` CLI: ${error.message}`, 1e4);
    });
  }
  /** okWithOutput: resolve with stdout despite a nonzero exit, as `gh pr checks` exits 1/8 for failed/pending checks. */
  runGh(args, okWithOutput = false) {
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    return new Promise((resolve3, reject) => {
      execFile("gh", args, { env: { ...process.env, PATH }, timeout: 6e4, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error && !(okWithOutput && stdout.trim())) reject(new Error((stderr || error.message).trim()));
        else resolve3(stdout);
      });
    });
  }
  async openRecordInCode(record) {
    const worktree = this.worktreeFor(record, await this.indexBody(record));
    if (worktree) this.openInCode(worktree);
    else new import_obsidian11.Notice(`No worktree on disk for ${record.name}`);
  }
  async openCiStatus(record) {
    const sources = ciSources(record, await this.indexBody(record));
    const fixCi = (await this.launchersFor(record)).find((launcher) => /fix ci/i.test(launcher.label));
    const fetch = async (source) => {
      const output = await this.runGh(source.args, isPrSource(source));
      return isPrSource(source) ? summarizePrChecks(output) : summarizeCheckRuns(output);
    };
    new CiStatusModal(this.app, `CI: ${record.name}`, sources, fetch, fixCi && (() => void this.confirmLaunch(fixCi, record))).open();
  }
  async openRecordOnGithub(record) {
    const url = githubUrl(record, await this.indexBody(record));
    if (url) window.open(url);
  }
  async openRecordCompare(record) {
    const url = compareUrl(record, await this.indexBody(record));
    if (url) window.open(url);
    else new import_obsidian11.Notice(`No upstream_base_branch in ${record.name}'s index.md`);
  }
  async loadLaunchers() {
    const files = this.app.vault.getMarkdownFiles().flatMap((file) => {
      const scope = launcherScope(file.path);
      return scope ? [{ file, scope }] : [];
    }).sort((a, b) => Number(a.scope.repo === null) - Number(b.scope.repo === null));
    const parsed = await Promise.all(files.map(async ({ file, scope }) => parseLaunchers(await this.app.vault.cachedRead(file), scope)));
    return parsed.flat();
  }
  async launchersFor(record) {
    const [sectioned] = await this.withSections([record]);
    return launchersFor(await this.loadLaunchers(), sectioned);
  }
  /** Records with their queue sections, so section-scoped launchers match. */
  async withSections(records) {
    const texts = /* @__PURE__ */ new Map();
    await Promise.all(queuePaths(records).map(async (path) => {
      const file = this.app.vault.getFileByPath(path);
      if (file) texts.set(path, await this.app.vault.cachedRead(file));
    }));
    return withSections(records, (path) => texts.get(path));
  }
  async openRepository(repo) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo }, active: true });
  }
  async openAgents(agent = ALL_AGENTS) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: AGENTS_VIEW, state: { agent }, active: true });
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
    if (!import_obsidian11.Platform.isDesktopApp) return;
    const record = recordFromPath(file.path);
    if (!record) return;
    for (const launcher of await this.launchersFor(record)) {
      menu.addItem(
        (item2) => item2.setTitle(`Launch: ${launcher.label}`).setIcon("bot").onClick(() => void this.confirmLaunch(launcher, record))
      );
    }
  }
  async pickLauncher(record) {
    const launchers = await this.launchersFor(record);
    if (launchers.length === 0) {
      new import_obsidian11.Notice(`No launchers for ${record.repo}/${record.kind} (${record.status}) in repositories/${record.repo}/${record.kind}/LAUNCHERS.md`);
      return;
    }
    new LauncherSuggest(this.app, launchers, (launcher) => void this.confirmLaunch(launcher, record)).open();
  }
  async loadProfiles() {
    try {
      const profiles = parseProfiles((0, import_obsidian11.parseYaml)(await this.app.vault.adapter.read(PROFILES_PATH)));
      if (profiles.length > 0) return profiles;
    } catch (error) {
      new import_obsidian11.Notice(`Could not read ${PROFILES_PATH}: ${error}`);
    }
    return FALLBACK_PROFILES;
  }
  async loadEnvironments() {
    try {
      const environments = parseEnvironments((0, import_obsidian11.parseYaml)(await this.app.vault.adapter.read(ENVIRONMENTS_PATH)));
      if (environments.length > 0) return environments;
    } catch {
    }
    return [LOCAL_ENVIRONMENT];
  }
  async confirmLaunch(launcher, record) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    if (launcher.command) {
      const args = commandArgs(launcher, record, vaultRoot);
      new CommandModal(this.app, launcher.label, args, () => this.runCommand(launcher.label, args)).open();
      return;
    }
    const profiles = await this.loadProfiles();
    const environments = await this.loadEnvironments();
    new LaunchModal(this.app, launcher, {
      profiles,
      profile: defaultProfile(profiles, launcher),
      environments,
      environment: defaultEnvironment(environments),
      name: fillTemplate(launcher.name, record, vaultRoot),
      prompt: fillTemplate(launcher.prompt, record, vaultRoot),
      launch: (profile, environment, name, prompt) => this.launch(vaultRoot, launcher, profile, environment, name, prompt)
    }).open();
  }
  vaultRoot() {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof import_obsidian11.FileSystemAdapter) return adapter.getBasePath();
    new import_obsidian11.Notice("Launching agents needs the desktop app");
    return null;
  }
  async syncAgent(repo, kind) {
    try {
      return parseRecordAgents((0, import_obsidian11.parseYaml)(await this.app.vault.adapter.read(RECORD_AGENTS_PATH)))[repo]?.[kind];
    } catch {
      return void 0;
    }
  }
  async launchSync(repo, kind, agentDir) {
    const prompt = `Sync ${repo} ${kind} per agents/_shared/${SYNC_PROCESSES[kind]} (${repo} only).`;
    await this.confirmTask({ prompt, agentDir, profile: SYNC_PROFILE }, () => {
    });
  }
  /** Agent dirs with an AGENTS.md, not `_`-prefixed. */
  async agentDirs() {
    const { folders } = await this.app.vault.adapter.list("agents");
    const names = folders.map((folder) => folder.split("/").pop()).filter((name) => !name.startsWith("_"));
    const withAgents = await Promise.all(names.map((name) => this.app.vault.adapter.exists(`agents/${name}/AGENTS.md`)));
    return names.filter((_, i) => withAgents[i]).sort();
  }
  /** Cards for a ```gb-tasks block: launch removes the task on success. */
  async renderTasks(source, el3, ctx) {
    const profiles = await this.loadProfiles();
    let raw;
    let tasks;
    try {
      raw = (0, import_obsidian11.parseYaml)(source);
      tasks = parseTasks(raw, { profiles: profiles.map((p) => p.name), agentDirs: await this.agentDirs() });
    } catch (error) {
      el3.createDiv({ cls: "gb-tasks-error", text: `gb-tasks: ${error instanceof Error ? error.message : error}` });
      return;
    }
    const rewrite = async (entries2) => {
      const file = this.app.vault.getFileByPath(ctx.sourcePath);
      const section2 = ctx.getSectionInfo(el3);
      if (!file || !section2) return void new import_obsidian11.Notice("Could not locate this gb-tasks block");
      await this.app.vault.process(
        file,
        (note) => replaceBlockBody(note, section2.lineStart, section2.lineEnd, entries2.length ? (0, import_obsidian11.stringifyYaml)(entries2) : "")
      );
    };
    const entries = raw;
    const remove = (index) => rewrite(entries.filter((_, i) => i !== index));
    const snooze = (index, day) => rewrite(entries.map((entry, i) => i === index ? { ...entry, snoozed_until: day } : entry));
    renderTaskCards(el3, tasks, {
      defaultProfile: profiles[0]?.name ?? "",
      ...import_obsidian11.Platform.isDesktopApp ? {
        launch: (task, index, pending) => void this.confirmTask(task, () => void remove(index), task.agentDir, pending),
        refine: (task) => void this.refineTask(task)
      } : {},
      remove: (_task, index) => void remove(index),
      snooze: (_task, index, day) => void snooze(index, day),
      openRecord: (record, newLeaf) => this.openTaskRecord(record, newLeaf)
    });
  }
  /** Cards for a ```gb-missed-prs block in the note at path; ✔ / ↺ toggle `reviewed`. */
  renderMissedPrs(source, el3, path) {
    try {
      renderMissedPrCards(el3, parseMissedPrs((0, import_obsidian11.parseYaml)(source)), { setReviewed: (pr, reviewed) => setReviewedInFile(this.app, path, pr, reviewed) });
    } catch (error) {
      renderMissedPrsError(el3, error);
    }
  }
  /** Unreviewed PRs from a directory's merge-date files (body, default gx_reviews' the_cracks), newest first. */
  async renderMissedPrsFeed(source, el3, ctx) {
    const dir = source.trim() || cracksPath("gx_reviews");
    renderCrackDays(this.app, el3, await readCrackDays(this.app, dir), ctx.sourcePath);
  }
  /** Opens a task's record index.md, wherever its status puts it. */
  openTaskRecord(record, newLeaf) {
    const path = recordIndexPath(record, this.app.vault.getMarkdownFiles().map((file) => file.path));
    if (!path) return void new import_obsidian11.Notice(`No record ${record.repo}/${record.kind}/${record.name}`);
    void this.app.workspace.openLinkText(path, "", newLeaf);
  }
  /** Launch dialog for the factory agent to discuss refining task. */
  async refineTask(task) {
    await this.confirmTask({ prompt: refinementPrompt(task), agentDir: FACTORY_AGENT_DIR }, () => {
    }, "refine-task");
  }
  /** Launch dialog for a task; launched runs once the agent starts, pending brackets the launch. */
  async confirmTask(task, launched, name = task.agentDir, pending) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    const profiles = await this.loadProfiles();
    const environments = await this.loadEnvironments();
    const launcher = { label: "Task", repo: null, kind: null, statuses: [], agentDir: task.agentDir, name, prompt: task.prompt, ...task.profile ? { profile: task.profile } : {} };
    new LaunchModal(this.app, launcher, {
      profiles,
      profile: defaultProfile(profiles, launcher),
      environments,
      environment: defaultEnvironment(environments),
      name: launcher.name,
      prompt: task.prompt,
      launch: (profile, environment, name2, prompt) => this.launch(vaultRoot, launcher, profile, environment, name2, prompt, launched, pending)
    }).open();
  }
  runCommand(label3, [executable, ...args]) {
    const { execFile } = require("child_process");
    const { homedir } = require("os");
    const PATH = [`${homedir()}/.local/bin`, ...CLI_BIN_DIRS, process.env.PATH].join(":");
    const started = new import_obsidian11.Notice(`Running ${label3}\u2026`, 0);
    execFile(executable, args, { env: { ...process.env, PATH }, timeout: 18e4 }, (error, stdout, stderr) => {
      started.hide();
      if (error) new import_obsidian11.Notice(`${label3} failed: ${(stderr || error.message).trim()}`, 0);
      else new import_obsidian11.Notice(stdout.trim() || `${label3} done`, 15e3);
    });
  }
  launch(vaultRoot, launcher, profile, environment, name, prompt, launched, pending) {
    const { execFile } = require("child_process");
    const where = environment.host ? ` on ${environment.name}` : "";
    const started = new import_obsidian11.Notice(`Launching ${profile.name} in ${launcher.agentDir}${where}\u2026`, 0);
    pending?.(true);
    const [executable, ...args] = launchArgv(environment, vaultRoot, [launcher.agentDir, profile.agent, name, prompt, ...profileArgs(profile)]);
    execFile(
      executable,
      args,
      { timeout: 18e4 },
      (error, stdout, stderr) => {
        started.hide();
        if (error) {
          pending?.(false);
          new import_obsidian11.Notice(`Launch failed: ${(stderr || error.message).trim()}`, 15e3);
        } else {
          new import_obsidian11.Notice(stdout.trim(), 1e4);
          launched?.();
        }
      }
    );
  }
};
var CommandModal = class extends import_obsidian11.Modal {
  constructor(app, label3, args, run) {
    super(app);
    this.label = label3;
    this.args = args;
    this.run = run;
  }
  onOpen() {
    this.setTitle(this.label);
    this.contentEl.createEl("pre", { text: this.args.join(" \\\n  ") });
    new import_obsidian11.Setting(this.contentEl).addButton(
      (button2) => button2.setButtonText("Run").setCta().onClick(() => {
        this.close();
        this.run();
      })
    ).addButton((button2) => button2.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var LauncherSuggest = class extends import_obsidian11.FuzzySuggestModal {
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
var ChoiceSuggest = class extends import_obsidian11.FuzzySuggestModal {
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
var LaunchModal = class extends import_obsidian11.Modal {
  constructor(app, launcher, details3) {
    super(app);
    this.launcher = launcher;
    this.details = details3;
  }
  onOpen() {
    const { launcher } = this;
    let { name, prompt, profile, environment } = this.details;
    this.setTitle(`${launcher.label} in ${launcher.agentDir}`);
    new import_obsidian11.Setting(this.contentEl).setName("Agent name").addText(
      (text2) => text2.setValue(name).onChange((value) => name = value)
    );
    new import_obsidian11.Setting(this.contentEl).setName("Prompt").addTextArea((area) => {
      area.setValue(prompt).onChange((value) => prompt = value);
      area.inputEl.rows = 6;
    }).settingEl.addClass("galaxy-brain-launch-prompt");
    new import_obsidian11.Setting(this.contentEl).addDropdown((dropdown) => {
      for (const option of this.details.profiles) dropdown.addOption(option.name, option.name);
      dropdown.setValue(profile.name).onChange((value) => {
        profile = this.details.profiles.find((option) => option.name === value) ?? profile;
      });
    }).then((setting) => {
      if (this.details.environments.length < 2) return;
      setting.addDropdown((dropdown) => {
        for (const option of this.details.environments) dropdown.addOption(option.name, option.name);
        dropdown.setValue(environment.name).onChange((value) => {
          environment = this.details.environments.find((option) => option.name === value) ?? environment;
        });
      });
    }).addButton(
      (button2) => button2.setButtonText("Launch").setCta().onClick(() => {
        this.close();
        this.details.launch(profile, environment, name, prompt);
      })
    ).addButton((button2) => button2.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};

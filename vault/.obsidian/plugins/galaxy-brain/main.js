"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GalaxyBrainPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/agents-view.ts
var import_obsidian = require("obsidian");

// src/agent-routines.ts
var ROUTINES = [
  { file: "GOOD_MORNING.md", label: "\u{1F305} Good morning", prefix: "gm" },
  { file: "TICK.md", label: "\u23F1\uFE0F Tick", prefix: "tick" }
];
var ROUTINE_PROFILE = "Sonnet (medium)";
var tasksPath = (agentDir) => `agents/${agentDir}/TASKS.md`;
function routineLaunch(agentDir, routine) {
  return {
    task: { prompt: `Run ./${routine.file}`, agentDir, profile: ROUTINE_PROFILE },
    name: `${routine.prefix}-${agentDir}`
  };
}

// src/task-cards.ts
function renderTaskCards(el2, tasks, actions) {
  const list2 = el2.createDiv({ cls: "gb-tasks" });
  if (tasks.length === 0) list2.createDiv({ cls: "gb-tasks-empty", text: "No tasks." });
  tasks.forEach((task, index) => {
    const human = task.kind === "human";
    const cls = ["gb-task", task.status && `gb-task-${task.status}`, task.priority && `gb-task-${task.priority}`, human && "gb-task-human"];
    const card = list2.createDiv({ cls: cls.filter(Boolean).join(" ") });
    const head = card.createDiv({ cls: "gb-task-head" });
    if (task.priority) head.createSpan({ cls: "gb-task-priority", text: task.priority });
    if (task.status) head.createSpan({ cls: "gb-task-status", text: task.status });
    head.createSpan({ cls: "gb-task-meta", text: `${task.agentDir} \xB7 ${human ? "for John" : task.profile ?? actions.defaultProfile}` });
    if (actions.launch && !human) {
      const launch = actions.launch;
      head.createEl("button", { text: "\u{1F680}", attr: { "aria-label": "Launch" } }).onclick = () => launch(task, index);
    }
    const [text2, label] = human ? ["\u2714", "Done"] : ["\u2716", "Remove"];
    head.createEl("button", { text: text2, attr: { "aria-label": label } }).onclick = () => actions.remove(task, index);
    if (task.description) card.createDiv({ cls: "gb-task-description", text: task.description.trim() });
    if (task.link) {
      const text3 = task.link.replace(/^https?:\/\//, "");
      card.createDiv({ cls: "gb-task-link" }).createEl("a", { text: text3, href: task.link, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
    }
    card.createDiv({ cls: "gb-task-prompt", text: task.prompt.trim() });
  });
}

// src/task-list.ts
var FIELDS = ["prompt", "agent_dir", "profile", "description", "status", "priority", "kind", "link"];
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
    const { prompt, agent_dir: agentDir, profile, description, status, priority, kind, link } = entry;
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
    return {
      prompt,
      agentDir,
      ...profile ? { profile } : {},
      ...description ? { description } : {},
      ...status ? { status } : {},
      ...priority ? { priority } : {},
      ...kind ? { kind } : {},
      ...link ? { link } : {}
    };
  });
}
function taskBlocks(note) {
  const lines = note.split("\n");
  const blocks = [];
  for (let start = 0; start < lines.length; start++) {
    if (lines[start].trim() !== "```gb-tasks") continue;
    const end = lines.findIndex((line, i) => i > start && line.trim() === "```");
    if (end < 0) break;
    blocks.push({ start, end, source: lines.slice(start + 1, end).join("\n") });
    start = end;
  }
  return blocks;
}
function removeTask(note, task, parse2, stringify) {
  for (const block of taskBlocks(note)) {
    const entries = parse2(block.source);
    if (!Array.isArray(entries)) continue;
    const index = entries.findIndex((entry) => entry?.prompt === task.prompt && entry?.agent_dir === task.agentDir);
    if (index < 0) continue;
    const rest = entries.filter((_, i) => i !== index);
    return replaceBlockBody(note, block.start, block.end, rest.length ? stringify(rest) : "");
  }
  return void 0;
}
var PRIORITY_ORDER = { high: 0, none: 1, low: 2 };
var STATUS_ORDER = { recommended: 0, none: 1, idea: 2 };
function byPriority(tasks) {
  return [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority ?? "none"] - PRIORITY_ORDER[b.priority ?? "none"] || STATUS_ORDER[a.status ?? "none"] - STATUS_ORDER[b.status ?? "none"]
  );
}
function replaceBlockBody(note, fenceStart, fenceEnd, body) {
  const lines = note.split("\n");
  const bodyLines = body ? body.replace(/\n$/, "").split("\n") : [];
  lines.splice(fenceStart + 1, fenceEnd - fenceStart - 1, ...bodyLines);
  return lines.join("\n");
}

// src/agents-view.ts
var AGENTS_VIEW = "galaxy-brain-agents";
var ALL_AGENTS = "*";
var AgentsView = class extends import_obsidian.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.agent = ALL_AGENTS;
    this.scheduleRender = (0, import_obsidian.debounce)(() => void this.render(), 300, true);
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
    return { agent: this.agent };
  }
  async setState(state, result) {
    if (typeof state.agent === "string") this.agent = state.agent;
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      if (file.path.startsWith("agents/") && file.path.endsWith("/TASKS.md")) this.scheduleRender();
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
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository");
    const header = root.createDiv({ cls: "gbr-header" });
    header.createEl("h1", { text: all ? "All agents" : this.agent });
    const select = header.createEl("select", { cls: "dropdown" });
    select.createEl("option", { text: "All agents", value: ALL_AGENTS }).selected = all;
    for (const dir of dirs) select.createEl("option", { text: dir, value: dir }).selected = dir === this.agent;
    select.onchange = () => void this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent: select.value } });
    if (all) {
      const list2 = root.createEl("ul");
      shown.forEach((dir, i) => {
        const row = list2.createEl("li", { cls: "gbr-record" });
        this.renderRoutineButtons(row.createSpan({ cls: "gbr-actions" }), dir, routines[i]);
        const link = row.createEl("a", { text: dir, cls: "internal-link", href: "#" });
        link.onclick = (event) => {
          event.preventDefault();
          void this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent: dir } });
        };
        const count = lists[i].tasks.length;
        if (count) row.createSpan({ text: `${count} task${count === 1 ? "" : "s"}`, cls: "gbr-tag" });
      });
    } else {
      const bar = root.createDiv({ cls: "gbr-sync" });
      this.renderRoutineButtons(bar, this.agent, routines[0]);
      const file = this.app.vault.getFileByPath(tasksPath(this.agent));
      if (file) {
        const open = bar.createEl("a", { text: "Open TASKS.md", cls: "internal-link", href: "#" });
        open.onclick = (event) => {
          event.preventDefault();
          void this.app.workspace.openLinkText(file.path, "", event.metaKey || event.ctrlKey);
        };
      }
    }
    for (const { source, error } of lists) {
      if (error) root.createDiv({ cls: "gb-tasks-error", text: `${tasksPath(source)}: ${error}` });
    }
    const tasks = byPriority(lists.flatMap((list2) => list2.tasks));
    renderTaskCards(root, tasks, {
      defaultProfile: profiles[0]?.name ?? "",
      ...import_obsidian.Platform.isDesktopApp ? { launch: (_task, i) => void this.host.confirmTask(tasks[i], () => void this.remove(tasks[i])) } : {},
      remove: (_task, i) => void this.remove(tasks[i])
    });
  }
  /** 🌅 / ⏱️ buttons for the routine files the agent dir has; desktop only. */
  renderRoutineButtons(el2, dir, routines) {
    if (!import_obsidian.Platform.isDesktopApp) return;
    for (const routine of routines) {
      const { task, name } = routineLaunch(dir, routine);
      const button = el2.createEl("button", { text: routine.label, attr: { "aria-label": `Launch ${dir} with ./${routine.file}` } });
      button.onclick = () => void this.host.confirmTask(task, () => {
      }, name);
    }
  }
  async routinesFor(dir) {
    const present = await Promise.all(ROUTINES.map((routine) => this.app.vault.adapter.exists(`agents/${dir}/${routine.file}`)));
    return ROUTINES.filter((_, i) => present[i]);
  }
  async readTasks(dir, known) {
    const file = this.app.vault.getFileByPath(tasksPath(dir));
    if (!file) return { source: dir, tasks: [] };
    try {
      const blocks = taskBlocks(await this.app.vault.cachedRead(file));
      const tasks = blocks.flatMap((block) => parseTasks((0, import_obsidian.parseYaml)(block.source), known));
      return { source: dir, tasks: tasks.map((task) => ({ ...task, source: dir })) };
    } catch (error) {
      return { source: dir, tasks: [], error: error instanceof Error ? error.message : String(error) };
    }
  }
  async remove(task) {
    const file = this.app.vault.getFileByPath(tasksPath(task.source));
    if (!file) return void new import_obsidian.Notice(`${tasksPath(task.source)} is gone`);
    let found = false;
    await this.app.vault.process(file, (note) => {
      const updated = removeTask(note, task, import_obsidian.parseYaml, import_obsidian.stringifyYaml);
      found = updated !== void 0;
      return updated ?? note;
    });
    if (!found) new import_obsidian.Notice("Task already removed");
  }
};

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
var STATUS_ORDER2 = {
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
  const known = STATUS_ORDER2[kind];
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
  return kind === "branches" ? `repositories/${repo}/branches/MY_BRANCHES.md` : void 0;
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
    const link = line.match(/^- \[[^\]]*\]\(([^)\s]+)\)/);
    const section2 = sections[sections.length - 1];
    if (!link || !section2) continue;
    const record = parseRecordPath(resolveLink(path, decodeURI(link[1])));
    if (record?.rest && record.repo === repo && record.kind === kind && !section2.names.includes(record.id)) section2.names.push(record.id);
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

// src/launchers.ts
var KEY_LINE = /^(status|agent_dir|name|profile):\s*(.*)$/;
var list = (value) => value.split(",").map((item2) => item2.trim()).filter(Boolean);
function launcherScope(path) {
  const [root, repo, kind, file, ...rest] = path.split("/");
  if (root !== "repositories" || file !== "LAUNCHERS.md" || rest.length || !repo) return null;
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: repo === DEFAULTS_REPO ? null : repo, kind };
}
function parseLaunchers(markdown, scope) {
  const launchers = [];
  for (const section2 of markdown.split(/^## /m).slice(1)) {
    const [heading = "", ...lines] = section2.split("\n");
    const fields = {};
    let i = 0;
    for (; i < lines.length; i++) {
      const match = KEY_LINE.exec(lines[i].trim());
      if (!match) break;
      fields[match[1]] = match[2].trim();
    }
    const prompt = lines.slice(i).join("\n").trim();
    const label = heading.trim();
    if (!label || !fields.agent_dir || !prompt) continue;
    launchers.push({
      label,
      ...scope,
      statuses: list(fields.status ?? ""),
      agentDir: fields.agent_dir,
      name: fields.name || fields.agent_dir,
      ...fields.profile ? { profile: fields.profile } : {},
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
function launchersFor(launchers, record) {
  return launchers.filter(
    (launcher) => (launcher.repo ?? record.repo) === record.repo && launcher.kind === record.kind && (launcher.statuses.includes(record.status) || launcher.statuses.length === 0 && record.status !== UNTRACKED)
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

// src/diff-review-view.ts
var import_obsidian2 = require("obsidian");

// ../differential-review/src/core/types.ts
var SNAPSHOT_SCHEMA_VERSION = 1;
var REVIEW_STATE_SCHEMA_VERSION = 1;
var FINGERPRINT_VERSION = "h1";

// ../differential-review/node_modules/diff/libesm/diff/base.js
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

// ../differential-review/node_modules/diff/libesm/diff/character.js
var CharacterDiff = class extends Diff {
};
var characterDiff = new CharacterDiff();
function diffChars(oldStr, newStr, options) {
  return characterDiff.diff(oldStr, newStr, options);
}

// ../differential-review/node_modules/diff/libesm/diff/line.js
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

// ../differential-review/node_modules/diff/libesm/diff/array.js
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

// ../differential-review/node_modules/diff/libesm/patch/parse.js
function parsePatch(uniDiff) {
  const diffstr = uniDiff.split(/\n/), list2 = [];
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
    list2.push(index);
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
  return list2;
}

// ../differential-review/node_modules/diff/libesm/patch/create.js
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

// ../differential-review/src/core/sha256.ts
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

// ../differential-review/src/core/diff.ts
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

// ../differential-review/src/core/match.ts
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
  const pairs = [];
  const usedOld = /* @__PURE__ */ new Set();
  const usedNew = /* @__PURE__ */ new Set();
  const take = (i, j, match, sim) => {
    usedOld.add(i);
    usedNew.add(j);
    pairs.push({ oldId: oldRefs[i].id, newId: newRefs[j].id, match, similarity: sim });
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
    pairs,
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

// ../differential-review/src/core/snapshot.ts
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

// ../differential-review/src/core/queries.ts
function commitLineage(snapshots, from, sha) {
  const byId = new Map(snapshots.map((s) => [s.id, s]));
  const steps = [];
  let snapshot = from;
  let current = sha;
  while (snapshot.mapping) {
    const entry = snapshot.mapping.commits.find((c) => c.sha === current);
    const prev = byId.get(snapshot.mapping.previousSnapshotId);
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

// ../differential-review/src/core/review-state.ts
function emptyReviewState() {
  return { schemaVersion: REVIEW_STATE_SCHEMA_VERSION, kind: "differential-review-state", updatedAt: null, hunks: {}, commits: {} };
}
function parseReviewState(json) {
  const s = json;
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

// ../differential-review/src/core/derive.ts
function zero() {
  return { reviewed: 0, new: 0, changed: 0 };
}
function reviewedRefs(state, byId) {
  return Object.entries(state.hunks).map(([id, rec]) => {
    const snap = byId.get(rec.snapshotId);
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
  const byId = new Map(snapshots.map((s) => [s.id, s]));
  byId.set(current.id, current);
  const all = [...byId.values()];
  const counts = { hunks: zero(), files: zero(), commits: zero() };
  const parsed = snapshotFiles(current);
  const refs = hunkRefs(parsed);
  const old = reviewedRefs(state, byId);
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

// ../differential-review/src/core/storage.ts
var REVIEW_DIR = "differential-review";
var SNAPSHOTS_DIR = "snapshots";
var REVIEW_STATE_FILE = "review-state.json";
var REVIEWABLE_RECORD_KINDS = ["branches", "reviews"];
function isReviewableRecordKind(kind) {
  return REVIEWABLE_RECORD_KINDS.includes(kind);
}
function join(...parts) {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}
function reviewDir(recordDir) {
  return join(recordDir, REVIEW_DIR);
}
function snapshotsDir(recordDir) {
  return join(recordDir, REVIEW_DIR, SNAPSHOTS_DIR);
}
function snapshotPath(recordDir, id) {
  return join(snapshotsDir(recordDir), `${id}.json`);
}
function reviewStatePath(recordDir) {
  return join(recordDir, REVIEW_DIR, REVIEW_STATE_FILE);
}
function parseSnapshot(json) {
  const s = json;
  if (!s || s.kind !== "differential-review-snapshot") throw new Error("not a differential-review snapshot");
  if (s.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new Error(`unsupported snapshot schemaVersion ${s.schemaVersion}`);
  if (s.fingerprintVersion !== FINGERPRINT_VERSION) throw new Error(`unsupported fingerprintVersion ${s.fingerprintVersion}`);
  return s;
}
function recordSnapshotReader(adapter, recordDir) {
  return {
    async listSnapshotIds() {
      const names = await adapter.listFiles(snapshotsDir(recordDir));
      return names.filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
    },
    async readSnapshot(id) {
      const path = snapshotPath(recordDir, id);
      try {
        return parseSnapshot(JSON.parse(await adapter.read(path)));
      } catch (e) {
        throw new Error(`unreadable snapshot ${path}: ${e.message}`);
      }
    }
  };
}
async function readReviewState(adapter, recordDir) {
  const path = reviewStatePath(recordDir);
  if (!await adapter.exists(path)) return null;
  return parseReviewState(JSON.parse(await adapter.read(path)));
}
function recordReviewStateStore(adapter, recordDir) {
  return {
    readReviewState: () => readReviewState(adapter, recordDir),
    async writeReviewState(state) {
      await adapter.write(reviewStatePath(recordDir), JSON.stringify(state, null, 2) + "\n");
    }
  };
}
async function updateReviewState(store, mutate) {
  const next = mutate(await store.readReviewState() ?? emptyReviewState());
  await store.writeReviewState(next);
  return next;
}

// ../differential-review/src/core/view.ts
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
  const hidden = { files: 0, hunks: 0, commits: 0 };
  const parsed = new Map(snapshotFiles(current).map((f) => [f.path, f]));
  const files = review.files.map((file) => {
    const source = parsed.get(file.path);
    const hunks = file.hunks.map((h, i) => {
      const index = source.hunks[i];
      const match = hunkChange.get(h.id);
      const sinceBaseline = match ? HUNK_DELTA2[match.match] : null;
      const visible2 = !(hideReviewed && h.state === "reviewed") && sinceBaseline !== "carried";
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
    const { path, oldPath, status, binary } = source;
    return { path, oldPath, status, binary, state: file.state, counts: file.counts, hunks, visible };
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
function replacePrefix(string, oldPrefix, newPrefix) {
  if (string.slice(0, oldPrefix.length) != oldPrefix) {
    throw Error(`string ${JSON.stringify(string)} doesn't start with prefix ${JSON.stringify(oldPrefix)}; this is a bug`);
  }
  return newPrefix + string.slice(oldPrefix.length);
}
function replaceSuffix(string, oldSuffix, newSuffix) {
  if (!oldSuffix) {
    return string + newSuffix;
  }
  if (string.slice(-oldSuffix.length) != oldSuffix) {
    throw Error(`string ${JSON.stringify(string)} doesn't end with suffix ${JSON.stringify(oldSuffix)}; this is a bug`);
  }
  return string.slice(0, -oldSuffix.length) + newSuffix;
}
function removePrefix(string, oldPrefix) {
  return replacePrefix(string, oldPrefix, "");
}
function removeSuffix(string, oldSuffix) {
  return replaceSuffix(string, oldSuffix, "");
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
  const map = Array(endB);
  let k = 0;
  map[0] = 0;
  for (let j = 1; j < endB; j++) {
    if (b[j] == b[k]) {
      map[j] = map[k];
    } else {
      map[j] = k;
    }
    while (k > 0 && b[j] != b[k]) {
      k = map[k];
    }
    if (b[j] == b[k]) {
      k++;
    }
  }
  k = 0;
  for (let i = startA; i < a.length; i++) {
    while (k > 0 && a[i] != b[k]) {
      k = map[k];
    }
    if (a[i] == b[k]) {
      k++;
    }
  }
  return k;
}
function segment(string, segmenter) {
  const parts = [];
  for (const segmentObj of Array.from(segmenter.segment(string))) {
    const segment2 = segmentObj.segment;
    if (parts.length && /\s/.test(parts[parts.length - 1]) && /\s/.test(segment2)) {
      parts[parts.length - 1] += segment2;
    } else {
      parts.push(segment2);
    }
  }
  return parts;
}
function trailingWs(string, segmenter) {
  if (segmenter) {
    return leadingAndTrailingWs(string, segmenter)[1];
  }
  let i;
  for (i = string.length - 1; i >= 0; i--) {
    if (!string[i].match(/\s/)) {
      break;
    }
  }
  return string.substring(i + 1);
}
function leadingWs(string, segmenter) {
  if (segmenter) {
    return leadingAndTrailingWs(string, segmenter)[0];
  }
  const match = string.match(/^\s*/);
  return match ? match[0] : "";
}
function leadingAndTrailingWs(string, segmenter) {
  if (!segmenter) {
    return [leadingWs(string), trailingWs(string)];
  }
  if (segmenter.resolvedOptions().granularity != "word") {
    throw new Error('The segmenter passed must have a granularity of "word"');
  }
  const segments = segment(string, segmenter);
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

// src/diff-review-render.ts
function newReviewUi(hideReviewed = true) {
  return { hideReviewed, expanded: /* @__PURE__ */ new Set(), interdiffs: /* @__PURE__ */ new Set(), htmlCache: /* @__PURE__ */ new Map() };
}
var STATE_LABELS = { reviewed: "reviewed", new: "new", changed: "changed" };
var AUTO_EXPAND_LINES = 400;
function el(parent, tag, cls, text2) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text2 !== void 0) node.textContent = text2;
  parent?.appendChild(node);
  return node;
}
function badge(parent, state) {
  el(parent, "span", `gbdr-badge gbdr-${state}`, STATE_LABELS[state]);
}
function checkbox(parent, checked, label, onChange) {
  const box = el(parent, "input", "gbdr-check");
  box.type = "checkbox";
  box.checked = checked;
  box.title = label;
  box.setAttribute("aria-label", label);
  box.onclick = (event) => event.stopPropagation();
  box.onchange = onChange;
  return box;
}
function renderPatch(parent, patch, ui) {
  let markup = ui.htmlCache.get(patch);
  if (markup === void 0) {
    markup = html(patch, { drawFileList: false, outputFormat: "line-by-line", matching: "lines", diffStyle: "word" });
    ui.htmlCache.set(patch, markup);
  }
  el(parent, "div", "gbdr-diff").innerHTML = markup;
}
function renderHunkBody(parent, source, ui) {
  const patch = hunkPatch(source);
  if (patch) renderPatch(parent, patch, ui);
  else el(parent, "pre", "gbdr-meta-lines", source.hunk.lines.join("\n"));
}
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
function progress(parent, label, counts) {
  const total = counts.reviewed + counts.new + counts.changed;
  const item2 = el(parent, "span", "gbdr-progress-item");
  el(item2, "strong", void 0, `${label} `);
  item2.append(`${counts.reviewed}/${total}`);
  if (counts.changed) el(item2, "span", "gbdr-badge gbdr-changed", `${counts.changed} changed`);
  if (counts.new) el(item2, "span", "gbdr-badge gbdr-new", `${counts.new} new`);
}
function renderHeader(root, view, ui, actions) {
  const { snapshot } = view;
  const header = el(root, "div", "gbdr-header");
  el(header, "h2", void 0, `Review ${snapshot.branch}`);
  el(header, "div", "gbdr-meta", `${snapshotLabel(snapshot)} vs ${snapshot.base.ref} (merge-base ${snapshot.base.mergeBase.slice(0, 8)}) \xB7 ${view.snapshots.length} snapshot(s)`);
  const bar = el(header, "div", "gbdr-progress");
  progress(bar, "Hunks", view.counts.hunks);
  progress(bar, "Files", view.counts.files);
  progress(bar, "Commits", view.counts.commits);
  const total = view.counts.hunks.reviewed + view.counts.hunks.new + view.counts.hunks.changed;
  const meter = el(header, "div", "gbdr-meter");
  el(meter, "div", "gbdr-meter-fill").style.width = `${total ? 100 * view.counts.hunks.reviewed / total : 100}%`;
  const controls = el(header, "div", "gbdr-controls");
  const label = el(controls, "label", void 0, "Show ");
  const select = el(label, "select", "dropdown gbdr-baseline");
  const review = el(select, "option", void 0, "everything, badged since my last review");
  review.value = "";
  for (const option of view.baselineOptions) {
    const node = el(select, "option", void 0, `only changes since ${option.label}`);
    node.value = option.id;
  }
  select.value = view.baseline.kind === "snapshot" ? view.baseline.snapshotId : "";
  select.onchange = () => actions.setBaseline(select.value ? { kind: "snapshot", snapshotId: select.value } : { kind: "review" });
  const hide = el(controls, "label", "gbdr-hide");
  checkbox(hide, ui.hideReviewed, "Hide reviewed", () => actions.setHideReviewed(!ui.hideReviewed));
  hide.append(" Hide reviewed");
  const previous = view.snapshots.find((s) => s.id === view.summary.previousSnapshotId);
  const summary = summaryText(view.summary, previous ? snapshotLabel(previous) : null);
  if (summary) el(header, "div", "gbdr-summary", summary);
  if (view.needsRelook) {
    const n = view.commits.filter((c) => c.state === "changed").length;
    el(header, "div", "gbdr-callout", `${n} commit(s) changed since you signed them off: re-look below under Commits.`);
  }
}
function hiddenNote(parent, n, what) {
  if (n > 0) el(parent, "p", "gbdr-hidden", `${n} ${what} hidden (reviewed or unchanged since the baseline).`);
}
function interdiffToggle(parent, body, view, file, hunk, against, ui) {
  const before = previousHunk(view, hunk, against);
  const after = findHunk(snapshotFiles(view.snapshot), hunk.id);
  if (!before || !after || hunk.kind === "meta") return;
  const key2 = `${hunk.id}:${against}`;
  const text2 = against === "reviewed" ? "since reviewed" : "since baseline";
  const button = el(parent, "button", "gbdr-link", `\u0394 ${text2}`);
  const panel = el(null, "div", "gbdr-interdiff");
  const show = () => {
    panel.replaceChildren();
    el(panel, "div", "gbdr-caption", `How this hunk's changed lines differ from the version ${against === "reviewed" ? "you reviewed" : "in the baseline"}:`);
    renderPatch(panel, interdiffPatch(file.path, before.hunk, after.hunk), ui);
    body.prepend(panel);
  };
  button.onclick = (event) => {
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
  const box = el(parent, "div", `gbdr-hunk gbdr-state-${hunk.state}`);
  const bar = el(box, "div", "gbdr-hunk-bar gbdr-nav");
  bar.tabIndex = 0;
  bar.dataset.key = `hunk:${hunk.id}`;
  checkbox(bar, hunk.state === "reviewed", "Hunk reviewed (x)", () => actions.toggleHunk(file, hunk));
  badge(bar, hunk.state);
  el(bar, "code", "gbdr-hunk-header", hunk.header);
  if (hunk.kind === "text") el(bar, "span", "gbdr-stat", `+${hunk.added} \u2212${hunk.removed}`);
  if (hunk.whitespaceOnly) el(bar, "span", "gbdr-tag", "whitespace only");
  if (hunk.sinceBaseline && hunk.sinceBaseline !== "carried") el(bar, "span", "gbdr-tag", `${hunk.sinceBaseline} since baseline`);
  const body = el(box, "div", "gbdr-hunk-body");
  if (hunk.state === "changed") interdiffToggle(bar, body, view, file, hunk, "reviewed", ui);
  if (hunk.sinceBaseline === "changed") interdiffToggle(bar, body, view, file, hunk, "baseline", ui);
  if (source) renderHunkBody(body, source, ui);
}
function section(parent, key2, ui, fill) {
  const details = el(parent, "details", "gbdr-section");
  const summary = el(details, "summary", "gbdr-nav");
  summary.dataset.key = key2;
  let filled = false;
  const body = el(details, "div", "gbdr-section-body");
  const fillOnce = () => {
    if (filled) return;
    filled = true;
    fill(body);
  };
  details.open = ui.expanded.has(key2);
  if (details.open) fillOnce();
  details.ontoggle = () => {
    if (details.open) {
      ui.expanded.add(key2);
      fillOnce();
    } else ui.expanded.delete(key2);
  };
  return { details, summary };
}
function renderFile(parent, view, file, ui, actions) {
  const { summary } = section(parent, `file:${file.path}`, ui, (body) => {
    for (const hunk of file.hunks) if (hunk.visible) renderHunk(body, view, file, hunk, ui, actions);
    hiddenNote(body, file.hunks.filter((h) => !h.visible).length, "hunk(s)");
  });
  summary.classList.add(`gbdr-state-${file.state}`);
  checkbox(summary, file.state === "reviewed", "File reviewed (x)", () => actions.toggleFile(file));
  badge(summary, file.state);
  el(summary, "span", "gbdr-path", file.oldPath && file.oldPath !== file.path ? `${file.oldPath} \u2192 ${file.path}` : file.path);
  if (file.status !== "modified") el(summary, "span", "gbdr-tag", file.status);
  if (file.binary) el(summary, "span", "gbdr-tag", "binary");
  const total = file.hunks.length;
  el(summary, "span", "gbdr-stat", `${file.counts.reviewed}/${total} hunk(s) reviewed`);
}
function renderCommit(parent, view, commit, ui, actions) {
  const source = view.snapshot.commits.find((c) => c.sha === commit.sha);
  const { summary } = section(parent, `commit:${commit.sha}`, ui, (body) => {
    el(body, "pre", "gbdr-message", commit.message.trim());
    el(body, "div", "gbdr-caption", `${commit.author} \xB7 ${commit.authorDate}`);
    if (commit.signoff && commit.state !== "reviewed") {
      el(body, "div", "gbdr-caption", `You signed off ${commit.signoff.sha.slice(0, 8)} "${commit.signoff.subject}" at ${commit.signoff.signedOffAt}.`);
    }
    if (commit.contextOnly) {
      el(body, "p", "gbdr-callout", "Its patch-id changed but every hunk carried over (e.g. rebase context). Re-look at the commit as a whole and sign off again.");
      return;
    }
    const ids = commit.state === "changed" ? commit.differingHunks : null;
    if (ids) el(body, "div", "gbdr-caption", "Only the hunks that differ from the signed-off version:");
    for (const file of commitHunks(source, ids)) {
      el(body, "div", "gbdr-commit-file", file.path);
      for (const hunk of file.hunks) renderHunkBody(body, { file, hunk }, ui);
    }
  });
  summary.classList.add(`gbdr-state-${commit.state}`);
  const label = commit.state === "reviewed" ? "Revoke sign-off (x)" : "Sign off commit (x)";
  checkbox(summary, commit.state === "reviewed", label, () => actions.toggleCommit(commit));
  badge(summary, commit.state);
  el(summary, "code", "gbdr-sha", commit.sha.slice(0, 8));
  el(summary, "span", "gbdr-path", commit.subject);
  if (commit.contextOnly) el(summary, "span", "gbdr-tag", "rebased, context only");
  else if (commit.state === "changed") el(summary, "span", "gbdr-tag", `${commit.differingHunks?.length ?? 0} differing hunk(s)`);
  if (commit.sinceBaseline && commit.sinceBaseline !== "unchanged") el(summary, "span", "gbdr-tag", `${commit.sinceBaseline} since baseline`);
}
function renderReview(root, view, ui, actions) {
  root.replaceChildren();
  root.classList.add("gbdr");
  renderHeader(root, view, ui, actions);
  el(root, "h3", void 0, "Files");
  const files = el(root, "div", "gbdr-files");
  for (const file of view.files) if (file.visible) renderFile(files, view, file, ui, actions);
  if (!view.files.some((f) => f.visible)) el(files, "p", "gbdr-empty", "Nothing to review in the branch diff.");
  hiddenNote(files, view.hidden.files, "file(s)");
  el(root, "h3", void 0, "Commits");
  const commits = el(root, "div", "gbdr-commits");
  for (const commit of view.commits) if (commit.visible) renderCommit(commits, view, commit, ui, actions);
  if (!view.commits.some((c) => c.visible)) el(commits, "p", "gbdr-empty", "No commits to sign off.");
  hiddenNote(commits, view.hidden.commits, "commit(s)");
  el(root, "p", "gbdr-keys", "Keys: j/k move \xB7 x check off \xB7 o open/close \xB7 h hide reviewed \xB7 e expand all \xB7 c collapse all");
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

// src/diff-review-storage.ts
function vaultFileAdapter(adapter, onWrite) {
  return {
    exists: (path) => adapter.exists(path),
    read: (path) => adapter.read(path),
    async write(path, data) {
      const parent = path.slice(0, Math.max(0, path.lastIndexOf("/")));
      if (parent && !await adapter.exists(parent)) await adapter.mkdir(parent);
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
function hasDifferentialReview(app, recordDir) {
  return app.vault.getFolderByPath(snapshotsDir(recordDir)) !== null;
}
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
var DiffReviewView = class extends import_obsidian2.ItemView {
  constructor(leaf) {
    super(leaf);
    this.baseline = { kind: "review" };
    this.ui = newReviewUi();
    /** Parsed snapshots by id; snapshots are immutable, so each is read once. */
    this.snapshots = /* @__PURE__ */ new Map();
    this.reviewState = null;
    this.view = null;
    /** Serializes review-state writes from this view. */
    this.writes = Promise.resolve();
    this.expandedOnce = false;
    this.scheduleLoad = (0, import_obsidian2.debounce)(() => void this.reload(), 300, true);
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
        if (path === reviewStatePath(state.recordDir)) this.lastWritten = data;
      });
      this.reader = recordSnapshotReader(adapter, state.recordDir);
      this.store = recordReviewStateStore(adapter, state.recordDir);
      this.snapshots.clear();
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
      if (!this.recordDir || !path.startsWith(`${reviewDir(this.recordDir)}/`)) return;
      if (path === reviewStatePath(this.recordDir) && this.lastWritten !== void 0) {
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
    const { reader, store, recordDir } = this;
    if (!reader || !store || !recordDir) return;
    try {
      const ids = await reader.listSnapshotIds();
      for (const id of [...this.snapshots.keys()]) if (!ids.includes(id)) this.snapshots.delete(id);
      for (const id of ids) if (!this.snapshots.has(id)) this.snapshots.set(id, await reader.readSnapshot(id));
      this.reviewState = await store.readReviewState();
      this.rebuild();
    } catch (error) {
      this.view = null;
      this.showMessage(`Could not load the differential review for ${recordDir}: ${error instanceof Error ? error.message : error}`);
    }
  }
  rebuild() {
    this.view = buildReviewView([...this.snapshots.values()], this.reviewState, { baseline: this.baseline, hideReviewed: this.ui.hideReviewed });
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
    if (!this.view) {
      this.showMessage(
        `No differential-review snapshots in ${this.recordDir}/differential-review/snapshots yet. Agents write one after each branch phase or PR review round (see agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md).`
      );
      return;
    }
    const scroll = root.scrollTop;
    const focused = focusedItem(root);
    renderReview(root, this.view, this.ui, {
      toggleHunk: (file, hunk) => this.mutate(
        (state, snapshot, now) => hunk.state === "reviewed" ? unmarkHunks(state, [hunk.id, ...hunk.reviewedAs ? [hunk.reviewedAs.hunkId] : []], now) : markHunksReviewed(state, snapshot, [hunk.id], now)
      ),
      toggleFile: (file) => this.mutate(
        (state, snapshot, now) => file.state === "reviewed" ? unmarkHunks(state, file.hunks.flatMap((h) => [h.id, ...h.reviewedAs ? [h.reviewedAs.hunkId] : []]), now) : markFileReviewed(state, snapshot, file.path, now)
      ),
      toggleCommit: (commit) => this.mutate(
        (state, snapshot, now) => commit.state === "reviewed" && commit.signoff ? revokeCommitSignoff(state, commit.signoff.key, now) : signOffCommit(state, snapshot, commit.sha, now)
      ),
      setBaseline: (baseline) => {
        this.baseline = baseline;
        this.app.workspace.requestSaveLayout();
        this.rebuild();
      },
      setHideReviewed: (hide) => this.setHideReviewed(hide)
    });
    root.scrollTop = scroll;
    restoreFocus(root, focused);
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
      this.reviewState = await updateReviewState(store, (state) => change(state, view.snapshot, (/* @__PURE__ */ new Date()).toISOString()));
      this.rebuild();
    }).catch((error) => {
      new import_obsidian2.Notice(`Could not update review-state.json: ${error instanceof Error ? error.message : error}`, 1e4);
      void this.reload();
    });
  }
  showMessage(text2) {
    this.contentEl.replaceChildren();
    this.contentEl.createEl("p", { text: text2, cls: "gbdr-empty" });
  }
};

// ../site/src/lib/repository-tabs.ts
var REPOSITORY_TABS = [
  { id: "branches", label: "My branches" },
  { id: "issues", label: "My issues" },
  { id: "reviews", label: "My reviews" },
  { id: "my-drafts", label: "My drafts" },
  { id: "conflicting", label: "Conflicting" },
  { id: "new-prs", label: "New PRs" },
  { id: "undrafted-prs", label: "Out of draft" },
  { id: "new-issues", label: "New issues" }
];
var FORK_OWNER = "jmchilton";
var GITHUB_LISTS = {
  "my-drafts": { list: "pulls", query: (me) => `is:pr is:open author:${me} draft:true`, title: "My open draft PRs on GitHub" },
  // GitHub has no conflict filter.
  conflicting: { list: "pulls", query: (me) => `is:pr is:open author:${me}`, title: "My open PRs on GitHub (it can't filter by conflicts)" },
  "new-prs": { list: "pulls", query: () => "is:pr is:open sort:created-desc", title: "Open PRs, newest first, on GitHub" },
  // GitHub can't sort by ready-for-review time; recently updated non-drafts is the closest.
  "undrafted-prs": { list: "pulls", query: () => "is:pr is:open draft:false sort:updated-desc", title: "Open non-draft PRs, recently updated, on GitHub" },
  "new-issues": { list: "issues", query: () => "is:issue is:open sort:created-desc", title: "Open issues, newest first, on GitHub" }
};
function githubListUrl(owner, repo, tab, me = "@me") {
  const { list: list2, query } = GITHUB_LISTS[tab];
  return `https://github.com/${owner}/${repo}/${list2}?q=${encodeURIComponent(query(me))}`;
}
function githubListTitle(tab) {
  return GITHUB_LISTS[tab].title;
}
var MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;
function githubLinks(body) {
  return [...body.matchAll(MARKDOWN_LINK)].map((match) => ({ label: match[1], url: match[2] }));
}
var escapeRegExp = (text2) => text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

// src/record-links.ts
var BRANCHES_ON_UPSTREAM = /* @__PURE__ */ new Set(["foundry"]);
function githubUrl(record, body) {
  const all = githubLinks(body);
  const id = escapeRegExp(record.name);
  const find = (pattern, label) => all.find((link) => pattern.test(link.url) && (!label || label.test(link.label)))?.url;
  const upstream = `https://github.com/${upstreamOwner(record.repo, [body])}/${record.repo}`;
  if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
  if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
  const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
  const forkOwner = BRANCHES_ON_UPSTREAM.has(record.repo) ? upstreamOwner(record.repo, [body]) : FORK_OWNER;
  return find(/\/pull\/\d+$/, /^(View )?PR #\d+$/) ?? (statusPr ? `${upstream}/pull/${statusPr}` : void 0) ?? find(new RegExp(`/tree/${id}$`)) ?? `https://github.com/${forkOwner}/${record.repo}/tree/${record.name}`;
}
function worktreeCandidates(record, body, home) {
  const root = `${home}/projects/worktrees/${record.repo}`;
  if (record.kind === "reviews") return [`${root}/pr/${record.name}`];
  if (record.kind !== "branches") return [];
  const listed = /Worktree:\**\s*`([^`]+)`/.exec(body)?.[1]?.replace(/^~(?=\/)/, home);
  return [...listed ? [listed] : [], `${root}/branch/${record.name}`];
}

// src/record-agents.ts
var SYNC_PROCESSES = {
  issues: "PROCESS_SYNC_ISSUE_STATE.md",
  reviews: "PROCESS_SYNC_REVIEW_STATE.md"
};
var SYNC_PROFILE = "Sonnet (medium)";
function parseRecordAgents(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const map = {};
  for (const [repo, kinds] of Object.entries(data)) {
    map[repo] = {};
    if (!kinds || typeof kinds !== "object") continue;
    for (const [kind, agent] of Object.entries(kinds)) {
      if (RECORD_KINDS.includes(kind) && typeof agent === "string") map[repo][kind] = agent;
    }
  }
  return map;
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
var import_obsidian3 = require("obsidian");

// src/github-feed.ts
var FIELDS2 = "number title url createdAt author { login }";
var FEED_QUERY = `query($owner: String!, $name: String!, $mine: String!) {
  repository(owner: $owner, name: $name) {
    created: pullRequests(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS2} isDraft headRefName }
    }
    updated: pullRequests(states: OPEN, first: 60, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { ${FIELDS2} isDraft headRefName timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], last: 1) { nodes { ... on ReadyForReviewEvent { createdAt } } } }
    }
    issues(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS2} }
    }
  }
  mine: search(query: $mine, type: ISSUE, first: 100) {
    nodes { ... on PullRequest { ${FIELDS2} isDraft headRefName mergeable } }
  }
}`;
var item = (node, at = node.createdAt) => ({
  number: node.number,
  title: node.title,
  url: node.url,
  author: node.author?.login ?? "ghost",
  at,
  isDraft: node.isDraft ?? false,
  ...node.headRefName ? { branch: node.headRefName } : {}
});
function feedArgs(owner, name) {
  const mine = `repo:${owner}/${name} is:pr is:open author:@me sort:updated-desc`;
  return ["api", "graphql", "-f", `owner=${owner}`, "-f", `name=${name}`, "-f", `mine=${mine}`, "-f", `query=${FEED_QUERY}`];
}
function parseFeeds(json) {
  const data = JSON.parse(json).data;
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
    unchecked: mine.filter((node) => node.mergeable === "UNKNOWN").length
  };
}
function matchRecords(item2, isIssue, records, bodyOf) {
  const number = String(item2.number);
  return records.filter((record) => {
    if (isIssue) return record.kind === "issues" && record.name === number;
    if (record.kind === "reviews") return record.name === number;
    return record.kind === "branches" && (record.name === item2.branch || githubUrl(record, bodyOf(record)) === item2.url);
  });
}

// src/record-groups.ts
function groupRecords(records, kind, grouping) {
  const { sections, rest } = groupBySections(records, kind, grouping);
  const groups = sections.map(({ key: key2, label, records: records2 }) => ({ status: key2, label, collapsed: false, records: records2 }));
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
var RECORD_ICONS = { branches: "git-branch", reviews: "file-search", issues: "file-text" };
var RECORD_NOUNS = { branches: "branch", reviews: "review", issues: "issue" };
var FEED_KEYS = {
  "new-prs": "newPrs",
  "undrafted-prs": "undraftedPrs",
  "new-issues": "issues",
  "my-drafts": "myDrafts",
  conflicting: "conflicting"
};
var RECHECK_MS = 5e3;
var RepositoryView = class extends import_obsidian3.ItemView {
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
    this.scheduleRender = (0, import_obsidian3.debounce)(() => void this.render(), 300, true);
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
    if (state.tab && (state.tab === RECENT || REPOSITORY_TABS.some((tab) => tab.id === state.tab))) this.tab = state.tab;
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
    this.launchers = import_obsidian3.Platform.isDesktopApp ? await this.host.loadLaunchers() : [];
    const launchable = new Set(records.filter((record) => this.canLaunch(record)).map((record) => record.dir));
    if (this.embed) this.removeChild(this.embed);
    this.embed = this.addChild(new import_obsidian3.Component());
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
    const recordTabs = REPOSITORY_TABS.filter((tab) => isRecordTab(tab.id));
    const githubTabs = import_obsidian3.Platform.isDesktopApp ? REPOSITORY_TABS.filter((tab) => !isRecordTab(tab.id)) : [];
    const tabs = all ? [RECENT_TAB] : [...recordTabs, RECENT_TAB, ...githubTabs];
    const current = tabs.some((tab) => tab.id === this.tab) ? this.tab : tabs[0].id;
    const bar = root.createDiv({ cls: "gbr-tabs" });
    for (const tab of tabs) {
      const count = isRecordTab(tab.id) ? ` (${records.filter((record) => record.kind === tab.id).length})` : "";
      const button = bar.createEl("button", { text: tab.label + count, cls: tab.id === current ? "mod-cta" : "" });
      button.onclick = () => {
        this.tab = tab.id;
        this.app.workspace.requestSaveLayout();
        void this.render();
      };
    }
    if (current === RECENT) await this.renderRecent(root, records, bodies, launchable, all);
    else if (isRecordTab(current)) {
      await this.renderSync(root, current);
      this.renderRecords(root, current, records, bodies, launchable, await this.readQueue(current));
    } else this.renderFeed(root, current, records, bodies, launchable, header);
  }
  async renderRecent(root, records, bodies, launchable, all) {
    const controls = root.createDiv({ cls: "gbr-tabs" });
    const choose = (options, value, onChange) => {
      const select = controls.createEl("select", { cls: "dropdown" });
      for (const [key2, label] of Object.entries(options)) {
        select.createEl("option", { text: label, value: key2 }).selected = key2 === value;
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
    const list2 = root.createEl("ul");
    for (const record of recent) {
      const body = record.indexPath && bodies.get(record.indexPath) || "";
      const tags = [...all ? [record.repo] : [], ...this.recentKind ? [] : [RECORD_NOUNS[record.kind]], statusLabel(record.status)];
      this.renderRecord(list2, { ...record, title: recordTitle(body) ?? record.title }, body, launchable.has(record.dir), {
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
      const details = root.createEl("details", { cls: "gbr-group" });
      details.open = group.collapsed === this.toggled.has(key2);
      details.ontoggle = () => {
        if (details.open === group.collapsed) this.toggled.add(key2);
        else this.toggled.delete(key2);
      };
      details.createEl("summary", { text: `${group.label ?? statusLabel(group.status)} (${group.records.length})` });
      const list2 = details.createEl("ul");
      for (const record of group.records) {
        const body = record.indexPath && bodies.get(record.indexPath) || "";
        this.renderRecord(list2, record, body, launchable.has(record.dir));
      }
    }
    if (queue) void this.renderQueue(root, queue);
  }
  /** 🔄 Sync button and the last SYNC_REPORT.md, above an issues or reviews tab. */
  async renderSync(root, kind) {
    if (!SYNC_PROCESSES[kind]) return;
    const agent = import_obsidian3.Platform.isDesktopApp ? await this.host.syncAgent(this.repo, kind) : void 0;
    if (agent) {
      const bar = root.createDiv({ cls: "gbr-sync" });
      const button = bar.createEl("button", { text: `\u{1F504} Sync ${kind}`, attr: { "aria-label": `Launch ${agent} to sync ${kind}` } });
      button.onclick = () => void this.host.launchSync(this.repo, kind, agent);
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
    await import_obsidian3.MarkdownRenderer.render(this.app, queue.text, body, queue.path, this.embed);
  }
  renderFeed(root, tab, records, bodies, launchable, header) {
    const state = this.feedState();
    const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh from GitHub" } });
    (0, import_obsidian3.setIcon)(refresh, "refresh-cw");
    refresh.onclick = () => void this.fetchFeeds(true);
    if (state.fetchedAt) header.createSpan({ text: `fetched ${timeAgo(state.fetchedAt, Date.now())}`, cls: "gbr-time" });
    const owner = upstreamOwner(this.repo, [...bodies.values()]);
    root.createEl("p", { cls: "gbr-github-link" }).createEl("a", {
      text: githubListTitle(tab),
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
    const items = state.feeds[FEED_KEYS[tab]];
    const unchecked = tab === "conflicting" ? state.feeds.unchecked : 0;
    if (unchecked) root.createEl("p", { text: `GitHub hasn't checked ${unchecked} PR(s) yet; refresh to recheck.`, cls: "gbr-empty" });
    if (items.length === 0) root.createEl("p", { text: isMine(tab) ? "None." : "Nothing recent.", cls: "gbr-empty" });
    const list2 = root.createEl("ul");
    for (const item2 of items) {
      const matched = matchRecords(item2, tab === "new-issues", records, bodyOf);
      this.renderFeedItem(list2, item2, tab === "new-issues", matched, bodyOf, launchable);
    }
  }
  renderFeedItem(list2, item2, isIssue, matched, bodyOf, launchable) {
    const row = list2.createEl("li", { cls: "gbr-record" });
    const actions = row.createSpan({ cls: "gbr-actions" });
    row.createEl("a", { text: `#${item2.number} ${item2.title}`, href: item2.url, cls: "external-link" });
    if (item2.isDraft) row.createSpan({ text: "draft", cls: "gbr-tag" });
    row.createSpan({ text: `${item2.author} \xB7 ${timeAgo(Date.parse(item2.at), Date.now())}`, cls: "gbr-time" });
    const action = (icon, label, onClick) => {
      const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian3.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (matched.length === 0) {
      const untracked = untrackedRecord(this.repo, isIssue ? "issues" : "reviews", item2.number);
      if (this.canLaunch(untracked)) action("bot", "Launch agent (no record yet)", () => void this.host.pickLauncher(untracked));
    }
    for (const record of matched) {
      const kind = RECORD_NOUNS[record.kind];
      action(
        RECORD_ICONS[record.kind],
        `Open ${kind} record ${record.name} (${statusLabel(record.status)})`,
        (event) => void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey)
      );
      if (launchable.has(record.dir)) action("bot", `Launch agent for ${kind} record`, () => void this.host.pickLauncher(record));
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
        state.feeds = parseFeeds(await this.host.runGh(feedArgs(owner, repo)));
        state.fetchedAt = Date.now();
        state.error = void 0;
        if (state.feeds.unchecked) {
          state.checking = true;
          if (this.repo === repo) await this.render();
          await sleep(RECHECK_MS);
          state.feeds = parseFeeds(await this.host.runGh(feedArgs(owner, repo)));
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
  renderRecord(list2, record, body, launchable, { time = record.mtime, tags = [] } = {}) {
    const item2 = list2.createEl("li", { cls: "gbr-record" });
    const actions = item2.createSpan({ cls: "gbr-actions" });
    const link = item2.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
    link.onclick = (event) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
    };
    if (record.title !== record.name) item2.createSpan({ text: record.name, cls: "gbr-name" });
    for (const tag of tags) item2.createSpan({ text: tag, cls: "gbr-tag" });
    item2.createSpan({ text: timeAgo(time, Date.now()), cls: "gbr-time" });
    const action = (icon, label, onClick) => {
      const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian3.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
    action("github", "Open on GitHub", () => window.open(githubUrl(record, body)));
    const worktree = import_obsidian3.Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
    if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
    if (isReviewableRecordKind(record.kind) && hasDifferentialReview(this.app, record.dir)) action("git-compare", "Differential review", () => void openDifferentialReview(this.app, record.dir));
  }
  canLaunch(record) {
    return launchersFor(this.launchers, record).length > 0;
  }
};

// src/main.ts
var PROFILES_PATH = "agents/_shared/AGENT_PROFILES.yml";
var RECORD_AGENTS_PATH = "agents/_shared/RECORD_AGENTS.yml";
var LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
var CLI_BIN_DIRS = ["/usr/local/bin", "/opt/homebrew/bin", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"];
var GalaxyBrainPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.recordActions = /* @__PURE__ */ new WeakMap();
  }
  async onload() {
    registerDifferentialReview(this);
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian4.TFile)) return;
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
    this.registerMarkdownCodeBlockProcessor("gb-tasks", (source, el2, ctx) => this.renderTasks(source, el2, ctx));
    if (!import_obsidian4.Platform.isDesktopApp) return;
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
      new import_obsidian4.Notice(`Copied ${file.name}`);
    } catch (error) {
      new import_obsidian4.Notice(`Could not copy ${file.name}: ${error}`);
    }
  }
  /** Code, GitHub and agent icons in the header of notes inside a repository record. */
  refreshRecordActions() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian4.MarkdownView)) continue;
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
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    execFile("code", [path], { env: { ...process.env, PATH } }, (error) => {
      if (error) new import_obsidian4.Notice(`Could not run the VS Code \`code\` CLI: ${error.message}`, 1e4);
    });
  }
  runGh(args) {
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    return new Promise((resolve, reject) => {
      execFile("gh", args, { env: { ...process.env, PATH }, timeout: 6e4, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error((stderr || error.message).trim()));
        else resolve(stdout);
      });
    });
  }
  async openRecordInCode(record) {
    const worktree = this.worktreeFor(record, await this.indexBody(record));
    if (worktree) this.openInCode(worktree);
    else new import_obsidian4.Notice(`No worktree on disk for ${record.name}`);
  }
  async openRecordOnGithub(record) {
    window.open(githubUrl(record, await this.indexBody(record)));
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
    return launchersFor(await this.loadLaunchers(), record);
  }
  async openRepository(repo) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo }, active: true });
  }
  async openAgents() {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: AGENTS_VIEW, state: { agent: ALL_AGENTS }, active: true });
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
    if (!import_obsidian4.Platform.isDesktopApp) return;
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
      new import_obsidian4.Notice(`No launchers for ${record.repo}/${record.kind} (${record.status}) in repositories/${record.repo}/${record.kind}/LAUNCHERS.md`);
      return;
    }
    new LauncherSuggest(this.app, launchers, (launcher) => void this.confirmLaunch(launcher, record)).open();
  }
  async loadProfiles() {
    try {
      const profiles = parseProfiles((0, import_obsidian4.parseYaml)(await this.app.vault.adapter.read(PROFILES_PATH)));
      if (profiles.length > 0) return profiles;
    } catch (error) {
      new import_obsidian4.Notice(`Could not read ${PROFILES_PATH}: ${error}`);
    }
    return FALLBACK_PROFILES;
  }
  async confirmLaunch(launcher, record) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    const profiles = await this.loadProfiles();
    new LaunchModal(this.app, launcher, {
      profiles,
      profile: defaultProfile(profiles, launcher),
      name: fillTemplate(launcher.name, record, vaultRoot),
      prompt: fillTemplate(launcher.prompt, record, vaultRoot),
      launch: (profile, name, prompt) => this.launch(vaultRoot, launcher, profile, name, prompt)
    }).open();
  }
  vaultRoot() {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof import_obsidian4.FileSystemAdapter) return adapter.getBasePath();
    new import_obsidian4.Notice("Launching agents needs the desktop app");
    return null;
  }
  async syncAgent(repo, kind) {
    try {
      return parseRecordAgents((0, import_obsidian4.parseYaml)(await this.app.vault.adapter.read(RECORD_AGENTS_PATH)))[repo]?.[kind];
    } catch {
      return void 0;
    }
  }
  async launchSync(repo, kind, agentDir) {
    const prompt = `Sync ${repo} ${kind} per agents/_shared/${SYNC_PROCESSES[kind]} (${repo} only).`;
    await this.confirmTask({ prompt, agentDir, profile: SYNC_PROFILE }, () => {
    });
  }
  /** Agent dirs with a CLAUDE.md, not `_`-prefixed. */
  async agentDirs() {
    const { folders } = await this.app.vault.adapter.list("agents");
    const names = folders.map((folder) => folder.split("/").pop()).filter((name) => !name.startsWith("_"));
    const withClaude = await Promise.all(names.map((name) => this.app.vault.adapter.exists(`agents/${name}/CLAUDE.md`)));
    return names.filter((_, i) => withClaude[i]).sort();
  }
  /** Cards for a ```gb-tasks block: 🚀 launches (and removes on success), ✖ removes. */
  async renderTasks(source, el2, ctx) {
    const profiles = await this.loadProfiles();
    let raw;
    let tasks;
    try {
      raw = (0, import_obsidian4.parseYaml)(source);
      tasks = parseTasks(raw, { profiles: profiles.map((p) => p.name), agentDirs: await this.agentDirs() });
    } catch (error) {
      el2.createDiv({ cls: "gb-tasks-error", text: `gb-tasks: ${error instanceof Error ? error.message : error}` });
      return;
    }
    const remove = async (index) => {
      const file = this.app.vault.getFileByPath(ctx.sourcePath);
      const section2 = ctx.getSectionInfo(el2);
      if (!file || !section2) return void new import_obsidian4.Notice("Could not locate this gb-tasks block");
      const rest = raw.filter((_, i) => i !== index);
      await this.app.vault.process(
        file,
        (note) => replaceBlockBody(note, section2.lineStart, section2.lineEnd, rest.length ? (0, import_obsidian4.stringifyYaml)(rest) : "")
      );
    };
    renderTaskCards(el2, tasks, {
      defaultProfile: profiles[0]?.name ?? "",
      ...import_obsidian4.Platform.isDesktopApp ? { launch: (task, index) => void this.confirmTask(task, () => void remove(index)) } : {},
      remove: (_task, index) => void remove(index)
    });
  }
  /** Launch dialog for a task; launched runs once the agent starts. */
  async confirmTask(task, launched, name = task.agentDir) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    const profiles = await this.loadProfiles();
    const launcher = { label: "Task", repo: null, kind: "branches", statuses: [], agentDir: task.agentDir, name, prompt: task.prompt, ...task.profile ? { profile: task.profile } : {} };
    new LaunchModal(this.app, launcher, {
      profiles,
      profile: defaultProfile(profiles, launcher),
      name: launcher.name,
      prompt: task.prompt,
      launch: (profile, name2, prompt) => this.launch(vaultRoot, launcher, profile, name2, prompt, launched)
    }).open();
  }
  launch(vaultRoot, launcher, profile, name, prompt, launched) {
    const { execFile } = require("child_process");
    const started = new import_obsidian4.Notice(`Launching ${profile.name} in ${launcher.agentDir}\u2026`, 0);
    execFile(
      `${vaultRoot}/${LAUNCH_SCRIPT}`,
      [launcher.agentDir, profile.agent, name, prompt, ...profileArgs(profile)],
      { timeout: 18e4 },
      (error, stdout, stderr) => {
        started.hide();
        if (error) new import_obsidian4.Notice(`Launch failed: ${(stderr || error.message).trim()}`, 15e3);
        else {
          new import_obsidian4.Notice(stdout.trim(), 1e4);
          launched?.();
        }
      }
    );
  }
};
var LauncherSuggest = class extends import_obsidian4.FuzzySuggestModal {
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
var ChoiceSuggest = class extends import_obsidian4.FuzzySuggestModal {
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
var LaunchModal = class extends import_obsidian4.Modal {
  constructor(app, launcher, details) {
    super(app);
    this.launcher = launcher;
    this.details = details;
  }
  onOpen() {
    const { launcher } = this;
    let { name, prompt, profile } = this.details;
    this.setTitle(`${launcher.label} in ${launcher.agentDir}`);
    new import_obsidian4.Setting(this.contentEl).setName("Agent name").addText(
      (text2) => text2.setValue(name).onChange((value) => name = value)
    );
    new import_obsidian4.Setting(this.contentEl).setName("Prompt").addTextArea((area) => {
      area.setValue(prompt).onChange((value) => prompt = value);
      area.inputEl.rows = 6;
    }).settingEl.addClass("galaxy-brain-launch-prompt");
    new import_obsidian4.Setting(this.contentEl).addDropdown((dropdown) => {
      for (const option of this.details.profiles) dropdown.addOption(option.name, option.name);
      dropdown.setValue(profile.name).onChange((value) => {
        profile = this.details.profiles.find((option) => option.name === value) ?? profile;
      });
    }).addButton(
      (button) => button.setButtonText("Launch").setCta().onClick(() => {
        this.close();
        this.details.launch(profile, name, prompt);
      })
    ).addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};

import os,re,ast,sys,collections
ROOT=sys.argv[1]
PKGS=["lib/galaxy/tool_shed/","lib/tool_shed/util/","lib/tool_shed/managers/",
      "lib/galaxy/util/tool_shed/","lib/tool_shed/dependencies/","lib/tool_shed/metadata/",
      "lib/tool_shed/repository_types/","lib/tool_shed/webapp/util/"]
EXT=(".py",".ts",".vue",".yml",".yaml",".xml",".rst",".md",".js",".json")
corpus={}
for dp,dn,fn in os.walk(ROOT):
    dn[:]=[d for d in dn if d not in ("node_modules",".git","__pycache__")]
    for f in fn:
        if f.endswith(EXT):
            p=os.path.join(dp,f);rel=os.path.relpath(p,ROOT)
            try:corpus[rel]=open(p,encoding="utf-8",errors="ignore").read()
            except Exception:pass
intarget=lambda f: any(f.startswith(p) for p in PKGS)
targets=[f for f in corpus if f.endswith(".py") and intarget(f)]
tok=re.compile(r'[A-Za-z_]\w*')

syms={}; children=collections.defaultdict(list)
for f in targets:
    try: tree=ast.parse(corpus[f])
    except SyntaxError: continue
    lines=corpus[f].splitlines()
    def walk(node,prefix=""):
        for ch in ast.iter_child_nodes(node):
            if isinstance(ch,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)):
                q=prefix+ch.name
                syms[(f,q)]=dict(name=ch.name,a=ch.lineno,b=ch.end_lineno,
                                 kind="class" if isinstance(ch,ast.ClassDef) else "func",
                                 bases=[ast.unparse(x) for x in getattr(ch,"bases",[])])
                if prefix: children[(f,prefix[:-1])].append((f,q))
                if isinstance(ch,ast.ClassDef): walk(ch,q+".")
    walk(tree)

# own-body text = symbol span MINUS spans of its nested symbols
def own(f,q):
    d=syms[(f,q)]; lines=corpus[f].splitlines()
    excl=set()
    for (ff,qq),dd in syms.items():
        if ff==f and qq!=q and qq.startswith(q+"."):
            excl.update(range(dd["a"],dd["b"]+1))
    return "\n".join(l for i,l in enumerate(lines[d["a"]-1:d["b"]],d["a"]) if i not in excl)

ownsrc={k:own(*k) for k in syms}
byname=collections.defaultdict(list)
for k,d in syms.items(): byname[d["name"]].append(k)

modlevel={}
for f in targets:
    lines=corpus[f].splitlines(); covered=set()
    for (ff,q),d in syms.items():
        if ff==f and "." not in q: covered.update(range(d["a"],d["b"]+1))
    modlevel[f]="\n".join(l for i,l in enumerate(lines,1) if i not in covered)

outside=set()
for g,src in corpus.items():
    if intarget(g) and g.endswith(".py"): continue
    outside.update(tok.findall(src))
for f in targets: outside.update(tok.findall(modlevel[f]))

roots=set()
for k,d in syms.items():
    if d["name"] in outside: roots.add(k)
    if d["name"].startswith("test_"): roots.add(k)
# dunder/protocol methods stay alive if their class is alive
adj=collections.defaultdict(set)
for k,d in syms.items():
    ids=set(tok.findall(ownsrc[k]))
    for nm in ids & byname.keys():
        for t in byname[nm]:
            if t!=k: adj[k].add(t)
    # a live class keeps its dunders + its subclass-overridden protocol surface
    if d["kind"]=="class":
        for c in children[k]:
            if syms[c]["name"].startswith("__"): adj[k].add(c)
    # subclassing: if class X(Base), reaching X reaches Base
    for bn in d["bases"]:
        base=bn.split(".")[-1]
        for t in byname.get(base,[]): adj[k].add(t)

reach=set();st=list(roots)
while st:
    c=st.pop()
    if c in reach: continue
    reach.add(c); st.extend(adj[c]-reach)

dead=[k for k in syms if k not in reach]
bym=collections.defaultdict(list)
for f,q in dead:
    d=syms[(f,q)]; bym[f].append((q,d["b"]-d["a"]+1))
pass
print(f"TOTAL DEAD LINES: {sum(c for f in bym for _,c in bym[f])}\n")
for f in sorted(bym,key=lambda x:-sum(c for _,c in bym[x])):
    tot=sum(c for _,c in bym[f]); fl=len(corpus[f].splitlines())
    pct=100*tot//fl
    print(f"{f}  [{fl} lines] -> {tot} dead ({pct}%)")
    for q,c in sorted(bym[f],key=lambda x:-x[1])[:14]:
        print(f"      {c:5d}  {q}")
    print()

deadset=[k for k in syms if k not in reach]
per=collections.defaultdict(set)
for f,q in deadset:
    d=syms[(f,q)]; per[f].update(range(d["a"],d["b"]+1))
tot=sum(len(v) for v in per.values())
print(f"\n==== UNION-BASED TOTALS ====\nDEAD LINES (deduped): {tot}\n")
for f in sorted(per,key=lambda x:-len(per[x])):
    fl=len(corpus[f].splitlines()); dl=len(per[f])
    tag="  *** WHOLE FILE ***" if dl>=fl-8 else ""
    print(f"{dl:6d}/{fl:<6d} ({100*dl//fl:3d}%)  {f}{tag}")

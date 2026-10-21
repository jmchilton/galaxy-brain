#!/usr/bin/env node
/* Parse reusable support modules without writing repository objects or files.
 * stdin: {typescriptPath, operation:'inspect'|'render', files:[{path,text,...}]}
 * render file fields: unitIds:string[], importNames?:string[]
 * stdout: {files:[...]}. Original full text is retained when all units are selected.
 */
const fs = require('fs');
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const ts = require(request.typescriptPath);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
function bindingNames(node) {
    if (ts.isIdentifier(node)) return [node.text];
    if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node))
        return node.elements.flatMap(e => ts.isBindingElement(e) ? bindingNames(e.name) : []);
    return [];
}
function declaredNames(statement) {
    if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.flatMap(d => bindingNames(d.name));
    if (statement.name && ts.isIdentifier(statement.name)) return [statement.name.text];
    return [];
}
function identifiers(node) {
    const result = new Set();
    function visit(n) {
        if (ts.isIdentifier(n)) {
            // A property label is not a reference to a same-named lexical binding.
            const p=n.parent;
            if (!((ts.isPropertyAccessExpression(p) && p.name === n) ||
                ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n && !ts.isComputedPropertyName(n)))) result.add(n.text);
        }
        ts.forEachChild(n, visit);
    }
    visit(node); return [...result].sort();
}
function parse(file) {
    const source=ts.createSourceFile(file.path,file.text,ts.ScriptTarget.Latest,true,ts.getScriptKindFromFileName(file.path));
    if(source.parseDiagnostics.length) throw new Error(`${file.path}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')}`);
    const imports=[], units=[];
    let count=0;
    for(const statement of source.statements) {
        const raw=file.text.slice(statement.getFullStart(),statement.end);
        if(ts.isImportDeclaration(statement)) {
            const clause=statement.importClause, bindings=[];
            if(clause?.name) bindings.push({local:clause.name.text, imported:'default', typeOnly:!!clause.isTypeOnly});
            if(clause?.namedBindings) {
                if(ts.isNamespaceImport(clause.namedBindings)) bindings.push({local:clause.namedBindings.name.text, imported:'*', typeOnly:!!clause.isTypeOnly});
                else for(const element of clause.namedBindings.elements) bindings.push({local:element.name.text,imported:element.propertyName?.text || element.name.text,typeOnly:!!clause.isTypeOnly||!!element.isTypeOnly});
            }
            imports.push({module:statement.moduleSpecifier.text,bindings,sideEffect:!clause,raw,node:statement});
        } else {
            const names=declaredNames(statement);
            const exports=statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword) ? names : [];
            // Export lists are tracked even when declarations live elsewhere.
            if(ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause))
                exports.push(...statement.exportClause.elements.map(e=>e.name.text));
            const id=names.length?names.join(','):`statement:${count}`;
            units.push({id,names,exports,refs:identifiers(statement).filter(n=>!names.includes(n)),raw,kind:ts.SyntaxKind[statement.kind]});
            count++;
        }
    }
    return {source,imports,units};
}
const output=[];
for(const file of request.files) {
    const parsed=parse(file);
    if(request.operation==='inspect') {
        output.push({path:file.path,imports:parsed.imports.map(({node,...rest})=>rest),units:parsed.units});
        continue;
    }
    if(request.operation!=='render') throw new Error('Unknown operation');
    const selected=new Set(file.unitIds), all=new Set(parsed.units.map(u=>u.id));
    for(const id of selected) if(!all.has(id)) throw new Error(`Unknown unit ${file.path}:${id}`);
    const units=parsed.units.filter(u=>selected.has(u.id));
    const references=new Set(file.importNames || units.flatMap(u=>u.refs));
    const complete=selected.size===all.size && parsed.imports.every(i=>i.bindings.every(b=>references.has(b.local)));
    if(complete) {output.push({path:file.path,text:file.text});continue;}
    const imports=[];
    for(const imp of parsed.imports) {
        if(imp.sideEffect) {imports.push(imp.raw.trim());continue;}
        const node=imp.node, old=node.importClause;
        const defaultName=old.name && references.has(old.name.text)?old.name:undefined;
        let named;
        if(old.namedBindings) {
            if(ts.isNamespaceImport(old.namedBindings)) named=references.has(old.namedBindings.name.text)?old.namedBindings:undefined;
            else {const elements=old.namedBindings.elements.filter(e=>references.has(e.name.text));if(elements.length) named=ts.factory.updateNamedImports(old.namedBindings,elements);}
        }
        if(!defaultName&&!named)continue;
        const clause=ts.factory.updateImportClause(old,old.isTypeOnly,defaultName,named);
        const updated=ts.factory.updateImportDeclaration(node,node.modifiers,clause,node.moduleSpecifier,node.attributes);
        imports.push(printer.printNode(ts.EmitHint.Unspecified,updated,parsed.source));
    }
    const text=[imports.join('\n'),units.map(u=>u.raw.trim()).join('\n\n')].filter(Boolean).join('\n\n')+'\n';
    output.push({path:file.path,text});
}
process.stdout.write(JSON.stringify({files:output}));

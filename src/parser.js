/* Java subset lexer + parser -> AST */
'use strict';

class CompileError extends Error {
  constructor(msg, line, col) { super(msg); this.line = line; this.col = col || 1; this.isCompile = true; }
}

const KEYWORDS = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum ' +
  'extends final finally float for goto if implements import instanceof int interface long native new package private ' +
  'protected public return short static strictfp super switch synchronized this throw throws transient try void volatile ' +
  'while true false null').split(' '));
const PRIMS = new Set(['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short']);
const OPS = ['>>>=', '<<=', '>>=', '>>>', '...', '->', '::', '++', '--', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=',
  '/=', '%=', '&=', '|=', '^=', '<<', '>>', '(', ')', '{', '}', '[', ']', ';', ',', '.', '@', '=', '>', '<', '!', '~', '?', ':',
  '+', '-', '*', '/', '&', '|', '^', '%'];

function lex(src) {
  const toks = [];
  let i = 0, line = 1, ls = 0;
  const n = src.length;
  const err = (m, l, c) => { throw new CompileError(m, l || line, c || (i - ls + 1)); };
  const isIdStart = c => /[\p{L}_$]/u.test(c);
  const isIdPart = c => /[\p{L}\p{N}_$]/u.test(c);
  function readEscape() {
    // at src[i] === '\\'
    const c = src[i + 1];
    const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', s: ' ', '0': '\0', "'": "'", '"': '"', '\\': '\\' };
    if (c === 'u') {
      let j = i + 1; while (src[j] === 'u') j++;
      const hex = src.substr(j, 4);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) err('illegal unicode escape');
      i = j + 4; return String.fromCharCode(parseInt(hex, 16));
    }
    if (/[0-7]/.test(c)) {
      let j = i + 1, s = '';
      while (s.length < 3 && /[0-7]/.test(src[j])) { s += src[j]; j++; }
      i = j; return String.fromCharCode(parseInt(s, 8));
    }
    if (!(c in map)) err('illegal escape character');
    i += 2; return map[c];
  }
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; ls = i; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\u00a0') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i + 2);
      if (j < 0) err('unclosed comment');
      for (let k = i; k < j; k++) if (src[k] === '\n') { line++; ls = k + 1; }
      i = j + 2; continue;
    }
    const start = i, sl = line, sc = i - ls + 1;
    const push = (t, v, extra) => { const tk = { t, v, line: sl, col: sc, pos: start, end: i }; if (extra) Object.assign(tk, extra); toks.push(tk); };
    if (isIdStart(c)) {
      let j = i + 1; while (j < n && isIdPart(src[j])) j++;
      const w = src.slice(i, j); i = j;
      push(KEYWORDS.has(w) ? 'kw' : 'id', w);
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i, kind = 'int', text, radix = 10;
      if (c === '0' && /[xX]/.test(src[i + 1] || '')) { j = i + 2; while (/[0-9a-fA-F_]/.test(src[j] || '')) j++; text = src.slice(i + 2, j); radix = 16; }
      else if (c === '0' && /[bB]/.test(src[i + 1] || '')) { j = i + 2; while (/[01_]/.test(src[j] || '')) j++; text = src.slice(i + 2, j); radix = 2; }
      else {
        while (/[0-9_]/.test(src[j] || '')) j++;
        if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) { kind = 'double'; j++; while (/[0-9_]/.test(src[j] || '')) j++; }
        else if (src[j] === '.' && !isIdStart(src[j + 1] || ' ') && src[j + 1] !== '.') { kind = 'double'; j++; }
        if (/[eE]/.test(src[j] || '') && /[0-9+-]/.test(src[j + 1] || '')) {
          kind = 'double'; j++; if (/[+-]/.test(src[j])) j++;
          if (!/[0-9]/.test(src[j] || '')) err('malformed floating-point literal');
          while (/[0-9_]/.test(src[j] || '')) j++;
        }
        text = src.slice(i, j);
        if (kind === 'int' && text.length > 1 && text[0] === '0' && /^[0-7_]+$/.test(text)) { radix = 8; text = text.slice(1); }
      }
      text = text.replace(/_/g, '');
      const suf = src[j] || '';
      if (/[lL]/.test(suf) && kind === 'int') { j++; kind = 'long'; }
      else if (/[fF]/.test(suf)) { j++; kind = 'float'; }
      else if (/[dD]/.test(suf)) { j++; kind = 'double'; }
      if (isIdPart(src[j] || ' ')) { i = j; err('illegal character in number'); }
      i = j;
      if (kind === 'int') {
        let v;
        if (radix === 10) { v = Number(text); if (v > 2147483648) err('integer number too large', sl, sc); }
        else { const b = BigInt((radix === 16 ? '0x' : radix === 2 ? '0b' : '0o') + (text || '0')); if (b > 0xFFFFFFFFn) err('integer number too large', sl, sc); v = Number(BigInt.asIntN(32, b)); }
        push('int', v, { text: src.slice(start, i) });
      } else if (kind === 'long') {
        let b;
        if (radix === 10) b = BigInt(text); else b = BigInt((radix === 16 ? '0x' : radix === 2 ? '0b' : '0o') + (text || '0'));
        if (radix === 10 && b > 9223372036854775808n) err('integer number too large', sl, sc);
        push('long', BigInt.asIntN(64, b));
      } else {
        const v = Number(text);
        push(kind, kind === 'float' ? Math.fround(v) : v);
      }
      continue;
    }
    if (c === '"') {
      if (src.startsWith('"""', i)) {
        // text block
        let j = i + 3; while (src[j] === ' ' || src[j] === '\t') j++;
        if (src[j] === '\r') j++;
        if (src[j] !== '\n') err('illegal text block open delimiter sequence, missing line terminator');
        i = j + 1; line++; ls = i;
        let raw = '';
        while (true) {
          if (i >= n) err('unclosed text block', sl, sc);
          if (src.startsWith('"""', i)) { i += 3; break; }
          if (src[i] === '\\') { raw += '\u0000ESC' + src[i + 1]; i += 2; continue; }
          if (src[i] === '\n') { line++; ls = i + 1; }
          raw += src[i]; i++;
        }
        const lines = raw.split('\n');
        const closingOnOwnLine = /^[ \t]*$/.test(lines[lines.length - 1]);
        const sig = lines.filter((l, k) => /\S/.test(l) || k === lines.length - 1);
        let ind = Infinity;
        for (const l of sig) { const m = l.match(/^[ \t]*/)[0].length; if (/\S/.test(l) || closingOnOwnLine) ind = Math.min(ind, m); }
        if (!isFinite(ind)) ind = 0;
        let out = lines.map(l => l.slice(ind).replace(/[ \t]+$/, '')).join('\n');
        if (closingOnOwnLine) out = out.replace(/[^\n]*$/, '');
        out = out.replace(/\u0000ESC(.)/g, (m, ch) => ({ n: '\n', t: '\t', '"': '"', "'": "'", '\\': '\\', s: ' ', '\n': '' }[ch] ?? ch));
        push('str', out);
        continue;
      }
      i++;
      let s = '';
      while (true) {
        if (i >= n || src[i] === '\n') err('unclosed string literal', sl, sc);
        if (src[i] === '"') { i++; break; }
        if (src[i] === '\\') { s += readEscape(); continue; }
        s += src[i]; i++;
      }
      push('str', s);
      continue;
    }
    if (c === "'") {
      i++;
      let s;
      if (src[i] === "'") err('empty character literal', sl, sc);
      if (src[i] === '\\') s = readEscape(); else { if (src[i] === '\n' || i >= n) err('illegal line end in character literal', sl, sc); s = src[i]; i++; }
      if (src[i] !== "'") err('unclosed character literal', sl, sc);
      i++;
      push('char', s.charCodeAt(0));
      continue;
    }
    let op = null;
    for (const o of OPS) if (src.startsWith(o, i)) { op = o; break; }
    if (!op) err(`illegal character: '${c}'`);
    i += op.length;
    push('op', op);
  }
  const lastTok = toks[toks.length - 1];
  toks.push({ t: 'eof', v: '<EOF>', line: lastTok ? lastTok.line : line, col: lastTok ? lastTok.col + String(lastTok.text || lastTok.v).length : 1, pos: n, end: n });
  return toks;
}

const MODIFIERS = new Set(['public', 'private', 'protected', 'static', 'final', 'abstract', 'native', 'synchronized', 'transient', 'volatile', 'strictfp', 'default']);

class Parser {
  constructor(toks, src) { this.toks = toks; this.p = 0; this.src = src; this.splits = []; }
  get tk() { return this.toks[this.p]; }
  peek(k = 1) { return this.toks[Math.min(this.p + k, this.toks.length - 1)]; }
  prev() { return this.toks[Math.max(0, this.p - 1)]; }
  is(v) { const t = this.tk; return (t.t === 'op' || t.t === 'kw') && t.v === v; }
  isAt(k, v) { const t = this.peek(k); return (t.t === 'op' || t.t === 'kw') && t.v === v; }
  accept(v) { if (this.is(v)) { this.p++; return true; } return false; }
  fail(msg, tk) { tk = tk || this.tk; throw new CompileError(msg, tk.line, tk.col); }
  failExpected(what) {
    // javac reports ';' / ')' expected right after the previous token
    if ((what === "';'" || what === "')'" || what === "']'" || what === "')' or ','") && this.p > 0) {
      const pv = this.prev();
      throw new CompileError(`${what} expected`, pv.line, pv.col + String(pv.text || pv.v).length);
    }
    if (this.tk.t === 'eof') this.fail('reached end of file while parsing');
    this.fail(`${what} expected`);
  }
  expect(v) { if (!this.is(v)) this.failExpected(`'${v}'`); return this.toks[this.p++]; }
  ident() {
    const t = this.tk;
    if (t.t !== 'id') {
      if (t.t === 'kw' && !['true', 'false', 'null'].includes(t.v)) this.fail(`<identifier> expected`);
      this.failExpected('<identifier>');
    }
    this.p++; return t.v;
  }
  save() { return { p: this.p, s: this.splits.length }; }
  restore(st) {
    while (this.splits.length > st.s) { const u = this.splits.pop(); this.toks.splice(u.i, 2, u.tok); }
    this.p = st.p;
  }
  // consume a single '>' possibly splitting '>>', '>>>', '>=', '>>='
  expectGT() {
    const t = this.tk;
    if (t.t === 'op' && t.v[0] === '>' && t.v !== '>') {
      const a = Object.assign({}, t, { v: '>', end: t.pos + 1 });
      const b = Object.assign({}, t, { v: t.v.slice(1), pos: t.pos + 1, col: t.col + 1 });
      this.toks.splice(this.p, 1, a, b);
      this.splits.push({ i: this.p, tok: t });
    }
    this.expect('>');
  }

  // ---------------------------------------------------------------- compilation unit
  parseUnit() {
    const unit = { k: 'Unit', imports: [], types: [] };
    this.skipAnnotations();
    if (this.is('package')) { this.p++; this.qualifiedName(); this.expect(';'); }
    while (this.is('import')) {
      const line = this.tk.line; this.p++;
      const isStatic = this.accept('static');
      let name = this.ident();
      let star = false;
      while (this.accept('.')) { if (this.accept('*')) { star = true; break; } name += '.' + this.ident(); }
      this.expect(';');
      unit.imports.push({ name, star, isStatic, line });
    }
    while (this.tk.t !== 'eof') {
      if (this.accept(';')) continue;
      unit.types.push(this.typeDecl(null));
    }
    return unit;
  }
  qualifiedName() { let n = this.ident(); while (this.is('.') && this.peek().t === 'id') { this.p++; n += '.' + this.ident(); } return n; }
  skipAnnotations(out) {
    while (this.is('@') && !(this.peek().t === 'kw' && this.peek().v === 'interface')) {
      this.p++; const name = this.qualifiedName();
      if (out) out.push(name);
      if (this.is('(')) { let d = 0; do { if (this.is('(')) d++; else if (this.is(')')) d--; this.p++; } while (d > 0 && this.tk.t !== 'eof'); }
    }
  }
  modifiers() {
    const mods = new Set(); const ann = [];
    const first = this.tk;
    while (true) {
      this.skipAnnotations(ann);
      const t = this.tk;
      if (t.t === 'kw' && MODIFIERS.has(t.v)) {
        if (t.v === 'default' && (this.isAt(1, ':') || this.isAt(1, '->'))) break;
        if (mods.has(t.v)) this.fail(`repeated modifier`);
        mods.add(t.v); this.p++; continue;
      }
      if (t.t === 'id' && (t.v === 'sealed' || t.v === 'non') && this.peek().t !== 'op') { this.p++; continue; }
      break;
    }
    const acc = ['public', 'private', 'protected'].filter(m => mods.has(m));
    if (acc.length > 1) this.fail('illegal combination of modifiers: ' + acc[0] + ' and ' + acc[1], first);
    return { mods, ann, line: first.line, col: first.col };
  }
  typeDecl(outer, pre) {
    const m = pre || this.modifiers();
    const t = this.tk;
    let kind;
    if (this.accept('class')) kind = 'class';
    else if (this.accept('interface')) kind = 'interface';
    else if (this.accept('enum')) kind = 'enum';
    else if (this.is('@') && this.isAt(1, 'interface')) { this.fail('annotation type declarations are not supported'); }
    else if (t.t === 'id' && t.v === 'record') { this.fail('records are not supported in this practice runtime \u2013 use a class'); }
    else this.fail('class, interface, enum, or record expected');
    const nameTok = this.tk;
    const name = this.ident();
    const decl = { k: 'Class', kind, name, mods: m.mods, ann: m.ann, line: nameTok.line, col: nameTok.col, typeParams: [], ext: null, impls: [], fields: [], methods: [], ctors: [], inits: [], inner: [], enumConsts: [], outer };
    if (this.is('<')) decl.typeParams = this.typeParams();
    if (this.accept('extends')) {
      if (kind === 'interface') { decl.impls.push(this.type()); while (this.accept(',')) decl.impls.push(this.type()); }
      else decl.ext = this.type();
    }
    if (this.accept('implements')) { decl.impls.push(this.type()); while (this.accept(',')) decl.impls.push(this.type()); }
    if (this.tk.t === 'id' && this.tk.v === 'permits') { this.p++; this.type(); while (this.accept(',')) this.type(); }
    this.classBody(decl);
    return decl;
  }
  typeParams() {
    const ps = [];
    this.expect('<');
    do {
      this.skipAnnotations();
      ps.push(this.ident());
      if (this.accept('extends')) { this.type(); while (this.accept('&')) this.type(); }
    } while (this.accept(','));
    this.expectGT();
    return ps;
  }
  classBody(decl) {
    this.expect('{');
    if (decl.kind === 'enum') {
      let ord = 0;
      while (!this.is(';') && !this.is('}')) {
        this.skipAnnotations();
        const tk = this.tk; const name = this.ident();
        let args = [];
        if (this.is('(')) args = this.args();
        let body = null;
        if (this.is('{')) {
          body = { k: 'Class', kind: 'class', name: decl.name + '$' + (ord + 1), mods: new Set(), ann: [], line: tk.line, typeParams: [], ext: null, impls: [], fields: [], methods: [], ctors: [], inits: [], inner: [], enumConsts: [], outer: decl, anon: true };
          this.classBody(body);
        }
        decl.enumConsts.push({ name, args, body, line: tk.line, ord: ord++ });
        if (!this.accept(',')) break;
      }
      if (!this.accept(';')) { this.expect('}'); return; }
    }
    while (!this.accept('}')) {
      if (this.tk.t === 'eof') this.fail('reached end of file while parsing');
      if (this.accept(';')) continue;
      this.member(decl);
    }
  }
  member(decl) {
    const startTok = this.tk;
    if (this.is('{')) { decl.inits.push({ static: false, body: this.block(), line: startTok.line }); return; }
    if (this.is('static') && this.isAt(1, '{')) { this.p++; decl.inits.push({ static: true, body: this.block(), line: startTok.line }); return; }
    const m = this.modifiers();
    if (this.is('class') || this.is('interface') || this.is('enum') || (this.tk.t === 'id' && this.tk.v === 'record' && this.peek().t === 'id')) {
      const inner = this.typeDecl(decl, m);
      decl.inner.push(inner); return;
    }
    let typeParams = [];
    if (this.is('<')) typeParams = this.typeParams();
    // constructor?
    if (this.tk.t === 'id' && this.isAt(1, '(') && this.tk.v === decl.name) {
      const tk = this.tk; this.p++;
      const params = this.params();
      const thr = this.throwsClause();
      const body = this.block();
      decl.ctors.push({ k: 'Ctor', name: decl.name, mods: m.mods, ann: m.ann, params, throws: thr, body, line: tk.line, col: tk.col, cls: decl });
      return;
    }
    if (this.tk.t === 'id' && this.isAt(1, '(')) {
      this.fail('invalid method declaration; return type required');
    }
    let type;
    if (this.accept('void')) type = { k: 'Type', name: 'void', args: null, dims: 0 };
    else type = this.type();
    const nameTok = this.tk;
    const name = this.ident();
    if (this.is('(')) {
      const params = this.params();
      let dims = 0; while (this.is('[')) { this.p++; this.expect(']'); dims++; }
      if (dims) type = Object.assign({}, type, { dims: type.dims + dims });
      const thr = this.throwsClause();
      let body = null;
      if (this.is('{')) body = this.block();
      else if (this.accept(';')) body = null;
      else if (this.accept('default')) { this.expr(); this.expect(';'); }
      else this.failExpected("';'");
      decl.methods.push({ k: 'Method', name, mods: m.mods, ann: m.ann, typeParams, ret: type, params, throws: thr, body, line: nameTok.line, col: nameTok.col, cls: decl });
      return;
    }
    // field(s)
    const fd = { k: 'Field', mods: m.mods, type, decls: [], line: nameTok.line };
    let nm = name, tk = nameTok;
    while (true) {
      let t = type; let dims = 0;
      while (this.is('[')) { this.p++; this.expect(']'); dims++; }
      if (dims) t = Object.assign({}, type, { dims: type.dims + dims });
      let init = null;
      if (this.accept('=')) init = this.is('{') ? this.arrayInit() : this.expr();
      fd.decls.push({ name: nm, type: t, init, line: tk.line, col: tk.col });
      if (!this.accept(',')) break;
      tk = this.tk; nm = this.ident();
    }
    this.expect(';');
    decl.fields.push(fd);
  }
  throwsClause() { const r = []; if (this.accept('throws')) { r.push(this.type()); while (this.accept(',')) r.push(this.type()); } return r; }
  params() {
    this.expect('(');
    const ps = [];
    if (!this.is(')')) {
      do {
        const m = this.modifiers();
        const type = this.type();
        let varargs = false;
        if (this.accept('...')) varargs = true;
        const tk = this.tk;
        if (this.tk.t === 'kw' && this.tk.v === 'this') { this.p++; continue; }
        const name = this.ident();
        let t = type; let dims = 0;
        while (this.is('[')) { this.p++; this.expect(']'); dims++; }
        if (dims) t = Object.assign({}, type, { dims: type.dims + dims });
        if (varargs) t = Object.assign({}, t, { dims: t.dims + 1 });
        ps.push({ name, type: t, varargs, final: m.mods.has('final'), line: tk.line, col: tk.col });
      } while (this.accept(','));
    }
    this.expect(')');
    return ps;
  }
  // ---------------------------------------------------------------- types
  type() {
    this.skipAnnotations();
    const t = this.tk;
    let name;
    if (t.t === 'kw' && PRIMS.has(t.v)) { this.p++; name = t.v; }
    else if (t.t === 'id') {
      name = this.ident();
      let args = null;
      if (this.is('<')) args = this.typeArgs();
      while (this.is('.') && this.peek().t === 'id') {
        this.p++; name += '.' + this.ident();
        if (this.is('<')) args = this.typeArgs();
      }
      let dims = 0;
      while (this.is('[') && this.isAt(1, ']')) { this.p += 2; dims++; }
      return { k: 'Type', name, args, dims, line: t.line, col: t.col };
    } else {
      if (t.t === 'kw' && t.v === 'var') this.p++;
      this.failExpected('<identifier>');
    }
    let dims = 0;
    while (this.is('[') && this.isAt(1, ']')) { this.p += 2; dims++; }
    return { k: 'Type', name, args: null, dims, line: t.line, col: t.col };
  }
  typeArgs() {
    this.expect('<');
    const args = [];
    if (this.is('>')) { this.p++; return []; } // diamond
    do {
      this.skipAnnotations();
      if (this.accept('?')) {
        if (this.accept('extends') || this.accept('super')) args.push(this.type());
        else args.push({ k: 'Type', name: 'Object', args: null, dims: 0 });
      } else args.push(this.type());
    } while (this.accept(','));
    this.expectGT();
    return args;
  }
  tryType() {
    const st = this.save();
    try { const t = this.type(); return t; } catch (e) { if (!e.isCompile) throw e; this.restore(st); return null; }
  }
  // ---------------------------------------------------------------- statements
  block() {
    const tk = this.expect('{');
    const stmts = [];
    while (!this.is('}')) {
      if (this.tk.t === 'eof') this.fail('reached end of file while parsing');
      stmts.push(this.blockStmt());
    }
    const end = this.tk;
    this.p++;
    return { k: 'Block', stmts, line: tk.line, endLine: end.line };
  }
  isLocalVarDecl() {
    const t = this.tk;
    if (t.t === 'kw' && PRIMS.has(t.v)) return true;
    if (t.t !== 'id') return false;
    if (t.v === 'var' && this.peek().t === 'id') return true;
    const st = this.save();
    let ok = false;
    try {
      this.type();
      const n = this.tk;
      if (n.t === 'id') { const a = this.peek(); ok = a.t === 'op' && ['=', ';', ',', ':', '['].includes(a.v); }
    } catch (e) { if (!e.isCompile) throw e; }
    this.restore(st);
    return ok;
  }
  localVarDecl(mods, noSemi) {
    const tk = this.tk;
    let type;
    if (tk.t === 'id' && tk.v === 'var' && this.peek().t === 'id') { this.p++; type = { k: 'Type', name: 'var', args: null, dims: 0, line: tk.line, col: tk.col }; }
    else type = this.type();
    const decls = [];
    do {
      const nt = this.tk;
      const name = this.ident();
      let t = type, dims = 0;
      while (this.is('[')) { this.p++; this.expect(']'); dims++; }
      if (dims) t = Object.assign({}, type, { dims: type.dims + dims });
      let init = null;
      if (this.accept('=')) init = this.is('{') ? this.arrayInit() : this.expr();
      decls.push({ name, type: t, init, line: nt.line, col: nt.col });
    } while (this.accept(','));
    if (!noSemi) this.expect(';');
    return { k: 'Local', type, decls, final: mods ? mods.has('final') : false, line: tk.line, col: tk.col };
  }
  blockStmt() {
    const t = this.tk;
    if (t.t === 'kw' && (t.v === 'final' || t.v === 'abstract' || t.v === 'static') || this.is('@')) {
      const m = this.modifiers();
      if (this.is('class') || this.is('interface') || this.is('enum')) return { k: 'LocalClass', decl: this.typeDecl(null, m), line: t.line };
      return this.localVarDecl(m.mods);
    }
    if (this.is('class') || this.is('interface') || this.is('enum')) {
      return { k: 'LocalClass', decl: this.typeDecl(null), line: t.line };
    }
    if (this.isLocalVarDecl()) return this.localVarDecl(null);
    return this.stmt();
  }
  parExpr() { this.expect('('); const e = this.expr(); this.expect(')'); return e; }
  stmt() {
    const t = this.tk;
    const line = t.line, col = t.col;
    if (t.t === 'op' && t.v === '{') return this.block();
    if (t.t === 'op' && t.v === ';') { this.p++; return { k: 'Empty', line }; }
    if (t.t === 'id' && this.isAt(1, ':') ) {
      this.p += 2;
      return { k: 'Labeled', label: t.v, body: this.stmt(), line };
    }
    if (t.t === 'id' && t.v === 'yield' && !this.isAt(1, '=') && !this.isAt(1, '(') && !this.isAt(1, '.') && !this.isAt(1, '++') && !this.isAt(1, '--')) {
      this.p++; const e = this.expr(); this.expect(';'); return { k: 'Yield', e, line };
    }
    if (t.t === 'kw') {
      switch (t.v) {
        case 'if': {
          this.p++; const cond = this.parExpr(); const then = this.stmt();
          let els = null; if (this.accept('else')) els = this.stmt();
          return { k: 'If', cond, then, els, line };
        }
        case 'while': { this.p++; const cond = this.parExpr(); return { k: 'While', cond, body: this.stmt(), line }; }
        case 'do': {
          this.p++; const body = this.stmt(); this.expect('while'); const cond = this.parExpr(); this.expect(';');
          return { k: 'DoWhile', body, cond, line };
        }
        case 'for': {
          this.p++; this.expect('(');
          // for-each?
          const st = this.save();
          let mods = null;
          if (this.is('final') || this.is('@')) mods = this.modifiers().mods;
          if (this.isLocalVarDecl()) {
            const st2 = this.save();
            let type;
            if (this.tk.t === 'id' && this.tk.v === 'var' && this.peek().t === 'id') { const vt = this.tk; this.p++; type = { k: 'Type', name: 'var', args: null, dims: 0, line: vt.line, col: vt.col }; }
            else type = this.type();
            const nt = this.tk;
            if (nt.t === 'id' && this.isAt(1, ':')) {
              this.p += 2;
              const iter = this.expr(); this.expect(')');
              return { k: 'ForEach', type, name: nt.v, iter, body: this.stmt(), final: mods ? mods.has('final') : false, line, vline: nt.line, vcol: nt.col };
            }
            this.restore(st2);
            const init = [this.localVarDecl(mods, true)];
            return this.forRest(init, line);
          }
          this.restore(st);
          const init = [];
          if (!this.is(';')) { do { init.push({ k: 'ExprStmt', e: this.stmtExpr(), line: this.tk.line }); } while (this.accept(',')); }
          return this.forRest(init, line);
        }
        case 'return': {
          this.p++; let e = null; if (!this.is(';')) e = this.expr(); this.expect(';');
          return { k: 'Return', e, line, col };
        }
        case 'break': { this.p++; let label = null; if (this.tk.t === 'id') label = this.ident(); this.expect(';'); return { k: 'Break', label, line, col }; }
        case 'continue': { this.p++; let label = null; if (this.tk.t === 'id') label = this.ident(); this.expect(';'); return { k: 'Continue', label, line, col }; }
        case 'throw': { this.p++; const e = this.expr(); this.expect(';'); return { k: 'Throw', e, line, col }; }
        case 'switch': {
          const sw = this.switchBody(false);
          return sw;
        }
        case 'try': return this.tryStmt();
        case 'synchronized': { this.p++; this.parExpr(); return this.block(); }
        case 'assert': { this.p++; const cond = this.expr(); let msg = null; if (this.accept(':')) msg = this.expr(); this.expect(';'); return { k: 'Assert', cond, msg, line }; }
        case 'else': this.fail("'else' without 'if'");
        case 'case': case 'default': this.fail(`orphaned ${t.v}`);
        case 'catch': this.fail("'catch' without 'try'");
        case 'finally': this.fail("'finally' without 'try'");
      }
    }
    const e = this.stmtExpr();
    this.expect(';');
    return { k: 'ExprStmt', e, line, col };
  }
  stmtExpr() {
    const t = this.tk;
    const e = this.expr();
    if (!['Assign', 'PreInc', 'PostInc', 'Call', 'New', 'CtorCall'].includes(e.k)) throw new CompileError('not a statement', e.line || t.line, e.col || t.col);
    return e;
  }
  forRest(init, line) {
    this.expect(';');
    let cond = null; if (!this.is(';')) cond = this.expr();
    this.expect(';');
    const update = [];
    if (!this.is(')')) { do { update.push(this.stmtExpr()); } while (this.accept(',')); }
    this.expect(')');
    return { k: 'For', init, cond, update, body: this.stmt(), line };
  }
  tryStmt() {
    const line = this.tk.line; this.p++;
    const resources = [];
    if (this.accept('(')) {
      while (!this.is(')')) {
        if (this.is('final')) this.p++;
        if (this.isLocalVarDecl()) {
          const tk = this.tk;
          let type;
          if (this.tk.t === 'id' && this.tk.v === 'var' && this.peek().t === 'id') { this.p++; type = { k: 'Type', name: 'var', args: null, dims: 0 }; }
          else type = this.type();
          const name = this.ident(); this.expect('=');
          resources.push({ type, name, init: this.expr(), line: tk.line });
        } else resources.push({ type: null, name: null, init: this.expr(), line: this.tk.line });
        if (!this.accept(';')) break;
      }
      this.expect(')');
    }
    const block = this.block();
    const catches = [];
    while (this.is('catch')) {
      const cl = this.tk.line; this.p++; this.expect('(');
      this.modifiers();
      const types = [this.type()];
      while (this.accept('|')) types.push(this.type());
      const nt = this.tk;
      const name = this.ident();
      this.expect(')');
      catches.push({ types, name, body: this.block(), line: cl, nline: nt.line, ncol: nt.col });
    }
    let fin = null;
    if (this.accept('finally')) fin = this.block();
    if (!catches.length && !fin && !resources.length) throw new CompileError("'try' without 'catch', 'finally' or resource declarations", line, 1);
    return { k: 'Try', resources, block, catches, fin, line };
  }
  switchBody(isExpr) {
    const t = this.tk; this.p++;
    const sel = this.parExpr();
    this.expect('{');
    const cases = [];
    let arrow = null;
    while (!this.accept('}')) {
      const ct = this.tk;
      let labels;
      if (this.accept('default')) labels = null;
      else if (this.accept('case')) {
        labels = [];
        do {
          if (this.is('null')) { this.p++; labels.push({ k: 'Lit', vt: 'null', v: null, line: ct.line }); }
          else if (this.is('default')) { this.p++; labels.push({ k: 'Default' }); }
          else labels.push(this.ternary());
        } while (this.accept(','));
      } else this.fail("'case', 'default', or '}' expected");
      let isArrow;
      if (this.accept('->')) isArrow = true; else { this.expect(':'); isArrow = false; }
      if (arrow === null) arrow = isArrow; else if (arrow !== isArrow) this.fail('different case kinds used in the switch', ct);
      let body;
      if (isArrow) {
        if (this.is('{')) body = [this.block()];
        else if (this.is('throw')) body = [this.stmt()];
        else {
          const el = this.tk;
          const e = this.expr(); this.expect(';');
          body = isExpr ? [{ k: 'Yield', e, line: el.line, implicit: true }] : [{ k: 'ExprStmt', e, line: el.line }];
          if (!isExpr && !['Assign', 'PreInc', 'PostInc', 'Call', 'New'].includes(e.k)) throw new CompileError('not a statement', el.line, el.col);
        }
      } else {
        body = [];
        while (!this.is('case') && !this.is('default') && !this.is('}')) {
          if (this.tk.t === 'eof') this.fail('reached end of file while parsing');
          body.push(this.blockStmt());
        }
        // `default` as modifier lookahead guard
      }
      cases.push({ labels, body, line: ct.line });
    }
    return { k: isExpr ? 'SwitchExpr' : 'Switch', sel, cases, arrow: !!arrow, line: t.line, col: t.col };
  }
  // ---------------------------------------------------------------- expressions
  expr() { return this.assignment(); }
  isLambdaAhead() {
    const t = this.tk;
    if (t.t === 'id' && this.isAt(1, '->')) return true;
    if (!this.is('(')) return false;
    let d = 0, k = 0;
    while (true) {
      const x = this.peek(k);
      if (x.t === 'eof') return false;
      if (x.t === 'op' && x.v === '(') d++;
      else if (x.t === 'op' && x.v === ')') { d--; if (d === 0) break; }
      k++;
    }
    const nx = this.peek(k + 1);
    return nx.t === 'op' && nx.v === '->';
  }
  lambda() {
    const t = this.tk;
    const params = [];
    if (t.t === 'id') { this.p++; params.push({ name: t.v, type: null }); }
    else {
      this.expect('(');
      if (!this.is(')')) {
        do {
          this.modifiers();
          if (this.tk.t === 'id' && (this.isAt(1, ',') || this.isAt(1, ')'))) params.push({ name: this.ident(), type: null });
          else { let ty; if (this.tk.t === 'id' && this.tk.v === 'var') { this.p++; ty = null; } else ty = this.type(); params.push({ type: ty, name: this.ident() }); }
        } while (this.accept(','));
      }
      this.expect(')');
    }
    this.expect('->');
    let body;
    if (this.is('{')) body = this.block(); else body = this.expr();
    return { k: 'Lambda', params, body, line: t.line, col: t.col };
  }
  assignment() {
    if (this.isLambdaAhead()) return this.lambda();
    const lhs = this.ternary();
    const t = this.tk;
    if (t.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='].includes(t.v)) {
      if (!['Name', 'Field', 'Index'].includes(lhs.k)) this.fail('unexpected type\n  required: variable\n  found:    value', t);
      this.p++;
      const rhs = (t.v === '=' && this.is('{')) ? this.fail('illegal start of expression') : this.assignment();
      return { k: 'Assign', op: t.v, target: lhs, value: rhs, line: t.line, col: lhs.col };
    }
    return lhs;
  }
  ternary() {
    const c = this.binary(0);
    if (this.is('?')) {
      const t = this.tk; this.p++;
      const a = this.isLambdaAhead() ? this.lambda() : this.ternary();
      this.expect(':');
      const b = this.isLambdaAhead() ? this.lambda() : this.ternary();
      return { k: 'Cond', c, a, b, line: t.line, col: c.col };
    }
    return c;
  }
  binary(minPrec) {
    let left = this.unary();
    while (true) {
      const t = this.tk;
      let op = null;
      if (t.t === 'op' && BIN_PREC[t.v] !== undefined) op = t.v;
      else if (t.t === 'kw' && t.v === 'instanceof') op = 'instanceof';
      if (!op) break;
      const prec = op === 'instanceof' ? 7 : BIN_PREC[op];
      if (prec < minPrec) break;
      this.p++;
      if (op === 'instanceof') {
        const fin = this.accept('final');
        const type = this.type();
        let bind = null;
        if (this.tk.t === 'id') { bind = { name: this.ident(), line: this.prev().line, col: this.prev().col }; }
        left = { k: 'InstanceOf', e: left, type, bind, line: t.line, col: left.col };
        continue;
      }
      const right = this.binary(prec + 1);
      left = { k: 'Bin', op, l: left, r: right, line: t.line, col: left.col, opcol: t.col };
    }
    return left;
  }
  unary() {
    const t = this.tk;
    if (t.t === 'op') {
      if (t.v === '++' || t.v === '--') { this.p++; const e = this.unary(); this.checkVar(e, t); return { k: 'PreInc', op: t.v, e, line: t.line, col: t.col }; }
      if (t.v === '+' || t.v === '-') {
        this.p++;
        const nx = this.tk;
        if (t.v === '-' && nx.t === 'int' && nx.v === 2147483648) { this.p++; return this.postfix({ k: 'Lit', vt: 'int', v: -2147483648, line: t.line, col: t.col }); }
        if (t.v === '-' && nx.t === 'long' && nx.v === -9223372036854775808n) { this.p++; return this.postfix({ k: 'Lit', vt: 'long', v: nx.v, line: t.line, col: t.col }); }
        const e = this.unary(); return { k: 'Unary', op: t.v, e, line: t.line, col: t.col };
      }
      if (t.v === '!' || t.v === '~') { this.p++; const e = this.unary(); return { k: 'Unary', op: t.v, e, line: t.line, col: t.col }; }
      if (t.v === '(') {
        const cast = this.tryCast();
        if (cast) return cast;
      }
    }
    if (t.t === 'int' && t.v === 2147483648) this.fail('integer number too large');
    return this.postfix(this.primary());
  }
  checkVar(e, t) { if (!['Name', 'Field', 'Index'].includes(e.k)) this.fail('unexpected type\n  required: variable\n  found:    value', t); }
  tryCast() {
    const st = this.save();
    const t = this.tk;
    this.p++;
    const nt = this.tk;
    if (nt.t === 'kw' && PRIMS.has(nt.v)) {
      const type = this.type();
      if (!this.is(')')) { this.restore(st); return null; }
      this.p++;
      const e = this.unary();
      return { k: 'Cast', type, e, line: t.line, col: t.col };
    }
    if (nt.t !== 'id') { this.restore(st); return null; }
    let type = null;
    try { type = this.type(); while (this.accept('&')) this.type(); } catch (e) { if (!e.isCompile) throw e; type = null; }
    if (!type || !this.is(')')) { this.restore(st); return null; }
    this.p++;
    const a = this.tk;
    const ok = a.t === 'id' || a.t === 'str' || a.t === 'char' || a.t === 'int' || a.t === 'long' || a.t === 'double' || a.t === 'float' ||
      (a.t === 'kw' && ['this', 'new', 'super', 'true', 'false', 'null', 'switch'].includes(a.v) || (a.t === 'kw' && PRIMS.has(a.v))) ||
      (a.t === 'op' && ['(', '!', '~'].includes(a.v));
    if (!ok) { this.restore(st); return null; }
    if (this.isLambdaAhead()) return { k: 'Cast', type, e: this.lambda(), line: t.line, col: t.col };
    const e = this.unary();
    return { k: 'Cast', type, e, line: t.line, col: t.col };
  }
  args() {
    this.expect('(');
    const a = [];
    if (!this.is(')')) { do { a.push(this.expr()); } while (this.accept(',')); }
    if (!this.is(')')) this.failExpected("')' or ','");
    this.p++;
    return a;
  }
  arrayInit() {
    const t = this.expect('{');
    const elems = [];
    while (!this.is('}')) {
      elems.push(this.is('{') ? this.arrayInit() : this.expr());
      if (!this.accept(',')) break;
    }
    this.expect('}');
    return { k: 'ArrayInit', elems, line: t.line, col: t.col };
  }
  primary() {
    const t = this.tk;
    const line = t.line, col = t.col;
    switch (t.t) {
      case 'int': this.p++; return { k: 'Lit', vt: 'int', v: t.v, line, col };
      case 'long': this.p++; return { k: 'Lit', vt: 'long', v: t.v, line, col };
      case 'double': this.p++; return { k: 'Lit', vt: 'double', v: t.v, line, col };
      case 'float': this.p++; return { k: 'Lit', vt: 'float', v: t.v, line, col };
      case 'char': this.p++; return { k: 'Lit', vt: 'char', v: t.v, line, col };
      case 'str': this.p++; return { k: 'Lit', vt: 'String', v: t.v, line, col };
      case 'id': {
        this.p++;
        if (this.is('(')) { const args = this.args(); return { k: 'Call', obj: null, name: t.v, args, line, col }; }
        // generic type method ref e.g. ArrayList<String>::new  -- rare; ignore
        return { k: 'Name', name: t.v, line, col };
      }
      case 'kw':
        switch (t.v) {
          case 'true': case 'false': this.p++; return { k: 'Lit', vt: 'boolean', v: t.v === 'true', line, col };
          case 'null': this.p++; return { k: 'Lit', vt: 'null', v: null, line, col };
          case 'this':
            this.p++;
            if (this.is('(')) { const args = this.args(); return { k: 'CtorCall', kind: 'this', args, line, col }; }
            return { k: 'This', line, col };
          case 'super':
            this.p++;
            if (this.is('(')) { const args = this.args(); return { k: 'CtorCall', kind: 'super', args, line, col }; }
            if (this.accept('::')) { const name = this.ident(); return { k: 'MethodRef', target: { k: 'Super', line, col }, name, line, col }; }
            this.expect('.');
            {
              const nt = this.tk; const name = this.ident();
              if (this.is('(')) { const args = this.args(); return { k: 'Call', obj: { k: 'Super', line, col }, name, args, line: nt.line, col: nt.col }; }
              return { k: 'Field', obj: { k: 'Super', line, col }, name, line: nt.line, col: nt.col };
            }
          case 'new': return this.creator();
          case 'switch': return this.switchBody(true);
          default:
            if (PRIMS.has(t.v) || t.v === 'void') {
              // int.class or int[]::new etc.
              const type = t.v === 'void' ? (this.p++, { k: 'Type', name: 'void', dims: 0 }) : this.type();
              if (this.accept('::')) { this.expect('new'); return { k: 'MethodRef', target: { k: 'TypeRef', type }, name: 'new', line, col }; }
              if (this.accept('.')) { this.expect('class'); return { k: 'ClassLit', type, line, col }; }
              this.fail(`'.class' expected`);
            }
        }
        break;
      case 'op':
        if (t.v === '(') {
          this.p++;
          const e = this.expr();
          this.expect(')');
          return { k: 'Paren', e, line, col };
        }
        break;
    }
    if (t.t === 'eof') this.fail('reached end of file while parsing');
    this.fail('illegal start of expression');
  }
  creator() {
    const t = this.tk; this.p++;
    const line = t.line, col = t.col;
    this.skipAnnotations();
    const tt = this.tk;
    let name;
    let args = null;
    if (tt.t === 'kw' && PRIMS.has(tt.v)) { this.p++; name = tt.v; }
    else {
      name = this.ident();
      if (this.is('<')) args = this.typeArgs();
      while (this.accept('.')) { name += '.' + this.ident(); if (this.is('<')) args = this.typeArgs(); }
    }
    const type = { k: 'Type', name, args, dims: 0, line: tt.line, col: tt.col };
    if (this.is('[')) {
      const dims = [];
      let extra = 0;
      while (this.is('[')) {
        this.p++;
        if (this.is(']')) { this.p++; extra++; continue; }
        if (extra) this.fail("']' expected");
        dims.push(this.expr()); this.expect(']');
      }
      let init = null;
      if (!dims.length) {
        if (!this.is('{')) this.fail('array dimension missing');
        init = this.arrayInit();
      }
      return { k: 'NewArray', type, dims, extra, init, line, col };
    }
    if (PRIMS.has(name)) this.fail("'[' expected");
    const a = this.args();
    let body = null;
    if (this.is('{')) {
      body = { k: 'Class', kind: 'class', name: '', mods: new Set(), ann: [], line, typeParams: [], ext: null, impls: [], fields: [], methods: [], ctors: [], inits: [], inner: [], enumConsts: [], outer: null, anon: true };
      this.classBody(body);
    }
    return { k: 'New', type, args: a, body, line, col };
  }
  postfix(e) {
    while (true) {
      const t = this.tk;
      if (t.t !== 'op') break;
      if (t.v === '.') {
        this.p++;
        if (this.is('<')) this.typeArgs(); // explicit generic method call
        const nt = this.tk;
        if (nt.t === 'kw' && nt.v === 'new') { // inner class creation outer.new Inner()
          const c = this.creator(); c.outer = e; e = c; continue;
        }
        if (nt.t === 'kw' && nt.v === 'class') { this.p++; e = { k: 'ClassLit', type: { k: 'Type', name: exprToName(e), dims: 0 }, line: t.line, col: e.col }; continue; }
        if (nt.t === 'kw' && nt.v === 'this') { this.p++; e = { k: 'This', qual: exprToName(e), line: nt.line, col: e.col }; continue; }
        const name = this.ident();
        if (this.is('(')) { const args = this.args(); e = { k: 'Call', obj: e, name, args, line: nt.line, col: nt.col, dotcol: t.col }; }
        else e = { k: 'Field', obj: e, name, line: nt.line, col: nt.col };
        continue;
      }
      if (t.v === '[') {
        // could be a type like String[]::new \u2014 rare
        if (this.isAt(1, ']')) {
          let dims = 0; while (this.is('[') && this.isAt(1, ']')) { this.p += 2; dims++; }
          const tn = exprToName(e);
          const type = { k: 'Type', name: tn, dims, args: null };
          if (this.accept('::')) { this.expect('new'); return { k: 'MethodRef', target: { k: 'TypeRef', type }, name: 'new', line: t.line, col: e.col }; }
          if (this.accept('.')) { this.expect('class'); return { k: 'ClassLit', type, line: t.line, col: e.col }; }
          this.fail('illegal start of expression');
        }
        this.p++;
        const idx = this.expr();
        this.expect(']');
        e = { k: 'Index', arr: e, idx, line: t.line, col: e.col };
        continue;
      }
      if (t.v === '++' || t.v === '--') {
        this.checkVar(e, t);
        this.p++; e = { k: 'PostInc', op: t.v, e, line: t.line, col: e.col }; continue;
      }
      if (t.v === '::') {
        this.p++;
        let name;
        if (this.accept('new')) name = 'new'; else name = this.ident();
        e = { k: 'MethodRef', target: e, name, line: t.line, col: e.col };
        continue;
      }
      if (t.v === '<' && e.k === 'Name' && /^[A-Z]/.test(e.name)) {
        // possible generic type in method ref: List<String>::new  (rare) \u2014 try
        const st = this.save();
        try { this.typeArgs(); if (this.is('::')) continue; } catch (er) { if (!er.isCompile) throw er; }
        this.restore(st);
      }
      break;
    }
    return e;
  }
}
function exprToName(e) {
  if (e.k === 'Name') return e.name;
  if (e.k === 'Field') return exprToName(e.obj) + '.' + e.name;
  throw new CompileError('<identifier> expected', e.line, e.col);
}
const BIN_PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '>>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };

function parse(src) {
  const toks = lex(src);
  const p = new Parser(toks, src);
  return p.parseUnit();
}

const JavaParser = { lex, parse, CompileError, PRIMS };
(typeof window !== 'undefined' ? window : globalThis).JavaParser = JavaParser;
if (typeof module !== 'undefined' && module.exports) module.exports = JavaParser;

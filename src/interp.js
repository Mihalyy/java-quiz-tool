/* Tree-walking interpreter for the Java subset */
'use strict';
(function (JR) {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const { CompileError } = G.JavaParser;
  const { JD, JC, JL, JObject, JArray, JClassRef, JFunc, JThrow, Halt, Scope, tdesc, d2i, d2l, fmtDouble, fmtFloat } = JR;

  const MAX_DEPTH = 3000;
  const D0 = new JD(0), F0 = new JD(0, true), C0 = new JC(0), L0 = new JL(0n);
  const SIG_BREAK = { k: 'b', label: null }, SIG_CONT = { k: 'c', label: null };

  // fully qualified names of built-in exception classes
  const EXC = {
    Throwable: [null, 'java.lang'], Exception: ['Throwable', 'java.lang'], Error: ['Throwable', 'java.lang'],
    RuntimeException: ['Exception', 'java.lang'], ArithmeticException: ['RuntimeException', 'java.lang'],
    NullPointerException: ['RuntimeException', 'java.lang'], ClassCastException: ['RuntimeException', 'java.lang'],
    IllegalArgumentException: ['RuntimeException', 'java.lang'], NumberFormatException: ['IllegalArgumentException', 'java.lang'],
    IllegalStateException: ['RuntimeException', 'java.lang'], IndexOutOfBoundsException: ['RuntimeException', 'java.lang'],
    ArrayIndexOutOfBoundsException: ['IndexOutOfBoundsException', 'java.lang'], StringIndexOutOfBoundsException: ['IndexOutOfBoundsException', 'java.lang'],
    UnsupportedOperationException: ['RuntimeException', 'java.lang'], NegativeArraySizeException: ['RuntimeException', 'java.lang'],
    ArrayStoreException: ['RuntimeException', 'java.lang'], CloneNotSupportedException: ['Exception', 'java.lang'],
    InterruptedException: ['Exception', 'java.lang'], ReflectiveOperationException: ['Exception', 'java.lang'],
    ConcurrentModificationException: ['RuntimeException', 'java.util'], NoSuchElementException: ['RuntimeException', 'java.util'],
    InputMismatchException: ['NoSuchElementException', 'java.util'], EmptyStackException: ['RuntimeException', 'java.util'],
    IllegalFormatException: ['IllegalArgumentException', 'java.util'], IllegalFormatConversionException: ['IllegalFormatException', 'java.util'],
    MissingFormatArgumentException: ['IllegalFormatException', 'java.util'], UnknownFormatConversionException: ['IllegalFormatException', 'java.util'],
    DateTimeException: ['RuntimeException', 'java.time'],
    IOException: ['Exception', 'java.io'], FileNotFoundException: ['IOException', 'java.io'], UncheckedIOException: ['RuntimeException', 'java.io'],
    VirtualMachineError: ['Error', 'java.lang'], StackOverflowError: ['VirtualMachineError', 'java.lang'], OutOfMemoryError: ['VirtualMachineError', 'java.lang'],
    AssertionError: ['Error', 'java.lang'], ExceptionInInitializerError: ['Error', 'java.lang'],
  };
  // built-in interfaces user classes may implement: name -> [abstract method, arity]
  const IFACES = {
    Comparable: [['compareTo', 1]], Comparator: [['compare', 2]], Runnable: [['run', 0]], Cloneable: [], Serializable: [],
    Iterable: [['iterator', 0]], Iterator: [['hasNext', 0], ['next', 0]], AutoCloseable: [['close', 0]], Closeable: [['close', 0]],
    Function: [['apply', 1]], BiFunction: [['apply', 2]], Consumer: [['accept', 1]], BiConsumer: [['accept', 2]], Supplier: [['get', 0]],
    Predicate: [['test', 1]], BiPredicate: [['test', 2]], UnaryOperator: [['apply', 1]], BinaryOperator: [['apply', 2]], CharSequence: [],
    IntBinaryOperator: [['applyAsInt', 2]], IntUnaryOperator: [['applyAsInt', 1]], IntPredicate: [['test', 1]], ToIntFunction: [['applyAsInt', 1]],
    ToDoubleFunction: [['applyAsDouble', 1]], IntFunction: [['apply', 1]], Callable: [['call', 0]],
  };
  const IFACE_PKG = { Serializable: 'java.io', Closeable: 'java.io', Comparator: 'java.util', Iterator: 'java.util', Function: 'java.util.function',
    BiFunction: 'java.util.function', Consumer: 'java.util.function', BiConsumer: 'java.util.function', Supplier: 'java.util.function',
    Predicate: 'java.util.function', BiPredicate: 'java.util.function', UnaryOperator: 'java.util.function', BinaryOperator: 'java.util.function',
    IntBinaryOperator: 'java.util.function', IntUnaryOperator: 'java.util.function', IntPredicate: 'java.util.function', ToIntFunction: 'java.util.function',
    ToDoubleFunction: 'java.util.function', IntFunction: 'java.util.function', Callable: 'java.util.concurrent' };

  let CID = 0, RT_IDS = 0;
  class ClassInfo {
    constructor(name, kind) {
      this.id = ++CID; this.name = name; this.qname = name; this.kind = kind;
      this.decl = null; this.sup = null; this.ifaces = []; this.outer = null;
      this.fields = new Map(); this.methods = new Map(); this.ctors = [];
      this.staticInit = []; this.instInit = []; this.instFields = [];
      this.statics = Object.create(null);
      this.inited = false; this.isAbstract = false; this.builtin = false; this.nativeCtor = null;
      this.needsCap = false; this.isLocal = false; this.anon = false; this.capScope = null;
      this.typeParams = new Set(); this.mcache = new Map(); this.fcache = new Map();
      this.line = 0; this.enumConsts = null; this.pkg = null;
    }
  }
  const WIDEN = { byte: ['short', 'int', 'long', 'float', 'double'], short: ['int', 'long', 'float', 'double'], char: ['int', 'long', 'float', 'double'], int: ['long', 'float', 'double'], long: ['float', 'double'], float: ['double'] };
  const isPrimDesc = d => d === 'int' || d === 'long' || d === 'double' || d === 'float' || d === 'boolean' || d === 'char' || d === 'byte' || d === 'short';

  class Interp {
    constructor(opts) {
      opts = opts || {};
      this.input = opts.input || [];
      this.inPos = 0;
      this.interactive = !!opts.interactive;
      this.timeLimit = opts.timeLimit || 4000;
      this.outLimit = opts.outLimit || 400000;
      this.seed = opts.seed !== undefined ? opts.seed : 12345;
      this.startTime = opts.startTime || 1700000000000;
      this.out = []; this.outLen = 0;
      this.steps = 0; this.frames = []; this.peak = 0; this.jsStack = false; this.tokSeq = 0; this.lastTok = undefined;
      this.classes = new Map();
      this.hashState = 0x2a139a55 ^ (this.seed & 0xffff);
      this.randCount = 0;
      this.fileName = 'Main.java';
      this.rtId = ++RT_IDS;
      this.lib = JR.makeLib(this);
      this.initBuiltins();
    }
    // ------------------------------------------------------------ output / input
    emit(s, kind) {
      if (!s) return;
      this.outLen += s.length;
      if (this.outLen > this.outLimit) throw new Halt('limit', 'Output limit exceeded');
      const last = this.out[this.out.length - 1];
      if (last && last.k === kind) last.s += s; else this.out.push({ k: kind, s });
    }
    readLine() {
      if (this.inPos < this.input.length) { const l = this.input[this.inPos++]; this.emit(l + '\n', 'i'); return l; }
      if (this.interactive) throw new Halt('input');
      return null;
    }
    tick() { if (Date.now() > this.deadline) throw new Halt('timeout', 'Time limit exceeded'); }
    nextHash() {
      // deterministic pseudo-random identity hashes (look like Java's)
      let x = this.hashState;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      this.hashState = x | 0;
      return (x >>> 1) & 0x7fffffff || 0x1b6d3586;
    }
    idHash(o) { if (!o.hash) o.hash = this.nextHash(); return o.hash; }
    // ------------------------------------------------------------ errors
    err(msg, node) { const e = new CompileError(msg, node ? node.line : 0, node ? node.col : 1); e.runtime = true; return e; }
    makeEx(name, msg, cause) {
      const ci = this.classes.get(name);
      const o = new JObject(ci);
      o.f['Throwable.message'] = msg === undefined ? null : msg;
      o.f['Throwable.cause'] = cause || null;
      o.stack = this.snapStack();
      return o;
    }
    thr(name, msg) { return new JThrow(this.makeEx(name, msg)); }
    npe(msg) { return this.thr('NullPointerException', msg || null); }
    snapStack() {
      const r = [];
      for (let i = this.frames.length - 1; i >= 0; i--) { const f = this.frames[i]; r.push({ c: f.cls.qname, m: f.method, line: f.line }); }
      return r;
    }
    // ------------------------------------------------------------ builtin classes
    mkBuiltin(name, kind, sup) {
      const ci = new ClassInfo(name, kind);
      ci.builtin = true; ci.inited = true; ci.sup = sup || null;
      if (kind === 'interface') ci.isAbstract = true;
      this.classes.set(name, ci);
      return ci;
    }
    nat(ci, name, arity, fn, opts) {
      const m = { name, params: [], native: fn, static: !!(opts && opts.static), abstract: false, cls: ci, mods: new Set(['public']), varargs: false, line: 0, retD: null };
      for (let i = 0; i < arity; i++) m.params.push({ name: 'a' + i, d: (opts && opts.pd && opts.pd[i]) || 'ref', type: { name: (opts && opts.pt && opts.pt[i]) || 'Object', dims: 0 }, isTP: true });
      m.sig = name + '(' + m.params.map(p => p.type.name).join(',') + ')';
      if (!ci.methods.has(name)) ci.methods.set(name, []);
      ci.methods.get(name).push(m);
      return m;
    }
    initBuiltins() {
      const rt = this;
      const O = this.mkBuiltin('Object', 'class', null);
      O.pkg = 'java.lang'; O.qname = 'java.lang.Object';
      this.nat(O, 'toString', 0, (rt, self) => rt.className(self) + '@' + rt.idHash(self).toString(16));
      this.nat(O, 'equals', 1, (rt, self, a) => self === a[0]);
      this.nat(O, 'hashCode', 0, (rt, self) => rt.idHash(self));
      this.nat(O, 'getClass', 0, (rt, self) => new JClassRef(self.cls.name, self.cls));
      // Throwable family
      for (const name of Object.keys(EXC)) {
        const [supName, pkg] = EXC[name];
        const ci = this.mkBuiltin(name, 'class', supName ? this.classes.get(supName) : O);
        ci.pkg = pkg; ci.qname = pkg + '.' + name;
      }
      const T = this.classes.get('Throwable');
      T.instFields = [{ key: 'Throwable.message', d: 'String' }, { key: 'Throwable.cause', d: 'ref' }];
      const tctor = (rt, self, a) => {
        if (a.length >= 1) {
          if (a[0] instanceof JObject && rt.isSub(a[0].cls, T)) { self.f['Throwable.cause'] = a[0]; self.f['Throwable.message'] = rt.jstr(a[0]); }
          else self.f['Throwable.message'] = a[0] === null ? null : rt.jstr(a[0]);
        }
        if (a.length >= 2) self.f['Throwable.cause'] = a[1];
        self.stack = rt.snapStack();
      };
      for (const name of Object.keys(EXC)) this.classes.get(name).nativeCtor = tctor;
      this.nat(T, 'getMessage', 0, (rt, self) => self.f['Throwable.message']);
      this.nat(T, 'getLocalizedMessage', 0, (rt, self) => rt.callMethod(self, 'getMessage', [], null));
      this.nat(T, 'getCause', 0, (rt, self) => self.f['Throwable.cause']);
      this.nat(T, 'initCause', 1, (rt, self, a) => { self.f['Throwable.cause'] = a[0]; return self; });
      this.nat(T, 'toString', 0, (rt, self) => { const m = rt.callMethod(self, 'getLocalizedMessage', [], null); return self.cls.qname + (m !== null ? ': ' + rt.jstr(m) : ''); });
      this.nat(T, 'printStackTrace', 0, (rt, self) => { rt.emit(rt.stackTraceText(self), 'e'); });
      this.nat(T, 'getStackTrace', 0, (rt, self) => new JArray('StackTraceElement', 1, []));
      this.nat(T, 'addSuppressed', 1, () => undefined);
      // Enum base
      const E = this.mkBuiltin('Enum', 'class', O);
      E.isAbstract = true; E.pkg = 'java.lang';
      this.nat(E, 'name', 0, (rt, self) => self.enumName);
      this.nat(E, 'ordinal', 0, (rt, self) => self.ordinal);
      this.nat(E, 'toString', 0, (rt, self) => self.enumName);
      this.nat(E, 'compareTo', 1, (rt, self, a) => { if (a[0] === null) throw rt.npe(); return self.ordinal - a[0].ordinal; });
      this.nat(E, 'equals', 1, (rt, self, a) => self === a[0]);
      this.nat(E, 'hashCode', 0, (rt, self) => rt.idHash(self));
      this.nat(E, 'getDeclaringClass', 0, (rt, self) => new JClassRef(self.cls.enumBase.name, self.cls.enumBase));
      // Interfaces
      for (const name of Object.keys(IFACES)) {
        const ci = this.mkBuiltin(name, 'interface', null);
        ci.pkg = IFACE_PKG[name] || 'java.lang'; ci.qname = ci.pkg + '.' + name;
        for (const [m, n] of IFACES[name]) {
          const mi = this.nat(ci, m, n, null);
          mi.abstract = true; mi.native = null;
        }
      }
      this.classes.get('Iterator').methods.set('remove', []);
      this.nat(this.classes.get('Iterator'), 'remove', 0, (rt) => { throw rt.thr('UnsupportedOperationException', 'remove'); });
      this.classes.get('UnaryOperator').ifaces = [this.classes.get('Function')];
      this.classes.get('BinaryOperator').ifaces = [this.classes.get('BiFunction')];
      this.classes.get('Closeable').ifaces = [this.classes.get('AutoCloseable')];
      this.objectClass = O;
    }
    className(o) {
      if (o instanceof JObject) return o.cls.qname;
      return 'Object';
    }
    stackTraceText(ex) {
      let s = this.jstr(ex) + '\n';
      for (const f of (ex.stack || [])) s += `\tat ${f.c}.${f.m}(${this.fileName}${f.line ? ':' + f.line : ''})\n`;
      const cause = ex.f['Throwable.cause'];
      if (cause && cause !== ex) s += 'Caused by: ' + this.stackTraceText(cause).replace(/\n$/, '') + '\n';
      return s;
    }
    // ------------------------------------------------------------ loading
    load(unit) {
      this.unit = unit;
      this.staticImports = unit.imports.filter(im => im.isStatic).map(im => { const p = im.name.split('.'); return im.star ? { cls: p[p.length - 1], member: '*' } : { cls: p[p.length - 2], member: p[p.length - 1] }; });
      const all = [];
      const reg = (decl, outer) => {
        const ci = new ClassInfo(decl.name, decl.kind);
        ci.decl = decl; ci.outer = outer; ci.line = decl.line;
        ci.qname = outer ? outer.qname + '$' + decl.name : decl.name;
        decl.ci = ci;
        if (this.classes.has(decl.name) && this.classes.get(decl.name).builtin) {
          // user class shadows a builtin (e.g. their own Node / Pair / Exception subclass named like a builtin)
        }
        this.classes.set(decl.name, ci);
        if (outer) this.classes.set(outer.name + '.' + decl.name, ci);
        all.push(ci);
        for (const inner of decl.inner) reg(inner, ci);
      };
      for (const t of unit.types) reg(t, null);
      for (const ci of all) this.linkClass(ci);
      for (const ci of all) this.buildMembers(ci);
      this.userClasses = all;
    }
    resolveClass(name) {
      if (!name) return null;
      let ci = this.classes.get(name);
      if (ci) return ci;
      const i = name.lastIndexOf('.');
      if (i >= 0) {
        ci = this.classes.get(name.slice(i + 1));
        if (ci) return ci;
      }
      return null;
    }
    linkClass(ci) {
      const d = ci.decl;
      ci.isAbstract = d.kind === 'interface' || d.mods.has('abstract');
      ci.isStaticNested = !ci.outer || d.mods.has('static') || d.kind !== 'class' || (ci.outer && ci.outer.kind === 'interface');
      if (ci.outer && !ci.isStaticNested) ci.needsCap = true;
      for (const tp of d.typeParams) ci.typeParams.add(tp);
      if (d.kind === 'enum') ci.sup = this.classes.get('Enum');
      else if (d.ext) {
        const s = this.resolveClass(d.ext.name);
        if (!s) throw new CompileError(`cannot find symbol\n  symbol: class ${d.ext.name}`, d.ext.line || d.line, d.ext.col);
        ci.sup = s;
      } else if (d.kind !== 'interface') ci.sup = this.objectClass;
      for (const it of d.impls) {
        const s = this.resolveClass(it.name);
        if (s) ci.ifaces.push(s);
        else if (!JR.isLibType(it.name)) throw new CompileError(`cannot find symbol\n  symbol: class ${it.name}`, it.line || d.line, it.col);
      }
    }
    isTypeParam(ci, name, mtps) {
      if (mtps && mtps.includes(name)) return true;
      for (let c = ci; c; c = c.outer) if (c.typeParams.has(name)) return true;
      return false;
    }
    mkParam(ci, p, mtps) {
      const isTP = this.isTypeParam(ci, p.type.name, mtps);
      return { name: p.name, type: p.type, d: isTP ? 'ref' : tdesc(p.type), varargs: p.varargs, final: p.final, isTP };
    }
    buildMembers(ci) {
      const d = ci.decl;
      const isIface = d.kind === 'interface';
      if (d.kind === 'enum') {
        ci.enumConsts = [];
        ci.enumBase = ci;
        for (const ec of d.enumConsts) {
          const fi = { name: ec.name, key: ec.name, static: true, final: true, d: 'ref', type: { name: ci.name, dims: 0 }, cls: ci, init: null, line: ec.line, mods: new Set(['public', 'static', 'final']), enumConst: ec };
          ci.fields.set(ec.name, fi);
          ci.enumConsts.push(ec);
        }
      }
      for (const fd of d.fields) {
        const isStatic = isIface || fd.mods.has('static');
        for (const dc of fd.decls) {
          const isTP = this.isTypeParam(ci, dc.type.name);
          const fi = { name: dc.name, key: isStatic ? dc.name : ci.name + '.' + dc.name, static: isStatic, final: isIface || fd.mods.has('final'), d: isTP ? 'ref' : tdesc(dc.type), type: dc.type, cls: ci, init: dc.init, line: dc.line, mods: fd.mods };
          ci.fields.set(dc.name, fi);
          if (isStatic) ci.staticInit.push({ f: fi });
          else { ci.instInit.push({ f: fi }); ci.instFields.push(fi); }
        }
      }
      for (const it of d.inits) {
        if (it.static) ci.staticInit.push({ block: it.body });
        else ci.instInit.push({ block: it.body });
      }
      // keep declaration order between fields and init blocks
      const order = x => x.f ? x.f.line : x.block.line;
      ci.staticInit.sort((a, b) => order(a) - order(b));
      ci.instInit.sort((a, b) => order(a) - order(b));
      for (const md of d.methods) {
        const mtps = md.typeParams;
        const isStatic = md.mods.has('static');
        const abs = md.mods.has('abstract') || (isIface && !md.body && !isStatic);
        const retIsTP = this.isTypeParam(ci, md.ret.name, mtps);
        const m = {
          name: md.name, params: md.params.map(p => this.mkParam(ci, p, mtps)), ret: md.ret, retD: md.ret.name === 'void' ? null : (retIsTP ? 'ref' : tdesc(md.ret)),
          static: isStatic, abstract: abs, body: md.body, cls: ci, mods: md.mods, varargs: md.params.length > 0 && md.params[md.params.length - 1].varargs,
          line: md.line, decl: md,
        };
        if (isIface && !md.mods.has('private')) m.mods = new Set([...md.mods, 'public']);
        m.sig = md.name + '(' + m.params.map(p => p.isTP ? 'Object' : p.type.name + '[]'.repeat(p.type.dims)).join(',') + ')';
        if (!ci.methods.has(md.name)) ci.methods.set(md.name, []);
        ci.methods.get(md.name).push(m);
      }
      for (const cd of d.ctors) {
        const m = { name: '<init>', params: cd.params.map(p => this.mkParam(ci, p, null)), body: cd.body, cls: ci, mods: cd.mods, varargs: cd.params.length > 0 && cd.params[cd.params.length - 1].varargs, line: cd.line, decl: cd, static: false, abstract: false };
        ci.ctors.push(m);
      }
    }
    // build a class at runtime (anonymous / local)
    buildDynamicClass(decl, supType, sc, isAnon) {
      if (decl.ci && decl.ci.rtId === this.rtId) return decl.ci;
      const frameCls = sc.frame.cls;
      const ci = new ClassInfo(decl.name || '', 'class');
      ci.rtId = this.rtId;
      if (isAnon) {
        frameCls.anonCount = (frameCls.anonCount || 0) + 1;
        const top = this.topOf(frameCls);
        top.anonSeq = (top.anonSeq || 0) + 1;
        ci.name = top.qname + '$' + top.anonSeq;
        ci.qname = ci.name;
        ci.anon = true;
      } else {
        const top = this.topOf(frameCls);
        top.localSeq = (top.localSeq || 0) + 1;
        ci.qname = top.qname + '$' + top.localSeq + decl.name;
        ci.isLocal = true;
        this.classes.set(decl.name, ci);
      }
      ci.decl = decl; ci.outer = frameCls; ci.line = decl.line; ci.needsCap = true;
      decl.ci = ci;
      if (isAnon) {
        const s = this.resolveClass(supType.name);
        if (s) {
          if (s.kind === 'interface') { ci.sup = this.objectClass; ci.ifaces = [s]; }
          else ci.sup = s;
        } else {
          ci.sup = this.objectClass;
          ci.libIface = supType.name;
        }
        ci.isAbstract = false;
        decl.kind = 'class';
        for (const inner of decl.inner) { const ic = this.buildDynamicClass(inner, null, sc, false); ic.outer = ci; }
        this.buildMembers(ci);
      } else {
        this.linkClass(ci);
        ci.needsCap = true;
        this.buildMembers(ci);
      }
      ci.capScope = sc;
      return ci;
    }
    topOf(ci) { while (ci.outer) ci = ci.outer; return ci; }
    isSub(a, b) {
      if (a === b) return true;
      if (!a) return false;
      if (b === this.objectClass) return true;
      if (a.sup && this.isSub(a.sup, b)) return true;
      for (const i of a.ifaces) if (this.isSub(i, b)) return true;
      return false;
    }
    // ------------------------------------------------------------ class init
    ensureInit(ci) {
      if (ci.inited) return;
      ci.inited = true;
      if (ci.sup) this.ensureInit(ci.sup);
      for (const [n, f] of ci.fields) if (f.static) ci.statics[f.key] = this.defVal(f.d);
      const fr = { cls: ci, thisObj: null, method: '<clinit>', line: ci.line };
      this.frames.push(fr);
      try {
        const sc = new Scope(ci.capScope || null, fr);
        if (ci.enumConsts) {
          const vals = [];
          for (const ec of ci.enumConsts) {
            fr.line = ec.line;
            let cls = ci;
            if (ec.body) {
              cls = new ClassInfo(ci.name, 'class');
              cls.qname = ci.qname + '$' + (vals.length + 1);
              cls.decl = ec.body; cls.sup = ci; cls.outer = ci; cls.enumBase = ci; cls.line = ec.line; cls.inited = true; cls.anon = true;
              ec.body.ci = cls;
              this.buildMembers(cls);
            }
            const o = new JObject(cls);
            o.enumName = ec.name; o.ordinal = vals.length;
            this.initFieldDefaults(o, cls);
            const args = this.evArgs(ec.args, sc);
            this.construct(cls, o, args, ec);
            ci.statics[ec.name] = o;
            vals.push(o);
          }
          ci.enumValues = vals;
        }
        for (const it of ci.staticInit) {
          if (it.f) {
            fr.line = it.f.line;
            if (it.f.init) {
              ci.statics[it.f.key] = it.f.init.k === 'ArrayInit' ? this.arrayInit(it.f.init, it.f.type, sc) : this.coerce(this.tagFunc(this.ev(it.f.init, sc), it.f.type), it.f.d, it.f.init);
              if (typeof ci.statics[it.f.key] === 'string') (ci.stok || (ci.stok = Object.create(null)))[it.f.key] = this.lastTok;
            }
          } else this.execBlock(it.block.stmts, new Scope(sc, fr));
        }
      } finally { this.frames.pop(); }
    }
    defVal(d) {
      switch (d) {
        case 'int': case 'short': case 'byte': return 0;
        case 'double': return D0; case 'float': return F0; case 'long': return L0; case 'char': return C0; case 'boolean': return false;
        default: return null;
      }
    }
    initFieldDefaults(o, ci) {
      for (let c = ci; c; c = c.sup) for (const f of c.instFields) o.f[f.key] = this.defVal(f.d);
    }
    instantiate(ci, args, node, sc) {
      if (ci.isAbstract) throw this.err(`${ci.name} is abstract; cannot be instantiated`, node);
      this.ensureInit(ci);
      const o = new JObject(ci);
      this.initFieldDefaults(o, ci);
      for (let c = ci; c; c = c.sup) {
        if (c.needsCap) { if (!o.caps) o.caps = Object.create(null); o.caps[c.id] = (c.isLocal || c.anon) ? (c.capScope || sc) : sc; }
      }
      if (ci.anon) o.caps[ci.id] = sc;
      this.construct(ci, o, args, node);
      return o;
    }
    construct(ci, o, args, node) {
      if (ci.builtin) { if (ci.nativeCtor) ci.nativeCtor(this, o, args, node); return; }
      let ctor = null;
      if (ci.ctors.length) {
        ctor = this.select(ci.ctors, args, node && node.args ? node : null);
        if (!ctor) throw this.err(`constructor ${ci.name} in class ${ci.name} cannot be applied to given types;\n  found: ${this.argTypesStr(args)}`, node);
      } else if (args.length && !ci.anon) {
        throw this.err(`constructor ${ci.name} in class ${ci.name} cannot be applied to given types;\n  required: no arguments\n  found:    ${this.argTypesStr(args)}`, node);
      }
      const fr = { cls: ci, thisObj: o, method: '<init>', line: ctor ? ctor.line : ci.line };
      if (this.frames.length > MAX_DEPTH) throw this.thr('StackOverflowError');
      this.frames.push(fr);
      try {
        const cap = o.caps ? (o.caps[ci.id] || null) : null;
        if (!ctor) {
          if (ci.sup) this.construct(ci.sup, o, ci.anon ? args : [], node);
          this.runInstInit(ci, o, cap, fr);
          return;
        }
        const sc = new Scope(cap, fr);
        this.bindParams(ctor, args, sc);
        const stmts = ctor.body.stmts;
        let start = 0;
        const first = stmts[0];
        if (first && first.k === 'ExprStmt' && first.e.k === 'CtorCall') {
          start = 1;
          fr.line = first.line;
          const a = this.evArgs(first.e.args, sc);
          if (first.e.kind === 'this') this.construct(ci, o, a, first.e);
          else { if (ci.sup) this.construct(ci.sup, o, a, first.e); this.runInstInit(ci, o, cap, fr); }
        } else {
          if (ci.sup) this.construct(ci.sup, o, [], node);
          this.runInstInit(ci, o, cap, fr);
        }
        for (let i = start; i < stmts.length; i++) {
          const r = this.exec(stmts[i], sc);
          if (r) break;
        }
      } finally { this.frames.pop(); }
    }
    runInstInit(ci, o, cap, fr) {
      if (!ci.instInit.length) return;
      const sc = new Scope(cap, fr);
      for (const it of ci.instInit) {
        if (it.f) {
          if (it.f.init) {
            fr.line = it.f.line;
            o.f[it.f.key] = it.f.init.k === 'ArrayInit' ? this.arrayInit(it.f.init, it.f.type, sc) : this.coerce(this.tagFunc(this.ev(it.f.init, sc), it.f.type), it.f.d, it.f.init);
            if (typeof o.f[it.f.key] === 'string') (o.ft || (o.ft = Object.create(null)))[it.f.key] = this.lastTok;
          }
        } else this.execBlock(it.block.stmts, new Scope(sc, fr));
      }
    }
    // ------------------------------------------------------------ methods
    methodsNamed(ci, name) {
      let r = ci.mcache.get(name);
      if (r) return r;
      r = [];
      const seen = new Set();
      const visit = c => {
        const ms = c.methods.get(name);
        if (ms) for (const m of ms) { if (!seen.has(m.sig)) { seen.add(m.sig); r.push(m); } }
        if (c.sup) visit(c.sup);
        for (const i of c.ifaces) visit(i);
      };
      visit(ci);
      if (ci.kind === 'interface') { const ms = this.objectClass.methods.get(name); if (ms) for (const m of ms) if (!seen.has(m.sig)) r.push(m); }
      ci.mcache.set(name, r);
      return r;
    }
    select(cands, args, node) {
      let best = null, bs = Infinity;
      const sts = node && node.args && node.args.length === args.length && node.args.every(a => a._t) ? node.args.map(a => a._t) : null;
      for (const m of cands) {
        let s = sts && !m.varargs ? this.staticMatch(m, sts, args) : this.matchScore(m, args);
        if (s < 0) continue;
        if (m.abstract) s += 1000;
        if (s < bs) { bs = s; best = m; }
      }
      return best;
    }
    matchScore(m, args) {
      const ps = m.params, n = ps.length;
      let s = 0;
      if (m.varargs) {
        if (args.length === n && (args[n - 1] instanceof JArray || args[n - 1] === null)) {
          for (let i = 0; i < n - 1; i++) { const c = this.argScore(args[i], ps[i]); if (c < 0) return -1; s += c; }
          return s;
        }
        if (args.length < n - 1) return -1;
        for (let i = 0; i < n - 1; i++) { const c = this.argScore(args[i], ps[i]); if (c < 0) return -1; s += c; }
        const vp = ps[n - 1];
        const et = { name: vp.type.name, dims: vp.type.dims - 1 };
        const ep = { type: et, d: vp.isTP ? 'ref' : tdesc(et), isTP: vp.isTP };
        for (let i = n - 1; i < args.length; i++) { const c = this.argScore(args[i], ep); if (c < 0) return -1; s += c; }
        return s + 20;
      }
      if (args.length !== n) return -1;
      for (let i = 0; i < n; i++) { const c = this.argScore(args[i], ps[i]); if (c < 0) return -1; s += c; }
      return s;
    }
    // overload resolution with the static argument types recorded by the checker
    staticMatch(m, sts, args) {
      const ps = m.params;
      if (ps.length !== sts.length) return -1;
      let s = 0;
      for (let i = 0; i < ps.length; i++) {
        let c = this.staticScore(sts[i], ps[i]);
        if (c === null) c = this.argScore(args[i], ps[i]);
        if (c < 0) return -1;
        s += c;
      }
      return s;
    }
    staticScore(t, p) {
      const pd = p.d;
      if (p.isTP) return 4;
      if (!t || t.n === '$lambda' || t.n === '?') return null;
      if (t.n === 'null') return isPrimDesc(pd) ? -1 : 1;
      const tPrim = t.d === 0 && JR.PRIM_DESC.has(t.n);
      if (isPrimDesc(pd)) {
        const src = tPrim ? t.n : (t.d === 0 ? JR.BOX[t.n] : null);
        if (!src) return t.n === 'Object' || t.d ? -1 : null;
        const extra = tPrim ? 0 : 3;
        if (src === pd) return extra;
        const R = WIDEN[src];
        if (R && R.includes(pd)) return 1 + R.indexOf(pd) / 10 + extra;
        return -1;
      }
      if (JR.BOX[pd]) {
        if (t.d === 0 && t.n === pd) return 0;
        if (tPrim && JR.BOX[pd] === t.n) return 3;
        return t.n === 'Object' ? -1 : null;
      }
      if (pd === 'String') return t.d === 0 && t.n === 'String' ? 0 : (t.n === 'Object' || tPrim || t.d ? -1 : null);
      const pt = p.type;
      if (pt.dims > 0) return t.d === pt.dims ? (t.n === pt.name ? 0 : 2) : (pt.name === 'Object' && t.d > pt.dims ? 3 : -1);
      if (pt.name === 'Object') return tPrim ? 5 : 4;
      if (tPrim) return ['Number', 'Comparable', 'Serializable'].includes(pt.name) ? 5 : -1;
      if (t.n === 'Object' && t.d === 0) return -1;
      return null;
    }
    argScore(v, p) {
      const d = p.d;
      if (d === 'ref' || d === null) {
        if (v === null) return 1;
        if (p.isTP) return 4;
        const t = p.type;
        if (t.dims > 0) return v instanceof JArray ? 1 : -1;
        if (t.name === 'Object') return 4;
        return this.isInstanceName(v, t.name) ? 2 : -1;
      }
      if (d === 'String') return typeof v === 'string' ? 0 : v === null ? 1 : -1;
      const tv = typeof v;
      switch (d) {
        case 'int': return tv === 'number' ? 0 : v instanceof JC ? 1 : -1;
        case 'short': case 'byte': return tv === 'number' ? 1 : -1;
        case 'long': return tv === 'number' ? 1 : v instanceof JL ? 0 : v instanceof JC ? 2 : -1;
        case 'float': return v instanceof JD ? (v.f ? 0 : -1) : (tv === 'number' || v instanceof JL || v instanceof JC) ? 2 : -1;
        case 'double': return v instanceof JD ? (v.f ? 1 : 0) : (tv === 'number' || v instanceof JL || v instanceof JC) ? 2 : -1;
        case 'char': return v instanceof JC ? 0 : -1;
        case 'boolean': return tv === 'boolean' ? 0 : -1;
        case 'Integer': return tv === 'number' ? 3 : v === null ? 1 : -1;
        case 'Long': return v instanceof JL ? 3 : v === null ? 1 : -1;
        case 'Double': return (v instanceof JD && !v.f) ? 3 : v === null ? 1 : -1;
        case 'Float': return (v instanceof JD && v.f) ? 3 : v === null ? 1 : -1;
        case 'Character': return v instanceof JC ? 3 : v === null ? 1 : -1;
        case 'Boolean': return tv === 'boolean' ? 3 : v === null ? 1 : -1;
        case 'Short': case 'Byte': return tv === 'number' ? 3 : v === null ? 1 : -1;
      }
      return 4;
    }
    argTypesStr(args) { return args.length ? args.map(a => this.typeNameOf(a)).join(',') : 'no arguments'; }
    typeNameOf(v) {
      if (v === null) return '<null>';
      switch (typeof v) { case 'number': return 'int'; case 'string': return 'String'; case 'boolean': return 'boolean'; }
      if (v instanceof JD) return v.f ? 'float' : 'double';
      if (v instanceof JC) return 'char';
      if (v instanceof JL) return 'long';
      if (v instanceof JObject) return v.cls.name;
      if (v instanceof JArray) return v.et + '[]'.repeat(v.dims);
      if (v.jtype) return v.jtype;
      return 'Object';
    }
    bindParams(m, args, sc) {
      const ps = m.params, n = ps.length;
      if (m.varargs && !(args.length === n && (args[n - 1] instanceof JArray || args[n - 1] === null))) {
        for (let i = 0; i < n - 1; i++) sc.vars.set(ps[i].name, { v: this.coerce(args[i], ps[i].d), d: ps[i].d, fin: ps[i].final });
        const vp = ps[n - 1];
        const et = { name: vp.type.name, dims: vp.type.dims - 1 };
        const ed = vp.isTP ? 'ref' : tdesc(et);
        const arr = [];
        for (let i = n - 1; i < args.length; i++) arr.push(this.coerce(args[i], ed));
        sc.vars.set(vp.name, { v: new JArray(vp.type.name, vp.type.dims, arr), d: 'ref', fin: vp.final });
        return;
      }
      const toks = args.toks;
      for (let i = 0; i < n; i++) {
        const a = args[i];
        if (a instanceof JFunc) this.tagFunc(a, ps[i].type);
        sc.vars.set(ps[i].name, { v: this.coerce(a, ps[i].d), d: ps[i].d, fin: ps[i].final, tok: toks ? toks[i] : undefined });
      }
    }
    invoke(m, self, args, node) {
      if (m.native) return m.native(this, self, args, node);
      if (!m.body) {
        if (self instanceof JObject) {
          const c = this.select(this.methodsNamed(self.cls, m.name).filter(x => !x.abstract && x !== m), args);
          if (c) return this.invoke(c, self, args, node);
        }
        throw this.thr('AbstractMethodError', m.name);
      }
      if (this.frames.length > MAX_DEPTH) throw this.thr('StackOverflowError');
      const fr = { cls: m.cls, thisObj: m.static ? null : self, method: m.name, line: m.line };
      if (this.frames.push(fr) > this.peak) this.peak = this.frames.length;
      try {
        const cap = (!m.static && self && self.caps) ? (self.caps[m.cls.id] || null) : (m.cls.capScope || null);
        const sc = new Scope(cap, fr);
        this.bindParams(m, args, sc);
        const stmts = m.body.stmts;
        for (let i = 0; i < stmts.length; i++) {
          const r = this.exec(stmts[i], sc);
          if (r !== undefined) {
            if (r.k === 'r') { this.lastTok = r.tok; this.userRet = true; return m.retD ? this.coerce(r.v, m.retD) : r.v; }
            break;
          }
        }
        return undefined;
      } finally { this.frames.pop(); }
    }
    callMethod(recv, name, args, node) {
      if (recv instanceof JObject) {
        const ms = this.methodsNamed(recv.cls, name);
        const m = this.select(ms, args, node);
        if (!m) {
          if (ms.length) throw this.err(`method ${name} in class ${recv.cls.name} cannot be applied to given types;\n  found: ${this.argTypesStr(args)}`, node);
          if (recv.cls.libIface || this.libFallback(recv, name)) return JR.objLibCall(this, recv, name, args, node);
          throw this.err(`cannot find symbol\n  symbol:   method ${name}(${this.argTypesStr(args).replace('no arguments', '')})\n  location: class ${recv.cls.name}`, node);
        }
        return this.invoke(m, recv, args, node);
      }
      if (recv === null || recv === undefined) {
        const t = node && node.obj && node.obj._t;
        const tn = t && t.n && !t.d && /^[A-Z]/.test(t.n) ? (this.resolveClass(t.n) && !this.resolveClass(t.n).builtin ? t.n : (t.n === 'String' ? 'String' : JR.libQName(t.n))) + '.' : '';
        const what = node && node.obj ? (node.obj.k === 'Call' ? `the return value of "${tn ? '' : ''}${this.exprText(node.obj).replace(/^the return value of "|"$/g, '')}"` : '"' + this.exprText(node.obj) + '"') : 'value';
        throw this.npe(`Cannot invoke "${tn}${name}()" because ${what} is null`);
      }
      return this.lib.call(recv, name, args, node);
    }
    libFallback(recv, name) {
      // default methods of library functional interfaces implemented by user classes (e.g. Comparator.reversed())
      return ['reversed', 'thenComparing', 'andThen', 'compose', 'negate', 'and', 'or', 'forEachRemaining'].includes(name);
    }
    exprText(e) {
      switch (e.k) {
        case 'Name': return e.name;
        case 'Field': return (e.obj.k === 'This' ? 'this' : this.exprText(e.obj)) + '.' + e.name;
        case 'This': return 'this';
        case 'Call': return 'the return value of "' + e.name + '()"';
        case 'Index': return this.exprText(e.arr) + '[...]';
        default: return '...';
      }
    }
    callStatic(ref, name, args, node) {
      const ci = ref.ci;
      if (ci && !(ci.builtin && this.lib.hasStatic(ref.name, name))) {
        this.ensureInit(ci);
        if (ci.enumValues || ci.kind === 'enum') {
          if (name === 'values' && !args.length) return new JArray(ci.name, 1, ci.enumValues.slice());
          if (name === 'valueOf' && args.length === 1) {
            const v = ci.enumValues.find(o => o.enumName === args[0]);
            if (!v) throw this.thr('IllegalArgumentException', `No enum constant ${ci.qname.replace(/\$/g, '.')}.${args[0]}`);
            return v;
          }
        }
        const ms = this.methodsNamed(ci, name);
        const m = this.select(ms, args, node);
        if (!m) {
          if (!ms.length) throw this.err(`cannot find symbol\n  symbol:   method ${name}\n  location: class ${ci.name}`, node);
          throw this.err(`method ${name} in class ${ci.name} cannot be applied to given types;\n  found: ${this.argTypesStr(args)}`, node);
        }
        if (!m.static) throw this.err(`non-static method ${name}(${m.params.map(p => p.type.name).join(',')}) cannot be referenced from a static context`, node);
        return this.invoke(m, null, args, node);
      }
      return this.lib.callStatic(ref.name, name, args, node);
    }
    // ------------------------------------------------------------ values
    coerce(v, d, node) {
      if (d === 'int' && typeof v === 'number') return v;
      if (d === null || d === 'ref' || d === 'String' || d === undefined) return v;
      switch (d) {
        case 'int':
          if (typeof v === 'number') return v;
          if (v instanceof JC) return v.v;
          if (v instanceof JD) return d2i(v.v);
          if (v instanceof JL) return Number(BigInt.asIntN(32, v.v));
          break;
        case 'double':
          if (v instanceof JD) return v.f ? new JD(v.v) : v;
          if (typeof v === 'number') return new JD(v);
          if (v instanceof JC) return new JD(v.v);
          if (v instanceof JL) return new JD(Number(v.v));
          break;
        case 'boolean': if (typeof v === 'boolean') return v; break;
        case 'char':
          if (v instanceof JC) return v;
          if (typeof v === 'number') return new JC(v & 0xffff);
          if (v instanceof JD) return new JC(d2i(v.v) & 0xffff);
          if (v instanceof JL) return new JC(Number(BigInt.asUintN(16, v.v)));
          break;
        case 'long':
          if (v instanceof JL) return v;
          if (typeof v === 'number') return new JL(BigInt(v));
          if (v instanceof JC) return new JL(BigInt(v.v));
          if (v instanceof JD) return new JL(d2l(v.v));
          break;
        case 'float':
          if (v instanceof JD) return v.f ? v : new JD(Math.fround(v.v), true);
          if (typeof v === 'number') return new JD(Math.fround(v), true);
          if (v instanceof JC) return new JD(v.v, true);
          if (v instanceof JL) return new JD(Math.fround(Number(v.v)), true);
          break;
        case 'short': { const x = this.coerce(v, 'int'); return typeof x === 'number' ? (x << 16) >> 16 : x; }
        case 'byte': { const x = this.coerce(v, 'int'); return typeof x === 'number' ? (x << 24) >> 24 : x; }
        default:
          // wrapper types
          if (v === null) return null;
          return this.coerce(v, JR.BOX[d]);
      }
      if (v === null || v === undefined) {
        if (v === undefined) throw this.err('variable might not have been initialized', node);
        throw this.npe('Cannot unbox null value');
      }
      return v;
    }
    castTo(v, t, node) {
      const d = tdesc(t);
      if (isPrimDesc(d)) {
        if (v === null) throw this.npe('Cannot unbox null value');
        if (typeof v === 'boolean' && d !== 'boolean') throw this.err(`incompatible types: boolean cannot be converted to ${d}`, node);
        if (typeof v === 'string') throw this.err(`incompatible types: String cannot be converted to ${d}`, node);
        return this.coerce(v, d, node);
      }
      if (v === null) return null;
      if (t.dims === 0 && JR.BOX[t.name]) {
        const want = JR.BOX[t.name];
        const have = typeof v === 'number' ? 'int' : v instanceof JD ? (v.f ? 'float' : 'double') : v instanceof JC ? 'char' : v instanceof JL ? 'long' : typeof v === 'boolean' ? 'boolean' : null;
        if (have === null || (have !== want && !((want === 'short' || want === 'byte') && have === 'int'))) {
          if (have !== null && JR.PRIM_DESC.has(have) && node && node.e && node.e.k !== 'Name' && node.e.k !== 'Call' && node.e.k !== 'Index' && node.e.k !== 'Field') return this.coerce(v, want);
          throw this.thr('ClassCastException', `class ${this.qTypeName(v)} cannot be cast to class java.lang.${t.name}`);
        }
        return v;
      }
      if (t.dims === 0 && !this.isInstanceName(v, t.name)) {
        if (this.resolveClass(t.name) || t.name === 'String' || JR.isLibType(t.name))
          throw this.thr('ClassCastException', `class ${this.qTypeName(v)} cannot be cast to class ${this.qName(t.name)}`);
      }
      return v;
    }
    qName(n) {
      const ci = this.resolveClass(n);
      if (ci) return ci.qname;
      return JR.libQName(n);
    }
    qTypeName(v) {
      if (typeof v === 'string') return 'java.lang.String';
      if (typeof v === 'number') return 'java.lang.Integer';
      if (typeof v === 'boolean') return 'java.lang.Boolean';
      if (v instanceof JD) return v.f ? 'java.lang.Float' : 'java.lang.Double';
      if (v instanceof JC) return 'java.lang.Character';
      if (v instanceof JL) return 'java.lang.Long';
      if (v instanceof JObject) return v.cls.qname;
      if (v && v.jtype) return JR.libQName(v.jtype);
      return 'java.lang.Object';
    }
    isInstanceName(v, name) {
      if (v === null || v === undefined) return false;
      if (name === 'Object') return true;
      if (v instanceof JObject) {
        const ci = this.resolveClass(name);
        if (ci) return this.isSub(v.cls, ci);
        if (v.cls.libIface === name) return true;
        return false;
      }
      return JR.libInstanceOf(this, v, name);
    }
    isInstance(v, t) {
      if (v === null) return false;
      if (t.dims > 0) return v instanceof JArray && (v.dims === t.dims && (v.et === t.name || t.name === 'Object') || (t.name === 'Object' && v.dims > t.dims));
      return this.isInstanceName(v, t.name);
    }
    // Java String.valueOf semantics
    jstr(v) {
      if (v === null || v === undefined) return 'null';
      switch (typeof v) {
        case 'string': return v;
        case 'number': return String(v);
        case 'boolean': return v ? 'true' : 'false';
      }
      if (v instanceof JD) return v.f ? fmtFloat(v.v) : fmtDouble(v.v);
      if (v instanceof JC) return String.fromCharCode(v.v);
      if (v instanceof JL) return v.v.toString();
      if (v instanceof JObject) { const s = this.callMethod(v, 'toString', [], null); return s === null ? 'null' : this.jstr(s); }
      if (v instanceof JArray) return '[' + JR.arrCode(v) + '@' + this.idHash(v).toString(16);
      if (v instanceof JClassRef) return (v.ci && v.ci.kind === 'interface' ? 'interface ' : 'class ') + (v.ci ? v.ci.qname : JR.libQName(v.name));
      if (v instanceof JFunc) return this.topOf(this.userClasses[0] || this.objectClass).qname + '$$Lambda@' + this.idHash(v).toString(16);
      if (v.toJ) return v.toJ(this);
      return String(v);
    }
    jequals(a, b) {
      if (a === b) return true;
      if (a === null || b === null || a === undefined || b === undefined) return false;
      if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return false;
      if (a instanceof JD) return b instanceof JD && b.f === a.f && (a.v === b.v ? (a.v !== 0 || 1 / a.v === 1 / b.v) : (Number.isNaN(a.v) && Number.isNaN(b.v)));
      if (a instanceof JC) return b instanceof JC && a.v === b.v;
      if (a instanceof JL) return b instanceof JL && a.v === b.v;
      if (a instanceof JObject) return !!this.callMethod(a, 'equals', [b], null);
      if (a.jequals) return a.jequals(this, b);
      return false;
    }
    jhash(v) {
      if (v === null || v === undefined) return 0;
      switch (typeof v) {
        case 'string': return JR.javaStringHash(v);
        case 'number': return v;
        case 'boolean': return v ? 1231 : 1237;
      }
      if (v instanceof JC) return v.v;
      if (v instanceof JL) return Number(BigInt.asIntN(32, v.v ^ (BigInt.asUintN(64, v.v) >> 32n)));
      if (v instanceof JD) {
        if (v.f) { const b = new Float32Array([v.v]); return new Int32Array(b.buffer)[0]; }
        const buf = new Float64Array([Number.isNaN(v.v) ? NaN : v.v]); const ia = new Int32Array(buf.buffer);
        return (ia[0] ^ ia[1]) | 0;
      }
      if (v instanceof JObject) return this.coerce(this.callMethod(v, 'hashCode', [], null), 'int');
      if (v.jhash) return v.jhash(this);
      return this.idHash(v);
    }
    // natural ordering (Comparable)
    jcompare(a, b) {
      if (a === null || b === null) throw this.npe();
      if (typeof a === 'string' && typeof b === 'string') return JR.strCompare(a, b);
      if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
      if (JR.isNum(a) && JR.isNum(b)) {
        if (a instanceof JL && b instanceof JL) return a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
        const x = JR.numVal(a), y = JR.numVal(b); return x < y ? -1 : x > y ? 1 : 0;
      }
      if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
      if (a instanceof JObject) {
        const ms = this.methodsNamed(a.cls, 'compareTo');
        if (!ms.some(m => !m.abstract)) throw this.thr('ClassCastException', `class ${a.cls.qname} cannot be cast to class java.lang.Comparable`);
        return this.coerce(this.callMethod(a, 'compareTo', [b], null), 'int');
      }
      throw this.thr('ClassCastException', `class ${this.qTypeName(a)} cannot be cast to class java.lang.Comparable`);
    }
    // call a functional value (lambda / method ref / object implementing the interface)
    callFn(f, args, mname) {
      if (f instanceof JFunc) return f.fn(args);
      if (f instanceof JObject) {
        if (mname) {
          const ms = this.methodsNamed(f.cls, mname).filter(m => !m.abstract);
          if (ms.length) return this.callMethod(f, mname, args, null);
        }
        // single abstract method
        for (let c = f.cls; c; c = c.sup) {
          for (const [n, ms] of c.methods) for (const m of ms) if (!m.static && !m.abstract && m.params.length === args.length && !['toString', 'equals', 'hashCode'].includes(n)) return this.invoke(m, f, args, null);
        }
      }
      if (f === null) throw this.npe();
      throw this.err('value is not a functional interface instance', null);
    }
    // ------------------------------------------------------------ arrays
    newArray(t, dimsVals, totalDims, node) {
      const n = dimsVals[0];
      if (n < 0) throw this.thr('NegativeArraySizeException', String(n));
      const a = new Array(n);
      if (dimsVals.length > 1) for (let i = 0; i < n; i++) a[i] = this.newArray(t, dimsVals.slice(1), totalDims - 1, node);
      else { const dv = totalDims === 1 ? this.defVal(tdesc({ name: t.name, dims: 0 })) : null; for (let i = 0; i < n; i++) a[i] = dv; }
      return new JArray(t.name, totalDims, a);
    }
    arrayInit(init, t, sc) {
      // t: the array type (dims >= 1)
      if (init.k !== 'ArrayInit') return this.ev(init, sc);
      const et = { name: t.name, dims: t.dims - 1 };
      const ed = t.dims - 1 > 0 ? 'ref' : tdesc(et);
      const a = init.elems.map(el => el.k === 'ArrayInit' ? this.arrayInit(el, et, sc) : this.coerce(this.ev(el, sc), ed, el));
      return new JArray(t.name, t.dims, a);
    }
    // ------------------------------------------------------------ lookup
    fieldInfo(ci, name) {
      let r = ci.fcache.get(name);
      if (r !== undefined) return r;
      r = null;
      const visit = c => {
        if (!c || r) return;
        const f = c.fields.get(name);
        if (f) { r = f; return; }
        visit(c.sup);
        for (const i of c.ifaces) visit(i);
      };
      visit(ci);
      ci.fcache.set(name, r);
      return r;
    }
    fieldRef(fi, obj, node, name) {
      if (fi.static) { this.ensureInit(fi.cls); return { holder: fi.cls.statics, key: fi.key, d: fi.d, fi, th: fi.cls.stok || (fi.cls.stok = Object.create(null)) }; }
      if (!obj) throw this.err(`non-static variable ${name} cannot be referenced from a static context`, node);
      return { holder: obj.f, key: fi.key, d: fi.d, fi, th: obj.ft || (obj.ft = Object.create(null)) };
    }
    // --- String identity: each String object gets a token so == behaves like Java (literals are interned, input/concat results are new objects)
    fresh() { return ++this.tokSeq; }
    lookup(name, sc, node) {
      let s = sc;
      while (s) {
        if (s.vars.size === 0 && s.parent && s.parent.frame === s.frame) { s = s.parent; continue; }
        const v = s.vars.get(name);
        if (v !== undefined) return v;
        const nx = s.parent;
        if (!nx || nx.frame !== s.frame) {
          const fr = s.frame;
          const fi = this.fieldInfo(fr.cls, name);
          if (fi) return this.fieldRef(fi, fr.thisObj, node, name);
        }
        s = nx;
      }
      // static fields of lexically enclosing classes
      for (let c = sc.frame.cls.outer; c; c = c.outer) {
        const fi = this.fieldInfo(c, name);
        if (fi && fi.static) return this.fieldRef(fi, null, node, name);
      }
      return null;
    }
    // ------------------------------------------------------------ statements
    execBlock(stmts, sc) {
      for (let i = 0; i < stmts.length; i++) {
        const r = this.exec(stmts[i], sc);
        if (r !== undefined) return r;
      }
      return undefined;
    }
    exec(s, sc, label) {
      sc.frame.line = s.line;
      if ((++this.steps & 0x3fff) === 0) this.tick();
      switch (s.k) {
        case 'ExprStmt': this.ev(s.e, sc); return undefined;
        case 'Local': this.execLocal(s, sc); return undefined;
        case 'Block': return this.execBlock(s.stmts, new Scope(sc, sc.frame));
        case 'If':
          if (this.ev(s.cond, sc)) return this.exec(s.then, sc);
          return s.els ? this.exec(s.els, sc) : undefined;
        case 'Return': { const v = s.e ? this.ev(s.e, sc) : undefined; return { k: 'r', v, tok: typeof v === 'string' ? this.lastTok : undefined }; }
        case 'While': return this.execWhile(s, sc, label);
        case 'DoWhile': return this.execDo(s, sc, label);
        case 'For': return this.execFor(s, sc, label);
        case 'ForEach': return this.execForEach(s, sc, label);
        case 'Break': return s.label ? { k: 'b', label: s.label } : SIG_BREAK;
        case 'Continue': return s.label ? { k: 'c', label: s.label } : SIG_CONT;
        case 'Yield': return { k: 'y', v: this.ev(s.e, sc) };
        case 'Empty': return undefined;
        case 'Labeled': return this.execLabeled(s, sc);
        case 'Switch': return this.execSwitch(s, sc, label, false);
        case 'Throw': return this.execThrow(s, sc);
        case 'Try': return this.execTry(s, sc);
        case 'LocalClass': this.buildDynamicClass(s.decl, null, sc, false); return undefined;
        case 'Assert': return undefined; // assertions are disabled by default in Java
      }
      throw this.err('unsupported statement ' + s.k, s);
    }
    execLocal(s, sc) {
      for (const d of s.decls) {
        const dd = tdesc(d.type);
        let v;
        if (d.init) {
          if (d.init.k === 'ArrayInit') v = this.arrayInit(d.init, d.type, sc);
          else { v = this.ev(d.init, sc); if (v instanceof JFunc) this.tagFunc(v, d.type); v = this.coerce(v, dd, d.init); }
        }
        sc.vars.set(d.name, { v, d: dd, fin: s.final, tok: typeof v === 'string' ? this.lastTok : undefined });
      }
    }
    execWhile(s, sc, label) {
      while (this.ev(s.cond, sc)) {
        if ((++this.steps & 0x3fff) === 0) this.tick();
        const r = this.exec(s.body, sc);
        if (r !== undefined) {
          if (r.k === 'b' && (r.label === null || r.label === label)) break;
          if (r.k === 'c' && (r.label === null || r.label === label)) continue;
          return r;
        }
      }
      return undefined;
    }
    execDo(s, sc, label) {
      do {
        if ((++this.steps & 0x3fff) === 0) this.tick();
        const r = this.exec(s.body, sc);
        if (r !== undefined) {
          if (r.k === 'b' && (r.label === null || r.label === label)) break;
          if (r.k === 'c' && (r.label === null || r.label === label)) continue;
          return r;
        }
      } while (this.ev(s.cond, sc));
      return undefined;
    }
    execFor(s, sc, label) {
      const fs = new Scope(sc, sc.frame);
      for (const i of s.init) this.exec(i, fs);
      while (s.cond === null || this.ev(s.cond, fs)) {
        if ((++this.steps & 0x3fff) === 0) this.tick();
        const r = this.exec(s.body, fs);
        if (r !== undefined) {
          if (r.k === 'b' && (r.label === null || r.label === label)) break;
          if (!(r.k === 'c' && (r.label === null || r.label === label))) return r;
        }
        for (const u of s.update) this.ev(u, fs);
      }
      return undefined;
    }
    execLabeled(s, sc) {
      const r = this.exec(s.body, sc, s.label);
      if (r !== undefined && r.k === 'b' && r.label === s.label) return undefined;
      return r;
    }
    execThrow(s, sc) {
      const v = this.ev(s.e, sc);
      if (v === null) throw this.npe('Cannot throw exception because value is null');
      if (!(v instanceof JObject) || !this.isSub(v.cls, this.classes.get('Throwable'))) throw this.err('incompatible types: cannot be converted to Throwable', s);
      throw new JThrow(v);
    }
    execForEach(s, sc, label) {
      const it = this.ev(s.iter, sc);
      if (it === null) throw this.npe('Cannot iterate over null');
      const d = s.type.name === 'var' ? null : tdesc(s.type);
      const body = s.body;
      const run = v => {
        const bs = new Scope(sc, sc.frame);
        bs.vars.set(s.name, { v: this.coerce(v, d, s), d, fin: s.final });
        if ((++this.steps & 0x3fff) === 0) this.tick();
        return this.exec(body, bs);
      };
      const handle = r => {
        if (r === undefined) return 0;
        if (r.k === 'b' && (r.label === null || r.label === label)) return 1;
        if (r.k === 'c' && (r.label === null || r.label === label)) return 0;
        return 2;
      };
      if (it instanceof JArray) {
        const a = it.a;
        for (let i = 0; i < a.length; i++) {
          const r = run(a[i]);
          const h = handle(r);
          if (h === 1) break; if (h === 2) return r;
        }
        return undefined;
      }
      const iter = this.lib.iterator(it, s.iter);
      while (iter.hasNext()) {
        const r = run(iter.next());
        const h = handle(r);
        if (h === 1) break; if (h === 2) return r;
      }
      return undefined;
    }
    switchEq(v, lv) {
      if (typeof v === 'string') return v === lv;
      if (v instanceof JObject) return v === lv;
      return JR.isNum(v) && JR.isNum(lv) && JR.numVal(v) === JR.numVal(lv);
    }
    matchCase(s, v, sc) {
      let def = -1;
      for (let i = 0; i < s.cases.length; i++) {
        const c = s.cases[i];
        if (c.labels === null) { def = i; continue; }
        for (const l of c.labels) {
          if (l.k === 'Default') { def = i; continue; }
          if (l.k === 'Lit' && l.vt === 'null') { if (v === null) return i; continue; }
          if (v instanceof JObject && v.enumName !== undefined && l.k === 'Name') { if (v.enumName === l.name) return i; continue; }
          const lv = this.ev(l, sc);
          if (this.switchEq(v, lv)) return i;
        }
      }
      return def;
    }
    execSwitch(s, sc, label, isExpr) {
      const v = this.ev(s.sel, sc);
      if (v === null && !s.cases.some(c => c.labels && c.labels.some(l => l.k === 'Lit' && l.vt === 'null'))) throw this.npe();
      const idx = this.matchCase(s, v, sc);
      if (idx < 0) {
        if (isExpr) throw this.thr('IncompatibleClassChangeError');
        return undefined;
      }
      const ss = new Scope(sc, sc.frame);
      if (s.arrow) {
        const r = this.execBlock(s.cases[idx].body, ss);
        if (r !== undefined) {
          if (r.k === 'b' && r.label === null && !isExpr) return undefined;
          return r;
        }
        return undefined;
      }
      for (let i = idx; i < s.cases.length; i++) {
        const r = this.execBlock(s.cases[i].body, ss);
        if (r !== undefined) {
          if (r.k === 'b' && (r.label === null) && !isExpr) return undefined;
          return r;
        }
      }
      return undefined;
    }
    catchMatches(obj, types) {
      for (const t of types) {
        const ci = this.resolveClass(t.name);
        if (ci && this.isSub(obj.cls, ci)) return true;
      }
      return false;
    }
    toJThrow(ex) {
      if (ex instanceof JThrow) return ex;
      if (ex instanceof RangeError && /call stack|too much recursion/i.test(ex.message)) { this.jsStack = true; return this.thr('StackOverflowError'); }
      return null;
    }
    execTry(s, sc) {
      let res, pending = null;
      const ts = new Scope(sc, sc.frame);
      const opened = [];
      try {
        for (const r of s.resources) {
          const v = this.ev(r.init, ts);
          if (r.name) ts.vars.set(r.name, { v, d: 'ref', fin: true });
          opened.push(v);
        }
        res = this.execBlock(s.block.stmts, ts);
        for (let i = opened.length - 1; i >= 0; i--) if (opened[i] !== null) this.callMethod(opened[i], 'close', [], s);
      } catch (ex0) {
        const ex = this.toJThrow(ex0);
        if (!ex) throw ex0;
        for (let i = opened.length - 1; i >= 0; i--) { try { if (opened[i] !== null) this.callMethod(opened[i], 'close', [], s); } catch (e) { if (!(e instanceof JThrow)) throw e; } }
        const c = s.catches.find(c => this.catchMatches(ex.obj, c.types));
        if (c) {
          const cs = new Scope(sc, sc.frame);
          cs.vars.set(c.name, { v: ex.obj, d: 'ref' });
          try { res = this.execBlock(c.body.stmts, cs); }
          catch (ex2) { if (!s.fin) throw ex2; const j = this.toJThrow(ex2); if (!j) throw ex2; pending = j; }
        } else {
          if (!s.fin) throw ex;
          pending = ex;
        }
      }
      if (s.fin) {
        const fr = this.execBlock(s.fin.stmts, new Scope(sc, sc.frame));
        if (fr !== undefined) return fr;
        if (pending) throw pending;
      }
      return res;
    }
    // ------------------------------------------------------------ expressions
    evArgs(args, sc) {
      const n = args.length;
      if (n === 0) return [];
      const r = new Array(n);
      let toks = null;
      for (let i = 0; i < n; i++) {
        r[i] = this.ev(args[i], sc);
        if (typeof r[i] === 'string') { if (!toks) toks = new Array(n); toks[i] = this.lastTok; }
      }
      if (toks) r.toks = toks;
      return r;
    }
    ev(e, sc) {
      switch (e.k) {
        case 'Lit': this.lastTok = e.vt === 'String' ? 'L' + e.v : undefined; return this.lit(e);
        case 'Name': return this.evName(e, sc);
        case 'Bin': return this.evBin(e, sc);
        case 'Call': return this.evCall(e, sc);
        case 'Field': return this.evField(e, sc);
        case 'Assign': return this.evAssign(e, sc);
        case 'Paren': return this.ev(e.e, sc);
        case 'Index': { const v = this.evIndex(e, sc); this.lastTok = undefined; return v; }
        case 'Unary': return this.evUnary(e, sc);
        case 'PreInc': case 'PostInc': return this.evInc(e, sc);
        case 'Cond': return this.evCond(e, sc);
        case 'Cast': return this.castTo(this.ev(e.e, sc), e.type, e);
        case 'New': { const v = this.evNew(e, sc); this.lastTok = typeof v === 'string' ? this.fresh() : undefined; return v; }
        case 'NewArray': return this.evNewArray(e, sc);
        case 'InstanceOf': return this.evInstanceOf(e, sc);
        case 'This': return this.evThis(e, sc);
        case 'Lambda': return this.makeLambda(e, sc);
        case 'MethodRef': return this.makeMethodRef(e, sc);
        case 'SwitchExpr': return this.evSwitchExpr(e, sc);
        case 'ClassLit': { const ci = this.resolveClass(e.type.name); return new JClassRef(e.type.name, ci, !ci); }
        case 'CtorCall': throw this.err(`call to ${e.kind} must be first statement in constructor`, e);
        case 'ArrayInit': throw this.err('illegal initializer for array', e);
        case 'Super': throw this.err("'.' expected", e);
      }
      throw this.err('unsupported expression ' + e.k, e);
    }
    evName(e, sc) {
      const r = this.lookup(e.name, sc, e);
      if (r) {
        if (r.holder) { this.lastTok = r.th ? r.th[r.key] : undefined; return r.holder[r.key]; }
        if (r.v === undefined) throw this.err(`variable ${e.name} might not have been initialized`, e);
        this.lastTok = r.tok;
        return r.v;
      }
      const ci = this.resolveClass(e.name);
      if (ci) return new JClassRef(ci.name, ci);
      if (this.lib.hasClass(e.name)) return new JClassRef(e.name, null, true);
      for (const si of this.staticImports || []) {
        if (si.member !== '*' && si.member !== e.name) continue;
        const uc = this.resolveClass(si.cls);
        if (uc && !uc.builtin) { const fi = this.fieldInfo(uc, e.name); if (fi && fi.static) { const r = this.fieldRef(fi, null, e, e.name); return r.holder[r.key]; } continue; }
        try { return this.lib.staticField(si.cls, e.name, e); } catch (x) { if (!(x && x.isCompile)) throw x; }
      }
      throw this.err(`cannot find symbol\n  symbol:   variable ${e.name}`, e);
    }
    evIndex(e, sc) {
      const a = this.ev(e.arr, sc);
      let i = this.ev(e.idx, sc);
      if (typeof i !== 'number') i = this.coerce(i, 'int', e.idx);
      if (a === null) throw this.npe(`Cannot load from array because "${this.exprText(e.arr)}" is null`);
      if (!(a instanceof JArray)) throw this.err('array required, but ' + this.typeNameOf(a) + ' found', e);
      if (i < 0 || i >= a.a.length) throw this.thr('ArrayIndexOutOfBoundsException', `Index ${i} out of bounds for length ${a.a.length}`);
      return a.a[i];
    }
    evCond(e, sc) {
      const v = this.ev(e.c, sc) ? this.ev(e.a, sc) : this.ev(e.b, sc);
      const t = e._t;
      if (t && t.d === 0 && (t.n === 'double' || t.n === 'float' || t.n === 'long') && v !== null) return this.coerce(v, t.n);
      return v;
    }
    evNewArray(e, sc) {
      if (e.init) return this.arrayInit(e.init, { name: e.type.name, dims: e.extra }, sc);
      const dv = e.dims.map(x => this.coerce(this.ev(x, sc), 'int', x));
      return this.newArray(e.type, dv, e.dims.length + e.extra, e);
    }
    evInstanceOf(e, sc) {
      const v = this.ev(e.e, sc);
      const r = this.isInstance(v, e.type);
      if (r && e.bind) sc.vars.set(e.bind.name, { v, d: 'ref' });
      return r;
    }
    evThis(e, sc) {
      if (e.qual) {
        let s = sc;
        while (s) { if (s.frame.thisObj && (s.frame.cls.name === e.qual || s.frame.cls.qname.endsWith(e.qual))) return s.frame.thisObj; s = s.parent; }
      }
      if (!sc.frame.thisObj) throw this.err('non-static variable this cannot be referenced from a static context', e);
      return sc.frame.thisObj;
    }
    evSwitchExpr(e, sc) {
      const r = this.execSwitch(e, sc, null, true);
      if (r && r.k === 'y') return r.v;
      if (r && r.k === 'r') throw this.err('return outside of enclosing switch expression', e);
      throw this.err('switch expression does not yield a value', e);
    }
    lit(e) {
      switch (e.vt) {
        case 'int': case 'String': case 'boolean': case 'null': return e.v;
        case 'double': return e._c || (e._c = new JD(e.v));
        case 'float': return e._c || (e._c = new JD(e.v, true));
        case 'char': return e._c || (e._c = new JC(e.v));
        case 'long': return e._c || (e._c = new JL(e.v));
      }
    }
    evBin(e, sc) {
      const op = e.op;
      if (op === '&&') { const r = !!(this.ev(e.l, sc) && this.ev(e.r, sc)); this.lastTok = undefined; return r; }
      if (op === '||') { const r = !!(this.ev(e.l, sc) || this.ev(e.r, sc)); this.lastTok = undefined; return r; }
      const a = this.ev(e.l, sc), ta = this.lastTok, b = this.ev(e.r, sc), tb = this.lastTok;
      this.lastTok = undefined;
      if (typeof a === 'string') {
        if (typeof b === 'string' && (op === '==' || op === '!=') && ta !== undefined && tb !== undefined) return (ta === tb) === (op === '==');
        if (op === '+') {
          const r = this.binop(op, a, b, e);
          this.lastTok = (typeof ta === 'string' || e.l.k === 'Lit') && (typeof tb === 'string' || e.r.k === 'Lit') ? 'L' + r : this.fresh();
          return r;
        }
      } else if (op === '+' && typeof b === 'string') {
        const r = this.binop(op, a, b, e);
        this.lastTok = e.l.k === 'Lit' && typeof tb === 'string' ? 'L' + r : this.fresh();
        return r;
      }
      if (typeof a === 'number' && typeof b === 'number') {
        switch (op) {
          case '+': return (a + b) | 0;
          case '-': return (a - b) | 0;
          case '*': return Math.imul(a, b);
          case '/': if (b === 0) throw this.thr('ArithmeticException', '/ by zero'); return (a / b) | 0;
          case '%': if (b === 0) throw this.thr('ArithmeticException', '/ by zero'); return (a % b) | 0;
          case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b;
          case '==': return a === b; case '!=': return a !== b;
        }
      }
      return this.binop(op, a, b, e);
    }
    binop(op, a, b, node) {
      switch (op) {
        case '+':
          if (typeof a === 'string' || typeof b === 'string') return this.jstr(a) + this.jstr(b);
          return this.arith(op, a, b, node);
        case '-': case '*': case '/': case '%': return this.arith(op, a, b, node);
        case '==': return this.eq(a, b);
        case '!=': return !this.eq(a, b);
        case '<': case '>': case '<=': case '>=': return this.cmp(op, a, b, node);
        case '&': case '|': case '^': return this.bitop(op, a, b, node);
        case '<<': case '>>': case '>>>': return this.shift(op, a, b, node);
      }
      throw this.err('bad operator ' + op, node);
    }
    badOperands(op, a, b, node) {
      if (a === null || b === null) return this.npe();
      return this.err(`bad operand types for binary operator '${op}'\n  first type:  ${this.typeNameOf(a)}\n  second type: ${this.typeNameOf(b)}`, node);
    }
    arith(op, a, b, node) {
      const ka = JR.nk(a), kb = JR.nk(b);
      if (ka < 0 || kb < 0) throw this.badOperands(op, a, b, node);
      const k = ka > kb ? ka : kb;
      if (k === 0) {
        const x = typeof a === 'number' ? a : a.v, y = typeof b === 'number' ? b : b.v;
        switch (op) {
          case '+': return (x + y) | 0;
          case '-': return (x - y) | 0;
          case '*': return Math.imul(x, y);
          case '/': if (y === 0) throw this.thr('ArithmeticException', '/ by zero'); return (x / y) | 0;
          case '%': if (y === 0) throw this.thr('ArithmeticException', '/ by zero'); return (x % y) | 0;
        }
      }
      if (k === 1) {
        const x = JR.lv(a), y = JR.lv(b);
        let r;
        switch (op) {
          case '+': r = x + y; break;
          case '-': r = x - y; break;
          case '*': r = x * y; break;
          case '/': if (y === 0n) throw this.thr('ArithmeticException', '/ by zero'); r = x / y; break;
          case '%': if (y === 0n) throw this.thr('ArithmeticException', '/ by zero'); r = x % y; break;
        }
        return new JL(BigInt.asIntN(64, r));
      }
      const x = JR.numVal(a), y = JR.numVal(b);
      let r;
      switch (op) {
        case '+': r = x + y; break;
        case '-': r = x - y; break;
        case '*': r = x * y; break;
        case '/': r = x / y; break;
        case '%': r = x % y; break;
      }
      return k === 2 ? new JD(Math.fround(r), true) : new JD(r);
    }
    eq(a, b) {
      if (a === b) return !(a instanceof JD && Number.isNaN(a.v));
      const ka = JR.nk(a), kb = JR.nk(b);
      if (ka >= 0 && kb >= 0) {
        if (ka <= 1 && kb <= 1 && (ka === 1 || kb === 1)) return JR.lv(a) === JR.lv(b);
        return JR.numVal(a) === JR.numVal(b);
      }
      return false;
    }
    cmp(op, a, b, node) {
      const ka = JR.nk(a), kb = JR.nk(b);
      if (ka < 0 || kb < 0) throw this.badOperands(op, a, b, node);
      let x, y;
      if (ka <= 1 && kb <= 1 && (ka === 1 || kb === 1)) { x = JR.lv(a); y = JR.lv(b); }
      else { x = JR.numVal(a); y = JR.numVal(b); }
      switch (op) { case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y; }
    }
    bitop(op, a, b, node) {
      if (typeof a === 'boolean' && typeof b === 'boolean') {
        switch (op) { case '&': return a && b; case '|': return a || b; case '^': return a !== b; }
      }
      const ka = JR.nk(a), kb = JR.nk(b);
      if (ka < 0 || kb < 0 || ka > 1 || kb > 1) throw this.badOperands(op, a, b, node);
      if (ka === 1 || kb === 1) {
        const x = JR.lv(a), y = JR.lv(b);
        switch (op) { case '&': return new JL(x & y); case '|': return new JL(x | y); case '^': return new JL(x ^ y); }
      }
      const x = typeof a === 'number' ? a : a.v, y = typeof b === 'number' ? b : b.v;
      switch (op) { case '&': return x & y; case '|': return x | y; case '^': return x ^ y; }
    }
    shift(op, a, b, node) {
      const ka = JR.nk(a), kb = JR.nk(b);
      if (ka < 0 || kb < 0 || ka > 1 || kb > 1) throw this.badOperands(op, a, b, node);
      const sh = kb === 1 ? Number(BigInt.asIntN(32, b.v)) : (typeof b === 'number' ? b : b.v);
      if (ka === 1) {
        const x = a.v, s = BigInt(sh & 63);
        switch (op) {
          case '<<': return new JL(BigInt.asIntN(64, x << s));
          case '>>': return new JL(x >> s);
          case '>>>': return new JL(BigInt.asIntN(64, BigInt.asUintN(64, x) >> s));
        }
      }
      const x = typeof a === 'number' ? a : a.v;
      switch (op) { case '<<': return x << sh; case '>>': return x >> sh; case '>>>': return (x >>> sh) | 0; }
    }
    evUnary(e, sc) {
      const v = this.ev(e.e, sc);
      switch (e.op) {
        case '!': if (typeof v !== 'boolean') throw this.err(`bad operand type ${this.typeNameOf(v)} for unary operator '!'`, e); return !v;
        case '-':
          if (typeof v === 'number') return (-v) | 0;
          if (v instanceof JD) return new JD(-v.v, v.f);
          if (v instanceof JC) return -v.v;
          if (v instanceof JL) return new JL(BigInt.asIntN(64, -v.v));
          break;
        case '+':
          if (typeof v === 'number') return v;
          if (v instanceof JC) return v.v;
          if (v instanceof JD || v instanceof JL) return v;
          break;
        case '~':
          if (typeof v === 'number') return ~v;
          if (v instanceof JC) return ~v.v;
          if (v instanceof JL) return new JL(~v.v);
          break;
      }
      if (v === null) throw this.npe();
      throw this.err(`bad operand type ${this.typeNameOf(v)} for unary operator '${e.op}'`, e);
    }
    incr(v, delta, d, node) {
      let r;
      if (typeof v === 'number') r = (v + delta) | 0;
      else if (v instanceof JC) r = new JC((v.v + delta) & 0xffff);
      else if (v instanceof JL) r = new JL(BigInt.asIntN(64, v.v + BigInt(delta)));
      else if (v instanceof JD) r = new JD(v.f ? Math.fround(v.v + delta) : v.v + delta, v.f);
      else if (v === null) throw this.npe();
      else throw this.err(`bad operand type ${this.typeNameOf(v)} for unary operator '${delta > 0 ? '++' : '--'}'`, node);
      return (d === 'byte' || d === 'short') ? this.coerce(r, d) : r;
    }
    // resolve an assignable location: returns {get(), set(v), d}
    ref(t, sc) {
      if (t.k === 'Name') {
        const r = this.lookup(t.name, sc, t);
        if (!r) throw this.err(`cannot find symbol\n  symbol:   variable ${t.name}`, t);
        return r;
      }
      if (t.k === 'Paren') return this.ref(t.e, sc);
      if (t.k === 'Field') {
        if (t.obj.k === 'Super') {
          const fr = sc.frame;
          const fi = this.fieldInfo(fr.cls.sup, t.name);
          if (!fi) throw this.err(`cannot find symbol\n  symbol: variable ${t.name}`, t);
          return this.fieldRef(fi, fr.thisObj, t, t.name);
        }
        const o = this.ev(t.obj, sc);
        if (o instanceof JClassRef) {
          if (!o.ci) throw this.err(`cannot assign a value to final variable ${t.name}`, t);
          const fi = this.fieldInfo(o.ci, t.name);
          if (!fi) throw this.err(`cannot find symbol\n  symbol:   variable ${t.name}\n  location: class ${o.ci.name}`, t);
          if (!fi.static) throw this.err(`non-static variable ${t.name} cannot be referenced from a static context`, t);
          return this.fieldRef(fi, null, t, t.name);
        }
        if (o === null) throw this.npe(`Cannot assign field "${t.name}" because "${this.exprText(t.obj)}" is null`);
        if (o instanceof JObject) {
          const start = (t.obj.k === 'This' && !t.obj.qual) ? sc.frame.cls : o.cls;
          const fi = this.fieldInfo(start, t.name) || this.fieldInfo(o.cls, t.name);
          if (!fi) throw this.err(`cannot find symbol\n  symbol:   variable ${t.name}\n  location: class ${o.cls.name}`, t);
          return this.fieldRef(fi, o, t, t.name);
        }
        if (o instanceof JArray && t.name === 'length') throw this.err('cannot assign a value to final variable length', t);
        throw this.err(`cannot find symbol\n  symbol: variable ${t.name}`, t);
      }
      if (t.k === 'Index') {
        const a = this.ev(t.arr, sc);
        let i = this.ev(t.idx, sc);
        if (typeof i !== 'number') i = this.coerce(i, 'int', t.idx);
        if (a === null) throw this.npe(`Cannot store to array because "${this.exprText(t.arr)}" is null`);
        if (!(a instanceof JArray)) throw this.err('array required, but ' + this.typeNameOf(a) + ' found', t);
        if (i < 0 || i >= a.a.length) throw this.thr('ArrayIndexOutOfBoundsException', `Index ${i} out of bounds for length ${a.a.length}`);
        return { holder: a.a, key: i, d: a.ed || (a.ed = a.dims === 1 ? tdesc({ name: a.et, dims: 0 }) : 'ref') };
      }
      throw this.err('unexpected type\n  required: variable\n  found:    value', t);
    }
    evAssign(e, sc) {
      const r = this.ref(e.target, sc);
      let v;
      let tok;
      if (e.op === '=') {
        v = this.ev(e.value, sc);
        tok = this.lastTok;
        if (r.d === 'ref' && v instanceof JFunc && r.fi && r.fi.type) this.tagFunc(v, r.fi.type);
        v = this.coerce(v, r.d, e.value);
      } else {
        const cur = r.holder ? r.holder[r.key] : r.v;
        if (cur === undefined) throw this.err(`variable ${e.target.name} might not have been initialized`, e.target);
        const rhs = this.ev(e.value, sc);
        const res = this.binop(e.op.slice(0, -1), cur, rhs, e);
        v = r.d === 'String' ? res : this.coerce(res, r.d === 'ref' ? null : r.d, e);
        tok = typeof v === 'string' ? this.fresh() : undefined;
      }
      if (typeof v !== 'string') tok = undefined;
      if (r.holder) { r.holder[r.key] = v; if (r.th) r.th[r.key] = tok; } else { r.v = v; r.tok = tok; }
      this.lastTok = tok;
      return v;
    }
    tagFunc(f, type) {
      if (!(f instanceof JFunc) || f.iface || !type || type.dims) return f;
      const ci = this.resolveClass(type.name);
      if (ci && ci.kind === 'interface' && !ci.builtin) f.iface = ci;
      return f;
    }
    evInc(e, sc) {
      const r = this.ref(e.e, sc);
      const old = r.holder ? r.holder[r.key] : r.v;
      if (old === undefined) throw this.err(`variable ${e.e.name} might not have been initialized`, e.e);
      let nv = this.incr(old, e.op === '++' ? 1 : -1, r.d, e);
      if (r.d && r.d !== 'ref' && JR.BOX[r.d]) nv = this.coerce(nv, r.d);
      if (r.holder) r.holder[r.key] = nv; else r.v = nv;
      return e.k === 'PreInc' ? nv : old;
    }
    // java.util.Arrays -> class reference
    qualRef(x) {
      let n = '', k = x;
      while (k.k === 'Field') { n = '.' + k.name + n; k = k.obj; }
      if (k.k !== 'Name' || k.name !== 'java') return null;
      n = k.name + n;
      const simple = n.slice(n.lastIndexOf('.') + 1);
      if (!/^[A-Z]/.test(simple)) return null;
      const ci = this.resolveClass(simple);
      return new JClassRef(simple, ci, !ci);
    }
    evField(e, sc) {
      if (e.obj.k === 'Field' || (e.obj.k === 'Name' && e.obj.name === 'java')) { const q = this.qualRef(e); if (q) return q; }
      if (e.obj.k === 'Super') {
        const fr = sc.frame;
        const fi = this.fieldInfo(fr.cls.sup, e.name);
        if (!fi) throw this.err(`cannot find symbol\n  symbol: variable ${e.name}`, e);
        const r = this.fieldRef(fi, fr.thisObj, e, e.name);
        this.lastTok = r.th[r.key];
        return r.holder[r.key];
      }
      let o;
      if (e.obj.k === 'Name') {
        // package-qualified names like java.util.Scanner are not values; let class lookup handle 'Outer.Inner'
        o = this.ev(e.obj, sc);
      } else o = this.ev(e.obj, sc);
      if (o instanceof JClassRef) {
        if (o.ci) {
          const ci = o.ci;
          const fi = this.fieldInfo(ci, e.name);
          if (fi) {
            if (!fi.static) throw this.err(`non-static variable ${e.name} cannot be referenced from a static context`, e);
            const r = this.fieldRef(fi, null, e, e.name);
            this.lastTok = r.th[r.key];
            return r.holder[r.key];
          }
          const inner = this.classes.get(ci.name + '.' + e.name);
          if (inner) return new JClassRef(inner.name, inner);
          if (e.name === 'length') throw this.err(`cannot find symbol\n  symbol:   variable length\n  location: class ${ci.name}`, e);
          throw this.err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${ci.name}`, e);
        }
        return this.lib.staticField(o.name, e.name, e);
      }
      if (o === null) throw this.npe(`Cannot read field "${e.name}" because "${this.exprText(e.obj)}" is null`);
      if (o instanceof JArray) {
        if (e.name === 'length') return o.a.length;
        throw this.err(`cannot find symbol\n  symbol:   variable ${e.name}`, e);
      }
      if (o instanceof JObject) {
        const start = (e.obj.k === 'This' && !e.obj.qual) ? sc.frame.cls : o.cls;
        const fi = this.fieldInfo(start, e.name) || this.fieldInfo(o.cls, e.name);
        if (!fi) throw this.err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${o.cls.name}`, e);
        const r = this.fieldRef(fi, o, e, e.name);
        this.lastTok = r.th[r.key];
        return r.holder[r.key];
      }
      if (typeof o === 'string' && e.name === 'length') throw this.err('cannot find symbol\n  symbol:   variable length\n  location: class String', e);
      throw this.err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${this.typeNameOf(o)}`, e);
    }
    evCall(e, sc) {
      this.callRecv = undefined; this.callArgs = null;
      const v = this.evCall0(e, sc);
      if (typeof v !== 'string') { this.lastTok = undefined; return v; }
      if (!this.userRet) this.lastTok = this.libTok(e.name, v, this.callRecv, this.callRecvTok, this.callArgs);
      return v;
    }
    libTok(name, v, recv, recvTok, args) {
      if (recv === undefined) return undefined;
      if (typeof recv === 'string') {
        if (name === 'intern') return 'L' + v;
        if (v === recv && ['trim', 'strip', 'stripLeading', 'stripTrailing', 'toUpperCase', 'toLowerCase', 'replace', 'toString', 'substring', 'concat', 'repeat'].includes(name)) return recvTok;
        return this.fresh();
      }
      if (recv instanceof JClassRef) {
        if (recv.name === 'String' && name === 'valueOf' && args && args.length === 1 && typeof args[0] === 'string') return args.toks ? args.toks[0] : undefined;
        return ['String', 'Integer', 'Double', 'Long', 'Float', 'Character', 'Boolean', 'Arrays', 'Short', 'Byte'].includes(recv.name) ? this.fresh() : undefined;
      }
      if (recv && (recv.ltype === 'Scanner' || recv.ltype === 'BufferedReader' || recv.ltype === 'StringBuilder' || recv.ltype === 'StringBuffer')) return this.fresh();
      return undefined;
    }
    evCall0(e, sc) {
      const name = e.name;
      if (!e.obj) {
        const args = this.evArgs(e.args, sc);
        this.userRet = false;
        return this.callUnqualified(name, args, sc, e);
      }
      if (e.obj.k === 'Super') {
        const fr = sc.frame;
        const args = this.evArgs(e.args, sc);
        let start = fr.cls.sup;
        let m = start ? this.select(this.methodsNamed(start, name).filter(x => !x.abstract), args) : null;
        if (!m) for (const i of fr.cls.ifaces) { m = this.select(this.methodsNamed(i, name).filter(x => !x.abstract), args); if (m) break; }
        if (!m) throw this.err(`cannot find symbol\n  symbol: method ${name}`, e);
        this.userRet = false;
        return this.invoke(m, fr.thisObj, args, e);
      }
      const recv = (e.obj.k === 'Field' && this.qualRef(e.obj)) || this.ev(e.obj, sc);
      const recvTok = this.lastTok;
      const args = this.evArgs(e.args, sc);
      this.callRecv = recv; this.callRecvTok = recvTok; this.callArgs = args;
      this.userRet = false;
      if (name === 'remove' && args.length === 1 && typeof args[0] === 'number') this.boxedArg = this.isBoxedExpr(e.args[0], sc);
      if (recv instanceof JClassRef && !(e.obj.k === 'ClassLit') && !(e.obj.k === 'Call')) return this.callStatic(recv, name, args, e);
      if (recv instanceof JObject && e.obj.k === 'This' && !e.obj.qual) {
        // private methods are not virtual
        const own = sc.frame.cls.methods.get(name);
        if (own) { const pm = this.select(own.filter(m => m.mods.has('private')), args); if (pm) return this.invoke(pm, recv, args, e); }
      }
      return this.callMethod(recv, name, args, e);
    }
    // static type of an int-valued expression is Integer (for List.remove(Object) vs remove(int))
    isBoxedExpr(x, sc) {
      if (x._t) return !JR.PRIM_DESC.has(x._t.n) || x._t.d > 0;
      switch (x.k) {
        case 'Paren': return this.isBoxedExpr(x.e, sc);
        case 'Cast': return x.type.name === 'Integer' || x.type.name === 'Object';
        case 'Call':
          if (x.name === 'valueOf' && x.obj && x.obj.k === 'Name' && x.obj.name === 'Integer') return true;
          if (x.obj && ['get', 'next', 'getKey', 'getValue', 'peek', 'poll', 'pop', 'getFirst', 'getLast'].includes(x.name)) return true;
          return false;
        case 'Name': { const r = this.lookup(x.name, sc, x); return !!r && r.d === 'Integer'; }
        case 'Field': return false;
      }
      return false;
    }
    callUnqualified(name, args, sc, e) {
      let s = sc, fr = null;
      while (s) {
        if (s.frame !== fr) {
          fr = s.frame;
          const ms = this.methodsNamed(fr.cls, name);
          if (ms.length) {
            const m = this.select(ms, args, e);
            if (!m) throw this.err(`method ${name} in class ${fr.cls.name} cannot be applied to given types;\n  required: ${ms[0].params.map(p => p.type.name + '[]'.repeat(p.type.dims)).join(',') || 'no arguments'}\n  found:    ${this.argTypesStr(args)}`, e);
            if (m.static) return this.invoke(m, null, args, e);
            if (!fr.thisObj) throw this.err(`non-static method ${name}(${m.params.map(p => p.type.name + '[]'.repeat(p.type.dims)).join(',')}) cannot be referenced from a static context`, e);
            if (fr.thisObj instanceof JFunc) return this.callMethod(fr.thisObj, name, args, e);
            if (m.mods && m.mods.has('private') && m.cls === fr.cls) return this.invoke(m, fr.thisObj, args, e);
            // virtual dispatch on the runtime class
            const vm = fr.thisObj.cls === fr.cls ? m : (this.methodsNamed(fr.thisObj.cls, name).find(x => x.sig === m.sig && !x.abstract) || this.select(this.methodsNamed(fr.thisObj.cls, name), args, e) || m);
            return this.invoke(vm, fr.thisObj, args, e);
          }
        }
        s = s.parent;
      }
      for (let c = sc.frame.cls.outer; c; c = c.outer) {
        const ms = this.methodsNamed(c, name);
        const m = this.select(ms.filter(x => x.static), args);
        if (m) return this.invoke(m, null, args, e);
        if (ms.length) throw this.err(`non-static method ${name}(${ms[0].params.map(p => p.type.name).join(',')}) cannot be referenced from a static context`, e);
      }
      for (const si of this.staticImports || []) {
        if (si.member !== '*' && si.member !== name) continue;
        const uc = this.resolveClass(si.cls);
        if (uc && !uc.builtin) { const m = this.select(this.methodsNamed(uc, name).filter(x => x.static), args, e); if (m) return this.invoke(m, null, args, e); continue; }
        if (this.lib.hasStatic(si.cls, name)) return this.lib.callStatic(si.cls, name, args, e);
      }
      throw this.err(`cannot find symbol\n  symbol:   method ${name}(${args.map(a => this.typeNameOf(a)).join(',')})\n  location: class ${sc.frame.cls.name}`, e);
    }
    evNew(e, sc) {
      if (e.body) {
        const ci = this.buildDynamicClass(e.body, e.type, sc, true);
        const args = this.evArgs(e.args, sc);
        if (ci.libIface) {
          // anonymous implementation of a library interface (e.g. new Comparator<T>() {...})
          return this.instantiate(ci, args, e, sc);
        }
        return this.instantiate(ci, args, e, sc);
      }
      const name = e.type.name;
      const ci = this.resolveClass(name);
      if (e.outer) {
        const oo = this.ev(e.outer, sc);
        if (oo === null) throw this.npe();
        sc = new Scope(null, { cls: oo.cls, thisObj: oo, method: '<init>', line: e.line });
      }
      if (ci && !ci.builtin || (ci && EXC[name])) {
        if (ci.kind === 'interface') throw this.err(`${ci.name} is abstract; cannot be instantiated`, e);
        if (ci.kind === 'enum') throw this.err(`enum classes may not be instantiated`, e);
        const args = this.evArgs(e.args, sc);
        if (ci.builtin) {
          const o = new JObject(ci);
          this.initFieldDefaults(o, ci);
          ci.nativeCtor(this, o, args, e);
          return o;
        }
        return this.instantiate(ci, args, e, sc);
      }
      if (name === 'Object') { const o = new JObject(this.objectClass); return o; }
      const args = this.evArgs(e.args, sc);
      return this.lib.create(name, e.type, args, e);
    }
    makeLambda(e, sc) {
      const rt = this;
      const f = new JFunc(function (args) {
        const ls = new Scope(sc, sc.frame);
        const ps = e.params;
        if (args.length !== ps.length) throw rt.err(`incompatible parameter types in lambda expression`, e);
        for (let i = 0; i < ps.length; i++) {
          const d = ps[i].type ? tdesc(ps[i].type) : null;
          ls.vars.set(ps[i].name, { v: d ? rt.coerce(args[i], d) : args[i], d });
        }
        if (e.body.k === 'Block') {
          const r = rt.execBlock(e.body.stmts, ls);
          if (r && r.k === 'r') return r.v;
          return undefined;
        }
        return rt.ev(e.body, ls);
      }, 'lambda');
      f.arity = e.params.length;
      return f;
    }
    makeMethodRef(e, sc) {
      const rt = this;
      const name = e.name;
      const t = e.target;
      // Type::method or Type::new
      let ref = null, recv, bound = false;
      if (t.k === 'TypeRef') ref = new JClassRef(t.type.name, this.resolveClass(t.type.name), !this.resolveClass(t.type.name));
      else if (t.k === 'Super') { recv = sc.frame.thisObj; bound = true; }
      else if (t.k === 'Name' && !this.lookup(t.name, sc, t) && (this.resolveClass(t.name) || this.lib.hasClass(t.name))) {
        const ci = this.resolveClass(t.name);
        ref = new JClassRef(t.name, ci, !ci);
      } else { recv = this.ev(t, sc); bound = true; if (recv instanceof JClassRef) { ref = recv; bound = false; } }
      if (bound) {
        if (recv === null) throw this.npe();
        if (t.k === 'Super') {
          return new JFunc(args => {
            const m = rt.select(rt.methodsNamed(sc.frame.cls.sup, name).filter(x => !x.abstract), args);
            return rt.invoke(m, recv, args, e);
          }, 'mref');
        }
        return new JFunc(args => rt.callMethod(recv, name, args, e), 'mref');
      }
      if (t.k === 'TypeRef' && t.type.dims > 0 && name === 'new') {
        return new JFunc(args => rt.newArray({ name: t.type.name }, [rt.coerce(args[0], 'int')], t.type.dims, e), 'mref');
      }
      if (name === 'new') {
        return new JFunc(args => {
          if (ref.ci) return rt.instantiate(ref.ci, args, e, sc);
          return rt.lib.create(ref.name, { name: ref.name, args: null, dims: 0 }, args, e);
        }, 'mref');
      }
      const mr = new JFunc(args => {
        if (ref.ci) {
          rt.ensureInit(ref.ci);
          const ms = rt.methodsNamed(ref.ci, name);
          const sm = rt.select(ms.filter(m => m.static), args);
          if (sm) return rt.invoke(sm, null, args, e);
          if (args.length && args[0] !== null) return rt.callMethod(args[0], name, args.slice(1), e);
          if (args.length && args[0] === null) throw rt.npe();
          throw rt.err(`invalid method reference\n  cannot find symbol: method ${name}`, e);
        }
        // library type: static first (Integer::parseInt, String::valueOf), else instance (String::length)
        if (rt.lib.hasStatic(ref.name, name, args.length)) return rt.lib.callStatic(ref.name, name, args, e);
        if (args.length && args[0] !== null) return rt.callMethod(args[0], name, args.slice(1), e);
        if (args.length) throw rt.npe();
        return rt.lib.callStatic(ref.name, name, args, e);
      }, 'mref');
      // how many arguments this reference expects (key extractor = 1, comparator = 2)
      if (ref.ci) {
        const ms = this.methodsNamed(ref.ci, name);
        const st = ms.find(m => m.static), inst = ms.find(m => !m.static);
        mr.arity = st ? st.params.length : inst ? inst.params.length + 1 : undefined;
      } else mr.arity = ['compare', 'compareTo', 'compareToIgnoreCase', 'equals', 'equalsIgnoreCase', 'max', 'min', 'sum'].includes(name) ? 2 : 1;
      return mr;
    }
    // ------------------------------------------------------------ run
    findMain() {
      const cands = [];
      for (const ci of this.userClasses) {
        const ms = ci.methods.get('main') || [];
        for (const m of ms) if (m.static && m.params.length === 1 && m.params[0].type.name === 'String' && m.params[0].type.dims === 1) cands.push({ ci, m });
        if (!cands.length) for (const m of ms) if (m.params.length === 0 && m.mods.has('static')) cands.push({ ci, m });
      }
      if (!cands.length) return null;
      const pub = cands.find(c => c.ci.decl.mods.has('public') && !c.ci.outer);
      return pub || cands.find(c => !c.ci.outer) || cands[0];
    }
    run() {
      this.deadline = Date.now() + this.timeLimit;
      const res = { status: 'done', exitCode: 0, error: null };
      try {
        const main = this.findMain();
        if (!main) {
          res.status = 'error';
          res.error = { msg: 'no main method found. Please define the main method as:\n   public static void main(String[] args)', line: 0 };
          return res;
        }
        const pubTop = this.userClasses.find(c => !c.outer && c.decl.mods.has('public'));
        this.fileName = (pubTop || main.ci).name + '.java';
        this.ensureInit(main.ci);
        this.invoke(main.m, null, main.m.params.length ? [new JArray('String', 1, [])] : [], null);
      } catch (ex0) {
        let ex = ex0;
        if (ex instanceof RangeError && /call stack|too much recursion/i.test(ex.message)) { this.frames = []; this.jsStack = true; ex = this.thr('StackOverflowError'); }
        if (ex instanceof JThrow) {
          let txt;
          try { txt = this.stackTraceText(ex.obj); } catch (e2) { txt = ex.obj.cls.qname + '\n'; }
          this.emit('Exception in thread "main" ' + txt, 'e');
          res.status = 'exception'; res.exitCode = 1;
          res.exception = ex.obj.cls.qname;
          if (this.jsStack && res.exception === 'java.lang.StackOverflowError') res.deep = this.peak;
        } else if (ex instanceof Halt) {
          if (ex.kind === 'exit') { res.exitCode = ex.code; }
          else if (ex.kind === 'input') res.status = 'input';
          else { res.status = ex.kind; res.error = { msg: ex.msg }; }
        } else if (ex && ex.isCompile) {
          res.status = 'error';
          res.error = { msg: ex.message, line: ex.line, col: ex.col, runtime: true };
        } else {
          res.status = 'internal';
          res.error = { msg: 'Internal interpreter error: ' + (ex && ex.message || ex), stack: ex && ex.stack };
        }
      }
      res.out = this.out;
      return res;
    }
  }
  JR.Interp = Interp;
  JR.ClassInfo = ClassInfo;
  JR.EXC = EXC;
  JR.IFACES = IFACES;
})(typeof window !== 'undefined' ? (window.JR = window.JR || {}) : (globalThis.JR = globalThis.JR || {}));

/* Compile + run + grade helpers shared by the page and the test scripts */
'use strict';
(function (JR) {
  const G = typeof window !== 'undefined' ? window : globalThis;

  // ---------------------------------------------------------------- compile
  // returns { unit, errors: [{line, col, msg}], warnings }
  function compile(src) {
    let unit;
    try { unit = G.JavaParser.parse(src); }
    catch (e) {
      if (e && e.isCompile) return { unit: null, errors: [{ line: e.line, col: e.col, msg: e.message }], warnings: [] };
      return { unit: null, errors: [{ line: 0, col: 1, msg: 'internal parser error: ' + (e && e.message) }], warnings: [] };
    }
    let errors = [];
    try { errors = JR.check(unit, src); } catch (e) { errors = []; }
    const warnings = JR.checkWarnings ? JR.checkWarnings() : [];
    if (!errors.length) {
      // a dry load catches remaining structural problems (unknown superclass etc.)
      try { const rt = new JR.Interp({}); rt.load(unit); }
      catch (e) { if (e && e.isCompile) errors = [{ line: e.line, col: e.col, msg: e.message }]; }
    }
    return { unit, errors, warnings };
  }

  // ---------------------------------------------------------------- run
  // opts: { input: [lines], interactive, seed, timeLimit }
  function run(unit, opts) {
    const rt = new JR.Interp(opts || {});
    rt.load(unit);
    const res = rt.run();
    res.sleepMs = rt.sleepMs || 0;
    return res;
  }
  function stdoutOf(res) { return res.out.filter(s => s.k === 'o').map(s => s.s).join(''); }
  function stderrOf(res) { return res.out.filter(s => s.k === 'e').map(s => s.s).join(''); }

  // ---------------------------------------------------------------- output matching
  const norm = s => s.toLowerCase().replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  // every expected snippet must appear, in order
  function matchExpect(stdout, expects) {
    const hay = ' ' + norm(stdout) + ' ';
    let pos = 0;
    for (let i = 0; i < expects.length; i++) {
      const needle = norm(expects[i]);
      const at = hay.indexOf(needle, pos);
      if (at < 0) {
        const anywhere = hay.indexOf(needle) >= 0;
        return { ok: false, index: i, outOfOrder: anywhere };
      }
      pos = at + needle.length;
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------- structural requirements
  function classes(unit) {
    const out = new Map();
    const reg = d => { out.set(d.name, d); d.inner.forEach(reg); };
    unit.types.forEach(reg);
    return out;
  }
  function walk(node, fn) {
    const seen = new Set();
    const go = n => {
      if (!n || typeof n !== 'object' || seen.has(n)) return;
      seen.add(n);
      if (Array.isArray(n)) { n.forEach(go); return; }
      fn(n);
      for (const k in n) {
        if (k === 'outer' || k === 'ci' || k === 'cci' || k === 'cls' || k === '_t' || k === '_c' || k === '_iface') continue;
        const v = n[k];
        if (v && typeof v === 'object') go(v);
      }
    };
    go(node);
  }
  function typeNames(t, acc) {
    if (!t) return acc;
    acc.push(t.name.replace(/^java\.util\./, ''));
    if (t.args) t.args.forEach(a => typeNames(a, acc));
    return acc;
  }
  function checkReq(unit, r) {
    const cls = classes(unit);
    const c = r.cls ? cls.get(r.cls) : null;
    const fields = d => d ? d.fields.flatMap(f => f.decls.map(x => ({ name: x.name, mods: f.mods, static: f.mods.has('static') }))) : [];
    switch (r.type) {
      case 'class': return !!cls.get(r.name) && cls.get(r.name).kind === 'class';
      case 'interface': return !!cls.get(r.name) && cls.get(r.name).kind === 'interface';
      case 'abstractClass': { const d = cls.get(r.name); return !!d && d.kind === 'class' && d.mods.has('abstract'); }
      case 'abstractMethod': return !!c && c.methods.some(m => m.name === r.method && (m.mods.has('abstract') || (c.kind === 'interface' && !m.body)));
      case 'extends': return !!c && !!c.ext && c.ext.name === r.sup;
      case 'implements': return !!c && c.impls.some(t => t.name === r.iface);
      case 'privateFields': {
        if (!c) return false;
        const fs = fields(c).filter(f => !f.static);
        if (r.names && !r.names.every(n => fs.some(f => f.name === n))) return false;
        if (r.min && fs.length < r.min) return false;
        return fs.length > 0 && fs.every(f => f.mods.has('private'));
      }
      case 'protectedFields': {
        if (!c) return false;
        const fs = fields(c);
        return r.names.every(n => fs.some(f => f.name === n && f.mods.has('protected')));
      }
      case 'method': {
        if (!c) return false;
        return c.methods.some(m => m.name === r.name && (!r.access || m.mods.has(r.access) || (c.kind === 'interface')) && (!r.ret || m.ret.name === r.ret));
      }
      case 'noMethod': return !c || !c.methods.some(m => m.name === r.name);
      case 'ctorParams': return !!c && c.ctors.some(k => k.params.length === r.n);
      case 'superCall': {
        if (!c || !c.ctors.length) return false;
        return c.ctors.every(k => { const s = k.body.stmts[0]; return s && s.k === 'ExprStmt' && s.e.k === 'CtorCall' && (s.e.kind === 'super' || s.e.kind === 'this'); }) &&
          c.ctors.some(k => { const s = k.body.stmts[0]; return s.e.kind === 'super'; });
      }
      case 'overrides': return !!c && c.methods.some(m => m.name === r.method && m.body);
      case 'usesType': {
        let found = false;
        walk(unit, n => { if (n.k === 'Type' && typeNames(n, []).some(x => r.names.includes(x))) found = true; });
        return found;
      }
      case 'throws': return !!c && c.methods.some(m => m.name === r.method && m.throws.some(t => t.name === r.exc));
      case 'usesNode': { let found = false; walk(unit, n => { if (n.k === r.kind) found = true; }); return found; }
      case 'calls': { let found = false; walk(unit, n => { if (n.k === 'Call' && r.names.includes(n.name)) found = true; }); return found; }
      case 'declType': {
        // a variable / field / parameter declared with this type (or with it as a generic argument)
        let found = false;
        const hit = t => t && (t.name === r.name || (r.generic && t.args && t.args.some(a => a && a.name === r.name)) || (!r.generic && t.args && t.args.some(a => a && a.name === r.name)));
        walk(unit, n => {
          if (n.k === 'Local' && hit(n.type)) found = true;
          if (n.k === 'Field' && hit(n.type)) found = true;
          if ((n.k === 'Method' || n.k === 'Ctor') && n.params.some(p => hit(p.type))) found = true;
          if (n.k === 'ForEach' && hit(n.type)) found = true;
        });
        return found;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- grade a question
  // returns { score, compileErrors, results: [{kind:'test'|'req', label, ok, detail}] }
  function grade(src, q, opts) {
    opts = opts || {};
    const comp = compile(src);
    if (comp.errors.length) return { score: 0, compileErrors: comp.errors, results: [], warnings: comp.warnings };
    const results = [];
    for (const t of q.tests) {
      const input = t.input.length ? t.input.split('\n') : [];
      let res;
      try { res = run(comp.unit, { input, interactive: false, seed: 777, timeLimit: opts.timeLimit || 3000 }); }
      catch (e) { res = { status: 'internal', out: [], error: { msg: String(e && e.message || e) } }; }
      const out = stdoutOf(res);
      let ok = false, detail = '';
      const m = matchExpect(out, t.expect);
      if (res.status === 'error' || res.status === 'internal') detail = (res.error && res.error.msg) || 'error';
      else if (res.status === 'timeout') detail = 'Time limit exceeded - is there an infinite loop?';
      else if (res.status === 'limit') detail = 'Too much output - is there an infinite loop?';
      else if (res.status === 'exception') {
        const err = stderrOf(res).split('\n')[0];
        detail = /NoSuchElementException/.test(err) ? 'The program kept asking for input after the test input ran out (' + err.replace('Exception in thread "main" ', '') + ')' : err;
        if (m.ok) detail = 'Output was right, but the program crashed: ' + err;
      }
      else if (!m.ok) detail = m.outOfOrder ? `Found "${t.expect[m.index]}" but not in the expected order` : `Expected to see: ${t.expect[m.index]}`;
      ok = m.ok && (res.status === 'done');
      results.push({ kind: 'test', label: t.name, ok, detail, transcript: res.out, input: t.input, expect: t.expect, missing: m.ok ? -1 : m.index });
    }
    for (const r of (q.reqs || [])) {
      let ok = false;
      try { ok = checkReq(comp.unit, r); } catch (e) { ok = false; }
      results.push({ kind: 'req', label: r.label, ok });
    }
    // structure points only count once the program produces correct output for at least one test
    const anyTest = results.some(r => r.kind === 'test' && r.ok);
    for (const r of results) if (r.kind === 'req' && !anyTest) r.locked = true;
    const passed = results.filter(r => r.ok && !r.locked).length;
    const score = results.length ? Math.round(100 * passed / results.length) : 0;
    return { score, compileErrors: [], results, warnings: comp.warnings };
  }

  JR.compile = compile;
  JR.runProgram = run;
  JR.stdoutOf = stdoutOf;
  JR.stderrOf = stderrOf;
  JR.matchExpect = matchExpect;
  JR.checkReq = checkReq;
  JR.grade = grade;
})(typeof window !== 'undefined' ? (window.JR = window.JR || {}) : (globalThis.JR = globalThis.JR || {}));

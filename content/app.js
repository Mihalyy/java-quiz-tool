(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'hehe-java-practice-v1';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const fresh = () => ({ code: {}, cur: {}, best: {}, fs: {}, theory: {}, theoryChecked: false, theoryScore: null, pg: null, tab: 'practice' });
  let state = Object.assign(fresh(), store.get());
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set(state), 250); };
  const saveNow = () => { clearTimeout(saveTimer); store.set(state); };
  window.addEventListener('beforeunload', saveNow);

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ======================================================================= execution engine
  // The interpreter runs inside a Web Worker (so an infinite loop never freezes the page).
  // If workers are unavailable it falls back to the main thread.
  const ENGINE_SRC = document.getElementById('engine').textContent;
  function workerMain() {
    let lastCode = null, lastComp = null;
    const comp = code => { if (code !== lastCode) { lastComp = JR.compile(code); lastCode = code; } return lastComp; };
    const handle = m => {
      if (m.type === 'ping') return { pong: true };
      if (m.type === 'compile') { const c = comp(m.code); return { errors: c.errors, warnings: c.warnings }; }
      if (m.type === 'run') {
        const c = comp(m.code);
        if (c.errors.length) return { errors: c.errors, warnings: c.warnings };
        const r = JR.runProgram(c.unit, m.opts);
        return { result: { status: r.status, out: r.out, exitCode: r.exitCode, deep: r.deep || 0, error: r.error ? { msg: r.error.msg, line: r.error.line, col: r.error.col } : null }, warnings: c.warnings };
      }
      if (m.type === 'grade') return { grade: JR.grade(m.code, m.q, m.opts) };
      return { fatal: 'unknown request' };
    };
    if (typeof self !== 'undefined' && typeof window === 'undefined') {
      self.onmessage = ev => {
        let out;
        try { out = handle(ev.data); } catch (e) { out = { fatal: String(e && e.message || e) }; }
        out.id = ev.data.id;
        self.postMessage(out);
      };
    }
    return handle;
  }
  const localHandle = workerMain();
  const Exec = {
    worker: null, seq: 0, pending: new Map(), mode: 'starting', readyP: null,
    start() {
      this.readyP = new Promise(resolve => {
        let done = false;
        const fallback = () => { if (done) return; done = true; this.mode = 'local'; if (this.worker) { try { this.worker.terminate(); } catch (e) { } } this.worker = null; resolve(); };
        try {
          const url = URL.createObjectURL(new Blob([ENGINE_SRC + '\n;(' + workerMain.toString() + ')();'], { type: 'text/javascript' }));
          const w = new Worker(url);
          w.onmessage = e => {
            if (e.data && e.data.pong) { if (!done) { done = true; this.mode = 'worker'; resolve(); } return; }
            const p = this.pending.get(e.data.id);
            if (p) { this.pending.delete(e.data.id); p(e.data); }
          };
          w.onerror = () => { if (!done) fallback(); };
          this.worker = w;
          w.postMessage({ type: 'ping', id: 0 });
          setTimeout(fallback, 2500);
        } catch (e) { fallback(); }
      });
      return this.readyP;
    },
    async request(msg) {
      await this.readyP;
      if (this.mode === 'worker' && this.worker) {
        return new Promise(resolve => { const id = ++this.seq; this.pending.set(id, resolve); this.worker.postMessage(Object.assign({ id }, msg)); });
      }
      // main-thread fallback: shorter time limits, run after a paint
      return new Promise(resolve => setTimeout(() => {
        let out;
        try { out = localHandle(msg); } catch (e) { out = { fatal: String(e && e.message || e) }; }
        resolve(out);
      }, 30));
    },
    // stop whatever is running (only possible with a worker)
    kill() {
      if (this.mode !== 'worker' || !this.worker) return false;
      this.worker.terminate();
      for (const p of this.pending.values()) p({ killed: true });
      this.pending.clear();
      this.start();
      return true;
    },
    limit(kind) { const w = this.mode === 'worker'; return kind === 'grade' ? (w ? 5000 : 2500) : (w ? 10000 : 4000); },
  };

  // ======================================================================= theme, clock, timer
  $('#themeBtn').onclick = () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem(KEY + '-theme', document.documentElement.dataset.theme); } catch (e) { }
  };
  try { const t = localStorage.getItem(KEY + '-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { }
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p2 = n => String(n).padStart(2, '0');
  let t0 = Date.now();
  function tick() {
    const d = new Date();
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }
    $('#clock').innerHTML = `${DAYS[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} - <b>${p2(d.getHours())}.${p2(d.getMinutes())}.${p2(d.getSeconds())}${tz ? '(' + esc(tz) + ')' : ''}</b>`;
    const s = Math.floor((Date.now() - t0) / 1000);
    $('#timer').textContent = `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`;
  }
  setInterval(tick, 1000); tick();
  $('#timer').onclick = () => { t0 = Date.now(); tick(); };

  // ======================================================================= tabs
  function showTab(tab) {
    state.tab = tab; save();
    for (const a of $$('.nav a[data-tab]')) a.classList.toggle('active', a.dataset.tab === tab);
    for (const t of ['practice', 'theory', 'playground']) $('#tab-' + t).classList.toggle('hidden', t !== tab);
    if (tab === 'playground') ensurePlayground();
    window.scrollTo({ top: 0 });
  }
  for (const a of $$('.nav a[data-tab]')) a.onclick = () => showTab(a.dataset.tab);

  // ======================================================================= syntax highlight
  const KW = new Set(('abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var yield record true false null').split(' '));
  const PRIMT = new Set('int long double float boolean char byte short void'.split(' '));
  function highlight(src, errLines) {
    let out = '', i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); const e = j < 0 ? n : j; out += `<span class="tk-cmt">${esc(src.slice(i, e))}</span>`; i = e; continue; }
      if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? n : j + 2; out += `<span class="tk-cmt">${esc(src.slice(i, e))}</span>`; i = e; continue; }
      if (c === '"' || c === "'") {
        let j = i + 1;
        if (c === '"' && src.startsWith('"""', i)) { const k = src.indexOf('"""', i + 3); j = k < 0 ? n : k + 3; out += `<span class="tk-str">${esc(src.slice(i, j))}</span>`; i = j; continue; }
        while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
        out += `<span class="tk-str">${esc(src.slice(i, j + 1))}</span>`; i = j + 1; continue;
      }
      if (c === '@' && /[A-Za-z]/.test(src[i + 1] || '')) { let j = i + 1; while (j < n && /\w/.test(src[j])) j++; out += `<span class="tk-ann">${esc(src.slice(i, j))}</span>`; i = j; continue; }
      if (/[0-9]/.test(c) && !/[\w$]/.test(src[i - 1] || '')) { let j = i; while (j < n && /[0-9a-fA-FxXlLdDfF._]/.test(src[j])) j++; out += `<span class="tk-num">${esc(src.slice(i, j))}</span>`; i = j; continue; }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
        const w = src.slice(i, j);
        let k = j; while (k < n && src[k] === ' ') k++;
        if (KW.has(w)) out += `<span class="tk-kw">${w}</span>`;
        else if (PRIMT.has(w)) out += `<span class="tk-kw">${w}</span>`;
        else if (src[k] === '(') out += `<span class="tk-fn">${w}</span>`;
        else if (/^[A-Z]/.test(w)) out += `<span class="tk-type">${w}</span>`;
        else out += w;
        i = j; continue;
      }
      out += esc(c); i++;
    }
    if (errLines && errLines.size) {
      out = out.split('\n').map((l, idx) => errLines.has(idx + 1) ? `<span class="errl">${l || ' '}</span>` : l).join('\n');
    }
    return out + '\n';
  }

  // ======================================================================= editor
  function createEditor(host, opts) {
    host.innerHTML = `<div class="editor" style="--fs:${opts.fs || 14}px">
        <div class="gutter">1</div>
        <div class="code"><pre></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" maxlength="${opts.max || 20000}" aria-label="${esc(opts.label || 'Java code')}"></textarea></div>
      </div>`;
    const ed = $('.editor', host), gut = $('.gutter', host), code = $('.code', host), hl = $('pre', host), ta = $('textarea', host);
    let errLines = new Set();
    ta.value = opts.code || '';
    const sync = () => {
      const v = ta.value;
      hl.innerHTML = highlight(v, errLines);
      const lines = v.split('\n').length;
      let g = '';
      for (let i = 1; i <= lines; i++) g += (errLines.has(i) ? `<span class="eline">${i}</span>` : i) + '\n';
      gut.innerHTML = g;
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
      ed.style.height = Math.max(opts.minH || 150, Math.min(opts.maxH || 560, lines * lh + 26)) + 'px';
      ta.style.height = Math.max(hl.scrollHeight, code.clientHeight) + 'px';
      ta.style.width = Math.max(hl.scrollWidth, code.clientWidth) + 'px';
      if (opts.onLen) opts.onLen(v.length);
    };
    code.addEventListener('scroll', () => { gut.scrollTop = code.scrollTop; });
    const insert = text => {
      ta.focus();
      // execCommand keeps the browser's undo history working
      if (!document.execCommand || !document.execCommand('insertText', false, text)) {
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.setRangeText(text, s, e, 'end');
        ta.dispatchEvent(new Event('input'));
      }
    };
    ta.addEventListener('input', () => { if (errLines.size) { errLines = new Set(); } sync(); if (opts.onChange) opts.onChange(ta.value); });
    ta.addEventListener('keydown', e => {
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (opts.onRun) opts.onRun(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        if (s === en && !e.shiftKey) { insert('    '); return; }
        // indent / outdent selected lines
        const le = v.indexOf('\n', en - (en > s && v[en - 1] === '\n' ? 1 : 0)); const end = le < 0 ? v.length : le;
        const block = v.slice(ls, end);
        const changed = block.split('\n').map(l => e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : '    ' + l).join('\n');
        ta.setSelectionRange(ls, end);
        insert(changed);
        ta.setSelectionRange(ls, ls + changed.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const indent = v.slice(ls, s).match(/^[ \t]*/)[0];
        const before = v.slice(ls, s).trimEnd();
        const after = v.slice(en).match(/^[ \t]*(.)?/);
        if (before.endsWith('{') && after && after[1] === '}') {
          insert('\n' + indent + '    \n' + indent);
          const pos = s + 1 + indent.length + 4;
          ta.setSelectionRange(pos, pos);
          return;
        }
        insert('\n' + indent + (/[{(\[]$/.test(before) ? '    ' : ''));
        return;
      }
      if (e.key === '}' && s === en) {
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const pre = v.slice(ls, s);
        if (/^ {4,}$/.test(pre)) { e.preventDefault(); ta.setSelectionRange(s - 4, s); insert('}'); return; }
      }
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const le = v.indexOf('\n', en); const end = le < 0 ? v.length : le;
        const lines = v.slice(ls, end).split('\n');
        const allC = lines.every(l => /^\s*\/\//.test(l) || !l.trim());
        const res = lines.map(l => allC ? l.replace(/^(\s*)\/\/ ?/, '$1') : (l.trim() ? l.replace(/^(\s*)/, '$1// ') : l)).join('\n');
        ta.setSelectionRange(ls, end); insert(res); ta.setSelectionRange(ls, ls + res.length);
      }
    });
    requestAnimationFrame(sync);
    return {
      el: ed, ta,
      get: () => ta.value,
      set: v => { ta.value = v; errLines = new Set(); sync(); if (opts.onChange) opts.onChange(v); },
      setFs: fs => { ed.style.setProperty('--fs', fs + 'px'); sync(); },
      setErrors: lines => { errLines = new Set(lines); sync(); },
      gotoLine: (line, col) => {
        const lines = ta.value.split('\n');
        let pos = 0; for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
        pos += Math.max(0, Math.min((col || 1) - 1, (lines[line - 1] || '').length));
        ta.focus(); ta.setSelectionRange(pos, pos);
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
        code.scrollTop = Math.max(0, (line - 4) * lh);
        ed.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      },
      sync,
    };
  }

  // ======================================================================= compile errors
  function fileNameOf(code) {
    const m = code.match(/public\s+(?:final\s+|abstract\s+)*(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)/);
    return (m ? m[1] : 'Main') + '.java';
  }
  function renderCompileErrors(box, errors, code, editor, extraNote) {
    if (!errors || !errors.length) { box.innerHTML = ''; box.classList.add('hidden'); if (editor) editor.setErrors([]); return; }
    const lines = code.split('\n');
    const fn = fileNameOf(code);
    const shown = errors.slice(0, 30);
    box.classList.remove('hidden');
    box.innerHTML = `<div class="ttl">Compilation failed${extraNote ? ' ' + esc(extraNote) : ''} - ${errors.length} error${errors.length > 1 ? 's' : ''}</div>` +
      shown.map((e, i) => {
        const parts = e.msg.split('\n');
        const src = e.line ? (lines[e.line - 1] || '') : '';
        const col = Math.max(1, e.col || 1);
        const caret = e.line ? '\n' + esc(src) + '\n' + ' '.repeat(Math.min(col - 1, src.length)) + '^' : '';
        return `<div class="cerr" data-i="${i}"><span class="loc">${esc(fn)}:${e.line || '?'}: error:</span> ${esc(parts[0])}${caret}${parts.length > 1 ? '\n' + esc(parts.slice(1).join('\n')) : ''}</div>`;
      }).join('');
    $$('.cerr', box).forEach(el => el.onclick = () => { const e = shown[+el.dataset.i]; if (editor && e.line) editor.gotoLine(e.line, e.col); });
    if (editor) editor.setErrors(errors.filter(e => e.line).map(e => e.line));
  }
  function renderWarnings(box, warnings) {
    if (!warnings || !warnings.length) { box.innerHTML = ''; return; }
    box.innerHTML = warnings.slice(0, 5).map(w => `⚠ line ${w.line}: ${esc(w.msg)}`).join('<br>');
  }

  // ======================================================================= console (interactive run)
  const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
  function segsHTML(out, opts) {
    let h = '';
    for (const s of out) {
      if (s.k === 'o') h += esc(s.s.replace(ANSI, ''));
      else if (s.k === 'i') h += `<span class="i">${esc(s.s)}</span>`;
      else h += `<span class="e">${esc(s.s)}</span>`;
    }
    return h;
  }
  function createConsole(host, getCode, ui) {
    host.innerHTML = `<div class="term-wrap hidden">
        <div class="term-bar"><span><span class="st">Console</span> <span class="sub"></span></span>
          <span>${ui.sampleInput ? '<button data-feed title="Run again and type the input of test 1 automatically">Use test input</button> ' : ''}<button data-stop>Stop</button> <button data-rerun>Run again</button> <button data-close>Close</button></span></div>
        <div class="term" tabindex="0"></div>
      </div>`;
    const wrap = $('.term-wrap', host), term = $('.term', host), st = $('.st', host), sub = $('.sub', host);
    const stopBtn = $('[data-stop]', host);
    let session = null, seq = 0;
    const setStatus = (s, extra) => { st.textContent = s; sub.textContent = extra || ''; };
    async function step(s) {
      setStatus('Running…');
      stopBtn.disabled = false;
      if (!s.out) term.innerHTML = '<span class="m">Compiling and running…</span>';
      const t = setTimeout(() => { if (session === s && s.busy) setStatus('Running…', '(still running - press Stop to end it)'); }, 1500);
      s.busy = true;
      const r = await Exec.request({ type: 'run', code: s.code, opts: { input: s.inputs, interactive: true, seed: s.seed, startTime: s.startTime, timeLimit: Exec.limit('run') } });
      s.busy = false;
      clearTimeout(t);
      if (session !== s) return;
      if (r.killed) { term.innerHTML = (s.out ? segsHTML(s.out) : '') + '<span class="m">\n^C\nProcess stopped.</span>'; setStatus('Stopped'); session = null; stopBtn.disabled = true; return; }
      if (r.fatal) { term.innerHTML = `<span class="e">Interpreter error: ${esc(r.fatal)}</span>`; setStatus('Error'); session = null; return; }
      if (r.errors && r.errors.length) {
        ui.showCompileErrors(r.errors, s.code);
        wrap.classList.add('hidden');
        session = null;
        return;
      }
      ui.showCompileErrors([], s.code, r.warnings);
      const res = r.result;
      s.out = res.out;
      let html = segsHTML(res.out);
      if (res.status === 'input') {
        term.innerHTML = html + '<input class="tin" aria-label="Program input" spellcheck="false" autocomplete="off">';
        const inp = $('input.tin', term);
        setStatus('Waiting for input', '(type and press Enter)');
        inp.focus({ preventScroll: true });
        term.scrollTop = term.scrollHeight;
        inp.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            s.inputs.push(inp.value);
            inp.replaceWith(Object.assign(document.createElement('span'), { className: 'i', textContent: inp.value + '\n' }));
            step(s);
          } else if (ev.key === 'c' && ev.ctrlKey) { ev.preventDefault(); stop(); }
        });
        inp.addEventListener('paste', ev => {
          const text = (ev.clipboardData || window.clipboardData).getData('text');
          if (text && text.includes('\n')) {
            ev.preventDefault();
            const ls = text.replace(/\r/g, '').split('\n');
            if (ls[ls.length - 1] === '') ls.pop();
            ls[0] = inp.value + ls[0];
            s.inputs.push(...ls);
            step(s);
          }
        });
        return;
      }
      stopBtn.disabled = true;
      session = null;
      if (res.status === 'done') { html += `<span class="m">\nProcess finished with exit code ${res.exitCode || 0}</span>`; setStatus('Finished', `(exit code ${res.exitCode || 0})`); }
      else if (res.status === 'exception') {
        if (res.deep) html += `<span class="m">\nNote: the in-browser interpreter ran out of stack after about ${res.deep} nested method calls. Real Java allows roughly 10 000, so if your recursion is not infinite it may still work in real Java.</span>`;
        html += `<span class="m">\nProcess finished with exit code 1</span>`; setStatus('Exception', '(uncaught - see the red text)');
      }
      else if (res.status === 'timeout') { html += `<span class="e">\n\nTime limit exceeded (${Exec.limit('run') / 1000} s). Is there an infinite loop?</span>`; setStatus('Time limit exceeded'); }
      else if (res.status === 'limit') { html += `<span class="e">\n\nOutput limit exceeded. Is there an infinite loop that prints?</span>`; setStatus('Output limit exceeded'); }
      else if (res.status === 'error') {
        const e = res.error || {};
        html += `<span class="e">\n\n${esc(e.line ? fileNameOf(s.code) + ':' + e.line + ': error: ' : 'error: ')}${esc(e.msg || '')}</span>`;
        if (e.line) ui.showCompileErrors([{ line: e.line, col: e.col, msg: e.msg }], s.code, null, '(found while running)');
        setStatus('Error');
      } else { html += `<span class="e">\n\n${esc((res.error && res.error.msg) || 'Interpreter error')}</span>`; setStatus('Error'); }
      term.innerHTML = html;
      term.scrollTop = term.scrollHeight;
    }
    function start(preInputs) {
      const code = getCode();
      wrap.classList.remove('hidden');
      term.innerHTML = '<span class="m">Compiling…</span>';
      session = { id: ++seq, code, inputs: preInputs ? preInputs.slice() : [], seed: (Math.random() * 1e9) | 0, startTime: Date.now(), out: null };
      step(session);
      setTimeout(() => wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
    }
    function stop() {
      if (!session) return;
      const s = session;
      if (s.busy) { if (!Exec.kill()) { toast('Cannot stop: the program runs on the page itself in this browser'); } return; }
      session = null;
      term.innerHTML = segsHTML(s.out || []) + '<span class="m">^C\nProcess stopped.</span>';
      setStatus('Stopped');
      stopBtn.disabled = true;
    }
    stopBtn.onclick = stop;
    const feed = $('[data-feed]', host);
    if (feed) feed.onclick = () => { if (session && session.busy) Exec.kill(); session = null; start(ui.sampleInput.split('\n')); };
    $('[data-rerun]', host).onclick = () => { if (session && session.busy) Exec.kill(); session = null; start(); };
    $('[data-close]', host).onclick = () => { if (session && session.busy) Exec.kill(); session = null; wrap.classList.add('hidden'); };
    term.addEventListener('click', () => { const i = $('input.tin', term); if (i) i.focus(); });
    return { start, stop };
  }

  // ======================================================================= code workspace (editor + console + errors)
  function createWorkspace(host, opts) {
    host.innerHTML = `<div data-ed></div>
      <div class="cerrs hidden" data-cerr></div>
      <div class="warns" data-warn></div>
      <div class="runrow"><div class="qlen">Code Length: <b data-len>0</b> / 20000</div>
        <div class="actions">${opts.extraButtons || ''}<button class="btn ghost" data-run title="Compile and run with your own input (Ctrl+Enter)">▶ Run</button>${opts.submit ? '<button class="btn" data-submit title="Check against the test cases">Submit</button>' : ''}</div></div>
      <div data-console></div>
      <div data-answer></div>
      <div data-feedback></div>`;
    const cerr = $('[data-cerr]', host), warn = $('[data-warn]', host), len = $('[data-len]', host);
    const editor = createEditor($('[data-ed]', host), { code: opts.code, fs: opts.fs, label: opts.label, onChange: opts.onChange, onRun: () => con.start(), onLen: n => { len.textContent = n; } });
    const ui = {
      sampleInput: opts.sampleInput || null,
      showCompileErrors: (errors, code, warnings, note) => { renderCompileErrors(cerr, errors, code, editor, note); renderWarnings(warn, warnings); },
    };
    const con = createConsole($('[data-console]', host), () => editor.get(), ui);
    $('[data-run]', host).onclick = () => con.start();
    return { editor, con, ui, host, cerr };
  }

  // ======================================================================= practice questions
  const Q = DATA.questions;
  function renderScores() {
    const ul = $('#scores');
    ul.innerHTML = Q.map(q => {
      const cur = state.cur[q.n] || 0, best = state.best[q.n] || 0;
      return `<li data-n="${q.n}" title="${esc(q.title)}"><span class="no">${q.n}.</span><span class="cur ${cur === 100 ? 'ok' : 'bad'}">${cur}/100</span><span class="best ${best === 100 ? 'ok' : 'bad'}">(${best})</span></li>`;
    }).join('');
    $$('li', ul).forEach(li => li.onclick = () => { showTab('practice'); setTimeout(() => document.getElementById('q' + li.dataset.n).scrollIntoView({ behavior: 'smooth' }), 30); });
    const practice = Math.floor(Q.reduce((a, q) => a + (state.cur[q.n] || 0), 0) / Q.length);
    const th = state.theoryScore;
    $('#theoryScore').innerHTML = th === null || th === undefined ? '<span class="lock">not checked yet</span>' : `<span class="${th === 100 ? 'ok' : th >= 60 ? '' : 'bad'}">${th}/100</span>`;
    const total = Math.round(practice * 0.7 + (th || 0) * 0.3);
    $('#total').textContent = total;
    $('#breakdown').textContent = `Practice ${practice} × 70% + Theory ${th || 0} × 30%`;
  }
  $('#resetAll').onclick = () => {
    if (!confirm('Clear all scores, theory answers and every piece of code you typed?')) return;
    state = fresh(); saveNow(); location.reload();
  };

  const UML = [
    { title: 'Q1 / Q9 / Q10', rows: [[{ n: 'Product', a: ['- productId : String', '- productName : String', '- productPrice : int', '- productStock : int'], m: ['+ Product(...)', '+ getters', '+ getTotalValue() : int'] }]] },
    { title: 'Q2 · access modifiers', rows: [[{ n: 'Member', a: ['- name : String', '- points : int'], m: ['+ getName() : String', '+ getPoints() : int', '+ addPoints(int)', '+ redeemPoints(int) : boolean'] }]] },
    { title: 'Q3 · inheritance', rows: [[{ n: 'Employee', a: ['# name : String', '# baseSalary : int'], m: ['+ calculateSalary() : int', '+ getRole() : String', '+ display()'] }], 'extends', [{ n: 'Cashier', a: ['- shiftCount : int'], m: ['+ calculateSalary() : int'] }, { n: 'Supervisor', a: ['- bonusPercent : int'], m: ['+ calculateSalary() : int'] }]] },
    { title: 'Q4 · abstraction', rows: [[{ n: 'Item', s: '«abstract»', a: ['- name : String', '- price : double'], m: ['+ getDiscountRate() : double «abstract»', '+ getFinalPrice() : double'] }], 'extends', [{ n: 'Food', m: ['10%'] }, { n: 'Beverage', m: ['5%'] }, { n: 'Household', m: ['15% if ≥ 50000'] }]] },
    { title: 'Q5 · interface', rows: [[{ n: 'Payment', s: '«interface»', a: ['+ ADMIN_FEE = 2500'], m: ['+ pay(double) : double', '+ getMethodName() : String'] }], 'implements', [{ n: 'Cash' }, { n: 'DebitCard' }, { n: 'EWallet' }]] },
    { title: 'Q11 · exceptions', rows: [[{ n: 'Exception', s: 'java.lang' }], 'extends', [{ n: 'OutOfStockException', m: ['+ OutOfStockException(String)'] }]] },
    { title: 'Q13 · CRUD + inheritance', rows: [[{ n: 'Member', s: '«abstract»', a: ['- id : String', '- name : String', '- phone : String'], m: ['+ getType() : String «abstract»', '+ getDiscount() : int «abstract»'] }], 'extends', [{ n: 'RegularMember', m: ['5%'] }, { n: 'VipMember', m: ['15%'] }]] },
  ];
  function umlBox(b) {
    const vis = l => l.replace(/^([-#+]) /, (m, v) => `<span class="vis ${v === '-' ? 'priv' : v === '#' ? 'prot' : 'pub'}">${v}</span>`);
    return `<div class="uml-box"><div class="nm">${b.s ? `<i>${esc(b.s)}</i>` : ''}${esc(b.n)}</div>${b.a ? `<div class="sec">${b.a.map(l => vis(esc(l))).join('<br>')}</div>` : ''}${b.m ? `<div class="sec">${b.m.map(l => vis(esc(l))).join('<br>')}</div>` : ''}</div>`;
  }
  $('#uml').innerHTML = UML.map(g => `<div class="uml-group"><div class="gt">${esc(g.title)}</div>${g.rows.map(r => typeof r === 'string' ? `<div class="uml-arrow">▲ ${r}</div>` : `<div class="uml-row">${r.map(umlBox).join('')}</div>`).join('')}</div>`).join('');

  // sample runs come from the model answers (run once, lazily)
  const sampleCache = {};
  function sampleRun(q) {
    if (sampleCache[q.n]) return sampleCache[q.n];
    const c = JR.compile(q.answer);
    const input = q.tests[0].input.split('\n');
    const r = JR.runProgram(c.unit, { input, interactive: false, seed: 1, timeLimit: 3000 });
    return (sampleCache[q.n] = r.out);
  }

  const workspaces = {};
  function questionHTML(q) {
    const bullets = (q.bullets || []).map(b => `<div class="bul">${esc(b)}</div>`).join('');
    const fs = state.fs[q.n] || 14;
    return `<section class="q" id="q${q.n}">
      <div class="qtitle"><span class="n">${q.n}.</span>${esc(q.title)}</div>
      <div class="qtext">${esc(q.text)}${bullets}</div>
      <div class="qmeta"><div class="hint">(${esc(q.hint)})</div>
        <label class="tsize">Text Size <input type="number" min="10" max="30" value="${fs}" data-fs></label></div>
      <details class="sample" data-sample><summary>Sample run (test 1 of ${q.tests.length})</summary>
        <div class="term" data-sample-term></div>
        <div class="sample-note">Green text is what the user typed. Submit checks ${q.tests.length} test cases${q.reqs && q.reqs.length ? ` + ${q.reqs.length} code requirements` : ''}: the important output lines must appear in this order (spaces, | and upper/lower case are ignored).</div>
      </details>
      <div data-ws></div>
    </section>`;
  }
  function wireQuestion(q) {
    const sec = document.getElementById('q' + q.n);
    const code = state.code[q.n] !== undefined ? state.code[q.n] : q.starter;
    const ws = createWorkspace($('[data-ws]', sec), {
      code, fs: state.fs[q.n] || 14, submit: true, label: `Java code for question ${q.n}`, sampleInput: q.tests[0].input,
      extraButtons: '<button class="answer-link" data-ans>Show answer</button><button class="answer-link" data-reset>Reset code</button><button class="answer-link" data-dl title="Save this code as a .java file for your IDE">Download .java</button>',
      onChange: v => { state.code[q.n] = v; save(); },
    });
    workspaces[q.n] = ws;
    $('[data-fs]', sec).addEventListener('input', e => {
      const v = Math.min(30, Math.max(10, parseInt(e.target.value, 10) || 14));
      state.fs[q.n] = v; save(); ws.editor.setFs(v);
    });
    $('[data-sample]', sec).addEventListener('toggle', e => {
      if (!e.target.open) return;
      const t = $('[data-sample-term]', sec);
      if (t.dataset.done) return;
      try { t.innerHTML = segsHTML(sampleRun(q)); } catch (err) { t.textContent = 'Could not build the sample: ' + err.message; }
      t.dataset.done = '1';
    });
    $('[data-dl]', sec).onclick = () => downloadText(fileNameOf(ws.editor.get()), ws.editor.get(), 'text/x-java');
    $('[data-reset]', sec).onclick = () => {
      if (!confirm('Replace your code with the starter code?')) return;
      ws.editor.set(q.starter); state.code[q.n] = q.starter; save();
    };
    $('[data-ans]', sec).onclick = e => {
      const box = $('[data-answer]', sec);
      if (box.innerHTML) { box.innerHTML = ''; e.target.textContent = 'Show answer'; return; }
      if (!confirm('Show a model answer for this question? Try it yourself first!')) return;
      box.innerHTML = `<div class="answer">${highlight(q.answer)}</div><div class="answer-tools"><button class="btn ghost small" data-copyans>Copy answer into the editor</button></div>`;
      $('[data-copyans]', box).onclick = () => { if (confirm('Overwrite your code with the model answer?')) { ws.editor.set(q.answer); state.code[q.n] = q.answer; save(); } };
      e.target.textContent = 'Hide answer';
    };
    const subBtn = $('[data-submit]', sec);
    subBtn.onclick = async () => {
      if (subBtn.disabled) return;
      const fb = $('[data-feedback]', sec);
      subBtn.disabled = true; subBtn.textContent = 'Checking…';
      fb.innerHTML = '';
      const codeNow = ws.editor.get();
      const r = await Exec.request({ type: 'grade', code: codeNow, q: { tests: q.tests, reqs: q.reqs }, opts: { timeLimit: Exec.limit('grade') } });
      let g = r.grade;
      if (r.killed || r.fatal || !g) g = { score: 0, compileErrors: [], results: [], fatal: r.fatal || 'stopped' };
      ws.ui.showCompileErrors(g.compileErrors, codeNow, g.warnings);
      renderFeedback(fb, g, q);
      state.cur[q.n] = g.score; state.best[q.n] = Math.max(state.best[q.n] || 0, g.score); save(); renderScores();
      // short cooldown like the real site
      let left = 3; subBtn.textContent = `Wait for ${left} seconds`;
      const iv = setInterval(() => {
        left--;
        if (left <= 0) { clearInterval(iv); subBtn.disabled = false; subBtn.textContent = 'Submit'; }
        else subBtn.textContent = `Wait for ${left} second${left === 1 ? '' : 's'}`;
      }, 1000);
    };
  }
  function highlightExpected(out, expect, missing) {
    // mark the lines of the transcript that matched expectations (best effort)
    return segsHTML(out);
  }
  function renderFeedback(fb, g, q) {
    const cls = g.score === 100 ? 'ok' : g.score >= 50 ? 'mid' : 'bad';
    if (g.compileErrors && g.compileErrors.length) {
      fb.innerHTML = `<div class="feedback bad"><b>0/100</b> - the code does not compile. Fix the errors shown above the Run button first.</div>`;
      return;
    }
    if (g.fatal) { fb.innerHTML = `<div class="feedback bad"><b>0/100</b> - checking failed: ${esc(g.fatal)}</div>`; return; }
    const tests = g.results.filter(r => r.kind === 'test'), reqs = g.results.filter(r => r.kind === 'req');
    const anyLocked = reqs.some(r => r.locked);
    const li = r => {
      if (r.kind === 'req') return `<li><span class="mk ${r.ok && !r.locked ? 'ok' : 'bad'}">${r.ok && !r.locked ? '✓' : r.locked && r.ok ? '○' : '✗'}</span>${esc(r.label)}${r.locked && r.ok ? ' <span class="lock">(counts once a test passes)</span>' : ''}</li>`;
      const exp = r.expect.map((x, i) => `<div><span class="${r.missing < 0 || i < r.missing ? 'ok' : i === r.missing ? 'bad' : 'lock'}">${r.missing < 0 || i < r.missing ? '✓' : i === r.missing ? '✗' : '·'}</span> ${esc(x)}</div>`).join('');
      return `<li><span class="mk ${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '✗'}</span>Test: ${esc(r.label)}${r.ok ? '' : `<div class="det">${esc(r.detail || '')}</div>`}
        <details><summary>${r.ok ? 'Show run' : 'Show input, expected lines and your output'}</summary>
          <div class="sample-note">Input:</div><div class="term" style="max-height:140px;border-radius:6px">${esc(r.input || '(none)')}</div>
          <div class="sample-note">Expected lines (in order):</div><div class="explain mono" style="font-size:12.5px">${exp}</div>
          <div class="sample-note">Your program (green = input):</div><div class="term" style="border-radius:6px">${segsHTML(r.transcript || [])}</div>
        </details></li>`;
    };
    fb.innerHTML = `<div class="feedback ${cls}"><b>${g.score}/100</b>${g.score === 100 ? ' - correct!' : ''}
      <ul class="res-list">${tests.map(li).join('')}${reqs.map(li).join('')}</ul>
      ${anyLocked ? '<div class="sample-note">Code-structure points are only awarded once at least one test case passes.</div>' : ''}</div>`;
  }

  // ======================================================================= theory
  const TH = DATA.theory;
  let tFilter = 'All';
  function renderTheory() {
    const topics = ['All', ...new Set(TH.map(t => t.topic))];
    $('#tfilters').innerHTML = topics.map(t => `<button class="${t === tFilter ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}${t === 'All' ? '' : ' (' + TH.filter(x => x.topic === t).length + ')'}</button>`).join('');
    $$('#tfilters button').forEach(b => b.onclick = () => { tFilter = b.dataset.t; renderTheory(); });
    const checked = state.theoryChecked;
    $('#theory').innerHTML = TH.map((t, i) => {
      if (tFilter !== 'All' && t.topic !== tFilter) return '';
      const sel = state.theory[i];
      return `<div class="tq" id="tq${i}"><div class="tp">${i + 1}. ${esc(t.topic)}</div><div class="qq">${esc(t.q)}</div>
        ${t.code ? `<pre>${highlight(t.code)}</pre>` : ''}
        ${t.options.map((o, j) => {
          let c = '';
          if (checked) { if (j === t.answer) c = 'right'; else if (sel === j) c = 'wrong'; }
          return `<label class="opt ${c}"><input type="radio" name="t${i}" value="${j}" ${sel === j ? 'checked' : ''} ${checked ? 'disabled' : ''}><span>${String.fromCharCode(65 + j)}. ${esc(o)}</span></label>`;
        }).join('')}
        ${checked ? `<div class="explain">${sel === t.answer ? '<b class="ok">Correct.</b> ' : sel === undefined ? '<b class="bad">Not answered.</b> ' : '<b class="bad">Incorrect.</b> '}${esc(t.explain)}</div>` : ''}
      </div>`;
    }).join('');
    $$('#theory input[type=radio]').forEach(r => r.onchange = () => { state.theory[+r.name.slice(1)] = +r.value; save(); updateTheoryBar(); });
    updateTheoryBar();
  }
  function updateTheoryBar() {
    const answered = Object.keys(state.theory).length;
    if (state.theoryChecked) {
      const right = TH.filter((t, i) => state.theory[i] === t.answer).length;
      $('#tscoreTop').innerHTML = `Score: <span class="${right === TH.length ? 'ok' : ''}">${state.theoryScore}/100</span> <span class="lock" style="font-size:13px;font-weight:600">(${right}/${TH.length} correct)</span>`;
    } else $('#tscoreTop').innerHTML = `<span class="lock" style="font-size:14px">${answered}/${TH.length} answered</span>`;
  }
  $('#tCheck').onclick = () => {
    const answered = Object.keys(state.theory).length;
    if (answered < TH.length && !confirm(`You answered ${answered} of ${TH.length} questions. Check anyway?`)) return;
    const right = TH.filter((t, i) => state.theory[i] === t.answer).length;
    state.theoryChecked = true; state.theoryScore = Math.round(100 * right / TH.length); save();
    renderTheory(); renderScores(); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  $('#tRetry').onclick = () => {
    if (!confirm('Clear your theory answers?')) return;
    state.theory = {}; state.theoryChecked = false; save(); renderTheory(); renderScores();
  };

  // ======================================================================= playground
  let pgWs = null;
  function ensurePlayground() {
    if (pgWs) return;
    const ex = DATA.examples;
    $('#pgExample').innerHTML = ex.map((e, i) => `<option value="${i}">${esc(e.title)}</option>`).join('');
    pgWs = createWorkspace($('#pgHost'), { code: state.pg !== null && state.pg !== undefined ? state.pg : ex[0].code, fs: 14, label: 'Playground Java code', onChange: v => { state.pg = v; save(); } });
    pgWs.editor.el.style.minHeight = '320px';
    $('#pgLoad').onclick = () => {
      const e = ex[+$('#pgExample').value];
      if (pgWs.editor.get().trim() && !confirm('Replace the playground code with "' + e.title + '"?')) return;
      pgWs.editor.set(e.code); state.pg = e.code; save();
    };
  }

  function downloadText(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // ======================================================================= download case
  $('#dlBtn').onclick = () => {
    let t = 'HEHE GROCERIES - JAVA OOP PRACTICE (UTS P1-P7)\n' + '='.repeat(48) + '\n\n';
    t += 'Theory 30%: OOP concepts & Java data structures, access modifiers.\nPractice 70%: code a menu application with CRUD that uses an ArrayList.\n\n';
    for (const q of Q) {
      t += `${q.n}. ${q.title}\n${q.text}\n` + q.bullets.map(b => '   - ' + b).join('\n') + '\n';
      try {
        const out = sampleRun(q).map(s => s.s).join('');
        t += '\n   Sample input:\n' + q.tests[0].input.split('\n').map(l => '      ' + l).join('\n') + '\n\n   Sample run:\n' + out.replace(/\n$/, '').split('\n').map(l => '      ' + l).join('\n') + '\n';
      } catch (e) { }
      t += '\n' + '-'.repeat(60) + '\n\n';
    }
    downloadText('Hehe_Groceries_Java_Practice.txt', t);
  };

  // ======================================================================= boot
  Exec.start();
  $('#questions').innerHTML = Q.map(questionHTML).join('');
  Q.forEach(wireQuestion);
  renderScores();
  renderTheory();
  showTab(state.tab && ['practice', 'theory', 'playground'].includes(state.tab) ? state.tab : 'practice');
  $('#loading').remove();
})();

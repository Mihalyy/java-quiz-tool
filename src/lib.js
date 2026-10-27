/* Java standard library subset */
'use strict';
(function (JR) {
  const { JD, JC, JL, JObject, JArray, JClassRef, JFunc, JThrow, Halt, d2i, d2l, fmtDouble, fmtFloat, fixedHalfUp, sciHalfUp, group } = JR;

  // ---------------------------------------------------------------- numeric helpers
  const nk = v => typeof v === 'number' ? 0 : v instanceof JC ? 0 : v instanceof JL ? 1 : v instanceof JD ? (v.f ? 2 : 3) : -1;
  const isNum = v => typeof v === 'number' || v instanceof JD || v instanceof JC || v instanceof JL;
  const numVal = v => typeof v === 'number' ? v : v instanceof JL ? Number(v.v) : v.v;
  const lv = v => typeof v === 'number' ? BigInt(v) : v instanceof JC ? BigInt(v.v) : v.v;
  function strCompare(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { const d = a.charCodeAt(i) - b.charCodeAt(i); if (d) return d; }
    return a.length - b.length;
  }
  const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k)) ? o[k] : undefined;
  JR.own = own;
  JR.nk = nk; JR.isNum = isNum; JR.numVal = numVal; JR.lv = lv; JR.strCompare = strCompare;
  const ARR_CODES = { int: 'I', double: 'D', char: 'C', boolean: 'Z', long: 'J', float: 'F', byte: 'B', short: 'S' };
  JR.arrCode = a => '['.repeat(a.dims - 1) + (ARR_CODES[a.et] || ('L' + JR.libQName(a.et) + ';'));

  // ---------------------------------------------------------------- library type table
  const LIB_TYPES = {
    ArrayList: ['ArrayList', 'List', 'Collection', 'Iterable', 'AbstractList', 'RandomAccess', 'SequencedCollection'],
    LinkedList: ['LinkedList', 'List', 'Deque', 'Queue', 'Collection', 'Iterable', 'AbstractList', 'SequencedCollection'],
    ImmutableList: ['List', 'Collection', 'Iterable'],
    Stack: ['Stack', 'Vector', 'List', 'Collection', 'Iterable', 'AbstractList', 'RandomAccess'],
    Vector: ['Vector', 'List', 'Collection', 'Iterable', 'AbstractList', 'RandomAccess'],
    ArrayDeque: ['ArrayDeque', 'Deque', 'Queue', 'Collection', 'Iterable'],
    PriorityQueue: ['PriorityQueue', 'Queue', 'Collection', 'Iterable', 'AbstractQueue'],
    HashMap: ['HashMap', 'Map', 'AbstractMap'], LinkedHashMap: ['LinkedHashMap', 'HashMap', 'Map', 'AbstractMap', 'SequencedMap'],
    TreeMap: ['TreeMap', 'Map', 'SortedMap', 'NavigableMap', 'AbstractMap'], ImmutableMap: ['Map'],
    HashSet: ['HashSet', 'Set', 'Collection', 'Iterable', 'AbstractSet'], LinkedHashSet: ['LinkedHashSet', 'HashSet', 'Set', 'Collection', 'Iterable', 'AbstractSet'],
    TreeSet: ['TreeSet', 'Set', 'SortedSet', 'NavigableSet', 'Collection', 'Iterable', 'AbstractSet'], ImmutableSet: ['Set', 'Collection', 'Iterable'],
    KeySet: ['Set', 'Collection', 'Iterable'], Values: ['Collection', 'Iterable'], EntrySet: ['Set', 'Collection', 'Iterable'],
    StringBuilder: ['StringBuilder', 'CharSequence', 'Appendable'], StringBuffer: ['StringBuffer', 'CharSequence', 'Appendable'],
    Scanner: ['Scanner', 'Closeable', 'AutoCloseable', 'Iterator'], Random: ['Random'], Iterator: ['Iterator', 'ListIterator'], Entry: ['Map.Entry', 'Entry'],
    PrintStream: ['PrintStream'], InputStream: ['InputStream'], BufferedReader: ['BufferedReader', 'Reader', 'Closeable', 'AutoCloseable'],
    InputStreamReader: ['InputStreamReader', 'Reader'], Locale: ['Locale'], Optional: ['Optional'], Stream: ['Stream', 'IntStream', 'DoubleStream', 'LongStream'],
  };
  const KNOWN_LIB = new Set(['String', 'Object', 'Math', 'Integer', 'Double', 'Long', 'Float', 'Short', 'Byte', 'Boolean', 'Character', 'Number', 'System',
    'Arrays', 'Collections', 'List', 'Map', 'Set', 'Objects', 'Thread', 'Comparator', 'Collection', 'Queue', 'Deque', 'Iterable', 'CharSequence',
    'StringBuilder', 'StringBuffer', 'Scanner', 'Random', 'ArrayList', 'LinkedList', 'HashMap', 'LinkedHashMap', 'TreeMap', 'HashSet', 'LinkedHashSet',
    'TreeSet', 'Stack', 'Vector', 'ArrayDeque', 'PriorityQueue', 'Iterator', 'ListIterator', 'Map.Entry', 'Entry', 'PrintStream', 'InputStream', 'BufferedReader',
    'InputStreamReader', 'Locale', 'Optional', 'Stream', 'IntStream', 'Collectors', 'SortedMap', 'NavigableMap', 'SortedSet', 'NavigableSet', 'AbstractList',
    'RandomAccess', 'Appendable', 'Function', 'BiFunction', 'Consumer', 'BiConsumer', 'Supplier', 'Predicate', 'BiPredicate', 'UnaryOperator',
    'BinaryOperator', 'Runnable', 'Comparable', 'Iterable', 'Void', 'StackTraceElement', 'IntBinaryOperator', 'IntUnaryOperator', 'IntPredicate', 'ToIntFunction', 'ToDoubleFunction', 'IntFunction',
    'SequencedCollection', 'SequencedMap', 'AbstractMap', 'AbstractSet', 'AbstractQueue', 'Cloneable', 'Serializable', 'Record', 'Enum', 'Callable', 'StrictMath', 'TimeUnit']);
  const PKG = {
    Scanner: 'java.util', Random: 'java.util', ArrayList: 'java.util', LinkedList: 'java.util', HashMap: 'java.util', LinkedHashMap: 'java.util', TreeMap: 'java.util',
    HashSet: 'java.util', LinkedHashSet: 'java.util', TreeSet: 'java.util', Stack: 'java.util', Vector: 'java.util', ArrayDeque: 'java.util', PriorityQueue: 'java.util',
    Iterator: 'java.util', ListIterator: 'java.util', List: 'java.util', Map: 'java.util', Set: 'java.util', Arrays: 'java.util', Collections: 'java.util', Objects: 'java.util',
    Comparator: 'java.util', Collection: 'java.util', Queue: 'java.util', Deque: 'java.util', Optional: 'java.util', Locale: 'java.util', SortedMap: 'java.util',
    NavigableMap: 'java.util', SortedSet: 'java.util', NavigableSet: 'java.util', AbstractList: 'java.util', RandomAccess: 'java.util', 'Map.Entry': 'java.util', Entry: 'java.util',
    SequencedCollection: 'java.util', SequencedMap: 'java.util', AbstractMap: 'java.util', AbstractSet: 'java.util', AbstractQueue: 'java.util',
    PrintStream: 'java.io', InputStream: 'java.io', BufferedReader: 'java.io', InputStreamReader: 'java.io', Serializable: 'java.io', Closeable: 'java.io',
    Stream: 'java.util.stream', IntStream: 'java.util.stream', Collectors: 'java.util.stream', TimeUnit: 'java.util.concurrent', Callable: 'java.util.concurrent',
    Function: 'java.util.function', BiFunction: 'java.util.function', Consumer: 'java.util.function', BiConsumer: 'java.util.function', Supplier: 'java.util.function',
    Predicate: 'java.util.function', BiPredicate: 'java.util.function', UnaryOperator: 'java.util.function', BinaryOperator: 'java.util.function',
    IntBinaryOperator: 'java.util.function', IntUnaryOperator: 'java.util.function', IntPredicate: 'java.util.function', ToIntFunction: 'java.util.function',
    ToDoubleFunction: 'java.util.function', IntFunction: 'java.util.function',
    InputMismatchException: 'java.util', NoSuchElementException: 'java.util', ConcurrentModificationException: 'java.util', EmptyStackException: 'java.util',
    IllegalFormatException: 'java.util', IllegalFormatConversionException: 'java.util', MissingFormatArgumentException: 'java.util', UnknownFormatConversionException: 'java.util',
    IOException: 'java.io', FileNotFoundException: 'java.io', UncheckedIOException: 'java.io',
  };
  JR.LIB_PKG = PKG;
  JR.KNOWN_LIB = KNOWN_LIB;
  JR.isLibType = n => KNOWN_LIB.has(n) || KNOWN_LIB.has(n.replace(/^java\.(util|lang|io)\.(function\.)?/, ''));
  JR.libQName = n => {
    if (n.indexOf('.') > 0 && /^java\./.test(n)) return n;
    if (n === 'Map.Entry' || n === 'Entry') return 'java.util.Map$Entry';
    if (PKG[n]) return PKG[n] + '.' + n;
    return 'java.lang.' + n;
  };
  const WRAP_TYPES = {
    number: ['Integer', 'Number', 'Comparable', 'Serializable'], JD: ['Double', 'Number', 'Comparable'], JDf: ['Float', 'Number', 'Comparable'],
    JC: ['Character', 'Comparable'], JL: ['Long', 'Number', 'Comparable'], boolean: ['Boolean', 'Comparable'], string: ['String', 'CharSequence', 'Comparable', 'Serializable'],
  };
  JR.libInstanceOf = (rt, v, name) => {
    if (name.startsWith('java.')) name = name.slice(name.lastIndexOf('.') + 1);
    let types;
    if (typeof v === 'number') types = WRAP_TYPES.number;
    else if (typeof v === 'string') types = WRAP_TYPES.string;
    else if (typeof v === 'boolean') types = WRAP_TYPES.boolean;
    else if (v instanceof JD) types = v.f ? WRAP_TYPES.JDf : WRAP_TYPES.JD;
    else if (v instanceof JC) types = WRAP_TYPES.JC;
    else if (v instanceof JL) types = WRAP_TYPES.JL;
    else if (v instanceof JFunc) {
      const ci = rt.resolveClass(name);
      return ci ? ci.kind === 'interface' : KNOWN_LIB.has(name);
    } else if (v instanceof JArray) return false;
    else if (v && v.ltype) types = LIB_TYPES[v.ltype] || [v.ltype];
    else return false;
    return types.includes(name);
  };

  // ---------------------------------------------------------------- printf / String.format
  function jformat(rt, fmt, args) {
    let out = '', ai = 0, last = 0, lastArg = null;
    const re = /%(\d+\$)?([-#+ 0,(<]*)?(\d+)?(\.\d+)?([a-zA-Z%])/g;
    let m;
    const fe = (name, msg) => rt.thr(name, msg);
    while ((m = re.exec(fmt)) !== null) {
      out += fmt.slice(last, m.index);
      last = re.lastIndex;
      const [spec, idx, flagsRaw, widthS, precS, conv] = m;
      const flags = flagsRaw || '';
      const width = widthS ? parseInt(widthS, 10) : -1;
      const prec = precS ? parseInt(precS.slice(1), 10) : -1;
      const left = flags.includes('-');
      if (conv === 'n') { out += '\n'; continue; }
      if (conv === '%') { out += pad('%', width, left, false); continue; }
      let arg;
      if (flags.includes('<')) arg = lastArg;
      else if (idx) { const k = parseInt(idx, 10) - 1; if (k >= args.length) throw fe('MissingFormatArgumentException', `Format specifier '${spec}'`); arg = args[k]; }
      else { if (ai >= args.length) throw fe('MissingFormatArgumentException', `Format specifier '${spec}'`); arg = args[ai++]; }
      lastArg = arg;
      let s;
      const lc = conv.toLowerCase();
      const upper = conv !== lc;
      const typeOf = v => rt.qTypeName(v);
      switch (lc) {
        case 's': s = rt.jstr(arg); if (prec >= 0) s = s.slice(0, prec); break;
        case 'b': s = arg === null ? 'false' : typeof arg === 'boolean' ? String(arg) : 'true'; if (prec >= 0) s = s.slice(0, prec); break;
        case 'c':
          if (arg === null) s = 'null';
          else if (arg instanceof JC) s = String.fromCharCode(arg.v);
          else if (typeof arg === 'number') s = String.fromCodePoint(arg);
          else throw fe('IllegalFormatConversionException', `c != ${typeOf(arg)}`);
          break;
        case 'd': {
          if (arg === null) { s = 'null'; break; }
          let big;
          if (typeof arg === 'number') big = BigInt(arg);
          else if (arg instanceof JL) big = arg.v;
          else throw fe('IllegalFormatConversionException', `d != ${typeOf(arg)}`);
          const neg = big < 0n;
          let digits = (neg ? -big : big).toString();
          if (flags.includes(',')) digits = group(digits);
          s = signed(digits, neg, flags, width);
          break;
        }
        case 'x': case 'o': case 'h': {
          if (arg === null) { s = 'null'; break; }
          if (lc === 'h') { s = (rt.jhash(arg) >>> 0).toString(16); break; }
          let big;
          if (typeof arg === 'number') big = BigInt(arg >>> 0);
          else if (arg instanceof JL) big = BigInt.asUintN(64, arg.v);
          else throw fe('IllegalFormatConversionException', `${conv} != ${typeOf(arg)}`);
          s = big.toString(lc === 'x' ? 16 : 8);
          if (flags.includes('#')) s = (lc === 'x' ? '0x' : '0') + s;
          if (flags.includes('0') && width > s.length) s = s.padStart(width, '0');
          break;
        }
        case 'f': case 'e': case 'g': {
          if (arg === null) { s = 'null'; break; }
          if (!(arg instanceof JD)) throw fe('IllegalFormatConversionException', `${conv} != ${typeOf(arg)}`);
          const x = arg.v;
          if (Number.isNaN(x) || !isFinite(x)) {
            s = Number.isNaN(x) ? 'NaN' : (x > 0 ? (flags.includes('+') ? '+Infinity' : 'Infinity') : (flags.includes('(') ? '(Infinity)' : '-Infinity'));
            break;
          }
          const p = prec >= 0 ? prec : 6;
          const neg = x < 0 || (x === 0 && 1 / x < 0);
          let body;
          if (lc === 'f') {
            body = fixedHalfUp(x, p, arg.f);
            if (flags.includes(',')) { const [i, f] = body.split('.'); body = group(i) + (f !== undefined ? '.' + f : ''); }
          } else if (lc === 'e') body = sciHalfUp(x, p, arg.f, upper);
          else {
            const a = Math.abs(x);
            const pp = p === 0 ? 1 : p;
            if (a !== 0 && (a < 1e-4 || a >= Math.pow(10, pp))) body = sciHalfUp(x, pp - 1, arg.f, upper);
            else { const e = a === 0 ? 0 : Math.floor(Math.log10(a)); body = fixedHalfUp(x, Math.max(0, pp - 1 - e), arg.f); }
          }
          s = signed(body, neg, flags, width);
          break;
        }
        default:
          throw fe('UnknownFormatConversionException', `Conversion = '${conv}'`);
      }
      if (upper) s = s.toUpperCase();
      out += pad(s, width, left, false);
    }
    out += fmt.slice(last);
    // lone '%' at the end or unknown sequence
    const bad = fmt.slice(last).match(/%/);
    if (bad) throw rt.thr('UnknownFormatConversionException', `Conversion = '%'`);
    return out;
  }
  function signed(digits, neg, flags, width) {
    let sign = '';
    if (neg) sign = flags.includes('(') ? '(' : '-';
    else if (flags.includes('+')) sign = '+';
    else if (flags.includes(' ')) sign = ' ';
    let tail = neg && flags.includes('(') ? ')' : '';
    if (flags.includes('0') && width > 0) {
      const padLen = width - sign.length - tail.length - digits.length;
      if (padLen > 0) digits = '0'.repeat(padLen) + digits;
    }
    return sign + digits + tail;
  }
  function pad(s, width, left) {
    if (width < 0 || s.length >= width) return s;
    return left ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
  }
  JR.jformat = jformat;

  // ---------------------------------------------------------------- regex helpers (Java -> JS)
  function jre(rt, pattern, flags) {
    let p = pattern
      .replace(/\\p\{Alpha\}/g, '[A-Za-z]').replace(/\\p\{Digit\}/g, '[0-9]').replace(/\\p\{Alnum\}/g, '[A-Za-z0-9]')
      .replace(/\\p\{Upper\}/g, '[A-Z]').replace(/\\p\{Lower\}/g, '[a-z]').replace(/\\p\{Punct\}/g, '[!-\\/:-@\\[-`{-~]')
      .replace(/\\p\{Space\}/g, '\\s').replace(/\\p\{javaLetter\}/g, '\\p{L}')
      .replace(/\\Q([\s\S]*?)(\\E|$)/g, (m, lit) => lit.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'))
      .replace(/\(\?i\)/g, () => { flags = (flags || '') + 'i'; return ''; })
      .replace(/([*+?}])\+/g, '$1'); // possessive -> greedy
    try { return new RegExp(p, (flags || '') + (/\\p\{/.test(p) ? 'u' : '')); }
    catch (e) { throw rt.thr('PatternSyntaxException', e.message); }
  }
  function javaReplacement(rt, rep) {
    // returns function for String.replace
    return (...m) => {
      const groups = m.slice(1, -2);
      let out = '';
      for (let i = 0; i < rep.length; i++) {
        const c = rep[i];
        if (c === '\\') { i++; if (i >= rep.length) throw rt.thr('IllegalArgumentException', 'character to be escaped is missing'); out += rep[i]; }
        else if (c === '$') {
          let j = i + 1, num = '';
          while (j < rep.length && /[0-9]/.test(rep[j])) { num += rep[j]; j++; }
          if (!num) throw rt.thr('IllegalArgumentException', 'Illegal group reference');
          const g = parseInt(num, 10);
          if (g === 0) out += m[0];
          else if (g > groups.length) throw rt.thr('IndexOutOfBoundsException', 'No group ' + g);
          else out += groups[g - 1] === undefined ? '' : groups[g - 1];
          i = j - 1;
        } else out += c;
      }
      return out;
    };
  }
  function jsplit(rt, s, regex, limit) {
    // fast path for single literal char
    let rx;
    if (regex.length === 1 && !'.$|()[{^?*+\\'.includes(regex)) rx = new RegExp(regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    else { const r0 = jre(rt, regex); rx = new RegExp(r0.source, 'g' + r0.flags.replace('g', '')); }
    if (s.length === 0) return [''];
    const parts = [];
    let last = 0, m, matched = false;
    while ((m = rx.exec(s)) !== null) {
      if (m[0].length === 0) {
        if (m.index >= s.length) break;
        if (m.index === 0) { rx.lastIndex++; continue; }
      }
      if (limit > 0 && parts.length === limit - 1) break;
      matched = true;
      parts.push(s.slice(last, m.index));
      last = m.index + m[0].length;
      if (m[0].length === 0) rx.lastIndex++;
    }
    if (!matched) return [s];
    parts.push(s.slice(last));
    if (limit === 0) while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    return parts;
  }

  // ---------------------------------------------------------------- number parsing
  function parseIntJ(rt, s, radix) {
    radix = radix || 10;
    if (s === null) throw rt.thr('NumberFormatException', 'Cannot parse null string: null');
    const rs = radix === 10 ? '' : ` under radix ${radix}`;
    const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix);
    const re = new RegExp(`^[+-]?[${digits}]+$`, 'i');
    if (!re.test(s)) throw rt.thr('NumberFormatException', `For input string: "${s}"${rs}`);
    let neg = s[0] === '-';
    const body = s.replace(/^[+-]/, '');
    let v = 0n;
    for (const ch of body.toLowerCase()) v = v * BigInt(radix) + BigInt(digits.indexOf(ch));
    if (neg) v = -v;
    return { v, rs };
  }
  function parseInt32(rt, s, radix) {
    const { v, rs } = parseIntJ(rt, s, radix);
    if (v > 2147483647n || v < -2147483648n) throw rt.thr('NumberFormatException', `For input string: "${s}"${rs}`);
    return Number(v);
  }
  function parseInt64(rt, s, radix) {
    const { v, rs } = parseIntJ(rt, s, radix);
    if (v > 9223372036854775807n || v < -9223372036854775808n) throw rt.thr('NumberFormatException', `For input string: "${s}"${rs}`);
    return v;
  }
  function parseDoubleJ(rt, s) {
    if (s === null) throw rt.npe();
    const t = s.trim();
    if (t === '') throw rt.thr('NumberFormatException', 'empty String');
    if (/^[+-]?NaN$/.test(t)) return NaN;
    if (/^[+-]?Infinity$/.test(t)) return t[0] === '-' ? -Infinity : Infinity;
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[fFdD]?$/.test(t)) throw rt.thr('NumberFormatException', `For input string: "${s}"`);
    return Number(t.replace(/[fFdD]$/, ''));
  }

  // ---------------------------------------------------------------- Java Random (48-bit LCG)
  const MULT = 0x5DEECE66Dn, MASK = (1n << 48n) - 1n;
  class JRandom {
    constructor(seed) { this.ltype = 'Random'; this.jtype = 'Random'; this.setSeed(seed); this.hash = 0; }
    setSeed(seed) { this.seed = (BigInt.asIntN(64, BigInt(seed)) ^ MULT) & MASK; }
    next(bits) {
      this.seed = (this.seed * MULT + 0xBn) & MASK;
      return Number(BigInt.asIntN(32, this.seed >> BigInt(48 - bits)));
    }
    nextInt(bound) {
      if (bound === undefined) return this.next(32);
      if (bound <= 0) throw new Error('bound');
      if ((bound & -bound) === bound) return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
      let bits, val;
      do { bits = this.next(31); val = bits % bound; } while (((bits - val + (bound - 1)) | 0) < 0);
      return val;
    }
    nextIntRange(origin, bound) {
      let r = this.next(32);
      const n = (bound - origin) | 0, m = (n - 1) | 0;
      if ((n & m) === 0) return ((r & m) + origin) | 0;
      if (n > 0) {
        for (let u = r >>> 1; ((u + m - (r = u % n)) | 0) < 0; u = this.next(32) >>> 1);
        return (r + origin) | 0;
      }
      while (r < origin || r >= bound) r = this.next(32);
      return r;
    }
    nextLong() { return BigInt.asIntN(64, (BigInt(this.next(32)) << 32n) + BigInt(this.next(32))); }
    nextDouble() { return (this.next(26) * 134217728 + this.next(27)) * Math.pow(2, -53); }
    nextFloat() { return this.next(24) / (1 << 24); }
    nextBoolean() { return this.next(1) !== 0; }
    nextGaussian() {
      if (this.haveNext) { this.haveNext = false; return this.nextG; }
      let v1, v2, s;
      do { v1 = 2 * this.nextDouble() - 1; v2 = 2 * this.nextDouble() - 1; s = v1 * v1 + v2 * v2; } while (s >= 1 || s === 0);
      const mul = Math.sqrt(-2 * Math.log(s) / s);
      this.nextG = v2 * mul; this.haveNext = true;
      return v1 * mul;
    }
  }

  // ---------------------------------------------------------------- collections
  class JList {
    constructor(kind, a, fixed) { this.ltype = kind; this.jtype = kind; this.a = a || []; this.mod = 0; this.fixed = fixed || 0; this.hash = 0; }
  }
  class JPQ {
    constructor(cmp) { this.ltype = 'PriorityQueue'; this.jtype = 'PriorityQueue'; this.q = []; this.cmp = cmp || null; this.mod = 0; this.hash = 0; }
  }
  class JMap {
    constructor(kind, cmp) {
      this.ltype = kind; this.jtype = kind; this.buckets = new Map(); this.size = 0; this.seq = 0; this.cap = 16; this.mod = 0; this.cmp = cmp || null;
      this.sorted = kind === 'TreeMap' ? [] : null; this.hash = 0; this.immutable = false;
    }
  }
  class JSet {
    constructor(kind, cmp) { this.ltype = kind; this.jtype = kind; this.m = new JMap(kind === 'TreeSet' ? 'TreeMap' : kind === 'LinkedHashSet' ? 'LinkedHashMap' : kind === 'ImmutableSet' ? 'LinkedHashMap' : 'HashMap', cmp); this.hash = 0; this.immutable = kind === 'ImmutableSet'; }
  }
  class JView { constructor(kind, m) { this.ltype = kind; this.jtype = kind === 'Values' ? 'Collection' : 'Set'; this.m = m; this.hash = 0; } }
  class JEntry { constructor(e, m) { this.ltype = 'Entry'; this.jtype = 'Map.Entry'; this.e = e; this.m = m; this.hash = 0; } }
  class JIter { constructor(src) { this.ltype = 'Iterator'; this.jtype = 'Iterator'; this.src = src; this.hash = 0; } }
  class JSB { constructor(kind, s) { this.ltype = kind; this.jtype = kind; this.s = s || ''; this.hash = 0; } }
  class JScanner { constructor(src) { this.ltype = 'Scanner'; this.jtype = 'Scanner'; this.buf = ''; this.pos = 0; this.src = src; this.closed = false; this.hash = 0; } }
  class JPrint { constructor(kind) { this.ltype = 'PrintStream'; this.jtype = 'PrintStream'; this.kind = kind; this.hash = 0; } }
  class JReader { constructor(kind) { this.ltype = kind; this.jtype = kind; this.sc = null; this.hash = 0; } }
  class JLocale { constructor(n) { this.ltype = 'Locale'; this.jtype = 'Locale'; this.n = n; } }
  class JOptional { constructor(v) { this.ltype = 'Optional'; this.jtype = 'Optional'; this.v = v; } }
  class JStream { constructor(a, kind) { this.ltype = 'Stream'; this.jtype = kind || 'Stream'; this.a = a; this.kind = kind || 'Stream'; } }

  // ---------------------------------------------------------------- factory
  JR.makeLib = function (rt) {
    const thr = (n, m) => rt.thr(n, m);
    const npe = m => rt.npe(m);
    const toI = v => rt.coerce(v, 'int');
    const D = x => new JD(x);
    const unsupported = () => thr('UnsupportedOperationException', null);
    const cerr = (msg, node) => rt.err(msg, node);
    const noMethod = (type, name, args, node) => cerr(`cannot find symbol\n  symbol:   method ${name}(${args.map(a => rt.typeNameOf(a)).join(',')})\n  location: class ${type}`, node);
    const outOfBounds = (i, n) => thr('IndexOutOfBoundsException', `Index ${i} out of bounds for length ${n}`);
    const seqCmp = (cmp) => cmp ? ((x, y) => toI(rt.callFn(cmp, [x, y], 'compare'))) : ((x, y) => rt.jcompare(x, y));

    let randSeq = 0;
    const newSeed = () => BigInt(rt.seed) * 6364136223846793005n + BigInt(++randSeq) * 1442695040888963407n;
    let mathRandom = null;

    // ---------------- iteration
    function listIter(l) {
      let cursor = 0, lastRet = -1, expected = l.mod;
      return {
        hasNext: () => cursor !== l.a.length,
        next: () => {
          if (l.mod !== expected) throw thr('ConcurrentModificationException');
          if (cursor >= l.a.length) throw thr('NoSuchElementException');
          lastRet = cursor; return l.a[cursor++];
        },
        remove: () => {
          if (lastRet < 0) throw thr('IllegalStateException');
          if (l.mod !== expected) throw thr('ConcurrentModificationException');
          if (l.fixed) throw unsupported();
          l.a.splice(lastRet, 1); cursor = lastRet; lastRet = -1; l.mod++; expected = l.mod;
        },
        set: v => { if (lastRet < 0) throw thr('IllegalStateException'); l.a[lastRet] = v; },
        add: v => { l.a.splice(cursor, 0, v); cursor++; lastRet = -1; l.mod++; expected = l.mod; },
        hasPrevious: () => cursor > 0,
        previous: () => { if (cursor <= 0) throw thr('NoSuchElementException'); cursor--; lastRet = cursor; return l.a[cursor]; },
        nextIndex: () => cursor, previousIndex: () => cursor - 1,
      };
    }
    function mapIter(m, f) {
      const ents = entries(m);
      let i = 0, expected = m.mod, last = null;
      return {
        hasNext: () => i < ents.length,
        next: () => {
          if (m.mod !== expected) throw thr('ConcurrentModificationException');
          if (i >= ents.length) throw thr('NoSuchElementException');
          last = ents[i++]; return f(last);
        },
        remove: () => {
          if (!last) throw thr('IllegalStateException');
          if (m.mod !== expected) throw thr('ConcurrentModificationException');
          mapRemove(m, last.k); last = null; expected = m.mod;
        },
      };
    }
    function iterator(v, node) {
      if (v instanceof JList) return listIter(v);
      if (v instanceof JArray) { let i = 0; return { hasNext: () => i < v.a.length, next: () => v.a[i++] }; }
      if (v instanceof JSet) return mapIter(v.m, e => e.k);
      if (v instanceof JView) {
        if (v.ltype === 'KeySet') return mapIter(v.m, e => e.k);
        if (v.ltype === 'Values') return mapIter(v.m, e => e.v);
        return mapIter(v.m, e => new JEntry(e, v.m));
      }
      if (v instanceof JPQ) { const a = v.q.slice(); let i = 0, exp = v.mod; return { hasNext: () => i < a.length, next: () => { if (v.mod !== exp) throw thr('ConcurrentModificationException'); return a[i++]; } }; }
      if (v instanceof JStream) { let i = 0; return { hasNext: () => i < v.a.length, next: () => v.a[i++] }; }
      if (v instanceof JIter) return v.src;
      if (v instanceof JObject) {
        const it = rt.callMethod(v, 'iterator', [], node);
        if (it instanceof JIter) return it.src;
        return { hasNext: () => !!rt.callMethod(it, 'hasNext', [], node), next: () => rt.callMethod(it, 'next', [], node) };
      }
      if (v instanceof JMap) throw cerr('for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    ' + v.jtype, node);
      if (typeof v === 'string') throw cerr('for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    String', node);
      throw cerr('for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    ' + rt.typeNameOf(v), node);
    }
    function toArr(v, node) {
      if (v instanceof JList) return v.a.slice();
      if (v instanceof JArray) return v.a.slice();
      const r = [];
      const it = iterator(v, node);
      while (it.hasNext()) r.push(it.next());
      return r;
    }
    // ---------------- maps
    const spread = h => (h ^ (h >>> 16));
    function mfind(m, k) {
      if (m.sorted) {
        const c = seqCmp(m.cmp);
        let lo = 0, hi = m.sorted.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const r = c(k, m.sorted[mid].k);
          if (r === 0) return m.sorted[mid];
          if (r < 0) hi = mid - 1; else lo = mid + 1;
        }
        return null;
      }
      const h = rt.jhash(k);
      const b = m.buckets.get(h);
      if (!b) return null;
      for (const e of b) if (e.k === k || (k !== null && rt.jequals(k, e.k))) return e;
      return null;
    }
    function mput(m, k, v) {
      if (m.immutable) throw unsupported();
      if (m.sorted) {
        if (k === null) throw npe();
        const c = seqCmp(m.cmp);
        if (!m.sorted.length) c(k, k); // type check like Java
        let lo = 0, hi = m.sorted.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const r = c(k, m.sorted[mid].k);
          if (r === 0) { const old = m.sorted[mid].v; m.sorted[mid].v = v; return old; }
          if (r < 0) hi = mid - 1; else lo = mid + 1;
        }
        m.sorted.splice(lo, 0, { k, v, seq: m.seq++ });
        m.size++; m.mod++;
        return null;
      }
      const e = mfind(m, k);
      if (e) { const old = e.v; e.v = v; return old; }
      const h = rt.jhash(k);
      let b = m.buckets.get(h);
      if (!b) { b = []; m.buckets.set(h, b); }
      b.push({ k, v, h, seq: m.seq++ });
      m.size++; m.mod++;
      if (m.size > m.cap * 0.75) m.cap *= 2;
      return null;
    }
    function mapRemove(m, k) {
      if (m.immutable) throw unsupported();
      if (m.sorted) {
        const e = mfind(m, k);
        if (!e) return null;
        m.sorted.splice(m.sorted.indexOf(e), 1); m.size--; m.mod++;
        return e;
      }
      const h = rt.jhash(k);
      const b = m.buckets.get(h);
      if (!b) return null;
      const i = b.findIndex(e => e.k === k || (k !== null && rt.jequals(k, e.k)));
      if (i < 0) return null;
      const [e] = b.splice(i, 1);
      if (!b.length) m.buckets.delete(h);
      m.size--; m.mod++;
      return e;
    }
    function entries(m) {
      if (m.sorted) return m.sorted.slice();
      const all = [];
      for (const b of m.buckets.values()) for (const e of b) all.push(e);
      if (m.ltype === 'LinkedHashMap') all.sort((a, b) => a.seq - b.seq);
      else {
        const mask = m.cap - 1;
        all.sort((a, b) => ((spread(a.h) & mask) - (spread(b.h) & mask)) || (a.seq - b.seq));
      }
      return all;
    }
    function mclear(m) { if (m.immutable) throw unsupported(); m.buckets = new Map(); if (m.sorted) m.sorted = []; m.size = 0; m.mod++; }
    function newMap(kind, cmp) { return new JMap(kind, cmp); }
    function newSet(kind, cmp) { return new JSet(kind, cmp); }
    // ---------------- PriorityQueue (same sift algorithm as java.util.PriorityQueue)
    function pqCmp(pq) { return seqCmp(pq.cmp); }
    function pqOffer(pq, x) {
      if (x === null) throw npe();
      const q = pq.q, c = pqCmp(pq);
      let k = q.length; q.push(x);
      if (k === 0) c(x, x);
      while (k > 0) { const p = (k - 1) >>> 1; const e = q[p]; if (c(x, e) >= 0) break; q[k] = e; k = p; }
      q[k] = x; pq.mod++;
      return true;
    }
    function pqSiftDown(pq, k, x) {
      const q = pq.q, c = pqCmp(pq), n = q.length;
      const half = n >>> 1;
      while (k < half) {
        let child = (k << 1) + 1; let o = q[child]; const r = child + 1;
        if (r < n && c(o, q[r]) > 0) o = q[child = r];
        if (c(x, o) <= 0) break;
        q[k] = o; k = child;
      }
      q[k] = x;
    }
    function pqPoll(pq) {
      const q = pq.q;
      if (!q.length) return null;
      const res = q[0];
      const x = q.pop();
      if (q.length) pqSiftDown(pq, 0, x);
      pq.mod++;
      return res;
    }
    function pqRemoveAt(pq, i) {
      const q = pq.q; pq.mod++;
      const s = q.length - 1;
      if (s === i) { q.pop(); return; }
      const moved = q.pop();
      pqSiftDown(pq, i, moved);
      if (q[i] === moved) {
        // sift up
        const c = pqCmp(pq); let k = i; const x = moved;
        while (k > 0) { const p = (k - 1) >>> 1; const e = q[p]; if (c(x, e) >= 0) break; q[k] = e; k = p; }
        q[k] = x;
      }
    }
    // ---------------- toString helpers
    function seqStr(arr) { return '[' + arr.map(x => rt.jstr(x)).join(', ') + ']'; }
    function mapStr(m) { return '{' + entries(m).map(e => rt.jstr(e.k) + '=' + rt.jstr(e.v)).join(', ') + '}'; }
    JList.prototype.toJ = function () { return '[' + this.a.map(x => x === this ? '(this Collection)' : rt.jstr(x)).join(', ') + ']'; };
    JPQ.prototype.toJ = function () { return seqStr(this.q); };
    JMap.prototype.toJ = function () { return mapStr(this); };
    JSet.prototype.toJ = function () { return seqStr(entries(this.m).map(e => e.k)); };
    JView.prototype.toJ = function () { return seqStr(toArr(this)); };
    JEntry.prototype.toJ = function () { return rt.jstr(this.e.k) + '=' + rt.jstr(this.e.v); };
    JSB.prototype.toJ = function () { return this.s; };
    JIter.prototype.toJ = function () { return 'java.util.Itr@' + rt.idHash(this).toString(16); };
    JScanner.prototype.toJ = function () { return 'java.util.Scanner[delimiters=\\p{javaWhitespace}+]'; };
    JRandom.prototype.toJ = function () { return 'java.util.Random@' + rt.idHash(this).toString(16); };
    JPrint.prototype.toJ = function () { return 'java.io.PrintStream@' + rt.idHash(this).toString(16); };
    JLocale.prototype.toJ = function () { return this.n; };
    JOptional.prototype.toJ = function () { return this.v === null ? 'Optional.empty' : 'Optional[' + rt.jstr(this.v) + ']'; };
    JStream.prototype.toJ = function () { return 'java.util.stream.ReferencePipeline@' + rt.idHash(this).toString(16); };
    JReader.prototype.toJ = function () { return 'java.io.' + this.ltype + '@' + rt.idHash(this).toString(16); };
    // equality / hash
    const seqEq = (a, b) => a.length === b.length && a.every((x, i) => rt.jequals(x, b[i]) || (x === null && b[i] === null));
    JList.prototype.jequals = function (rt, o) { return (o instanceof JList) && seqEq(this.a, o.a); };
    JList.prototype.jhash = function (rt) { let h = 1; for (const x of this.a) h = (Math.imul(31, h) + rt.jhash(x)) | 0; return h; };
    JSet.prototype.jequals = function (rt, o) { if (!(o instanceof JSet || o instanceof JView)) return false; const b = toArr(o); return b.length === this.m.size && b.every(x => !!mfind(this.m, x)); };
    JSet.prototype.jhash = function (rt) { let h = 0; for (const e of entries(this.m)) h = (h + rt.jhash(e.k)) | 0; return h; };
    JMap.prototype.jequals = function (rt, o) { if (!(o instanceof JMap) || o.size !== this.size) return false; return entries(this).every(e => { const f = mfind(o, e.k); return f && (rt.jequals(e.v, f.v) || (e.v === null && f.v === null)); }); };
    JMap.prototype.jhash = function (rt) { let h = 0; for (const e of entries(this)) h = (h + (rt.jhash(e.k) ^ rt.jhash(e.v))) | 0; return h; };
    JEntry.prototype.jequals = function (rt, o) { return o instanceof JEntry && rt.jequals(this.e.k, o.e.k) && rt.jequals(this.e.v, o.e.v); };
    JEntry.prototype.jhash = function (rt) { return rt.jhash(this.e.k) ^ rt.jhash(this.e.v); };
    JOptional.prototype.jequals = function (rt, o) { return o instanceof JOptional && (this.v === o.v || rt.jequals(this.v, o.v)); };

    // ---------------- Scanner
    const isWS = c => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f' || c === '\u000b' || c === '\u00a0' || c === '\u2028';
    function scPull(sc) {
      if (sc.closed) throw thr('IllegalStateException', 'Scanner closed');
      let line;
      if (sc.src === 'stdin') { line = rt.readLine(); if (line === null) return false; }
      else { if (sc.strDone) return false; sc.strDone = true; sc.buf = sc.buf.slice(sc.pos) + sc.src; sc.pos = 0; return sc.src.length > 0; }
      sc.buf = sc.buf.slice(sc.pos) + line + '\n'; sc.pos = 0;
      return true;
    }
    function scSkipWS(sc) {
      while (true) {
        while (sc.pos < sc.buf.length && isWS(sc.buf[sc.pos])) sc.pos++;
        if (sc.pos < sc.buf.length) return true;
        if (!scPull(sc)) return false;
      }
    }
    function scPeekToken(sc) {
      if (!scSkipWS(sc)) return null;
      let j = sc.pos;
      while (true) {
        while (j < sc.buf.length && !isWS(sc.buf[j])) j++;
        if (j < sc.buf.length || sc.src === 'stdin') break;
        if (!scPull(sc)) break;
        j = sc.pos; // re-scan after pull (string source)
        while (j < sc.buf.length && !isWS(sc.buf[j])) j++;
        break;
      }
      return { tok: sc.buf.slice(sc.pos, j), end: j };
    }
    function scNext(sc) {
      const t = scPeekToken(sc);
      if (!t) throw thr('NoSuchElementException');
      sc.pos = t.end;
      return t.tok;
    }
    const INT_RE = /^[+-]?\d+$/;
    function scNextInt(sc, kind, radix) {
      const t = scPeekToken(sc);
      if (!t) throw thr('NoSuchElementException');
      let tok = t.tok;
      const clean = (radix || 10) === 10 ? tok.replace(/(?<=\d),(?=\d{3})/g, '') : tok;
      let v;
      try {
        if (kind === 'long') v = parseInt64(rt, clean, radix || 10);
        else {
          v = parseInt32(rt, clean, radix || 10);
          if (kind === 'short' && (v < -32768 || v > 32767)) throw 0;
          if (kind === 'byte' && (v < -128 || v > 127)) throw 0;
        }
      } catch (e) {
        if (e instanceof JThrow || e === 0) throw thr('InputMismatchException', /^[+-]?\d+$/.test(clean) ? `For input string: "${clean}"` + ((radix || 10) !== 10 ? ` under radix ${radix}` : '') : null);
        throw e;
      }
      sc.pos = t.end;
      return kind === 'long' ? new JL(v) : v;
    }
    function scNextDouble(sc, isFloat) {
      const t = scPeekToken(sc);
      if (!t) throw thr('NoSuchElementException');
      const tok = t.tok.replace(/(?<=\d),(?=\d{3})/g, '');
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(tok) && !/^[+-]?(NaN|Infinity)$/.test(tok)) throw thr('InputMismatchException', null);
      sc.pos = t.end;
      const v = Number(tok);
      return isFloat ? new JD(Math.fround(v), true) : D(v);
    }
    function scNextLine(sc) {
      if (sc.pos >= sc.buf.length && !scPull(sc)) throw thr('NoSuchElementException', 'No line found');
      let i = sc.buf.indexOf('\n', sc.pos);
      if (i < 0) { const r = sc.buf.slice(sc.pos); sc.pos = sc.buf.length; return r; }
      let r = sc.buf.slice(sc.pos, i);
      if (r.endsWith('\r')) r = r.slice(0, -1);
      sc.pos = i + 1;
      return r;
    }
    const SCANNER = {
      nextInt: (sc, a) => scNextInt(sc, 'int', a.length ? toI(a[0]) : 10),
      nextLong: (sc, a) => scNextInt(sc, 'long', a.length ? toI(a[0]) : 10),
      nextShort: sc => scNextInt(sc, 'short'),
      nextByte: sc => scNextInt(sc, 'byte'),
      nextDouble: sc => scNextDouble(sc, false),
      nextFloat: sc => scNextDouble(sc, true),
      nextBoolean: sc => {
        const t = scPeekToken(sc);
        if (!t) throw thr('NoSuchElementException');
        if (!/^(true|false)$/i.test(t.tok)) throw thr('InputMismatchException', null);
        sc.pos = t.end; return t.tok.toLowerCase() === 'true';
      },
      next: sc => scNext(sc),
      nextLine: sc => scNextLine(sc),
      hasNext: sc => !!scPeekToken(sc),
      hasNextInt: sc => { const t = scPeekToken(sc); if (!t) return false; const s = t.tok.replace(/(?<=\d),(?=\d{3})/g, ''); if (!INT_RE.test(s)) return false; const v = BigInt(s); return v <= 2147483647n && v >= -2147483648n; },
      hasNextLong: sc => { const t = scPeekToken(sc); return !!t && INT_RE.test(t.tok); },
      hasNextDouble: sc => { const t = scPeekToken(sc); return !!t && /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t.tok.replace(/(?<=\d),(?=\d{3})/g, '')); },
      hasNextBoolean: sc => { const t = scPeekToken(sc); return !!t && /^(true|false)$/i.test(t.tok); },
      hasNextLine: sc => sc.pos < sc.buf.length || scPull(sc),
      close: sc => { sc.closed = true; },
      skip: (sc, a) => { const re = jre(rt, '^(?:' + a[0] + ')'); if (sc.pos >= sc.buf.length) scPull(sc); const m = sc.buf.slice(sc.pos).match(re); if (!m) throw thr('NoSuchElementException'); sc.pos += m[0].length; return sc; },
      useDelimiter: sc => sc,
    };

    // ---------------- String methods
    const sioobe = (msg) => thr('StringIndexOutOfBoundsException', msg);
    const chkStr = (v, node) => { if (v === null) throw npe(); return rt.jstr(v); };
    const charSeq = v => typeof v === 'string' ? v : (v instanceof JSB ? v.s : (v instanceof JC ? String.fromCharCode(v.v) : null));
    const ch = v => v instanceof JC ? String.fromCharCode(v.v) : typeof v === 'number' ? String.fromCodePoint(v) : null;
    const STRING = {
      length: s => s.length,
      isEmpty: s => s.length === 0,
      isBlank: s => s.trim().length === 0 && !/[^\s]/.test(s),
      charAt: (s, a) => { const i = toI(a[0]); if (i < 0 || i >= s.length) throw sioobe(`Index ${i} out of bounds for length ${s.length}`); return new JC(s.charCodeAt(i)); },
      codePointAt: (s, a) => { const i = toI(a[0]); if (i < 0 || i >= s.length) throw sioobe(`Index ${i} out of bounds for length ${s.length}`); return s.codePointAt(i); },
      substring: (s, a) => {
        const b = toI(a[0]), e = a.length > 1 ? toI(a[1]) : s.length;
        if (b < 0 || e > s.length || b > e) throw sioobe(a.length > 1 ? `begin ${b}, end ${e}, length ${s.length}` : `Range [${b}, ${e}) out of bounds for length ${s.length}`);
        return s.substring(b, e);
      },
      subSequence: (s, a) => STRING.substring(s, a),
      indexOf: (s, a) => {
        const t = ch(a[0]) ?? chkStr(a[0]);
        const from = a.length > 1 ? Math.max(0, toI(a[1])) : 0;
        return s.indexOf(t, from);
      },
      lastIndexOf: (s, a) => {
        const t = ch(a[0]) ?? chkStr(a[0]);
        if (a.length > 1) { const from = toI(a[1]); if (from < 0) return -1; return s.lastIndexOf(t, from); }
        return s.lastIndexOf(t);
      },
      contains: (s, a) => { const t = charSeq(a[0]); if (a[0] === null) throw npe(); return s.includes(t); },
      startsWith: (s, a) => s.startsWith(chkStr(a[0]), a.length > 1 ? toI(a[1]) : 0),
      endsWith: (s, a) => s.endsWith(chkStr(a[0])),
      equals: (s, a) => typeof a[0] === 'string' && a[0] === s,
      equalsIgnoreCase: (s, a) => typeof a[0] === 'string' && a[0].length === s.length && (a[0] === s || [...s].every((c, i) => { const d = a[0][i]; return c === d || c.toUpperCase() === d.toUpperCase() || c.toLowerCase() === d.toLowerCase(); })),
      contentEquals: (s, a) => charSeq(a[0]) === s,
      compareTo: (s, a) => { if (a[0] === null) throw npe(); return strCompare(s, a[0]); },
      compareToIgnoreCase: (s, a) => { if (a[0] === null) throw npe(); return strCompare(s.toUpperCase().toLowerCase(), a[0].toUpperCase().toLowerCase()); },
      toUpperCase: s => s.toUpperCase(),
      toLowerCase: s => s.toLowerCase(),
      trim: s => s.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, ''),
      strip: s => s.trim(),
      stripLeading: s => s.replace(/^\s+/, ''),
      stripTrailing: s => s.replace(/\s+$/, ''),
      concat: (s, a) => s + chkStr(a[0]),
      replace: (s, a) => {
        if (a[0] === null || a[1] === null) throw npe();
        const x = ch(a[0]) ?? charSeq(a[0]), y = ch(a[1]) ?? charSeq(a[1]);
        return s.split(x).join(y);
      },
      replaceAll: (s, a) => s.replace(new RegExp(jre(rt, chkStr(a[0])).source, 'g' + jre(rt, a[0]).flags), javaReplacement(rt, chkStr(a[1]))),
      replaceFirst: (s, a) => s.replace(jre(rt, chkStr(a[0])), javaReplacement(rt, chkStr(a[1]))),
      matches: (s, a) => new RegExp('^(?:' + jre(rt, chkStr(a[0])).source + ')$', jre(rt, a[0]).flags).test(s),
      split: (s, a) => new JArray('String', 1, jsplit(rt, s, chkStr(a[0]), a.length > 1 ? toI(a[1]) : 0)),
      toCharArray: s => new JArray('char', 1, Array.from({ length: s.length }, (_, i) => new JC(s.charCodeAt(i)))),
      chars: s => new JStream(Array.from({ length: s.length }, (_, i) => s.charCodeAt(i)), 'IntStream'),
      hashCode: s => JR.javaStringHash(s),
      repeat: (s, a) => { const n = toI(a[0]); if (n < 0) throw thr('IllegalArgumentException', 'count is negative: ' + n); return s.repeat(n); },
      toString: s => s,
      intern: s => s,
      lines: s => new JStream(s.split(/\r?\n/).filter((x, i, arr) => !(i === arr.length - 1 && x === '')), 'Stream'),
      indent: (s, a) => { const n = toI(a[0]); return s.split('\n').filter((x, i, arr) => !(i === arr.length - 1 && x === '')).map(l => n >= 0 ? ' '.repeat(n) + l : l.replace(new RegExp('^\\s{0,' + (-n) + '}'), '')).join('\n') + '\n'; },
      getClass: () => new JClassRef('String', null, true),
      formatted: (s, a) => jformat(rt, s, a),
      describeConstable: s => new JOptional(s),
    };
    // ---------------- boxed / primitive receivers
    function boxCall(v, name, a, node) {
      const kind = typeof v === 'number' ? 'Integer' : typeof v === 'boolean' ? 'Boolean' : v instanceof JD ? (v.f ? 'Float' : 'Double') : v instanceof JC ? 'Character' : 'Long';
      switch (name) {
        case 'toString': return rt.jstr(v);
        case 'equals': return rt.jequals(v, a[0]);
        case 'hashCode': return rt.jhash(v);
        case 'compareTo': if (a[0] === null) throw npe(); return rt.jcompare(v, a[0]);
        case 'intValue': return rt.coerce(v, 'int');
        case 'longValue': return rt.coerce(v, 'long');
        case 'doubleValue': return rt.coerce(v, 'double');
        case 'floatValue': return rt.coerce(v, 'float');
        case 'shortValue': return rt.coerce(v, 'short');
        case 'byteValue': return rt.coerce(v, 'byte');
        case 'charValue': if (v instanceof JC) return v; break;
        case 'booleanValue': if (typeof v === 'boolean') return v; break;
        case 'isNaN': if (v instanceof JD) return Number.isNaN(v.v); break;
        case 'isInfinite': if (v instanceof JD) return !isFinite(v.v) && !Number.isNaN(v.v); break;
        case 'getClass': return new JClassRef(kind, null, true);
      }
      throw noMethod(kind, name, a, node);
    }
    // ---------------- list methods
    const chkIdx = (l, i, size) => { if (i < 0 || i >= size) throw outOfBounds(i, size); };
    const mut = l => { if (l.fixed) throw unsupported(); };
    const LIST = {
      size: l => l.a.length,
      isEmpty: l => l.a.length === 0,
      get: (l, a) => { const i = toI(a[0]); chkIdx(l, i, l.a.length); return l.a[i]; },
      set: (l, a) => { if (l.fixed === 2) throw unsupported(); const i = toI(a[0]); chkIdx(l, i, l.a.length); const old = l.a[i]; l.a[i] = a[1]; return old; },
      add: (l, a) => {
        mut(l);
        if (a.length === 2) { const i = toI(a[0]); if (i < 0 || i > l.a.length) throw outOfBounds(i, l.a.length); l.a.splice(i, 0, a[1]); l.mod++; return undefined; }
        l.a.push(a[0]); l.mod++; return true;
      },
      addAll: (l, a) => {
        mut(l);
        if (a.length === 2) { const i = toI(a[0]); const xs = toArr(a[1]); if (i < 0 || i > l.a.length) throw outOfBounds(i, l.a.length); l.a.splice(i, 0, ...xs); l.mod++; return xs.length > 0; }
        if (a[0] === null) throw npe();
        const xs = toArr(a[0]); l.a.push(...xs); l.mod++; return xs.length > 0;
      },
      remove: (l, a, node) => {
        mut(l);
        const boxed = rt.boxedArg; rt.boxedArg = false;
        if (typeof a[0] === 'number' && !boxed) {
          const i = a[0]; chkIdx(l, i, l.a.length);
          l.mod++; return l.a.splice(i, 1)[0];
        }
        const i = l.a.findIndex(x => x === a[0] || (a[0] !== null && rt.jequals(a[0], x)));
        if (i < 0) return false;
        l.a.splice(i, 1); l.mod++; return true;
      },
      contains: (l, a) => l.a.some(x => x === a[0] || (a[0] !== null && rt.jequals(a[0], x))),
      indexOf: (l, a) => l.a.findIndex(x => x === a[0] || (a[0] !== null && rt.jequals(a[0], x))),
      lastIndexOf: (l, a) => { for (let i = l.a.length - 1; i >= 0; i--) if (l.a[i] === a[0] || (a[0] !== null && rt.jequals(a[0], l.a[i]))) return i; return -1; },
      clear: l => { mut(l); l.a.length = 0; l.mod++; },
      forEach: (l, a) => { const exp = l.mod; for (let i = 0; i < l.a.length; i++) { rt.callFn(a[0], [l.a[i]], 'accept'); if (l.mod !== exp) throw thr('ConcurrentModificationException'); } },
      removeIf: (l, a) => {
        mut(l);
        const keep = [], before = l.a.length;
        for (const x of l.a) if (!rt.callFn(a[0], [x], 'test')) keep.push(x);
        if (keep.length !== before) { l.a.length = 0; l.a.push(...keep); l.mod++; return true; }
        return false;
      },
      removeAll: (l, a) => { mut(l); const xs = toArr(a[0]); const before = l.a.length; const keep = l.a.filter(x => !xs.some(y => rt.jequals(y, x) || x === y)); l.a.length = 0; l.a.push(...keep); l.mod++; return keep.length !== before; },
      retainAll: (l, a) => { mut(l); const xs = toArr(a[0]); const before = l.a.length; const keep = l.a.filter(x => xs.some(y => rt.jequals(y, x) || x === y)); l.a.length = 0; l.a.push(...keep); l.mod++; return keep.length !== before; },
      containsAll: (l, a) => toArr(a[0]).every(y => l.a.some(x => x === y || rt.jequals(y, x))),
      replaceAll: (l, a) => { if (l.fixed === 2) throw unsupported(); for (let i = 0; i < l.a.length; i++) l.a[i] = rt.callFn(a[0], [l.a[i]], 'apply'); },
      sort: (l, a) => { if (l.fixed === 2) throw unsupported(); const c = seqCmp(a[0]); const s = l.a.slice().sort(c); for (let i = 0; i < s.length; i++) l.a[i] = s[i]; l.mod++; },
      iterator: l => new JIter(listIter(l)),
      listIterator: l => new JIter(listIter(l)),
      subList: (l, a) => { const f = toI(a[0]), t = toI(a[1]); if (f < 0 || t > l.a.length || f > t) throw thr('IndexOutOfBoundsException', `fromIndex: ${f}, toIndex: ${t}, size: ${l.a.length}`); return new JList('ArrayList', l.a.slice(f, t)); },
      toArray: (l, a) => new JArray(a.length && a[0] instanceof JArray ? a[0].et : 'Object', 1, l.a.slice()),
      equals: (l, a) => l.jequals(rt, a[0]),
      hashCode: l => l.jhash(rt),
      toString: l => l.toJ(),
      stream: l => new JStream(l.a.slice()),
      getFirst: l => { if (!l.a.length) throw thr('NoSuchElementException'); return l.a[0]; },
      getLast: l => { if (!l.a.length) throw thr('NoSuchElementException'); return l.a[l.a.length - 1]; },
      removeFirst: l => { mut(l); if (!l.a.length) throw thr('NoSuchElementException'); l.mod++; return l.a.shift(); },
      removeLast: l => { mut(l); if (!l.a.length) throw thr('NoSuchElementException'); l.mod++; return l.a.pop(); },
      addFirst: (l, a) => { mut(l); l.a.unshift(a[0]); l.mod++; },
      addLast: (l, a) => { mut(l); l.a.push(a[0]); l.mod++; },
      reversed: l => new JList('ArrayList', l.a.slice().reverse()),
      ensureCapacity: () => undefined, trimToSize: () => undefined,
      getClass: l => new JClassRef(l.ltype, null, true),
    };
    // deque-like operations (LinkedList / ArrayDeque); Stack separately
    const DEQUE = {
      offer: (l, a) => { if (a[0] === null && l.ltype === 'ArrayDeque') throw npe(); l.a.push(a[0]); l.mod++; return true; },
      offerLast: (l, a) => DEQUE.offer(l, a),
      offerFirst: (l, a) => { if (a[0] === null && l.ltype === 'ArrayDeque') throw npe(); l.a.unshift(a[0]); l.mod++; return true; },
      add: (l, a) => { if (a.length === 1 && a[0] === null && l.ltype === 'ArrayDeque') throw npe(); return LIST.add(l, a); },
      push: (l, a) => { if (a[0] === null && l.ltype === 'ArrayDeque') throw npe(); l.a.unshift(a[0]); l.mod++; },
      pop: l => { if (!l.a.length) throw thr('NoSuchElementException'); l.mod++; return l.a.shift(); },
      poll: l => { if (!l.a.length) return null; l.mod++; return l.a.shift(); },
      pollFirst: l => DEQUE.poll(l),
      pollLast: l => { if (!l.a.length) return null; l.mod++; return l.a.pop(); },
      peek: l => l.a.length ? l.a[0] : null,
      peekFirst: l => l.a.length ? l.a[0] : null,
      peekLast: l => l.a.length ? l.a[l.a.length - 1] : null,
      element: l => { if (!l.a.length) throw thr('NoSuchElementException'); return l.a[0]; },
      remove: (l, a, node) => { if (!a.length) { if (!l.a.length) throw thr('NoSuchElementException'); l.mod++; return l.a.shift(); } if (l.ltype === 'ArrayDeque') rt.boxedArg = true; return LIST.remove(l, a, node); },
      descendingIterator: l => { const r = new JList('ArrayList', l.a.slice().reverse()); return new JIter(listIter(r)); },
    };
    const STACK = {
      push: (l, a) => { l.a.push(a[0]); l.mod++; return a[0]; },
      pop: l => { if (!l.a.length) throw thr('EmptyStackException'); l.mod++; return l.a.pop(); },
      peek: l => { if (!l.a.length) throw thr('EmptyStackException'); return l.a[l.a.length - 1]; },
      empty: l => l.a.length === 0,
      search: (l, a) => { for (let i = l.a.length - 1; i >= 0; i--) if (rt.jequals(a[0], l.a[i]) || a[0] === l.a[i]) return l.a.length - i; return -1; },
      firstElement: l => { if (!l.a.length) throw thr('NoSuchElementException'); return l.a[0]; },
      lastElement: l => { if (!l.a.length) throw thr('NoSuchElementException'); return l.a[l.a.length - 1]; },
      elementAt: (l, a) => LIST.get(l, a),
      addElement: (l, a) => { LIST.add(l, a); },
    };
    const PQ = {
      add: (q, a) => pqOffer(q, a[0]), offer: (q, a) => pqOffer(q, a[0]),
      poll: q => pqPoll(q), remove: (q, a) => {
        if (!a.length) { if (!q.q.length) throw thr('NoSuchElementException'); return pqPoll(q); }
        const i = q.q.findIndex(x => rt.jequals(a[0], x)); if (i < 0) return false; pqRemoveAt(q, i); return true;
      },
      peek: q => q.q.length ? q.q[0] : null,
      element: q => { if (!q.q.length) throw thr('NoSuchElementException'); return q.q[0]; },
      size: q => q.q.length, isEmpty: q => q.q.length === 0, clear: q => { q.q.length = 0; q.mod++; },
      contains: (q, a) => q.q.some(x => rt.jequals(a[0], x)),
      iterator: q => new JIter(iterator(q)),
      toString: q => q.toJ(),
      addAll: (q, a) => { for (const x of toArr(a[0])) pqOffer(q, x); return true; },
      forEach: (q, a) => { for (const x of q.q.slice()) rt.callFn(a[0], [x], 'accept'); },
      toArray: q => new JArray('Object', 1, q.q.slice()),
      stream: q => new JStream(q.q.slice()),
    };
    // ---------------- map methods
    const MAP = {
      put: (m, a) => mput(m, a[0], a[1]),
      get: (m, a) => { const e = mfind(m, a[0]); return e ? e.v : null; },
      getOrDefault: (m, a) => { const e = mfind(m, a[0]); return e ? e.v : a[1]; },
      containsKey: (m, a) => !!mfind(m, a[0]),
      containsValue: (m, a) => entries(m).some(e => e.v === a[1 - 1] || rt.jequals(a[0], e.v)),
      remove: (m, a) => {
        if (a.length === 2) { const e = mfind(m, a[0]); if (e && rt.jequals(a[1], e.v)) { mapRemove(m, a[0]); return true; } return false; }
        const e = mapRemove(m, a[0]); return e ? e.v : null;
      },
      size: m => m.size, isEmpty: m => m.size === 0, clear: m => mclear(m),
      keySet: m => new JView('KeySet', m),
      values: m => new JView('Values', m),
      entrySet: m => new JView('EntrySet', m),
      putIfAbsent: (m, a) => { const e = mfind(m, a[0]); if (e && e.v !== null) return e.v; mput(m, a[0], a[1]); return null; },
      putAll: (m, a) => { for (const e of entries(a[0])) mput(m, e.k, e.v); },
      forEach: (m, a) => { const exp = m.mod; for (const e of entries(m)) { rt.callFn(a[0], [e.k, e.v], 'accept'); if (m.mod !== exp) throw thr('ConcurrentModificationException'); } },
      merge: (m, a) => {
        const e = mfind(m, a[0]);
        if (!e || e.v === null) { mput(m, a[0], a[1]); return a[1]; }
        const nv = rt.callFn(a[2], [e.v, a[1]], 'apply');
        if (nv === null) mapRemove(m, a[0]); else e.v = nv;
        return nv;
      },
      compute: (m, a) => {
        const e = mfind(m, a[0]);
        const nv = rt.callFn(a[1], [a[0], e ? e.v : null], 'apply');
        if (nv === null) { if (e) mapRemove(m, a[0]); } else mput(m, a[0], nv);
        return nv;
      },
      computeIfAbsent: (m, a) => {
        const e = mfind(m, a[0]);
        if (e && e.v !== null) return e.v;
        const nv = rt.callFn(a[1], [a[0]], 'apply');
        if (nv !== null) mput(m, a[0], nv);
        return nv;
      },
      computeIfPresent: (m, a) => {
        const e = mfind(m, a[0]);
        if (!e || e.v === null) return null;
        const nv = rt.callFn(a[1], [a[0], e.v], 'apply');
        if (nv === null) mapRemove(m, a[0]); else e.v = nv;
        return nv;
      },
      replace: (m, a) => { const e = mfind(m, a[0]); if (!e) return a.length === 3 ? false : null; if (a.length === 3) { if (rt.jequals(a[1], e.v)) { e.v = a[2]; return true; } return false; } const old = e.v; e.v = a[1]; return old; },
      replaceAll: (m, a) => { for (const e of entries(m)) e.v = rt.callFn(a[0], [e.k, e.v], 'apply'); },
      equals: (m, a) => m.jequals(rt, a[0]), hashCode: m => m.jhash(rt), toString: m => m.toJ(),
      firstKey: m => { const es = entries(m); if (!es.length) throw thr('NoSuchElementException'); return es[0].k; },
      lastKey: m => { const es = entries(m); if (!es.length) throw thr('NoSuchElementException'); return es[es.length - 1].k; },
      firstEntry: m => { const es = entries(m); return es.length ? new JEntry(es[0], m) : null; },
      lastEntry: m => { const es = entries(m); return es.length ? new JEntry(es[es.length - 1], m) : null; },
      pollFirstEntry: m => { const es = entries(m); if (!es.length) return null; mapRemove(m, es[0].k); return new JEntry(es[0], m); },
      pollLastEntry: m => { const es = entries(m); if (!es.length) return null; const e = es[es.length - 1]; mapRemove(m, e.k); return new JEntry(e, m); },
      floorKey: (m, a) => { const c = seqCmp(m.cmp); const es = entries(m).filter(e => c(e.k, a[0]) <= 0); return es.length ? es[es.length - 1].k : null; },
      ceilingKey: (m, a) => { const c = seqCmp(m.cmp); const e = entries(m).find(e => c(e.k, a[0]) >= 0); return e ? e.k : null; },
      lowerKey: (m, a) => { const c = seqCmp(m.cmp); const es = entries(m).filter(e => c(e.k, a[0]) < 0); return es.length ? es[es.length - 1].k : null; },
      higherKey: (m, a) => { const c = seqCmp(m.cmp); const e = entries(m).find(e => c(e.k, a[0]) > 0); return e ? e.k : null; },
      headMap: (m, a) => { const c = seqCmp(m.cmp); const r = newMap('TreeMap', m.cmp); for (const e of entries(m)) if (c(e.k, a[0]) < 0 || (a[1] === true && c(e.k, a[0]) === 0)) mput(r, e.k, e.v); return r; },
      tailMap: (m, a) => { const c = seqCmp(m.cmp); const r = newMap('TreeMap', m.cmp); for (const e of entries(m)) if (c(e.k, a[0]) >= 0 && !(a[1] === false && c(e.k, a[0]) === 0)) mput(r, e.k, e.v); return r; },
      descendingMap: m => { const r = newMap('LinkedHashMap'); for (const e of entries(m).reverse()) mput(r, e.k, e.v); return r; },
      descendingKeySet: m => { const s = newSet('LinkedHashSet'); for (const e of entries(m).reverse()) mput(s.m, e.k, true); return s; },
      navigableKeySet: m => new JView('KeySet', m),
      getClass: m => new JClassRef(m.ltype, null, true),
    };
    const SET = {
      add: (s, a) => { if (s.immutable) throw unsupported(); if (mfind(s.m, a[0])) return false; mput(s.m, a[0], true); return true; },
      remove: (s, a) => { if (s.immutable) throw unsupported(); return !!mapRemove(s.m, a[0]); },
      contains: (s, a) => !!mfind(s.m, a[0]),
      size: s => s.m.size, isEmpty: s => s.m.size === 0, clear: s => mclear(s.m),
      addAll: (s, a) => { let ch = false; for (const x of toArr(a[0])) if (SET.add(s, [x])) ch = true; return ch; },
      removeAll: (s, a) => { let ch = false; for (const x of toArr(a[0])) if (mapRemove(s.m, x)) ch = true; return ch; },
      retainAll: (s, a) => { const keep = toArr(a[0]); let ch = false; for (const e of entries(s.m)) if (!keep.some(y => rt.jequals(y, e.k))) { mapRemove(s.m, e.k); ch = true; } return ch; },
      containsAll: (s, a) => toArr(a[0]).every(x => !!mfind(s.m, x)),
      removeIf: (s, a) => { let ch = false; for (const e of entries(s.m)) if (rt.callFn(a[0], [e.k], 'test')) { mapRemove(s.m, e.k); ch = true; } return ch; },
      iterator: s => new JIter(iterator(s)),
      forEach: (s, a) => { for (const e of entries(s.m)) rt.callFn(a[0], [e.k], 'accept'); },
      toString: s => s.toJ(), equals: (s, a) => s.jequals(rt, a[0]), hashCode: s => s.jhash(rt),
      first: s => { const es = entries(s.m); if (!es.length) throw thr('NoSuchElementException'); return es[0].k; },
      last: s => { const es = entries(s.m); if (!es.length) throw thr('NoSuchElementException'); return es[es.length - 1].k; },
      pollFirst: s => { const es = entries(s.m); if (!es.length) return null; mapRemove(s.m, es[0].k); return es[0].k; },
      pollLast: s => { const es = entries(s.m); if (!es.length) return null; const k = es[es.length - 1].k; mapRemove(s.m, k); return k; },
      floor: (s, a) => MAP.floorKey(s.m, a), ceiling: (s, a) => MAP.ceilingKey(s.m, a), lower: (s, a) => MAP.lowerKey(s.m, a), higher: (s, a) => MAP.higherKey(s.m, a),
      headSet: (s, a) => { const r = newSet('TreeSet', s.m.cmp); for (const e of entries(MAP.headMap(s.m, a))) mput(r.m, e.k, true); return r; },
      tailSet: (s, a) => { const r = newSet('TreeSet', s.m.cmp); for (const e of entries(MAP.tailMap(s.m, a))) mput(r.m, e.k, true); return r; },
      descendingSet: s => MAP.descendingKeySet(s.m),
      toArray: (s, a) => new JArray(a.length && a[0] instanceof JArray ? a[0].et : 'Object', 1, toArr(s)),
      stream: s => new JStream(toArr(s)),
    };
    const VIEW = {
      size: v => v.m.size, isEmpty: v => v.m.size === 0,
      contains: (v, a) => v.ltype === 'KeySet' ? !!mfind(v.m, a[0]) : toArr(v).some(x => rt.jequals(a[0], x) || x === a[0]),
      remove: (v, a) => { if (v.ltype === 'KeySet') return !!mapRemove(v.m, a[0]); const e = entries(v.m).find(e => rt.jequals(a[0], v.ltype === 'Values' ? e.v : new JEntry(e, v.m))); if (e) { mapRemove(v.m, e.k); return true; } return false; },
      iterator: v => new JIter(iterator(v)),
      forEach: (v, a) => { for (const x of toArr(v)) rt.callFn(a[0], [x], 'accept'); },
      removeIf: (v, a) => { let ch = false; for (const e of entries(v.m)) { const x = v.ltype === 'KeySet' ? e.k : v.ltype === 'Values' ? e.v : new JEntry(e, v.m); if (rt.callFn(a[0], [x], 'test')) { mapRemove(v.m, e.k); ch = true; } } return ch; },
      toString: v => v.toJ(), stream: v => new JStream(toArr(v)),
      toArray: (v, a) => new JArray(a.length && a[0] instanceof JArray ? a[0].et : 'Object', 1, toArr(v)),
      containsAll: (v, a) => toArr(a[0]).every(x => VIEW.contains(v, [x])),
      clear: v => mclear(v.m),
      equals: (v, a) => { const xs = toArr(v), ys = a[0] && a[0].ltype ? toArr(a[0]) : null; return !!ys && xs.length === ys.length && xs.every(x => ys.some(y => rt.jequals(x, y))); },
      hashCode: v => { let h = 0; for (const x of toArr(v)) h = (h + rt.jhash(x)) | 0; return h; },
    };
    const ENTRY = {
      getKey: e => e.e.k, getValue: e => e.e.v,
      setValue: (e, a) => { const old = e.e.v; e.e.v = a[0]; return old; },
      toString: e => e.toJ(), equals: (e, a) => e.jequals(rt, a[0]), hashCode: e => e.jhash(rt),
    };
    const ITER = {
      hasNext: it => it.src.hasNext(), next: it => it.src.next(),
      remove: it => { if (!it.src.remove) throw unsupported(); it.src.remove(); },
      set: (it, a) => it.src.set(a[0]), add: (it, a) => it.src.add(a[0]),
      hasPrevious: it => it.src.hasPrevious(), previous: it => it.src.previous(), nextIndex: it => it.src.nextIndex(), previousIndex: it => it.src.previousIndex(),
      forEachRemaining: (it, a) => { while (it.src.hasNext()) rt.callFn(a[0], [it.src.next()], 'accept'); },
    };
    // ---------------- StringBuilder
    const sbStr = v => (v instanceof JArray && v.et === 'char' && v.dims === 1) ? v.a.map(c => String.fromCharCode(c.v)).join('') : rt.jstr(v);
    const SB = {
      append: (b, a) => { if (a.length === 3) { const s = sbStr(a[0]); b.s += (a[0] instanceof JArray ? s.substr(toI(a[1]), toI(a[2])) : s.slice(toI(a[1]), toI(a[2]))); } else b.s += sbStr(a[0]); return b; },
      toString: b => b.s,
      length: b => b.s.length,
      charAt: (b, a) => { const i = toI(a[0]); if (i < 0 || i >= b.s.length) throw sioobe(`index ${i},length ${b.s.length}`); return new JC(b.s.charCodeAt(i)); },
      reverse: b => { b.s = Array.from(b.s).reverse().join(''); return b; },
      insert: (b, a) => { const i = toI(a[0]); if (i < 0 || i > b.s.length) throw sioobe(`offset ${i}, length ${b.s.length}`); b.s = b.s.slice(0, i) + sbStr(a[1]) + b.s.slice(i); return b; },
      deleteCharAt: (b, a) => { const i = toI(a[0]); if (i < 0 || i >= b.s.length) throw sioobe(`index ${i},length ${b.s.length}`); b.s = b.s.slice(0, i) + b.s.slice(i + 1); return b; },
      delete: (b, a) => { const s = toI(a[0]); let e = toI(a[1]); if (e > b.s.length) e = b.s.length; if (s < 0 || s > e) throw sioobe(`start ${s}, end ${e}, length ${b.s.length}`); b.s = b.s.slice(0, s) + b.s.slice(e); return b; },
      replace: (b, a) => { const s = toI(a[0]); let e = Math.min(toI(a[1]), b.s.length); if (s < 0 || s > b.s.length || s > e) throw sioobe(`start ${s}, end ${e}, length ${b.s.length}`); b.s = b.s.slice(0, s) + rt.jstr(a[2]) + b.s.slice(e); return b; },
      setCharAt: (b, a) => { const i = toI(a[0]); if (i < 0 || i >= b.s.length) throw sioobe(`index ${i},length ${b.s.length}`); b.s = b.s.slice(0, i) + String.fromCharCode(rt.coerce(a[1], 'char').v) + b.s.slice(i + 1); },
      setLength: (b, a) => { const n = toI(a[0]); b.s = n <= b.s.length ? b.s.slice(0, n) : b.s + '\0'.repeat(n - b.s.length); },
      indexOf: (b, a) => b.s.indexOf(rt.jstr(a[0]), a.length > 1 ? toI(a[1]) : 0),
      lastIndexOf: (b, a) => a.length > 1 ? b.s.lastIndexOf(rt.jstr(a[0]), toI(a[1])) : b.s.lastIndexOf(rt.jstr(a[0])),
      substring: (b, a) => STRING.substring(b.s, a),
      isEmpty: b => b.s.length === 0,
      capacity: b => Math.max(16, b.s.length),
      compareTo: (b, a) => strCompare(b.s, a[0].s),
      chars: b => STRING.chars(b.s),
      equals: (b, a) => b === a[0], hashCode: b => rt.idHash(b),
    };
    // ---------------- PrintStream
    const printArg = v => (v instanceof JArray && v.et === 'char' && v.dims === 1) ? v.a.map(c => String.fromCharCode(c.v)).join('') : rt.jstr(v);
    const PRINT = {
      println: (p, a) => { rt.emit((a.length ? printArg(a[0]) : '') + '\n', p.kind); },
      print: (p, a, node) => { if (!a.length) throw cerr('no suitable method found for print(no arguments)', node); rt.emit(printArg(a[0]), p.kind); },
      printf: (p, a, node) => { if (!a.length) throw cerr('no suitable method found for printf(no arguments)', node); let args = a; if (a[0] instanceof JLocale) args = a.slice(1); const fmt = args[0]; if (fmt === null) throw npe(); rt.emit(jformat(rt, rt.jstr(fmt), flatVarargs(args.slice(1))), p.kind); return p; },
      format: (p, a, n) => PRINT.printf(p, a, n),
      flush: () => undefined, close: () => undefined,
      write: (p, a) => { rt.emit(String.fromCharCode(toI(a[0])), p.kind); },
    };
    function flatVarargs(args) { return (args.length === 1 && args[0] instanceof JArray && args[0].dims === 1 && !JR.PRIM_DESC.has(args[0].et)) ? args[0].a : args; }
    const READER = {
      readLine: r => { const l = rt.readLine(); return l; },
      read: r => { const l = rt.readLine(); return l === null ? -1 : (l.length ? l.charCodeAt(0) : 10); },
      ready: () => true, close: () => undefined,
    };
    const RANDOM = {
      nextInt: (r, a) => {
        if (!a.length) return r.nextInt();
        if (a.length === 2) { const o = toI(a[0]), b = toI(a[1]); if (o >= b) throw thr('IllegalArgumentException', 'bound must be greater than origin'); return r.nextIntRange(o, b); }
        const b = toI(a[0]); if (b <= 0) throw thr('IllegalArgumentException', 'bound must be positive'); return r.nextInt(b);
      },
      nextDouble: (r, a) => { const d = r.nextDouble(); if (a.length === 2) return D(numVal(a[0]) + d * (numVal(a[1]) - numVal(a[0]))); if (a.length === 1) return D(d * numVal(a[0])); return D(d); },
      nextBoolean: r => r.nextBoolean(),
      nextLong: r => new JL(r.nextLong()),
      nextFloat: r => new JD(Math.fround(r.nextFloat()), true),
      nextGaussian: r => D(r.nextGaussian()),
      setSeed: (r, a) => { r.setSeed(lv(a[0])); r.haveNext = false; },
      ints: () => { throw thr('UnsupportedOperationException', 'streams are not supported'); },
    };
    const OPTIONAL = {
      isPresent: o => o.v !== null, isEmpty: o => o.v === null,
      get: o => { if (o.v === null) throw thr('NoSuchElementException', 'No value present'); return o.v; },
      orElse: (o, a) => o.v !== null ? o.v : a[0],
      orElseGet: (o, a) => o.v !== null ? o.v : rt.callFn(a[0], [], 'get'),
      orElseThrow: (o, a) => { if (o.v !== null) return o.v; if (a.length) throw new JThrow(rt.callFn(a[0], [], 'get')); throw thr('NoSuchElementException', 'No value present'); },
      ifPresent: (o, a) => { if (o.v !== null) rt.callFn(a[0], [o.v], 'accept'); },
      ifPresentOrElse: (o, a) => { if (o.v !== null) rt.callFn(a[0], [o.v], 'accept'); else rt.callFn(a[1], [], 'run'); },
      map: (o, a) => o.v === null ? o : new JOptional(rt.callFn(a[0], [o.v], 'apply')),
      filter: (o, a) => o.v !== null && rt.callFn(a[0], [o.v], 'test') ? o : new JOptional(null),
      getAsInt: o => OPTIONAL.get(o), getAsDouble: o => OPTIONAL.get(o),
    };
    // ---------------- streams (common subset)
    const isIntStream = s => s.kind === 'IntStream';
    const STREAM = {
      filter: (s, a) => new JStream(s.a.filter(x => rt.callFn(a[0], [x], 'test')), s.kind),
      map: (s, a) => new JStream(s.a.map(x => rt.callFn(a[0], [x], 'apply')), s.kind),
      mapToInt: (s, a) => new JStream(s.a.map(x => toI(rt.callFn(a[0], [x], 'applyAsInt'))), 'IntStream'),
      mapToDouble: (s, a) => new JStream(s.a.map(x => rt.coerce(rt.callFn(a[0], [x], 'applyAsDouble'), 'double')), 'DoubleStream'),
      mapToObj: (s, a) => new JStream(s.a.map(x => rt.callFn(a[0], [x], 'apply')), 'Stream'),
      boxed: s => new JStream(s.a.slice(), 'Stream'),
      sorted: (s, a) => new JStream(s.a.slice().sort(seqCmp(a[0])), s.kind),
      distinct: s => { const r = []; for (const x of s.a) if (!r.some(y => rt.jequals(x, y) || x === y)) r.push(x); return new JStream(r, s.kind); },
      limit: (s, a) => new JStream(s.a.slice(0, Number(lv(a[0]))), s.kind),
      skip: (s, a) => new JStream(s.a.slice(Number(lv(a[0]))), s.kind),
      forEach: (s, a) => { for (const x of s.a) rt.callFn(a[0], [x], 'accept'); },
      collect: (s, a) => { const c = a[0]; if (!c || !c.collector) throw cerr('unsupported collector', null); return c.collector(s.a); },
      toList: s => new JList('ImmutableList', s.a.slice(), 2),
      count: s => new JL(BigInt(s.a.length)),
      sum: s => { if (s.kind === 'IntStream') return s.a.reduce((x, y) => (x + y) | 0, 0); return D(s.a.reduce((x, y) => x + numVal(y), 0)); },
      average: s => new JOptional(s.a.length ? D(s.a.reduce((x, y) => x + numVal(y), 0) / s.a.length) : null),
      max: (s, a) => { if (!s.a.length) return new JOptional(null); const c = seqCmp(a[0]); return new JOptional(s.a.reduce((x, y) => c(y, x) > 0 ? y : x)); },
      min: (s, a) => { if (!s.a.length) return new JOptional(null); const c = seqCmp(a[0]); return new JOptional(s.a.reduce((x, y) => c(y, x) < 0 ? y : x)); },
      anyMatch: (s, a) => s.a.some(x => rt.callFn(a[0], [x], 'test')),
      allMatch: (s, a) => s.a.every(x => rt.callFn(a[0], [x], 'test')),
      noneMatch: (s, a) => !s.a.some(x => rt.callFn(a[0], [x], 'test')),
      findFirst: s => new JOptional(s.a.length ? s.a[0] : null),
      findAny: s => new JOptional(s.a.length ? s.a[0] : null),
      reduce: (s, a) => { if (a.length === 1) { if (!s.a.length) return new JOptional(null); return new JOptional(s.a.reduce((x, y) => rt.callFn(a[0], [x, y], 'apply'))); } return s.a.reduce((x, y) => rt.callFn(a[1], [x, y], 'apply'), a[0]); },
      toArray: s => new JArray(s.kind === 'IntStream' ? 'int' : s.kind === 'DoubleStream' ? 'double' : 'Object', 1, s.a.slice()),
      asDoubleStream: s => new JStream(s.a.map(x => D(numVal(x))), 'DoubleStream'),
      getAsInt: s => s, peek: (s, a) => { for (const x of s.a) rt.callFn(a[0], [x], 'accept'); return s; },
    };
    const COLLECTORS = {
      toList: () => ({ collector: a => new JList('ArrayList', a.slice()) }),
      toSet: () => ({ collector: a => { const s = newSet('HashSet'); for (const x of a) SET.add(s, [x]); return s; } }),
      joining: (args) => ({ collector: a => (args[1] !== undefined ? rt.jstr(args[1]) : '') + a.map(x => rt.jstr(x)).join(args.length ? rt.jstr(args[0]) : '') + (args[2] !== undefined ? rt.jstr(args[2]) : '') }),
      counting: () => ({ collector: a => new JL(BigInt(a.length)) }),
      groupingBy: (args) => ({ collector: a => { const m = newMap('HashMap'); for (const x of a) { const k = rt.callFn(args[0], [x], 'apply'); const e = mfind(m, k); if (e) e.v.push(x); else mput(m, k, [x]); } for (const e of entries(m)) e.v = args[1] ? args[1].collector(e.v) : new JList('ArrayList', e.v); return m; } }),
      toMap: (args) => ({ collector: a => { const m = newMap('HashMap'); for (const x of a) mput(m, rt.callFn(args[0], [x], 'apply'), rt.callFn(args[1], [x], 'apply')); return m; } }),
      summingInt: (args) => ({ collector: a => a.reduce((s, x) => (s + toI(rt.callFn(args[0], [x], 'applyAsInt'))) | 0, 0) }),
      averagingInt: (args) => ({ collector: a => D(a.length ? a.reduce((s, x) => s + toI(rt.callFn(args[0], [x], 'applyAsInt')), 0) / a.length : 0) }),
      averagingDouble: (args) => ({ collector: a => D(a.length ? a.reduce((s, x) => s + numVal(rt.callFn(args[0], [x], 'applyAsDouble')), 0) / a.length : 0) }),
    };
    // ---------------- comparators / functional defaults
    function cmpOf(f) { return (x, y) => toI(rt.callFn(f, [x, y], 'compare')); }
    function keyCmp(keyFn, keyCmpFn) {
      return new JFunc(a => {
        const x = rt.callFn(keyFn, [a[0]], 'apply'), y = rt.callFn(keyFn, [a[1]], 'apply');
        return keyCmpFn ? toI(rt.callFn(keyCmpFn, [x, y], 'compare')) : rt.jcompare(x, y);
      }, 'comparator');
    }
    const FUNC = {
      reversed: f => new JFunc(a => -toI(rt.callFn(f, a, 'compare')) | 0, 'comparator'),
      thenComparing: (f, a) => {
        const second = a.length === 2 ? keyCmp(a[0], a[1]) : (a[0] instanceof JFunc && a[0].arity === 1 ? keyCmp(a[0]) : a[0]);
        return new JFunc(x => { const r = toI(rt.callFn(f, x, 'compare')); if (r !== 0) return r; const s = second instanceof JFunc && second.arity === 1 ? keyCmp(second) : second; return toI(rt.callFn(s, x, 'compare')); }, 'comparator');
      },
      thenComparingInt: (f, a) => FUNC.thenComparing(f, [keyCmp(a[0])]),
      thenComparingDouble: (f, a) => FUNC.thenComparing(f, [keyCmp(a[0])]),
      andThen: (f, a) => new JFunc(x => { const r = rt.callFn(f, x, 'apply'); if (f.arity === undefined || true) { const g = a[0]; if (r === undefined) { rt.callFn(g, x, 'accept'); return undefined; } return rt.callFn(g, [r], 'apply'); } }, 'lambda'),
      compose: (f, a) => new JFunc(x => rt.callFn(f, [rt.callFn(a[0], x, 'apply')], 'apply'), 'lambda'),
      negate: f => new JFunc(x => !rt.callFn(f, x, 'test'), 'lambda'),
      and: (f, a) => new JFunc(x => !!rt.callFn(f, x, 'test') && !!rt.callFn(a[0], x, 'test'), 'lambda'),
      or: (f, a) => new JFunc(x => !!rt.callFn(f, x, 'test') || !!rt.callFn(a[0], x, 'test'), 'lambda'),
      identity: f => f,
      equals: (f, a) => f === a[0], hashCode: f => rt.idHash(f), toString: f => rt.jstr(f),
      getClass: f => new JClassRef('Lambda', null, true),
    };
    const CLASSREF = {
      getSimpleName: c => c.ci ? (c.ci.anon ? '' : c.ci.name) : c.name.replace(/^.*\./, ''),
      getName: c => c.ci ? c.ci.qname : JR.libQName(c.name),
      getTypeName: c => c.ci ? c.ci.qname.replace(/\$/g, '.') : JR.libQName(c.name),
      toString: c => rt.jstr(c),
      equals: (c, a) => a[0] instanceof JClassRef && (a[0].ci ? a[0].ci === c.ci : a[0].name === c.name),
      hashCode: c => rt.idHash(c),
      isInstance: (c, a) => rt.isInstanceName(a[0], c.name),
      getSuperclass: c => c.ci && c.ci.sup ? new JClassRef(c.ci.sup.name, c.ci.sup) : null,
      isInterface: c => !!(c.ci && c.ci.kind === 'interface'),
      getEnumConstants: c => c.ci && c.ci.enumValues ? new JArray(c.ci.name, 1, c.ci.enumValues.slice()) : null,
    };

    // dispatch on receiver
    function call(recv, name, args, node) {
      if (typeof recv === 'string') {
        const f = own(STRING, name);
        if (f) return f(recv, args, node);
        throw noMethod('String', name, args, node);
      }
      if (typeof recv === 'number' || typeof recv === 'boolean' || recv instanceof JD || recv instanceof JC || recv instanceof JL) return boxCall(recv, name, args, node);
      let table = null, extra = null;
      if (recv instanceof JList) {
        if (recv.ltype === 'Stack' || recv.ltype === 'Vector') extra = STACK;
        else if (recv.ltype === 'LinkedList' || recv.ltype === 'ArrayDeque') extra = DEQUE;
        table = LIST;
        if (recv.ltype === 'ArrayDeque' && ['get', 'set', 'indexOf', 'subList', 'sort', 'listIterator'].includes(name)) throw noMethod('ArrayDeque', name, args, node);
      }
      else if (recv instanceof JMap) table = MAP;
      else if (recv instanceof JSet) table = SET;
      else if (recv instanceof JView) table = VIEW;
      else if (recv instanceof JEntry) table = ENTRY;
      else if (recv instanceof JIter) table = ITER;
      else if (recv instanceof JSB) table = SB;
      else if (recv instanceof JScanner) table = SCANNER;
      else if (recv instanceof JPrint) table = PRINT;
      else if (recv instanceof JRandom) table = RANDOM;
      else if (recv instanceof JPQ) table = PQ;
      else if (recv instanceof JReader) table = READER;
      else if (recv instanceof JOptional) table = OPTIONAL;
      else if (recv instanceof JStream) table = STREAM;
      else if (recv instanceof JClassRef) table = CLASSREF;
      else if (recv instanceof JArray) {
        if (name === 'clone') return new JArray(recv.et, recv.dims, recv.a.slice());
        if (name === 'length') throw cerr('cannot find symbol\n  symbol:   method length()\n  location: class ' + recv.et + '[]'.repeat(recv.dims) + '\n  (hint: use .length without parentheses for arrays)', node);
        if (name === 'equals') return recv === args[0];
        if (name === 'hashCode') return rt.idHash(recv);
        if (name === 'toString') return rt.jstr(recv);
        if (name === 'getClass') return new JClassRef(recv.et + '[]', null, true);
        throw noMethod(recv.et + '[]'.repeat(recv.dims), name, args, node);
      } else if (recv instanceof JFunc) {
        if (recv.iface) {
          const ms = rt.methodsNamed(recv.iface, name);
          const dm = rt.select(ms.filter(m => !m.abstract && !m.static && !m.native), args);
          if (dm) return rt.invoke(dm, recv, args, node);
          const am = ms.find(m => m.abstract && m.params.length === args.length);
          if (am) { const r = recv.fn(args.map((x, i) => rt.coerce(x, am.params[i].d))); return am.retD ? rt.coerce(r, am.retD) : r; }
        }
        const f = own(FUNC, name);
        if (f && !(name === 'equals' && args.length !== 1)) {
          if (name === 'andThen' || name === 'compose') return f(recv, args, node);
          return f(recv, args, node);
        }
        return recv.fn(args);
      }
      if (table) {
        const f = (extra && own(extra, name)) || own(table, name);
        if (f) return f(recv, args, node);
        if (name === 'toString') return rt.jstr(recv);
        if (name === 'equals') return recv.jequals ? recv.jequals(rt, args[0]) : recv === args[0];
        if (name === 'hashCode') return recv.jhash ? recv.jhash(rt) : rt.idHash(recv);
        if (name === 'getClass') return new JClassRef(recv.ltype, null, true);
        throw noMethod(recv.jtype || recv.ltype, name, args, node);
      }
      if (recv && recv.collector) throw noMethod('Collector', name, args, node);
      throw noMethod(rt.typeNameOf(recv), name, args, node);
    }
    JR.objLibCall = (rt2, obj, name, args, node) => {
      const f = new JFunc(a => rt.callFn(obj, a), 'obj');
      return call(f, name, args, node);
    };

    // ---------------- static members
    const mathArgs = a => a.map(x => { if (x === null) throw npe(); return x; });
    const maxKind = a => Math.max(...a.map(nk));
    const wrapK = (k, v) => k === 0 ? v | 0 : k === 1 ? new JL(BigInt.asIntN(64, BigInt(v))) : k === 2 ? new JD(Math.fround(v), true) : D(v);
    const asD = v => numVal(v);
    function roundHalfUp(x) { return Math.floor(x + 0.5); }
    const MATH = {
      abs: a => { const [x] = mathArgs(a); const k = nk(x); if (k === 0) return Math.abs(x instanceof JC ? x.v : x) | 0; if (k === 1) return new JL(BigInt.asIntN(64, x.v < 0n ? -x.v : x.v)); return new JD(Math.abs(x.v), x.f); },
      max: a => { const k = maxKind(a); if (k === 1) { const x = lv(a[0]), y = lv(a[1]); return new JL(x > y ? x : y); } const x = asD(a[0]), y = asD(a[1]); return wrapK(k, Number.isNaN(x) || Number.isNaN(y) ? NaN : Math.max(x, y)); },
      min: a => { const k = maxKind(a); if (k === 1) { const x = lv(a[0]), y = lv(a[1]); return new JL(x < y ? x : y); } const x = asD(a[0]), y = asD(a[1]); return wrapK(k, Number.isNaN(x) || Number.isNaN(y) ? NaN : Math.min(x, y)); },
      pow: a => D(Math.pow(asD(a[0]), asD(a[1]))),
      sqrt: a => D(Math.sqrt(asD(a[0]))), cbrt: a => D(Math.cbrt(asD(a[0]))),
      floor: a => D(Math.floor(asD(a[0]))), ceil: a => D(Math.ceil(asD(a[0]))), rint: a => { const x = asD(a[0]); const r = Math.round(x); return D((Math.abs(x % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r); },
      round: a => { const x = a[0]; if (x instanceof JD && x.f) return d2i(roundHalfUp(x.v)); if (x instanceof JD) { const v = x.v; if (Number.isNaN(v)) return new JL(0n); return new JL(d2l(roundHalfUp(v))); } return typeof x === 'number' ? x : x instanceof JL ? new JL(x.v) : x; },
      random: () => { if (!mathRandom) mathRandom = new JRandom(newSeed()); return D(mathRandom.nextDouble()); },
      sin: a => D(Math.sin(asD(a[0]))), cos: a => D(Math.cos(asD(a[0]))), tan: a => D(Math.tan(asD(a[0]))),
      asin: a => D(Math.asin(asD(a[0]))), acos: a => D(Math.acos(asD(a[0]))), atan: a => D(Math.atan(asD(a[0]))), atan2: a => D(Math.atan2(asD(a[0]), asD(a[1]))),
      exp: a => D(Math.exp(asD(a[0]))), log: a => D(Math.log(asD(a[0]))), log10: a => D(Math.log10(asD(a[0]))),
      hypot: a => D(Math.hypot(asD(a[0]), asD(a[1]))), signum: a => new JD(Math.sign(asD(a[0])), a[0] instanceof JD && a[0].f),
      toRadians: a => D(asD(a[0]) * Math.PI / 180), toDegrees: a => D(asD(a[0]) * 180 / Math.PI),
      floorDiv: a => { if (nk(a[0]) === 1 || nk(a[1]) === 1) { const x = lv(a[0]), y = lv(a[1]); if (y === 0n) throw thr('ArithmeticException', '/ by zero'); let q = x / y; if ((x % y !== 0n) && ((x < 0n) !== (y < 0n))) q -= 1n; return new JL(q); } const x = toI(a[0]), y = toI(a[1]); if (y === 0) throw thr('ArithmeticException', '/ by zero'); return Math.floor(x / y) | 0; },
      floorMod: a => { if (nk(a[0]) === 1 || nk(a[1]) === 1) { const x = lv(a[0]), y = lv(a[1]); if (y === 0n) throw thr('ArithmeticException', '/ by zero'); return new JL(((x % y) + y) % y); } const x = toI(a[0]), y = toI(a[1]); if (y === 0) throw thr('ArithmeticException', '/ by zero'); return (((x % y) + y) % y) | 0; },
      addExact: a => { const k = maxKind(a); if (k === 1) { const r = lv(a[0]) + lv(a[1]); if (r !== BigInt.asIntN(64, r)) throw thr('ArithmeticException', 'long overflow'); return new JL(r); } const r = toI(a[0]) + toI(a[1]); if (r !== (r | 0)) throw thr('ArithmeticException', 'integer overflow'); return r; },
      multiplyExact: a => { const k = maxKind(a); if (k === 1) { const r = lv(a[0]) * lv(a[1]); if (r !== BigInt.asIntN(64, r)) throw thr('ArithmeticException', 'long overflow'); return new JL(r); } const r = toI(a[0]) * toI(a[1]); if (r !== (r | 0)) throw thr('ArithmeticException', 'integer overflow'); return r; },
      subtractExact: a => { const r = toI(a[0]) - toI(a[1]); if (r !== (r | 0)) throw thr('ArithmeticException', 'integer overflow'); return r; },
      clamp: a => { const v = asD(a[0]), lo = asD(a[1]), hi = asD(a[2]); return wrapK(maxKind([a[1], a[2]]), Math.min(hi, Math.max(lo, v))); },
    };
    const INTEGER = {
      parseInt: a => parseInt32(rt, a[0], a.length > 1 ? toI(a[1]) : 10),
      valueOf: a => typeof a[0] === 'string' ? parseInt32(rt, a[0], a.length > 1 ? toI(a[1]) : 10) : (a[0] === null ? (() => { throw thr('NumberFormatException', 'Cannot parse null string: null'); })() : toI(a[0])),
      toString: a => a.length > 1 ? toI(a[0]).toString(toI(a[1])) : String(toI(a[0])),
      compare: a => { const x = toI(a[0]), y = toI(a[1]); return x < y ? -1 : x > y ? 1 : 0; },
      sum: a => (toI(a[0]) + toI(a[1])) | 0, max: a => Math.max(toI(a[0]), toI(a[1])), min: a => Math.min(toI(a[0]), toI(a[1])),
      toBinaryString: a => (toI(a[0]) >>> 0).toString(2), toHexString: a => (toI(a[0]) >>> 0).toString(16), toOctalString: a => (toI(a[0]) >>> 0).toString(8),
      signum: a => Math.sign(toI(a[0])), abs: a => Math.abs(toI(a[0])) | 0, bitCount: a => { let x = toI(a[0]) >>> 0, c = 0; while (x) { c += x & 1; x >>>= 1; } return c; },
      reverse: a => { let x = toI(a[0]) >>> 0, r = 0; for (let i = 0; i < 32; i++) { r = (r << 1) | (x & 1); x >>>= 1; } return r | 0; },
      hashCode: a => toI(a[0]),
    };
    const LONG = {
      parseLong: a => new JL(parseInt64(rt, a[0], a.length > 1 ? toI(a[1]) : 10)),
      valueOf: a => typeof a[0] === 'string' ? new JL(parseInt64(rt, a[0], 10)) : rt.coerce(a[0], 'long'),
      toString: a => lv(a[0]).toString(),
      compare: a => { const x = lv(a[0]), y = lv(a[1]); return x < y ? -1 : x > y ? 1 : 0; },
      sum: a => new JL(BigInt.asIntN(64, lv(a[0]) + lv(a[1]))), max: a => new JL(lv(a[0]) > lv(a[1]) ? lv(a[0]) : lv(a[1])), min: a => new JL(lv(a[0]) < lv(a[1]) ? lv(a[0]) : lv(a[1])),
      abs: a => new JL(lv(a[0]) < 0n ? -lv(a[0]) : lv(a[0])),
    };
    const DOUBLE = {
      parseDouble: a => D(parseDoubleJ(rt, a[0])),
      valueOf: a => typeof a[0] === 'string' ? D(parseDoubleJ(rt, a[0])) : rt.coerce(a[0], 'double'),
      toString: a => fmtDouble(asD(a[0])),
      compare: a => { const x = asD(a[0]), y = asD(a[1]); return x < y ? -1 : x > y ? 1 : (Number.isNaN(x) ? (Number.isNaN(y) ? 0 : 1) : Number.isNaN(y) ? -1 : 0); },
      isNaN: a => Number.isNaN(asD(a[0])), isInfinite: a => { const x = asD(a[0]); return x === Infinity || x === -Infinity; }, isFinite: a => isFinite(asD(a[0])),
      sum: a => D(asD(a[0]) + asD(a[1])), max: a => D(Math.max(asD(a[0]), asD(a[1]))), min: a => D(Math.min(asD(a[0]), asD(a[1]))),
      hashCode: a => rt.jhash(D(asD(a[0]))),
    };
    const FLOAT = {
      parseFloat: a => new JD(Math.fround(parseDoubleJ(rt, a[0])), true),
      valueOf: a => typeof a[0] === 'string' ? new JD(Math.fround(parseDoubleJ(rt, a[0])), true) : rt.coerce(a[0], 'float'),
      toString: a => fmtFloat(asD(a[0])),
      compare: a => DOUBLE.compare(a), isNaN: a => Number.isNaN(asD(a[0])),
      sum: a => new JD(Math.fround(asD(a[0]) + asD(a[1])), true), max: a => new JD(Math.max(asD(a[0]), asD(a[1])), true), min: a => new JD(Math.min(asD(a[0]), asD(a[1])), true),
    };
    const BOOLEAN = {
      parseBoolean: a => a[0] !== null && String(a[0]).toLowerCase() === 'true',
      valueOf: a => typeof a[0] === 'boolean' ? a[0] : (a[0] !== null && String(a[0]).toLowerCase() === 'true'),
      toString: a => String(a[0]), compare: a => a[0] === a[1] ? 0 : a[0] ? 1 : -1,
      logicalAnd: a => a[0] && a[1], logicalOr: a => a[0] || a[1], logicalXor: a => a[0] !== a[1],
    };
    const cc = a => { const v = a[0]; return v instanceof JC ? v.v : toI(v); };
    const cs = a => String.fromCharCode(cc(a));
    const retC = (a, code) => a[0] instanceof JC ? new JC(code) : code;
    const CHARACTER = {
      isDigit: a => /\p{Nd}/u.test(cs(a)), isLetter: a => /\p{L}/u.test(cs(a)), isLetterOrDigit: a => /[\p{L}\p{Nd}]/u.test(cs(a)),
      isAlphabetic: a => /\p{Alphabetic}/u.test(cs(a)), isUpperCase: a => /\p{Lu}/u.test(cs(a)), isLowerCase: a => /\p{Ll}/u.test(cs(a)),
      isWhitespace: a => /[\t\n\u000b\f\r\u001c-\u001f ]|[\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]/.test(cs(a)),
      isSpaceChar: a => /\p{Zs}|\u2028|\u2029/u.test(cs(a)),
      toUpperCase: a => retC(a, cs(a).toUpperCase().length === 1 ? cs(a).toUpperCase().charCodeAt(0) : cc(a)),
      toLowerCase: a => retC(a, cs(a).toLowerCase().length === 1 ? cs(a).toLowerCase().charCodeAt(0) : cc(a)),
      getNumericValue: a => { const c = cs(a); if (/[0-9]/.test(c)) return c.charCodeAt(0) - 48; if (/[a-z]/i.test(c)) return c.toLowerCase().charCodeAt(0) - 87; return -1; },
      digit: a => { const r = toI(a[1]); const v = parseInt(cs(a), 36); return Number.isNaN(v) || v >= r ? -1 : v; },
      toString: a => cs(a), valueOf: a => a[0], compare: a => cc(a) - cc([a[1]]),
      forDigit: a => { const d = toI(a[0]), r = toI(a[1]); return new JC(d < r && d >= 0 ? d.toString(r).charCodeAt(0) : 0); },
      isVowel: undefined, toChars: a => new JArray('char', 1, [new JC(toI(a[0]))]), hashCode: a => cc(a),
    };
    const STRING_S = {
      valueOf: a => (a[0] instanceof JArray && a[0].et === 'char') ? (a.length === 3 ? a[0].a.slice(toI(a[1]), toI(a[1]) + toI(a[2])) : a[0].a).map(c => String.fromCharCode(c.v)).join('') : rt.jstr(a[0]),
      copyValueOf: a => STRING_S.valueOf(a),
      format: (a, node) => { let args = a; if (a[0] instanceof JLocale) args = a.slice(1); if (args[0] === null) throw npe(); return jformat(rt, rt.jstr(args[0]), flatVarargs(args.slice(1))); },
      join: a => {
        const sep = rt.jstr(a[0]);
        let items;
        if (a.length === 2 && a[1] && !(typeof a[1] === 'string') && (a[1].ltype || a[1] instanceof JArray)) items = toArr(a[1]);
        else items = a.slice(1);
        return items.map(x => rt.jstr(x)).join(sep);
      },
    };
    const SYSTEM = {
      exit: a => { throw Object.assign(new Halt('exit'), { code: toI(a[0]) }); },
      currentTimeMillis: () => new JL(BigInt(rt.startTime + Math.floor(rt.steps / 2000))),
      nanoTime: () => new JL(BigInt(rt.startTime) * 1000000n + BigInt(rt.steps * 500)),
      lineSeparator: () => '\n',
      arraycopy: a => {
        const [src, sp0, dst, dp0, n0] = a; const sp = toI(sp0), dp = toI(dp0), n = toI(n0);
        if (src === null || dst === null) throw npe();
        if (sp < 0 || dp < 0 || n < 0 || sp + n > src.a.length || dp + n > dst.a.length) throw thr('ArrayIndexOutOfBoundsException', `arraycopy: last source index ${sp + n} out of bounds for length ${src.a.length}`);
        const tmp = src.a.slice(sp, sp + n); for (let i = 0; i < n; i++) dst.a[dp + i] = tmp[i];
      },
      identityHashCode: a => a[0] === null ? 0 : rt.idHash(a[0]),
      getProperty: a => ({ 'line.separator': '\n', 'java.version': '21', 'user.name': 'student', 'os.name': 'Linux' })[a[0]] || null,
      getenv: () => null, gc: () => undefined,
    };
    function arrSortCmp(arr) {
      const et = arr.et;
      if (arr.dims === 1 && JR.PRIM_DESC.has(et)) {
        if (et === 'double' || et === 'float') return (x, y) => DOUBLE.compare([x, y]);
        if (et === 'long') return (x, y) => (x.v < y.v ? -1 : x.v > y.v ? 1 : 0);
        if (et === 'char') return (x, y) => x.v - y.v;
        if (et === 'boolean') throw cerr('no suitable method found for sort(boolean[])', null);
        return (x, y) => x - y;
      }
      return (x, y) => rt.jcompare(x, y);
    }
    const ARRAYS = {
      toString: a => { const x = a[0]; if (x === null) return 'null'; if (!(x instanceof JArray)) throw cerr('no suitable method found for toString(' + rt.typeNameOf(x) + ')', null); return '[' + x.a.map(v => rt.jstr(v)).join(', ') + ']'; },
      deepToString: a => { const f = x => x instanceof JArray ? '[' + x.a.map(f).join(', ') + ']' : rt.jstr(x); return a[0] === null ? 'null' : f(a[0]); },
      sort: a => {
        const arr = a[0]; if (arr === null) throw npe();
        let from = 0, to = arr.a.length, cmp = null;
        if (a.length === 2) cmp = a[1];
        if (a.length >= 3) { from = toI(a[1]); to = toI(a[2]); if (a.length === 4) cmp = a[3]; if (from > to) throw thr('IllegalArgumentException', `fromIndex(${from}) > toIndex(${to})`); if (from < 0 || to > arr.a.length) throw thr('ArrayIndexOutOfBoundsException', `Array index out of range: ${to > arr.a.length ? to : from}`); }
        const c = cmp ? cmpOf(cmp) : arrSortCmp(arr);
        const part = arr.a.slice(from, to).sort(c);
        for (let i = 0; i < part.length; i++) arr.a[from + i] = part[i];
      },
      fill: a => {
        const arr = a[0]; const d = arr.dims === 1 ? JR.tdesc({ name: arr.et, dims: 0 }) : 'ref';
        if (a.length === 4) { const f = toI(a[1]), t = toI(a[2]); if (f < 0 || t > arr.a.length || f > t) throw thr('ArrayIndexOutOfBoundsException', `Array index out of range: ${t}`); for (let i = f; i < t; i++) arr.a[i] = rt.coerce(a[3], d); }
        else for (let i = 0; i < arr.a.length; i++) arr.a[i] = rt.coerce(a[1], d);
      },
      asList: a => { if (a.length === 1 && a[0] instanceof JArray && !JR.PRIM_DESC.has(a[0].et)) return new JList('ArrayList', a[0].a, 1); return new JList('ArrayList', a.slice(), 1); },
      copyOf: a => { const arr = a[0], n = toI(a[1]); if (n < 0) throw thr('NegativeArraySizeException', String(n)); const dv = arr.dims === 1 ? rt.defVal(JR.tdesc({ name: arr.et, dims: 0 })) : null; const r = arr.a.slice(0, n); while (r.length < n) r.push(dv); return new JArray(arr.et, arr.dims, r); },
      copyOfRange: a => { const arr = a[0], f = toI(a[1]), t = toI(a[2]); if (f < 0 || f > arr.a.length) throw thr('ArrayIndexOutOfBoundsException', `Array index out of range: ${f}`); if (f > t) throw thr('IllegalArgumentException', `${f} > ${t}`); const dv = arr.dims === 1 ? rt.defVal(JR.tdesc({ name: arr.et, dims: 0 })) : null; const r = arr.a.slice(f, t); while (r.length < t - f) r.push(dv); return new JArray(arr.et, arr.dims, r); },
      equals: a => { const x = a[0], y = a[1]; if (x === y) return true; if (!x || !y) return false; return x.a.length === y.a.length && x.a.every((v, i) => rt.eq(v, y.a[i]) || rt.jequals(v, y.a[i])); },
      deepEquals: a => { const f = (x, y) => x instanceof JArray && y instanceof JArray ? x.a.length === y.a.length && x.a.every((v, i) => f(v, y.a[i])) : (x === y || rt.jequals(x, y) || rt.eq(x, y)); return f(a[0], a[1]); },
      binarySearch: a => { const arr = a[0], key = a[a.length === 3 ? 2 : 1]; const c = a.length === 3 ? cmpOf(a[2]) : arrSortCmp(arr); let lo = 0, hi = arr.a.length - 1; while (lo <= hi) { const mid = (lo + hi) >>> 1; const r = c(arr.a[mid], key); if (r < 0) lo = mid + 1; else if (r > 0) hi = mid - 1; else return mid; } return -(lo + 1); },
      stream: a => { const arr = a[0]; return new JStream(arr.a.slice(), arr.et === 'int' ? 'IntStream' : arr.et === 'double' ? 'DoubleStream' : 'Stream'); },
      hashCode: a => { if (a[0] === null) return 0; let h = 1; for (const x of a[0].a) h = (Math.imul(31, h) + rt.jhash(x)) | 0; return h; },
    };
    const COLLECTIONS = {
      sort: a => LIST.sort(a[0], [a[1] || null]),
      reverse: a => { a[0].a.reverse(); a[0].mod++; },
      shuffle: a => { const l = a[0]; const r = a[1] || new JRandom(newSeed()); for (let i = l.a.length; i > 1; i--) { const j = r.nextInt(i); const t = l.a[i - 1]; l.a[i - 1] = l.a[j]; l.a[j] = t; } },
      max: a => { const xs = toArr(a[0]); if (!xs.length) throw thr('NoSuchElementException'); const c = a[1] ? cmpOf(a[1]) : (x, y) => rt.jcompare(x, y); return xs.reduce((x, y) => c(y, x) > 0 ? y : x); },
      min: a => { const xs = toArr(a[0]); if (!xs.length) throw thr('NoSuchElementException'); const c = a[1] ? cmpOf(a[1]) : (x, y) => rt.jcompare(x, y); return xs.reduce((x, y) => c(y, x) < 0 ? y : x); },
      swap: a => { const l = a[0], i = toI(a[1]), j = toI(a[2]); chkIdx(l, i, l.a.length); chkIdx(l, j, l.a.length); const t = l.a[i]; l.a[i] = l.a[j]; l.a[j] = t; },
      frequency: a => toArr(a[0]).filter(x => x === a[1] || rt.jequals(a[1], x)).length,
      unmodifiableList: a => new JList('ImmutableList', a[0].a, 2),
      unmodifiableSet: a => a[0], unmodifiableMap: a => a[0],
      emptyList: () => new JList('ImmutableList', [], 2), emptyMap: () => { const m = newMap('HashMap'); m.immutable = true; return m; }, emptySet: () => newSet('ImmutableSet'),
      singletonList: a => new JList('ImmutableList', [a[0]], 2),
      nCopies: a => new JList('ImmutableList', Array(toI(a[0])).fill(a[1]), 2),
      addAll: a => { const l = a[0]; const xs = a.length === 2 && a[1] instanceof JArray ? a[1].a : a.slice(1); if (l instanceof JSet) { let c = false; for (const x of xs) if (SET.add(l, [x])) c = true; return c; } LIST.addAll(l, [new JList('ArrayList', xs)]); return xs.length > 0; },
      reverseOrder: a => a.length ? FUNC.reversed(a[0]) : new JFunc(x => -rt.jcompare(x[0], x[1]) | 0, 'comparator'),
      fill: a => { for (let i = 0; i < a[0].a.length; i++) a[0].a[i] = a[1]; },
      binarySearch: a => ARRAYS.binarySearch([new JArray('Object', 1, a[0].a), a[1]].concat(a.length > 2 ? [a[2]] : [])),
    };
    const varList = a => (a.length === 1 && a[0] instanceof JArray && !JR.PRIM_DESC.has(a[0].et)) ? a[0].a.slice() : a.slice();
    const LIST_S = {
      of: a => { const xs = varList(a); if (xs.some(x => x === null)) throw npe(); return new JList('ImmutableList', xs, 2); },
      copyOf: a => new JList('ImmutableList', toArr(a[0]), 2),
    };
    const SET_S = {
      of: a => { const s = newSet('ImmutableSet'); s.immutable = false; for (const x of varList(a)) { if (x === null) throw npe(); if (!SET.add(s, [x])) throw thr('IllegalArgumentException', 'duplicate element: ' + rt.jstr(x)); } s.immutable = true; return s; },
      copyOf: a => { const s = newSet('ImmutableSet'); s.immutable = false; for (const x of toArr(a[0])) SET.add(s, [x]); s.immutable = true; return s; },
    };
    const MAP_S = {
      of: a => { const m = newMap('LinkedHashMap'); for (let i = 0; i < a.length; i += 2) { if (mfind(m, a[i])) throw thr('IllegalArgumentException', 'duplicate key: ' + rt.jstr(a[i])); mput(m, a[i], a[i + 1]); } m.immutable = true; return m; },
      entry: a => new JEntry({ k: a[0], v: a[1] }, null),
      copyOf: a => { const m = newMap('LinkedHashMap'); for (const e of entries(a[0])) mput(m, e.k, e.v); m.immutable = true; return m; },
    };
    const OBJECTS = {
      equals: a => a[0] === a[1] || (a[0] !== null && rt.jequals(a[0], a[1])),
      hash: a => { let h = 1; for (const x of varList(a)) h = (Math.imul(31, h) + rt.jhash(x)) | 0; return h; },
      hashCode: a => a[0] === null ? 0 : rt.jhash(a[0]),
      isNull: a => a[0] === null, nonNull: a => a[0] !== null,
      requireNonNull: a => { if (a[0] === null) throw npe(a.length > 1 ? rt.jstr(a[1]) : undefined); return a[0]; },
      requireNonNullElse: a => a[0] !== null ? a[0] : a[1],
      toString: a => a[0] === null && a.length > 1 ? rt.jstr(a[1]) : rt.jstr(a[0]),
      compare: a => a[0] === a[1] ? 0 : toI(rt.callFn(a[2], [a[0], a[1]], 'compare')),
    };
    const COMPARATOR = {
      comparing: a => keyCmp(a[0], a[1] || null),
      comparingInt: a => keyCmp(a[0]), comparingDouble: a => keyCmp(a[0]), comparingLong: a => keyCmp(a[0]),
      naturalOrder: () => new JFunc(x => rt.jcompare(x[0], x[1]), 'comparator'),
      reverseOrder: () => new JFunc(x => -rt.jcompare(x[0], x[1]) | 0, 'comparator'),
      nullsFirst: a => new JFunc(x => x[0] === null ? (x[1] === null ? 0 : -1) : x[1] === null ? 1 : toI(rt.callFn(a[0], x, 'compare')), 'comparator'),
      nullsLast: a => new JFunc(x => x[0] === null ? (x[1] === null ? 0 : 1) : x[1] === null ? -1 : toI(rt.callFn(a[0], x, 'compare')), 'comparator'),
    };
    const THREAD = {
      sleep: a => { if (lv(a[0]) < 0n) throw thr('IllegalArgumentException', 'timeout value is negative'); rt.sleepMs = (rt.sleepMs || 0) + Number(lv(a[0])); },
      currentThread: () => ({ ltype: 'Thread', jtype: 'Thread', toJ: () => 'Thread[#1,main,5,main]' }),
    };
    const STREAM_S = {
      of: a => new JStream(varList(a)),
      range: a => { const r = []; for (let i = toI(a[0]); i < toI(a[1]); i++) r.push(i); return new JStream(r, 'IntStream'); },
      rangeClosed: a => { const r = []; for (let i = toI(a[0]); i <= toI(a[1]); i++) r.push(i); return new JStream(r, 'IntStream'); },
    };
    const OPTIONAL_S = {
      of: a => { if (a[0] === null) throw npe(); return new JOptional(a[0]); },
      ofNullable: a => new JOptional(a[0]), empty: () => new JOptional(null),
    };
    const STATICS = {
      Math: MATH, StrictMath: MATH, Integer: INTEGER, Long: LONG, Double: DOUBLE, Float: FLOAT, Boolean: BOOLEAN, Character: CHARACTER, String: STRING_S,
      System: SYSTEM, Arrays: ARRAYS, Collections: COLLECTIONS, List: LIST_S, Set: SET_S, Map: MAP_S, Objects: OBJECTS, Comparator: COMPARATOR,
      Thread: THREAD, Stream: STREAM_S, IntStream: STREAM_S, Optional: OPTIONAL_S, Short: { parseShort: a => { const v = parseInt32(rt, a[0]); if (v < -32768 || v > 32767) throw thr('NumberFormatException', `Value out of range. Value:"${a[0]}" Radix:10`); return v; }, valueOf: a => toI(a[0]) },
      Byte: { parseByte: a => { const v = parseInt32(rt, a[0]); if (v < -128 || v > 127) throw thr('NumberFormatException', `Value out of range. Value:"${a[0]}" Radix:10`); return v; }, valueOf: a => toI(a[0]) },
      Collectors: Object.fromEntries(Object.entries(COLLECTORS).map(([k, f]) => [k, a => f(a)])),
      Function: { identity: () => new JFunc(x => x[0], 'lambda') },
      UnaryOperator: { identity: () => new JFunc(x => x[0], 'lambda') },
    };
    const SFIELDS = {
      Math: { PI: D(Math.PI), E: D(Math.E) },
      Integer: { MAX_VALUE: 2147483647, MIN_VALUE: -2147483648, SIZE: 32, BYTES: 4 },
      Long: { MAX_VALUE: new JL(9223372036854775807n), MIN_VALUE: new JL(-9223372036854775808n), SIZE: 64 },
      Double: { MAX_VALUE: D(Number.MAX_VALUE), MIN_VALUE: D(Number.MIN_VALUE), POSITIVE_INFINITY: D(Infinity), NEGATIVE_INFINITY: D(-Infinity), NaN: D(NaN) },
      Float: { MAX_VALUE: new JD(3.4028234663852886e38, true), MIN_VALUE: new JD(1.401298464324817e-45, true) },
      Short: { MAX_VALUE: 32767, MIN_VALUE: -32768 }, Byte: { MAX_VALUE: 127, MIN_VALUE: -128 },
      Character: { MAX_VALUE: new JC(0xffff), MIN_VALUE: new JC(0) },
      Boolean: { TRUE: true, FALSE: false },
      System: null, // lazily created
      Locale: { US: new JLocale('en_US'), ENGLISH: new JLocale('en'), ROOT: new JLocale(''), UK: new JLocale('en_GB') },
      String: { CASE_INSENSITIVE_ORDER: new JFunc(x => STRING.compareToIgnoreCase(x[0], [x[1]]), 'comparator') },
    };
    const sysOut = new JPrint('o'), sysErr = new JPrint('e'), sysIn = { ltype: 'InputStream', jtype: 'InputStream', toJ: () => 'java.io.BufferedInputStream@' + rt.idHash(sysIn).toString(16), hash: 0 };
    SFIELDS.System = { out: sysOut, err: sysErr, in: sysIn };

    function hasClass(n) { return KNOWN_LIB.has(n) || !!own(STATICS, n) || !!own(SFIELDS, n); }
    function hasStatic(cls, name) { return !!(own(STATICS, cls) && own(STATICS[cls], name)); }
    function callStatic(cls, name, args, node) {
      const t = own(STATICS, cls);
      const f = t && own(t, name);
      if (f) return f(args, node);
      if (cls === 'Character' && name === 'isVowel') throw noMethod(cls, name, args, node);
      throw cerr(`cannot find symbol\n  symbol:   method ${name}(${args.map(a => rt.typeNameOf(a)).join(',')})\n  location: class ${cls}`, node);
    }
    function staticField(cls, name, node) {
      const t = own(SFIELDS, cls);
      if (t && Object.prototype.hasOwnProperty.call(t, name)) return t[name];
      if (STATICS[cls] || KNOWN_LIB.has(cls)) {
        if (cls === 'Map' && name === 'Entry') return new JClassRef('Map.Entry', null, true);
        throw cerr(`cannot find symbol\n  symbol:   variable ${name}\n  location: class ${cls}`, node);
      }
      throw cerr(`cannot find symbol\n  symbol: variable ${cls}`, node);
    }
    function create(name, type, args, node) {
      const n = name.replace(/^java\.(util|lang|io)\./, '');
      const fromColl = () => { if (args.length && args[0] !== null && (args[0].ltype || args[0] instanceof JArray)) return toArr(args[0]); if (args.length && args[0] === null) throw npe(); return null; };
      switch (n) {
        case 'ArrayList': case 'LinkedList': case 'Vector': case 'Stack': case 'ArrayDeque': {
          const l = new JList(n, []);
          if (args.length === 1 && typeof args[0] === 'number') { if (args[0] < 0) throw thr('IllegalArgumentException', 'Illegal Capacity: ' + args[0]); return l; }
          const xs = fromColl(); if (xs) l.a = xs;
          return l;
        }
        case 'PriorityQueue': {
          let cmp = null; const pq = new JPQ(null);
          for (const a of args) { if (a instanceof JFunc || a instanceof JObject) cmp = a; }
          pq.cmp = cmp;
          if (args.length && args[0] && args[0].ltype) for (const x of toArr(args[0])) pqOffer(pq, x);
          return pq;
        }
        case 'HashMap': case 'LinkedHashMap': case 'TreeMap': case 'Hashtable': {
          let cmp = null; if (args.length === 1 && (args[0] instanceof JFunc || args[0] instanceof JObject)) cmp = args[0];
          const m = newMap(n === 'Hashtable' ? 'HashMap' : n, cmp);
          if (args.length === 1 && typeof args[0] === 'number') { let c = 1; while (c < args[0]) c *= 2; m.cap = Math.max(1, c); }
          if (args.length && args[0] instanceof JMap) for (const e of entries(args[0])) mput(m, e.k, e.v);
          return m;
        }
        case 'HashSet': case 'LinkedHashSet': case 'TreeSet': {
          let cmp = null; if (args.length === 1 && (args[0] instanceof JFunc || args[0] instanceof JObject)) cmp = args[0];
          const s = newSet(n, cmp);
          if (args.length === 1 && typeof args[0] === 'number') { let c = 1; while (c < args[0]) c *= 2; s.m.cap = Math.max(1, c); }
          const xs = cmp ? null : fromColl();
          if (xs) { if (n === 'HashSet') { let c = 16; while (c * 0.75 < Math.max(xs.length / 0.75 + 1, 16) && c < (1 << 30)) c *= 2; } for (const x of xs) SET.add(s, [x]); }
          return s;
        }
        case 'StringBuilder': case 'StringBuffer': return new JSB(n, args.length && typeof args[0] !== 'number' ? rt.jstr(args[0]) : '');
        case 'Scanner': {
          if (args.length !== 1) throw cerr('no suitable constructor found for Scanner(' + args.map(a => rt.typeNameOf(a)).join(',') + ')', node);
          if (args[0] === sysIn) return new JScanner('stdin');
          if (typeof args[0] === 'string') return new JScanner(args[0]);
          throw cerr('Scanner input source is not supported here (use System.in)', node);
        }
        case 'Random': return new JRandom(args.length ? lv(args[0]) : newSeed());
        case 'String': {
          if (!args.length) return '';
          if (args[0] instanceof JArray) return STRING_S.valueOf(args);
          if (args[0] instanceof JSB) return args[0].s;
          if (typeof args[0] === 'string') return args[0];
          throw cerr('no suitable constructor found for String(' + rt.typeNameOf(args[0]) + ')', node);
        }
        case 'InputStreamReader': return new JReader('InputStreamReader');
        case 'BufferedReader': return new JReader('BufferedReader');
        case 'Integer': return parseOrBox(args, 'int');
        case 'Double': return typeof args[0] === 'string' ? D(parseDoubleJ(rt, args[0])) : rt.coerce(args[0], 'double');
        case 'Object': return new JObject(rt.objectClass);
        case 'Locale': return new JLocale(args.map(a => rt.jstr(a)).join('_'));
        case 'Thread': return { ltype: 'Thread', jtype: 'Thread', start() { }, toJ: () => 'Thread' };
      }
      if (KNOWN_LIB.has(n)) throw cerr(`${n} is abstract; cannot be instantiated`, node);
      throw cerr(`cannot find symbol\n  symbol:   class ${name}`, node);
    }
    function parseOrBox(args, d) { return typeof args[0] === 'string' ? parseInt32(rt, args[0]) : rt.coerce(args[0], d); }

    return { call, callStatic, hasStatic, staticField, create, hasClass, iterator, toArr };
  };
  JR.jsplit = jsplit;
})(typeof window !== 'undefined' ? (window.JR = window.JR || {}) : (globalThis.JR = globalThis.JR || {}));

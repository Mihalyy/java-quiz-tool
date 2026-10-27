/* Runtime value model, numeric helpers and Java-compatible formatting */
'use strict';
(function (JR) {
  // double / float
  class JD { constructor(v, f) { this.v = v; this.f = !!f; } }
  // char
  class JC { constructor(v) { this.v = v; } }
  // long (BigInt payload)
  class JL { constructor(v) { this.v = v; } }
  class JObject {
    constructor(cls) { this.cls = cls; this.f = Object.create(null); this.caps = null; this.hash = 0; }
  }
  class JArray {
    // et: element type name (e.g. 'int', 'String', 'Product'), dims: dims of this array (>=1)
    constructor(et, dims, a) { this.et = et; this.dims = dims; this.a = a; this.hash = 0; }
  }
  class JClassRef { constructor(name, ci, lib) { this.name = name; this.ci = ci || null; this.lib = lib || null; } }
  // functional value: lambdas, method refs, library comparators
  class JFunc {
    constructor(fn, desc) { this.fn = fn; this.desc = desc || 'lambda'; this.iface = null; this.hash = 0; }
  }
  class JThrow { constructor(obj) { this.obj = obj; } }   // a thrown Java exception
  class Halt { constructor(kind, msg) { this.kind = kind; this.msg = msg; } } // exit / needInput / timeout / limit
  class Scope {
    constructor(parent, frame) { this.vars = new Map(); this.parent = parent; this.frame = frame; }
  }

  const PRIM_DESC = new Set(['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short']);
  const BOX = { Integer: 'int', Long: 'long', Double: 'double', Float: 'float', Boolean: 'boolean', Character: 'char', Byte: 'byte', Short: 'short' };
  const UNBOX = { int: 'Integer', long: 'Long', double: 'Double', float: 'Float', boolean: 'Boolean', char: 'Character', byte: 'Byte', short: 'Short' };
  // descriptor used for coercion of a declared type
  function tdesc(t) {
    if (!t) return null;
    if (t._d !== undefined) return t._d;
    let d;
    if (t.dims > 0) d = 'ref';
    else if (PRIM_DESC.has(t.name) || BOX[t.name] || t.name === 'String') d = t.name;
    else if (t.name === 'var') d = null;
    else d = 'ref';
    t._d = d;
    return d;
  }

  function d2i(x) {
    if (Number.isNaN(x)) return 0;
    if (x >= 2147483647) return 2147483647;
    if (x <= -2147483648) return -2147483648;
    return Math.trunc(x) | 0;
  }
  function d2l(x) {
    if (Number.isNaN(x)) return 0n;
    if (x >= 9223372036854775807) return 9223372036854775807n;
    if (x <= -9223372036854775808) return -9223372036854775808n;
    return BigInt(Math.trunc(x));
  }

  // ---------------------------------------------------------------- number -> string
  function fmtDouble(d) {
    if (Number.isNaN(d)) return 'NaN';
    if (d === Infinity) return 'Infinity';
    if (d === -Infinity) return '-Infinity';
    if (d === 0) return (1 / d < 0) ? '-0.0' : '0.0';
    const a = Math.abs(d);
    if (a >= 1e-3 && a < 1e7) {
      let s = String(d);
      if (s.indexOf('e') >= 0) s = plainFromExp(d.toExponential());
      if (s.indexOf('.') < 0) s += '.0';
      return s;
    }
    const s = d.toExponential();
    let [m, ex] = s.split('e');
    if (m.indexOf('.') < 0) m += '.0';
    return m + 'E' + (ex[0] === '+' ? ex.slice(1) : ex);
  }
  function shortestFloat(f) {
    if (!isFinite(f) || f === 0) return f;
    for (let p = 1; p <= 9; p++) {
      const v = Number(f.toPrecision(p));
      if (Math.fround(v) === f) return v;
    }
    return f;
  }
  function fmtFloat(f) {
    if (Number.isNaN(f) || !isFinite(f) || f === 0) return fmtDouble(f);
    return fmtDouble(shortestFloat(f));
  }
  // "1.2345e+3" -> "1234.5"
  function plainFromExp(es) {
    let [m, ex] = es.split('e');
    let neg = false;
    if (m[0] === '-') { neg = true; m = m.slice(1); }
    const e = parseInt(ex, 10);
    const digits = m.replace('.', '');
    const point = 1 + e; // position of decimal point in digits
    let s;
    if (point <= 0) s = '0.' + '0'.repeat(-point) + digits;
    else if (point >= digits.length) s = digits + '0'.repeat(point - digits.length);
    else s = digits.slice(0, point) + '.' + digits.slice(point);
    return (neg ? '-' : '') + s;
  }
  // decimal digits (shortest repr) of |x|: returns {int: '123', frac: '45'}
  function decParts(x, isFloat) {
    const a = Math.abs(isFloat ? shortestFloat(x) : x);
    const s = plainFromExp(a.toExponential());
    const i = s.indexOf('.');
    return i < 0 ? { int: s, frac: '' } : { int: s.slice(0, i), frac: s.slice(i + 1) };
  }
  // add one unit at the last position of a digit string
  function incDigits(s) {
    const arr = s.split('');
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] === '9') { arr[i] = '0'; i--; }
      else { arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1); return arr.join(''); }
    }
    return '1' + arr.join('');
  }
  // Java Formatter %.nf : HALF_UP on the shortest decimal representation
  function fixedHalfUp(x, prec, isFloat) {
    let { int, frac } = decParts(x, isFloat);
    if (frac.length <= prec) frac = frac + '0'.repeat(prec - frac.length);
    else {
      const up = frac.charCodeAt(prec) >= 53; // '5'
      let keep = int + frac.slice(0, prec);
      if (up) keep = incDigits(keep);
      const il = keep.length - prec;
      int = keep.slice(0, il); frac = keep.slice(il);
    }
    int = int.replace(/^0+(?=\d)/, '');
    return prec > 0 ? int + '.' + frac : int;
  }
  function sciHalfUp(x, prec, isFloat, upper) {
    const a = Math.abs(isFloat ? shortestFloat(x) : x);
    if (a === 0) return (prec > 0 ? '0.' + '0'.repeat(prec) : '0') + (upper ? 'E+00' : 'e+00');
    let [m, ex] = a.toExponential().split('e');
    let e = parseInt(ex, 10);
    let digits = m.replace('.', '');
    if (digits.length <= prec + 1) digits = digits + '0'.repeat(prec + 1 - digits.length);
    else {
      const up = digits.charCodeAt(prec + 1) >= 53;
      digits = digits.slice(0, prec + 1);
      if (up) { digits = incDigits(digits); if (digits.length > prec + 1) { digits = digits.slice(0, prec + 1); e++; } }
    }
    const mant = prec > 0 ? digits[0] + '.' + digits.slice(1) : digits[0];
    const es = (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    return mant + (upper ? 'E' : 'e') + es;
  }
  function group(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function javaStringHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  JR.JD = JD; JR.JC = JC; JR.JL = JL; JR.JObject = JObject; JR.JArray = JArray; JR.JClassRef = JClassRef;
  JR.JFunc = JFunc; JR.JThrow = JThrow; JR.Halt = Halt; JR.Scope = Scope;
  JR.tdesc = tdesc; JR.d2i = d2i; JR.d2l = d2l; JR.BOX = BOX; JR.UNBOX = UNBOX; JR.PRIM_DESC = PRIM_DESC;
  JR.fmtDouble = fmtDouble; JR.fmtFloat = fmtFloat; JR.fixedHalfUp = fixedHalfUp; JR.sciHalfUp = sciHalfUp; JR.group = group;
  JR.javaStringHash = javaStringHash; JR.shortestFloat = shortestFloat;
})(typeof window !== 'undefined' ? (window.JR = window.JR || {}) : (globalThis.JR = globalThis.JR || {}));

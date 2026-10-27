/* Static semantic checker: produces javac-like compile errors for common mistakes.
 * Conservative: when a type is unknown (null) checks are skipped instead of guessing. */
'use strict';
(function (JR) {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const PRIMS = new Set(['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short']);
  const NUMRANK = { byte: 1, short: 2, char: 2, int: 3, long: 4, float: 5, double: 6 };
  const BOXES = { Integer: 'int', Long: 'long', Double: 'double', Float: 'float', Boolean: 'boolean', Character: 'char', Byte: 'byte', Short: 'short' };
  const UNBOXES = { int: 'Integer', long: 'Long', double: 'Double', float: 'Float', boolean: 'Boolean', char: 'Character', byte: 'Byte', short: 'Short' };

  // ---------------------------------------------------------------- type helpers
  const T = (n, a, d) => ({ n, a: a || null, d: d || 0 });
  const tInt = T('int'), tBool = T('boolean'), tStr = T('String'), tDouble = T('double'), tLong = T('long'), tChar = T('char'), tVoid = T('void'), tNull = T('null'), tObj = T('Object'), tFloat = T('float');
  const tLambda = T('$lambda');
  const isPrim = t => t && t.d === 0 && PRIMS.has(t.n);
  const isNumPrim = t => isPrim(t) && t.n !== 'boolean';
  const unbox = t => t && t.d === 0 && BOXES[t.n] ? T(BOXES[t.n]) : t;
  const isNumeric = t => { const u = unbox(t); return !!u && isNumPrim(u); };
  const isBoolish = t => { const u = unbox(t); return !!u && u.d === 0 && u.n === 'boolean'; };
  const isStr = t => t && t.d === 0 && t.n === 'String';
  function tstr(t) {
    if (!t) return '?';
    if (t.n === 'null') return '<null>';
    if (t.n === '$lambda') return 'lambda';
    let s = t.n;
    if (t.a && t.a.length) s += '<' + t.a.map(tstr).join(',') + '>';
    return s + '[]'.repeat(t.d);
  }
  function binPromote(a, b) {
    const x = unbox(a), y = unbox(b);
    if (!isNumPrim(x) || !isNumPrim(y)) return null;
    if (x.n === 'double' || y.n === 'double') return tDouble;
    if (x.n === 'float' || y.n === 'float') return tFloat;
    if (x.n === 'long' || y.n === 'long') return tLong;
    return tInt;
  }
  const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k)) ? o[k] : undefined;
  const normName = n => n.replace(/^java\.(util|lang|io)\.(function\.|stream\.)?/, '');

  // ---------------------------------------------------------------- library signatures
  // return type specs: type strings with E/K/V/T placeholders; '?' = unknown; '$...' special handlers
  const OBJ_M = { toString: 'String', equals: 'boolean', hashCode: 'int', getClass: 'Class' };
  const BOXED_M = Object.assign({ intValue: 'int', doubleValue: 'double', longValue: 'long', floatValue: 'float', shortValue: 'short', byteValue: 'byte', compareTo: 'int', charValue: 'char', booleanValue: 'boolean', isNaN: 'boolean', isInfinite: 'boolean' }, OBJ_M);
  const STRING_M = Object.assign({
    length: 'int', charAt: 'char', isEmpty: 'boolean', isBlank: 'boolean', substring: 'String', subSequence: 'String', indexOf: 'int', lastIndexOf: 'int',
    contains: 'boolean', startsWith: 'boolean', endsWith: 'boolean', equalsIgnoreCase: 'boolean', contentEquals: 'boolean', compareTo: 'int',
    compareToIgnoreCase: 'int', toUpperCase: 'String', toLowerCase: 'String', trim: 'String', strip: 'String', stripLeading: 'String', stripTrailing: 'String',
    concat: 'String', replace: 'String', replaceAll: 'String', replaceFirst: 'String', matches: 'boolean', split: 'String[]', toCharArray: 'char[]',
    chars: 'IntStream', repeat: 'String', intern: 'String', lines: 'Stream<String>', indent: 'String', formatted: 'String', codePointAt: 'int', describeConstable: '?',
  }, OBJ_M);
  const COLL_M = Object.assign({ size: 'int', isEmpty: 'boolean', contains: 'boolean', containsAll: 'boolean', add: 'boolean', addAll: 'boolean', remove: 'boolean', removeAll: 'boolean', retainAll: 'boolean', removeIf: 'boolean', clear: 'void', iterator: 'Iterator<E>', forEach: 'void', stream: 'Stream<E>', toArray: '$toArray' }, OBJ_M);
  const LIST_M = Object.assign({}, COLL_M, {
    get: 'E', set: 'E', add: '$listAdd', remove: '$listRemove', indexOf: 'int', lastIndexOf: 'int', replaceAll: 'void', sort: 'void',
    listIterator: 'ListIterator<E>', subList: 'List<E>', getFirst: 'E', getLast: 'E', removeFirst: 'E', removeLast: 'E', addFirst: 'void', addLast: 'void',
    reversed: 'List<E>', ensureCapacity: 'void', trimToSize: 'void',
  });
  const DEQUE_M = Object.assign({}, COLL_M, { offer: 'boolean', offerFirst: 'boolean', offerLast: 'boolean', push: 'void', pop: 'E', poll: 'E', pollFirst: 'E', pollLast: 'E', peek: 'E', peekFirst: 'E', peekLast: 'E', element: 'E', remove: '$dequeRemove', descendingIterator: 'Iterator<E>', getFirst: 'E', getLast: 'E', removeFirst: 'E', removeLast: 'E', addFirst: 'void', addLast: 'void' });
  const LINKED_M = Object.assign({}, LIST_M, DEQUE_M, { remove: '$linkedRemove', add: '$listAdd' });
  const STACK_M = Object.assign({}, LIST_M, { push: 'E', pop: 'E', peek: 'E', empty: 'boolean', search: 'int', firstElement: 'E', lastElement: 'E', elementAt: 'E', addElement: 'void' });
  const PQ_M = Object.assign({}, COLL_M, { offer: 'boolean', poll: 'E', peek: 'E', element: 'E', remove: '$dequeRemove' });
  const SET_M = Object.assign({}, COLL_M, { first: 'E', last: 'E', pollFirst: 'E', pollLast: 'E', floor: 'E', ceiling: 'E', lower: 'E', higher: 'E', headSet: 'Set<E>', tailSet: 'Set<E>', descendingSet: 'Set<E>' });
  const MAP_M = Object.assign({
    put: 'V', get: 'V', getOrDefault: 'V', containsKey: 'boolean', containsValue: 'boolean', remove: '$mapRemove', size: 'int', isEmpty: 'boolean', clear: 'void',
    keySet: 'Set<K>', values: 'Collection<V>', entrySet: 'Set<Map.Entry<K,V>>', putIfAbsent: 'V', putAll: 'void', forEach: 'void', merge: 'V', compute: 'V',
    computeIfAbsent: 'V', computeIfPresent: 'V', replace: 'V', replaceAll: 'void', firstKey: 'K', lastKey: 'K', firstEntry: 'Map.Entry<K,V>', lastEntry: 'Map.Entry<K,V>',
    pollFirstEntry: 'Map.Entry<K,V>', pollLastEntry: 'Map.Entry<K,V>', floorKey: 'K', ceilingKey: 'K', lowerKey: 'K', higherKey: 'K', headMap: 'Map<K,V>', tailMap: 'Map<K,V>',
    descendingMap: 'Map<K,V>', descendingKeySet: 'Set<K>', navigableKeySet: 'Set<K>',
  }, OBJ_M);
  const ENTRY_M = Object.assign({ getKey: 'K', getValue: 'V', setValue: 'V' }, OBJ_M);
  const ITER_M = Object.assign({ hasNext: 'boolean', next: 'E', remove: 'void', set: 'void', add: 'void', hasPrevious: 'boolean', previous: 'E', nextIndex: 'int', previousIndex: 'int', forEachRemaining: 'void' }, OBJ_M);
  const SB_M = Object.assign({ append: '$self', toString: 'String', length: 'int', charAt: 'char', reverse: '$self', insert: '$self', deleteCharAt: '$self', delete: '$self', replace: '$self', setCharAt: 'void', setLength: 'void', indexOf: 'int', lastIndexOf: 'int', substring: 'String', isEmpty: 'boolean', capacity: 'int', compareTo: 'int', chars: 'IntStream' }, OBJ_M);
  const SCANNER_M = Object.assign({ nextInt: 'int', nextLong: 'long', nextShort: 'short', nextByte: 'byte', nextDouble: 'double', nextFloat: 'float', nextBoolean: 'boolean', next: 'String', nextLine: 'String', hasNext: 'boolean', hasNextInt: 'boolean', hasNextLong: 'boolean', hasNextDouble: 'boolean', hasNextBoolean: 'boolean', hasNextLine: 'boolean', close: 'void', skip: 'Scanner', useDelimiter: 'Scanner' }, OBJ_M);
  const PRINT_M = Object.assign({ println: 'void', print: 'void', printf: 'PrintStream', format: 'PrintStream', flush: 'void', close: 'void', write: 'void' }, OBJ_M);
  const READER_M = Object.assign({ readLine: 'String', read: 'int', ready: 'boolean', close: 'void' }, OBJ_M);
  const RANDOM_M = Object.assign({ nextInt: 'int', nextDouble: 'double', nextBoolean: 'boolean', nextLong: 'long', nextFloat: 'float', nextGaussian: 'double', setSeed: 'void', ints: '?' }, OBJ_M);
  const CLASS_M = Object.assign({ getSimpleName: 'String', getName: 'String', getTypeName: 'String', isInstance: 'boolean', getSuperclass: 'Class', isInterface: 'boolean', getEnumConstants: '?' }, OBJ_M);
  const ANY_M = null; // unknown members allowed
  const LIBM = {
    String: STRING_M, Integer: BOXED_M, Long: BOXED_M, Double: BOXED_M, Float: BOXED_M, Short: BOXED_M, Byte: BOXED_M, Character: BOXED_M, Boolean: BOXED_M, Number: BOXED_M,
    ArrayList: LIST_M, List: LIST_M, Vector: STACK_M, AbstractList: LIST_M, LinkedList: LINKED_M, Stack: STACK_M, Collection: COLL_M, Iterable: { iterator: 'Iterator<E>', forEach: 'void' },
    Queue: DEQUE_M, Deque: DEQUE_M, ArrayDeque: DEQUE_M, PriorityQueue: PQ_M,
    HashMap: MAP_M, LinkedHashMap: MAP_M, TreeMap: MAP_M, Map: MAP_M, SortedMap: MAP_M, NavigableMap: MAP_M, Hashtable: MAP_M,
    HashSet: SET_M, LinkedHashSet: SET_M, TreeSet: SET_M, Set: SET_M, SortedSet: SET_M, NavigableSet: SET_M,
    'Map.Entry': ENTRY_M, Entry: ENTRY_M, Iterator: ITER_M, ListIterator: ITER_M,
    StringBuilder: SB_M, StringBuffer: SB_M, Scanner: SCANNER_M, PrintStream: PRINT_M, BufferedReader: READER_M, Random: RANDOM_M, Class: CLASS_M,
    Object: OBJ_M, CharSequence: Object.assign({ length: 'int', charAt: 'char', subSequence: 'String', isEmpty: 'boolean', chars: 'IntStream' }, OBJ_M),
    Comparable: Object.assign({ compareTo: 'int' }, OBJ_M),
  };
  // allowed argument counts: [counts, javac 'required:' text when the method is not overloaded]
  const ARITY = {
    String: { length: [[0], 'no arguments'], charAt: [[1], 'int'], substring: [[1, 2]], indexOf: [[1, 2]], lastIndexOf: [[1, 2]], contains: [[1], 'CharSequence'],
      startsWith: [[1, 2]], endsWith: [[1], 'String'], equalsIgnoreCase: [[1], 'String'], compareTo: [[1], 'String'], compareToIgnoreCase: [[1], 'String'],
      replace: [[2]], replaceAll: [[2], 'String,String'], split: [[1, 2]], trim: [[0], 'no arguments'], isEmpty: [[0], 'no arguments'], isBlank: [[0], 'no arguments'],
      toUpperCase: [[0, 1]], toLowerCase: [[0, 1]], concat: [[1], 'String'], repeat: [[1], 'int'], matches: [[1], 'String'], toCharArray: [[0], 'no arguments'], strip: [[0], 'no arguments'] },
    ArrayList: { size: [[0], 'no arguments'], get: [[1], 'int'], set: [[2], 'int,E'], isEmpty: [[0], 'no arguments'], clear: [[0], 'no arguments'], add: [[1, 2]], remove: [[1]], contains: [[1], 'Object'], indexOf: [[1], 'Object'] },
  };
  const LIST_LIKE = new Set(['List', 'LinkedList', 'Vector', 'Stack']);
  // functional interfaces: any call allowed, return unknown (except a few)
  const FUNCTIONAL = new Set(['Comparator', 'Runnable', 'Function', 'BiFunction', 'Consumer', 'BiConsumer', 'Supplier', 'Predicate', 'BiPredicate', 'UnaryOperator', 'BinaryOperator', 'IntBinaryOperator', 'IntUnaryOperator', 'IntPredicate', 'ToIntFunction', 'ToDoubleFunction', 'IntFunction', 'Callable']);
  const FUNC_RET = { compare: 'int', test: 'boolean', accept: 'void', run: 'void', applyAsInt: 'int', applyAsDouble: 'double', reversed: '$self', thenComparing: '$self', thenComparingInt: '$self', thenComparingDouble: '$self', negate: '$self', and: '$self', or: '$self' };
  const STATIC_M = {
    Math: { abs: '$num', max: '$num', min: '$num', pow: 'double', sqrt: 'double', cbrt: 'double', floor: 'double', ceil: 'double', rint: 'double', round: '$round', random: 'double', sin: 'double', cos: 'double', tan: 'double', asin: 'double', acos: 'double', atan: 'double', atan2: 'double', exp: 'double', log: 'double', log10: 'double', hypot: 'double', signum: '$num', toRadians: 'double', toDegrees: 'double', floorDiv: '$num', floorMod: '$num', addExact: '$num', multiplyExact: '$num', subtractExact: '$num', clamp: '$num' },
    Integer: { parseInt: 'int', valueOf: 'Integer', toString: 'String', compare: 'int', sum: 'int', max: 'int', min: 'int', toBinaryString: 'String', toHexString: 'String', toOctalString: 'String', signum: 'int', abs: 'int', bitCount: 'int', reverse: 'int', hashCode: 'int' },
    Long: { parseLong: 'long', valueOf: 'Long', toString: 'String', compare: 'int', sum: 'long', max: 'long', min: 'long', abs: 'long' },
    Double: { parseDouble: 'double', valueOf: 'Double', toString: 'String', compare: 'int', isNaN: 'boolean', isInfinite: 'boolean', isFinite: 'boolean', sum: 'double', max: 'double', min: 'double', hashCode: 'int' },
    Float: { parseFloat: 'float', valueOf: 'Float', toString: 'String', compare: 'int', isNaN: 'boolean', sum: 'float', max: 'float', min: 'float' },
    Short: { parseShort: 'short', valueOf: 'Short' }, Byte: { parseByte: 'byte', valueOf: 'Byte' },
    Boolean: { parseBoolean: 'boolean', valueOf: 'Boolean', toString: 'String', compare: 'int', logicalAnd: 'boolean', logicalOr: 'boolean', logicalXor: 'boolean' },
    Character: { isDigit: 'boolean', isLetter: 'boolean', isLetterOrDigit: 'boolean', isAlphabetic: 'boolean', isUpperCase: 'boolean', isLowerCase: 'boolean', isWhitespace: 'boolean', isSpaceChar: 'boolean', toUpperCase: '$charOrInt', toLowerCase: '$charOrInt', getNumericValue: 'int', digit: 'int', toString: 'String', valueOf: 'Character', compare: 'int', forDigit: 'char', toChars: 'char[]', hashCode: 'int' },
    String: { valueOf: 'String', copyValueOf: 'String', format: 'String', join: 'String' },
    System: { exit: 'void', currentTimeMillis: 'long', nanoTime: 'long', lineSeparator: 'String', arraycopy: 'void', identityHashCode: 'int', getProperty: 'String', getenv: 'String', gc: 'void' },
    Arrays: { toString: 'String', deepToString: 'String', sort: 'void', fill: 'void', asList: '$asList', copyOf: '$arg0', copyOfRange: '$arg0', equals: 'boolean', deepEquals: 'boolean', binarySearch: 'int', stream: '?', hashCode: 'int' },
    Collections: { sort: 'void', reverse: 'void', shuffle: 'void', swap: 'void', fill: 'void', max: '$elem', min: '$elem', frequency: 'int', unmodifiableList: '$arg0', unmodifiableSet: '$arg0', unmodifiableMap: '$arg0', emptyList: 'List', emptyMap: 'Map', emptySet: 'Set', singletonList: 'List', nCopies: 'List', addAll: 'boolean', reverseOrder: 'Comparator', binarySearch: 'int' },
    List: { of: '$listOf', copyOf: 'List' }, Set: { of: 'Set', copyOf: 'Set' }, Map: { of: 'Map', entry: 'Map.Entry', copyOf: 'Map' },
    Objects: { equals: 'boolean', hash: 'int', hashCode: 'int', isNull: 'boolean', nonNull: 'boolean', requireNonNull: '$arg0', requireNonNullElse: '$arg0', toString: 'String', compare: 'int' },
    Comparator: { comparing: 'Comparator', comparingInt: 'Comparator', comparingDouble: 'Comparator', comparingLong: 'Comparator', naturalOrder: 'Comparator', reverseOrder: 'Comparator', nullsFirst: 'Comparator', nullsLast: 'Comparator' },
    Thread: { sleep: 'void', currentThread: '?' },
    Stream: { of: '?' }, IntStream: { range: '?', rangeClosed: '?', of: '?' }, Optional: { of: '?', ofNullable: '?', empty: '?' },
    Collectors: { toList: '?', toSet: '?', joining: '?', counting: '?', groupingBy: '?', toMap: '?', summingInt: '?', averagingInt: '?', averagingDouble: '?' },
    Function: { identity: '?' }, UnaryOperator: { identity: '?' }, StrictMath: null,
  };
  STATIC_M.StrictMath = STATIC_M.Math;
  const STATIC_F = {
    Math: { PI: 'double', E: 'double' }, Integer: { MAX_VALUE: 'int', MIN_VALUE: 'int', SIZE: 'int', BYTES: 'int' }, Long: { MAX_VALUE: 'long', MIN_VALUE: 'long', SIZE: 'int' },
    Double: { MAX_VALUE: 'double', MIN_VALUE: 'double', POSITIVE_INFINITY: 'double', NEGATIVE_INFINITY: 'double', NaN: 'double' }, Float: { MAX_VALUE: 'float', MIN_VALUE: 'float' },
    Short: { MAX_VALUE: 'short', MIN_VALUE: 'short' }, Byte: { MAX_VALUE: 'byte', MIN_VALUE: 'byte' }, Character: { MAX_VALUE: 'char', MIN_VALUE: 'char' },
    Boolean: { TRUE: 'Boolean', FALSE: 'Boolean' }, System: { out: 'PrintStream', err: 'PrintStream', in: 'InputStream' },
    Locale: { US: 'Locale', ENGLISH: 'Locale', ROOT: 'Locale', UK: 'Locale' }, String: { CASE_INSENSITIVE_ORDER: 'Comparator<String>' },
  };
  // types that need an import (package)
  const NEEDS_IMPORT = JR.LIB_PKG;
  const LIB_CLASSES_NEW = new Set(['ArrayList', 'LinkedList', 'Vector', 'Stack', 'ArrayDeque', 'PriorityQueue', 'HashMap', 'LinkedHashMap', 'TreeMap', 'Hashtable', 'HashSet', 'LinkedHashSet', 'TreeSet', 'StringBuilder', 'StringBuffer', 'Scanner', 'Random', 'String', 'InputStreamReader', 'BufferedReader', 'Integer', 'Double', 'Object', 'Locale', 'Thread']);
  const ABSTRACT_LIB = new Set(['List', 'Map', 'Set', 'Collection', 'Queue', 'Deque', 'Iterable', 'Iterator', 'Comparator', 'Comparable', 'Number', 'CharSequence', 'Runnable', 'Function', 'Consumer', 'Supplier', 'Predicate', 'BiFunction', 'AbstractList', 'SortedMap', 'NavigableMap', 'SortedSet', 'NavigableSet', 'Math', 'System', 'Arrays', 'Collections', 'Objects']);
  const LIB_SUPERS = {
    ArrayList: ['List', 'Collection', 'Iterable', 'AbstractList', 'RandomAccess', 'SequencedCollection', 'Cloneable', 'Serializable'],
    LinkedList: ['List', 'Deque', 'Queue', 'Collection', 'Iterable', 'AbstractList', 'SequencedCollection', 'Cloneable', 'Serializable'],
    Vector: ['List', 'Collection', 'Iterable', 'AbstractList', 'RandomAccess'], Stack: ['Vector', 'List', 'Collection', 'Iterable', 'AbstractList', 'RandomAccess'],
    ArrayDeque: ['Deque', 'Queue', 'Collection', 'Iterable'], PriorityQueue: ['Queue', 'Collection', 'Iterable', 'AbstractQueue'],
    List: ['Collection', 'Iterable', 'SequencedCollection'], Set: ['Collection', 'Iterable'], Queue: ['Collection', 'Iterable'], Deque: ['Queue', 'Collection', 'Iterable'], Collection: ['Iterable'],
    SortedSet: ['Set', 'Collection', 'Iterable'], NavigableSet: ['SortedSet', 'Set', 'Collection', 'Iterable'],
    HashMap: ['Map', 'AbstractMap', 'Cloneable', 'Serializable'], LinkedHashMap: ['HashMap', 'Map', 'AbstractMap', 'SequencedMap'], TreeMap: ['Map', 'SortedMap', 'NavigableMap', 'AbstractMap'], Hashtable: ['Map'],
    SortedMap: ['Map'], NavigableMap: ['SortedMap', 'Map'],
    HashSet: ['Set', 'Collection', 'Iterable', 'AbstractSet'], LinkedHashSet: ['HashSet', 'Set', 'Collection', 'Iterable', 'AbstractSet'], TreeSet: ['Set', 'SortedSet', 'NavigableSet', 'Collection', 'Iterable', 'AbstractSet'],
    String: ['CharSequence', 'Comparable', 'Serializable'], StringBuilder: ['CharSequence', 'Appendable'], StringBuffer: ['CharSequence', 'Appendable'],
    Integer: ['Number', 'Comparable', 'Serializable'], Long: ['Number', 'Comparable', 'Serializable'], Double: ['Number', 'Comparable', 'Serializable'], Float: ['Number', 'Comparable'], Short: ['Number', 'Comparable'], Byte: ['Number', 'Comparable'],
    Character: ['Comparable', 'Serializable'], Boolean: ['Comparable', 'Serializable'], Scanner: ['Iterator', 'Closeable', 'AutoCloseable'], BufferedReader: ['Reader', 'Closeable', 'AutoCloseable'],
    ListIterator: ['Iterator'], UnaryOperator: ['Function'], BinaryOperator: ['BiFunction'],
  };
  function libTypeArgsIndex(n) {
    // name of generic params for library types
    if (/Map$|^Hashtable$/.test(n) || n === 'Map.Entry' || n === 'Entry') return ['K', 'V'];
    if (['ArrayList', 'List', 'LinkedList', 'Vector', 'Stack', 'Collection', 'Iterable', 'Queue', 'Deque', 'ArrayDeque', 'PriorityQueue', 'HashSet', 'LinkedHashSet', 'TreeSet', 'Set', 'SortedSet', 'NavigableSet', 'Iterator', 'ListIterator', 'AbstractList', 'Stream', 'Optional'].includes(n)) return ['E'];
    if (['Comparator', 'Comparable', 'Function', 'Consumer', 'Supplier', 'Predicate', 'UnaryOperator', 'BinaryOperator'].includes(n)) return ['T'];
    return [];
  }
  // parse a signature string like 'Set<Map.Entry<K,V>>' with substitution
  function parseSig(s, sub) {
    let i = 0;
    function one() {
      let n = '';
      while (i < s.length && /[\w.$?]/.test(s[i])) n += s[i++];
      let a = null;
      if (s[i] === '<') { i++; a = []; while (s[i] !== '>') { a.push(one()); if (s[i] === ',') i++; } i++; }
      let d = 0; while (s.substr(i, 2) === '[]') { d++; i += 2; }
      if (n === '?') return null;
      if (sub && sub[n] !== undefined && !a) { const r = sub[n]; return r ? (d ? T(r.n, r.a, r.d + d) : r) : null; }
      if (a && a.some(x => x === null)) a = a.map(x => x || tObj);
      return T(n, a, d);
    }
    return one();
  }

  // ---------------------------------------------------------------- checker
  function check(unit, src) {
    let ctx = null; // current method context
    const errors = [];
    const warnings = [];
    const seen = new Set();
    const err = (msg, node, col) => {
      const line = node ? (node.line || 0) : 0;
      const c = col || (node ? node.col : 1) || 1;
      const key = line + ':' + msg.split('\n')[0];
      if (seen.has(key)) return;
      seen.add(key);
      errors.push({ line, col: c, msg });
    };
    const warn = (msg, node) => { warnings.push({ line: node.line, col: node.col || 1, msg }); };

    // ---------------- imports
    const imported = new Set(), wildcard = new Set();
    const staticImports = [];
    for (const im of unit.imports) {
      if (im.isStatic) {
        const parts = im.name.split('.');
        if (im.star) staticImports.push({ cls: parts[parts.length - 1], member: '*' });
        else staticImports.push({ cls: parts[parts.length - 2], member: parts[parts.length - 1] });
        continue;
      }
      if (im.star) { wildcard.add(im.name); continue; }
      const simple = im.name.slice(im.name.lastIndexOf('.') + 1);
      const pkg = im.name.slice(0, im.name.lastIndexOf('.'));
      if (im.isStatic) continue;
      if (NEEDS_IMPORT[simple] && NEEDS_IMPORT[simple] === pkg) imported.add(simple);
      else if (/^java\.lang\.\w+$/.test(im.name)) imported.add(simple);
      else if (im.name === 'java.util.Map.Entry') imported.add('Entry');
      else if (/^java\./.test(im.name) && !JR.isLibType(simple)) {
        if (/^java\.(util|io|lang|text|time|math|nio|net|sql)\b/.test(pkg)) imported.add('!' + simple);
        else err(`package ${pkg} does not exist`, im);
      } else if (!/^java\./.test(im.name)) err(`package ${pkg} does not exist`, im);
      else imported.add(simple);
    }
    function libVisible(n) {
      if (n.includes('.') && !/^java\./.test(n)) n = n.split('.')[0];
      if (!NEEDS_IMPORT[n]) return true;
      if (imported.has(n)) return true;
      return wildcard.has(NEEDS_IMPORT[n]);
    }

    // ---------------- class table
    const classes = new Map();
    const allDecls = [];
    function regClass(d, outer) {
      const ci = { name: d.name, decl: d, kind: d.kind, outer, fields: new Map(), methods: new Map(), ctors: [], sup: null, supT: null, ifaces: [], ifaceTs: [], typeParams: new Set(d.typeParams || []), isAbstract: d.kind === 'interface' || d.mods.has('abstract'), isStaticNested: !outer || d.mods.has('static') || d.kind !== 'class' || outer.kind === 'interface', user: true };
      ci.top = outer ? outer.top : ci;
      if (classes.has(d.name) && classes.get(d.name).user) err(`duplicate class: ${d.name}`, d);
      classes.set(d.name, ci);
      d.cci = ci;
      allDecls.push(ci);
      for (const inner of d.inner) regClass(inner, ci);
      return ci;
    }
    for (const t of unit.types) regClass(t, null);
    // built-in classes (exceptions, interfaces)
    function builtin(name, sup, kind, methods) {
      const ci = { name, kind: kind || 'class', fields: new Map(), methods: new Map(), ctors: [], sup: null, supName: sup, ifaces: [], typeParams: new Set(), isAbstract: kind === 'interface', builtin: true, isStaticNested: true };
      ci.top = ci;
      for (const [m, ret, n] of (methods || [])) addM(ci, { name: m, params: Array(n || 0).fill(null).map(() => ({ t: null })), ret: ret ? parseSig(ret) : null, static: false, abstract: kind === 'interface', mods: new Set(['public']), cls: ci, varargs: false, anyArgs: n === undefined });
      if (!classes.has(name)) classes.set(name, ci);
      return ci;
    }
    function addM(ci, m) { if (!ci.methods.has(m.name)) ci.methods.set(m.name, []); ci.methods.get(m.name).push(m); }
    const objCi = builtin('Object', null, 'class', [['toString', 'String', 0], ['equals', 'boolean', 1], ['hashCode', 'int', 0], ['getClass', 'Class', 0]]);
    for (const [name, [sup]] of Object.entries(JR.EXC)) {
      const ci = builtin(name, sup || 'Object', 'class', name === 'Throwable' ? [['getMessage', 'String', 0], ['getLocalizedMessage', 'String', 0], ['getCause', 'Throwable', 0], ['printStackTrace', 'void', 0], ['getStackTrace', '?', 0], ['addSuppressed', 'void', 1], ['initCause', 'Throwable', 1]] : []);
      ci.exc = true;
    }
    const enumCi = builtin('Enum', 'Object', 'class', [['name', 'String', 0], ['ordinal', 'int', 0], ['compareTo', 'int', 1], ['getDeclaringClass', 'Class', 0]]);
    const IF_SIGS = { Comparable: [['compareTo', 'int', 1]], Comparator: [['compare', 'int', 2]], Runnable: [['run', 'void', 0]], Iterable: [['iterator', '?', 0]], Iterator: [['hasNext', 'boolean', 0], ['next', '?', 0]], AutoCloseable: [['close', 'void', 0]], Closeable: [['close', 'void', 0]], Cloneable: [], Serializable: [], CharSequence: [] };
    for (const name of Object.keys(JR.IFACES)) builtin(name, null, 'interface', IF_SIGS[name] || JR.IFACES[name].map(([m, n]) => [m, null, n]));
    for (const ci of classes.values()) if (ci.builtin && ci.supName) ci.sup = classes.get(ci.supName);
    // link user classes
    for (const ci of allDecls) {
      const d = ci.decl;
      if (d.kind === 'enum') ci.sup = enumCi;
      else if (d.ext) {
        const s = resolveType(d.ext.name, ci);
        if (!s) err(`cannot find symbol\n  symbol: class ${d.ext.name}`, d.ext);
        else if (s.kind === 'interface') err('no interface expected here', d.ext);
        else if (s.decl && s.decl.mods.has('final')) err(`cannot inherit from final ${s.name}`, d.ext);
        else { ci.sup = s; ci.supT = typeOf(d.ext, ci); }
      } else if (d.kind !== 'interface') ci.sup = objCi;
      for (const it of d.impls) {
        const s = resolveType(it.name, ci);
        if (!s) { if (!knownLib(it.name)) err(`cannot find symbol\n  symbol: class ${it.name}`, it); else ci.libIfaces = (ci.libIfaces || []).concat(normName(it.name)); continue; }
        if (s.kind !== 'interface') { err(d.kind === 'interface' ? 'interface expected here' : 'interface expected here', it); continue; }
        ci.ifaces.push(s); ci.ifaceTs.push(typeOf(it, ci));
      }
    }
    // cyclic inheritance guard
    for (const ci of allDecls) { let c = ci.sup, n = 0; while (c && n < 50) { if (c === ci) { err(`cyclic inheritance involving ${ci.name}`, ci.decl); ci.sup = objCi; break; } c = c.sup; n++; } }
    function knownLib(n) { n = normName(n); return JR.isLibType(n) || !!LIBM[n] || FUNCTIONAL.has(n) || !!STATIC_M[n]; }
    function resolveType(name, fromCi) {
      if (!name) return null;
      name = name.replace(/^java\.lang\./, '');
      if (classes.has(name)) return classes.get(name);
      const i = name.lastIndexOf('.');
      if (i >= 0 && classes.has(name.slice(i + 1))) return classes.get(name.slice(i + 1));
      return null;
    }
    // type of a TypeRef in class context (type params -> null)
    function typeOf(tr, ci, mtps) {
      if (!tr) return null;
      if (!mtps && ctx && ctx.mtps) mtps = ctx.mtps;
      if (tr.name === 'var') return null;
      if (isTypeParam(tr.name, ci, mtps)) return tr.dims ? T('Object', null, tr.dims) : null;
      const n = normName(tr.name);
      const a = tr.args ? tr.args.map(x => typeOf(x, ci, mtps)) : null;
      return T(n === 'Entry' ? 'Map.Entry' : n, a, tr.dims);
    }
    function isTypeParam(n, ci, mtps) {
      if (mtps && mtps.includes(n)) return true;
      for (let c = ci; c; c = c.outer) if (c.typeParams && c.typeParams.has(n)) return true;
      return false;
    }
    // ---------------- members
    for (const ci of allDecls) {
      const d = ci.decl;
      const isIface = d.kind === 'interface';
      if (d.kind === 'enum') for (const ec of d.enumConsts) ci.fields.set(ec.name, { name: ec.name, t: T(ci.name), static: true, final: true, mods: new Set(['public', 'static', 'final']), cls: ci, node: ec });
      for (const fd of d.fields) {
        for (const dc of fd.decls) {
          if (ci.fields.has(dc.name)) err(`variable ${dc.name} is already defined in ${d.kind} ${ci.name}`, dc);
          const mods = isIface ? new Set([...fd.mods, 'public', 'static', 'final']) : fd.mods;
          ci.fields.set(dc.name, { name: dc.name, t: typeOf(dc.type, ci), tr: dc.type, static: mods.has('static'), final: mods.has('final'), mods, cls: ci, node: dc, init: dc.init });
        }
      }
      for (const md of d.methods) {
        const mods = isIface && !md.mods.has('private') ? new Set([...md.mods, 'public']) : md.mods;
        const m = {
          name: md.name, params: md.params.map(p => ({ t: typeOf(p.type, ci, md.typeParams), name: p.name, varargs: p.varargs })), ret: md.ret.name === 'void' ? tVoid : typeOf(md.ret, ci, md.typeParams),
          static: md.mods.has('static'), abstract: md.mods.has('abstract') || (isIface && !md.body && !md.mods.has('static') && !md.mods.has('default') && !md.mods.has('private')), mods, cls: ci, decl: md,
          varargs: md.params.length > 0 && md.params[md.params.length - 1].varargs, throws: md.throws.map(t => normName(t.name)),
        };
        if (!md.body && !m.abstract && !md.mods.has('native')) err('missing method body, or declare abstract', md);
        if (md.body && md.mods.has('abstract')) err('abstract methods cannot have a body', md);
        if (m.abstract && !isIface && !ci.isAbstract && d.kind !== 'enum') err(`${ci.name} is not abstract and does not override abstract method ${md.name}(${paramStr(m)}) in ${ci.name}`, d);
        const sig = md.name + '(' + m.params.map(p => tstr(p.t)).join(',') + ')';
        const dup = (ci.methods.get(md.name) || []).find(x => x.sig === sig);
        if (dup) err(`method ${sig.replace(/\?/g, 'Object')} is already defined in ${d.kind} ${ci.name}`, md);
        m.sig = sig;
        addM(ci, m);
      }
      for (const cd of d.ctors) {
        const m = { name: ci.name, params: cd.params.map(p => ({ t: typeOf(p.type, ci), name: p.name, varargs: p.varargs })), mods: cd.mods, cls: ci, decl: cd, varargs: cd.params.length > 0 && cd.params[cd.params.length - 1].varargs, throws: cd.throws.map(t => normName(t.name)), ctor: true };
        ci.ctors.push(m);
      }
      if (isIface && d.ctors.length) err('interface abstract methods cannot have body', d.ctors[0]);
    }
    function paramStr(m) { return m.params.map(p => tstr(p.t).replace('?', 'Object') + (p.varargs ? '' : '')).join(','); }

    // ---------------- hierarchy helpers
    function isSubClass(a, b) {
      if (!a || !b) return false;
      if (a === b) return true;
      if (b === objCi) return true;
      if (a.sup && isSubClass(a.sup, b)) return true;
      for (const i of a.ifaces) if (isSubClass(i, b)) return true;
      return false;
    }
    function supers(ci) { const r = []; const seen = new Set(); const v = c => { if (!c || seen.has(c)) return; seen.add(c); r.push(c); v(c.sup); for (const i of c.ifaces) v(i); }; v(ci); if (!seen.has(objCi)) r.push(objCi); return r; }
    function findField(ci, name) {
      for (const c of supers(ci)) { const f = c.fields.get(name); if (f) return f; }
      return null;
    }
    function findMethods(ci, name) {
      const r = [];
      const sigs = new Set();
      for (const c of supers(ci)) for (const m of (c.methods.get(name) || [])) { const s = m.sig || (m.name + m.params.length); if (!sigs.has(s)) { sigs.add(s); r.push(m); } }
      return r;
    }
    const sameTop = (a, b) => a && b && a.top === b.top;
    function accessible(member, fromCi) {
      if (!member.mods || !member.mods.has('private')) return true;
      return sameTop(member.cls, fromCi);
    }

    // ---------------- abstract / override checks
    for (const ci of allDecls) {
      const d = ci.decl;
      // implemented methods
      if (!ci.isAbstract) {
        const concrete = new Map();
        for (const c of supers(ci)) for (const [n, ms] of c.methods) for (const m of ms) if (!m.abstract && !m.static) { if (!concrete.has(n)) concrete.set(n, []); concrete.get(n).push(m); }
        const reported = new Set();
        for (const c of supers(ci)) {
          for (const [n, ms] of c.methods) for (const m of ms) {
            if (!m.abstract) continue;
            if (m.anyArgs) continue;
            const impls = (concrete.get(n) || []).filter(x => x.params.length === m.params.length && x.cls !== objCi || (x.cls === objCi && ['toString', 'equals', 'hashCode'].includes(n)));
            if (!impls.length && !reported.has(n)) {
              reported.add(n);
              if (d.kind === 'enum' && d.enumConsts.every(ec => ec.body && ec.body.methods.some(mm => mm.name === n))) continue;
              err(`${ci.name} is not abstract and does not override abstract method ${n}(${paramStr(m)}) in ${c.name}`, d);
            }
          }
        }
        if (ci.libIfaces) for (const li of ci.libIfaces) {
          const need = { Comparator: ['compare', 2], Runnable: ['run', 0] }[li];
          if (need && !(concrete.get(need[0]) || []).some(x => x.params.length === need[1])) err(`${ci.name} is not abstract and does not override abstract method ${need[0]}(${need[1] ? 'T,T' : ''}) in ${li}`, d);
        }
      }
      // overrides
      for (const [n, ms] of ci.methods) for (const m of ms) {
        if (m.static) continue;
        let overridden = null;
        for (const c of supers(ci)) {
          if (c === ci) continue;
          for (const sm of (c.methods.get(n) || [])) {
            if (sm.params.length !== m.params.length || sm.static) continue;
            if (sm.anyArgs || sm.params.every((p, i) => !p.t || !m.params[i].t || tstr(p.t) === tstr(m.params[i].t) || p.t.n === 'Object' && !c.user)) { overridden = sm; break; }
          }
          if (overridden) break;
        }
        const hasOverrideAnn = m.decl.ann.includes('Override');
        if (hasOverrideAnn && !overridden && !(ci.libIfaces && ci.libIfaces.length)) {
          const libObj = ['toString', 'equals', 'hashCode'].includes(n);
          if (!libObj) err('method does not override or implement a method from a supertype', { line: m.decl.line - (m.decl.ann.length ? 0 : 0), col: m.decl.col });
        }
        if (overridden && !overridden.mods.has('private')) {
          const rank = mods => mods.has('public') ? 3 : mods.has('protected') ? 2 : mods.has('private') ? 0 : 1;
          const or = overridden.cls.kind === 'interface' || overridden.cls === objCi ? 3 : rank(overridden.mods);
          const ovMods = overridden.cls === objCi ? (n === 'toString' || n === 'equals' || n === 'hashCode' ? 3 : 2) : or;
          if (rank(m.mods) < ovMods) {
            const was = ovMods === 3 ? 'public' : ovMods === 2 ? 'protected' : 'package';
            err(`${n}(${paramStr(m)}) in ${ci.name} cannot ${overridden.cls.kind === 'interface' && ci.kind !== 'interface' ? 'implement' : 'override'} ${n}(${paramStr(overridden)}) in ${overridden.cls.name}\n  attempting to assign weaker access privileges; was ${was}`, m.decl);
          }
          if (overridden.ret && m.ret && overridden.cls.user && !assignableT(overridden.ret, m.ret, null, true) && !(isPrim(overridden.ret) && tstr(overridden.ret) !== tstr(m.ret) ? false : true)) {
            err(`${n}(${paramStr(m)}) in ${ci.name} cannot override ${n}(${paramStr(overridden)}) in ${overridden.cls.name}\n  return type ${tstr(m.ret)} is not compatible with ${tstr(overridden.ret)}`, m.decl);
          }
          if (overridden.mods.has('final')) err(`${n}(${paramStr(m)}) in ${ci.name} cannot override ${n}(${paramStr(overridden)}) in ${overridden.cls.name}\n  overridden method is final`, m.decl);
        }
      }
    }
    // public top-level classes
    const pubs = unit.types.filter(t => t.mods.has('public'));
    if (pubs.length > 1) {
      const hasMain = t => t.methods.some(m => m.name === 'main' && m.mods.has('static'));
      const fileCls = pubs.find(hasMain) || pubs[0];
      for (const p of pubs) if (p !== fileCls) err(`class ${p.name} is public, should be declared in a file named ${p.name}.java`, p);
    }
    for (const t of unit.types) {
      if (t.mods.has('private') || t.mods.has('protected')) err(`modifier ${t.mods.has('private') ? 'private' : 'protected'} not allowed here`, t);
      if (t.mods.has('static')) err('modifier static not allowed here', t);
    }

    // ---------------- assignability
    function libSupers(n) { return LIB_SUPERS[n] || []; }
    function isRefT(t) { return t && !isPrim(t) && t.n !== 'void'; }
    function assignableT(to, from, expr, strict) {
      if (!to || !from) return true;
      if (from.n === 'void' && from.d === 0) return false;
      if (to.n === '$lambda' || from.n === '?') return true;
      if (from.n === 'null') return !isPrim(to);
      if (from.n === '$lambda') {
        if (isPrim(to) || isStr(to) || to.d) return false;
        const c = resolveType(to.n);
        if (c && c.user && c.kind !== 'interface') return false;
        return true;
      }
      if (to.d || from.d) {
        if (to.d === 0) return to.n === 'Object' || to.n === 'Cloneable' || to.n === 'Serializable';
        if (to.d !== from.d) return to.n === 'Object' && to.d < from.d && !isPrim(T(from.n));
        if (isPrim(T(to.n)) || isPrim(T(from.n))) return to.n === from.n;
        return to.n === from.n || to.n === 'Object' || isSubName(from.n, to.n);
      }
      if (isPrim(to)) {
        let f = from;
        if (!isPrim(f)) { if (!BOXES[f.n]) return false; f = T(BOXES[f.n]); }
        if (to.n === f.n) return true;
        if (to.n === 'boolean' || f.n === 'boolean') return false;
        if (NUMRANK[to.n] > NUMRANK[f.n] && !(to.n === 'char') && !(f.n === 'char' && to.n === 'short')) return true;
        if (!strict && expr && isConstInt(expr) && (to.n === 'char' || to.n === 'byte' || to.n === 'short') && (f.n === 'int' || f.n === 'char' || f.n === 'short' || f.n === 'byte')) {
          const v = constVal(expr);
          if (v === null) return true;
          if (to.n === 'byte') return v >= -128 && v <= 127;
          if (to.n === 'short') return v >= -32768 && v <= 32767;
          return v >= 0 && v <= 65535;
        }
        return false;
      }
      // to is reference
      if (isPrim(from)) {
        const boxed = UNBOXES[from.n];
        if (to.n === boxed || to.n === 'Object' || (to.n === 'Number' && from.n !== 'boolean' && from.n !== 'char') || to.n === 'Comparable' || to.n === 'Serializable') return true;
        if (!strict && expr && isConstInt(expr) && (to.n === 'Character' || to.n === 'Byte' || to.n === 'Short') && from.n === 'int') return true;
        return false;
      }
      if (to.n === from.n) return genericsOk(to, from);
      if (to.n === 'Object') return true;
      return isSubName(from.n, to.n);
    }
    function genericsOk(to, from) {
      if (!to.a || !from.a || !to.a.length || !from.a.length || to.a.length !== from.a.length) return true;
      return to.a.every((x, i) => !x || !from.a[i] || x.n === 'Object' || tstr(x) === tstr(from.a[i]));
    }
    function isSubName(from, to) {
      if (from === to) return true;
      const fc = resolveType(from), tc = resolveType(to);
      if (fc && tc) return isSubClass(fc, tc);
      if (fc && !tc) {
        if (fc.libIfaces && fc.libIfaces.includes(to)) return true;
        for (const c of supers(fc)) if (c.libIfaces && c.libIfaces.includes(to)) return true;
        if (fc.kind === 'enum' && (to === 'Comparable' || to === 'Enum')) return true;
        return !knownLib(to);
      }
      if (!fc && tc) {
        if (FUNCTIONAL.has(from)) return false;
        if (knownLib(from)) return to === 'Object' || (tc.builtin && tc.kind === 'interface' && libSupers(from).includes(to));
        return true;
      }
      if (libSupers(from).includes(to)) return true;
      if (knownLib(from) && knownLib(to)) {
        if (FUNCTIONAL.has(to) || FUNCTIONAL.has(from)) return from === to || (from === 'UnaryOperator' && to === 'Function') || (from === 'BinaryOperator' && to === 'BiFunction');
        if (['Class', 'Iterator', 'Stream', 'IntStream', 'Optional', 'Locale', 'PrintStream', 'InputStream', 'Thread'].includes(from) || ['Class', 'Iterator', 'Stream', 'IntStream', 'Optional', 'Locale', 'PrintStream', 'InputStream', 'Thread'].includes(to)) return from === to || (from === 'ListIterator' && to === 'Iterator') || (from === 'Scanner' && to === 'Iterator');
        if (LIBM[from] || LIB_SUPERS[from]) return false;
        return true;
      }
      return true;
    }
    function isConstInt(e) {
      switch (e.k) {
        case 'Lit': return e.vt === 'int' || e.vt === 'char';
        case 'Paren': return isConstInt(e.e);
        case 'Unary': return isConstInt(e.e);
        case 'Bin': return ['+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^'].includes(e.op) && isConstInt(e.l) && isConstInt(e.r);
        case 'Cast': return PRIMS.has(e.type.name) && e.type.dims === 0 && isConstInt(e.e);
        case 'Name': return !!(e._const);
      }
      return false;
    }
    function constVal(e) {
      try {
        switch (e.k) {
          case 'Lit': return e.v;
          case 'Paren': return constVal(e.e);
          case 'Unary': { const v = constVal(e.e); if (v === null) return null; return e.op === '-' ? -v : e.op === '~' ? ~v : v; }
          case 'Bin': {
            const a = constVal(e.l), b = constVal(e.r); if (a === null || b === null) return null;
            switch (e.op) { case '+': return (a + b) | 0; case '-': return (a - b) | 0; case '*': return Math.imul(a, b); case '/': return b ? (a / b) | 0 : null; case '%': return b ? a % b : null; case '<<': return a << b; case '>>': return a >> b; case '&': return a & b; case '|': return a | b; case '^': return a ^ b; }
            return null;
          }
          case 'Cast': { const v = constVal(e.e); if (v === null) return null; if (e.type.name === 'char') return v & 0xffff; if (e.type.name === 'byte') return (v << 24) >> 24; if (e.type.name === 'short') return (v << 16) >> 16; return v; }
          case 'Name': return e._const !== undefined ? e._const : null;
        }
      } catch (x) { }
      return null;
    }
    function incompatible0(to, from, node) { return incompatible(to, from, node); }
    function incompatible(to, from, node) {
      if (isPrim(to) && isPrim(from) && isNumPrim(to) && isNumPrim(from)) return err(`incompatible types: possible lossy conversion from ${tstr(from)} to ${tstr(to)}`, node);
      if (isPrim(to) && from && BOXES[from.n] && isNumPrim(T(BOXES[from.n])) && isNumPrim(to)) return err(`incompatible types: ${tstr(from)} cannot be converted to ${tstr(to)}`, node);
      if (from && from.n === '$lambda') return err(`incompatible types: ${tstr(to)} is not a functional interface`, node);
      err(`incompatible types: ${tstr(from)} cannot be converted to ${tstr(to)}`, node);
    }
    function checkAssign(to, from, expr, node) {
      if (!assignableT(to, from, expr)) { incompatible(to, from, node || expr); return false; }
      return true;
    }

    // ---------------- checked exceptions
    function excClass(n) { return resolveType(n); }
    function isChecked(n) {
      const c = excClass(n);
      if (!c) return false;
      const exc = classes.get('Exception'), rte = classes.get('RuntimeException'), thr = classes.get('Throwable'), errc = classes.get('Error');
      if (isSubClass(c, rte) || isSubClass(c, errc)) return false;
      return isSubClass(c, exc) || c === thr;
    }
    function excSub(a, b) { const ca = excClass(a), cb = excClass(b); return !!ca && !!cb && isSubClass(ca, cb); }

    // ---------------- method body checking
    class Scope {
      constructor(parent) { this.vars = new Map(); this.parent = parent; }
      get(n) { for (let s = this; s; s = s.parent) { const v = s.vars.get(n); if (v) return v; } return null; }
    }

    function mkCtx(ci, opts) {
      return Object.assign({ ci, isStatic: false, ret: null, inLoop: 0, inSwitch: 0, labels: [], handlers: [], throwsDecl: [], lambdaDepth: 0, captures: [], methodName: '', isCtor: false, collectors: [], da: null, breakDA: [], ctorFinalFields: null }, opts);
    }

    function declareVar(sc, name, t, node, opts) {
      // duplicate check: any enclosing scope within the method
      const ex = sc.get(name);
      if (ex && ex.method === ctx.methodToken && !(opts && opts.pattern) && !ex.pattern) {
        err(`variable ${name} is already defined in ${ctx.locDesc}`, node);
      }
      const v = Object.assign({ name, t, method: ctx.methodToken, assignedCount: 0, final: false, node, lambdaDepth: ctx.lambdaDepth, id: ++varIds }, opts || {});
      sc.vars.set(name, v);
      return v;
    }
    let varIds = 0;

    // definite assignment helpers: ctx.da is a Set of var ids assigned, or null meaning "unreachable / everything"
    const daCopy = s => s === null ? null : new Set(s);
    const daMeet = (a, b) => { if (a === null) return daCopy(b); if (b === null) return daCopy(a); const r = new Set(); for (const x of a) if (b.has(x)) r.add(x); return r; };
    const daHas = (s, v) => s === null || s.has(v.id);

    function checkMethodBody(ci, m, decl, isCtor) {
      const sc = new Scope(null);
      const prev = ctx;
      ctx = mkCtx(ci, { isStatic: !!(m && m.static), ret: isCtor ? tVoid : m.ret, methodName: decl.name, isCtor, throwsDecl: (m && m.throws) || [], methodToken: {}, da: new Set(), mtps: decl.typeParams || null });
      ctx.locDesc = isCtor ? `constructor ${ci.name}(${paramStr(m)})` : `method ${decl.name}(${paramStr(m)})`;
      for (const p of decl.params) {
        const v = declareVar(sc, p.name, p.varargs ? (typeOf(p.type, ci, decl.typeParams) ? T(typeOf(p.type, ci, decl.typeParams).n, typeOf(p.type, ci, decl.typeParams).a, p.type.dims) : null) : typeOf(p.type, ci, decl.typeParams), p, { param: true, final: p.final });
        ctx.da.add(v.id);
      }
      if (decl.body) {
        const stmts = decl.body.stmts;
        if (isCtor) {
          stmts.forEach((s, i) => { if (i > 0 && s.k === 'ExprStmt' && s.e.k === 'CtorCall') err(`call to ${s.e.kind} must be first statement in constructor`, s.e); });
          const first = stmts[0];
          const laterSuper = stmts.some((s, i) => i > 0 && s.k === 'ExprStmt' && s.e.k === 'CtorCall');
          if (!(first && first.k === 'ExprStmt' && first.e.k === 'CtorCall') && !laterSuper && ci.sup && ci.sup.user) {
            // implicit super()
            const ok = !ci.sup.ctors.length || ci.sup.ctors.some(c => c.params.length === 0 || (c.varargs && c.params.length === 1));
            if (!ok) err(`constructor ${ci.sup.name} in class ${ci.sup.name} cannot be applied to given types;\n  required: ${paramStr(ci.sup.ctors[0]) || 'no arguments'}\n  found:    no arguments\n  reason: actual and formal argument lists differ in length`, decl);
            else { const c = ci.sup.ctors.find(c => c.params.length === 0); if (c && c.mods.has('private') && !sameTop(c.cls, ci)) err(`${ci.sup.name}() has private access in ${ci.sup.name}`, decl); }
          }
        }
        const completes = checkBlock(decl.body, sc);
        if (completes && ctx.ret && ctx.ret.n !== 'void' && !isCtor) err('missing return statement', { line: decl.body.endLine, col: 1 });
      }
      finishCaptures();
      ctx = prev;
    }
    function finishCaptures() {
      for (const c of ctx.captures) {
        if (c.v.assignedCount > (c.v.hasInit || c.v.param ? 0 : 1)) err(`local variables referenced from ${c.kind} must be final or effectively final`, c.node);
      }
    }
    // implicit default ctor when superclass has no no-arg ctor
    for (const ci of allDecls) {
      if (ci.kind === 'class' && !ci.ctors.length && ci.sup && ci.sup.user && ci.sup.ctors.length && !ci.sup.ctors.some(c => c.params.length === 0 || (c.varargs && c.params.length === 1))) {
        err(`constructor ${ci.sup.name} in class ${ci.sup.name} cannot be applied to given types;\n  required: ${paramStr(ci.sup.ctors[0])}\n  found:    no arguments\n  reason: actual and formal argument lists differ in length`, ci.decl);
      }
    }

    // ---------------- statements; return true if can complete normally
    function checkBlock(b, sc) { return checkStmts(b.stmts, new Scope(sc)); }
    function checkStmts(stmts, sc) {
      let live = true;
      for (const s of stmts) {
        if (!live) { err('unreachable statement', s); live = true; ctx.da = new Set(ctx.da || []); }
        live = checkStmt(s, sc);
        if (!live) ctx.da = null;
      }
      return live;
    }
    const isTrueLit = e => e && ((e.k === 'Lit' && e.vt === 'boolean' && e.v === true) || (e.k === 'Paren' && isTrueLit(e.e)));
    const isFalseLit = e => e && ((e.k === 'Lit' && e.vt === 'boolean' && e.v === false) || (e.k === 'Paren' && isFalseLit(e.e)));
    function condCheck(e, sc) {
      const t = expr(e, sc);
      if (t && !isBoolish(t)) incompatible(tBool, t, e);
      return t;
    }
    function loopBody(body, sc, label) {
      ctx.inLoop++;
      ctx.breakDA.push({ label, das: [], loop: true });
      const c = checkStmt(body, new Scope(sc));
      const bd = ctx.breakDA.pop();
      ctx.inLoop--;
      return { c, breaks: bd.das };
    }
    function checkStmt(s, sc, label) {
      switch (s.k) {
        case 'Block': return checkBlock(s, sc);
        case 'Empty': return true;
        case 'LocalClass': checkClassDecl(s.decl, sc); return true;
        case 'Local': {
          let base = s.type.name === 'var' ? null : typeOf(s.type, ctx.ci);
          if (s.type.name !== 'var' && !PRIMS.has(s.type.name)) checkTypeExists(s.type, s);
          for (const d of s.decls) {
            let t = s.type.name === 'var' ? null : typeOf(d.type, ctx.ci);
            if (s.type.name === 'var') {
              if (!d.init) err("cannot infer type for local variable " + d.name + "\n  (cannot use 'var' on variable without initializer)", d);
              else if (d.init.k === 'ArrayInit') err("cannot infer type for local variable " + d.name + "\n  (array initializer needs an explicit target-type)", d);
              else if (d.init.k === 'Lit' && d.init.vt === 'null') err("cannot infer type for local variable " + d.name + "\n  (variable initializer is 'null')", d);
            }
            if (d.init) {
              if (d.init.k === 'ArrayInit') { if (t && !t.d) err('illegal initializer for ' + tstr(t), d.init); arrayInitCheck(d.init, t, sc); }
              else {
                const it = expr(d.init, sc, t);
                if (s.type.name === 'var') t = it && it.n !== 'null' ? it : null;
                else checkAssign(t, it, d.init);
              }
            }
            const v = declareVar(sc, d.name, t, d, { final: s.final, hasInit: !!d.init });
            if (s.final && d.init && isConstInt(d.init) && t && (t.n === 'int' || t.n === 'char')) { v.constVal = constVal(d.init); }
            if (d.init && ctx.da) ctx.da.add(v.id);
          }
          return true;
        }
        case 'ExprStmt': expr(s.e, sc, null, true); return true;
        case 'If': {
          condCheck(s.cond, sc);
          const before = daCopy(ctx.da);
          const thenSc = new Scope(sc);
          addPatternBindings(s.cond, thenSc, true);
          const ct = checkStmt(s.then, thenSc);
          const daThen = ct ? daCopy(ctx.da) : null;
          ctx.da = daCopy(before);
          let ce = true;
          if (s.els) { const elsSc = new Scope(sc); addPatternBindings(s.cond, elsSc, false); ce = checkStmt(s.els, elsSc); }
          else addPatternBindings(s.cond, sc, false, !ct);
          const daElse = ce ? daCopy(ctx.da) : null;
          ctx.da = (!ct && !ce) ? null : daMeet(daThen, daElse);
          return ct || ce;
        }
        case 'While': {
          condCheck(s.cond, sc);
          const before = daCopy(ctx.da);
          const { breaks } = loopBody(s.body, sc, label);
          if (isTrueLit(s.cond)) {
            if (!breaks.length) { ctx.da = null; return false; }
            ctx.da = breaks.reduce((a, b) => daMeet(a, b), null);
            return true;
          }
          ctx.da = before;
          return true;
        }
        case 'DoWhile': {
          const { c, breaks } = loopBody(s.body, sc, label);
          condCheck(s.cond, sc);
          if (isTrueLit(s.cond)) {
            if (!breaks.length) { ctx.da = null; return false; }
            ctx.da = breaks.reduce((a, b) => daMeet(a, b), null);
            return true;
          }
          if (!c && !breaks.length && !hasContinue(s.body, label)) { return false; }
          ctx.da = breaks.reduce((a, b) => daMeet(a, b), ctx.da);
          return true;
        }
        case 'For': {
          const fs = new Scope(sc);
          for (const i of s.init) checkStmt(i, fs);
          if (s.cond) condCheck(s.cond, fs);
          const before = daCopy(ctx.da);
          ctx.inLoop++;
          ctx.breakDA.push({ label, das: [], loop: true });
          checkStmt(s.body, new Scope(fs));
          for (const u of s.update) expr(u, fs, null, true);
          const bd = ctx.breakDA.pop();
          ctx.inLoop--;
          if (!s.cond || isTrueLit(s.cond)) {
            if (!bd.das.length) { ctx.da = null; return false; }
            ctx.da = bd.das.reduce((a, b) => daMeet(a, b), null);
            return true;
          }
          ctx.da = before;
          return true;
        }
        case 'ForEach': {
          const it = expr(s.iter, sc);
          let et = null;
          if (it) {
            if (it.d > 0) et = T(it.n, it.a, it.d - 1);
            else if (isPrim(it) || isStr(it)) err(`for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    ${tstr(it)}`, s.iter);
            else if (/Map$/.test(it.n) || it.n === 'Hashtable') err(`for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    ${tstr(it)}`, s.iter);
            else if (it.a && it.a.length === 1) et = it.a[0];
            else { const uc = resolveType(it.n); if (uc && uc.user) { et = null; if (!isSubClass(uc, classes.get('Iterable')) && !(uc.libIfaces || []).includes('Iterable')) err(`for-each not applicable to expression type\n  required: array or java.lang.Iterable\n  found:    ${tstr(it)}`, s.iter); } }
          }
          const bs = new Scope(sc);
          let vt = s.type.name === 'var' ? et : typeOf(s.type, ctx.ci);
          if (s.type.name !== 'var') { checkTypeExists(s.type, s); if (et && vt) checkAssign(vt, et, null, { line: s.vline, col: s.vcol }); }
          const v = declareVar(bs, s.name, vt, { line: s.vline, col: s.vcol }, { final: s.final, hasInit: true });
          const before = daCopy(ctx.da);
          if (ctx.da) ctx.da.add(v.id);
          loopBody(s.body, bs, label);
          ctx.da = before;
          return true;
        }
        case 'Labeled': {
          ctx.labels.push(s.label);
          ctx.breakDA.push({ label: s.label, das: [], loop: false, labelOnly: true });
          const c = checkStmt(s.body, sc, s.label);
          const bd = ctx.breakDA.pop();
          ctx.labels.pop();
          if (bd.das.length) { ctx.da = bd.das.reduce((a, b) => daMeet(a, b), c ? ctx.da : null); return true; }
          return c;
        }
        case 'Return': {
          if (ctx.lambdaRet !== undefined && ctx.lambdaDepth) { if (s.e) expr(s.e, sc); ctx.da = null; return false; }
          if (ctx.inInit) { err('return outside method', s); return false; }
          if (s.e) {
            const t = expr(s.e, sc, ctx.ret);
            if (ctx.ret && ctx.ret.n === 'void') err('incompatible types: unexpected return value', s.e);
            else if (ctx.ret) checkAssign(ctx.ret, t, s.e);
          } else if (ctx.ret && ctx.ret.n !== 'void') err('incompatible types: missing return value', s);
          return false;
        }
        case 'Break': {
          if (s.label) { if (!ctx.labels.includes(s.label)) err(`undefined label: ${s.label}`, s); }
          else if (!ctx.inLoop && !ctx.inSwitch) err('break outside switch or loop', s);
          // record DA for the target
          for (let i = ctx.breakDA.length - 1; i >= 0; i--) {
            const b = ctx.breakDA[i];
            if (s.label ? b.label === s.label : !b.labelOnly) { b.das.push(daCopy(ctx.da)); break; }
          }
          return false;
        }
        case 'Continue': {
          if (s.label) { if (!ctx.labels.includes(s.label)) err(`undefined label: ${s.label}`, s); }
          else if (!ctx.inLoop) err('continue outside of loop', s);
          return false;
        }
        case 'Yield': { const t = expr(s.e, sc); if (ctx.yieldTypes) ctx.yieldTypes.push(t); return false; }
        case 'Throw': {
          const t = expr(s.e, sc);
          if (t && !(t.n === 'null')) {
            const c = resolveType(t.n);
            if (!c || !isSubClass(c, classes.get('Throwable')) || t.d) err(`incompatible types: ${tstr(t)} cannot be converted to Throwable`, s.e);
            else noteThrow(t.n, s.e);
          }
          return false;
        }
        case 'Switch': return checkSwitch(s, sc, label, false);
        case 'Try': return checkTry(s, sc);
        case 'Assert': condCheck(s.cond, sc); if (s.msg) expr(s.msg, sc); return true;
      }
      return true;
    }
    function hasContinue(body, label) {
      let found = false;
      const walk = (n, depth) => {
        if (!n || typeof n !== 'object' || found) return;
        if (Array.isArray(n)) { n.forEach(x => walk(x, depth)); return; }
        if (n.k === 'Continue' && (!n.label ? depth === 0 : n.label === label)) { found = true; return; }
        if (n.k === 'Lambda' || n.k === 'Class') return;
        const loop = ['While', 'DoWhile', 'For', 'ForEach'].includes(n.k);
        for (const key of ['stmts', 'body', 'then', 'els', 'block', 'catches', 'fin', 'cases']) if (n[key]) walk(n[key], depth + (loop && key === 'body' ? 1 : 0));
      };
      walk(body, 0);
      return found;
    }
    function addPatternBindings(cond, sc, whenTrue, intoOuter) {
      // collect instanceof bindings that are definitely matched when cond is true/false
      const go = (e, want) => {
        if (!e) return;
        if (e.k === 'Paren') return go(e.e, want);
        if (e.k === 'InstanceOf' && e.bind && want) {
          const t = typeOf(e.type, ctx.ci);
          const v = declareVar(sc, e.bind.name, t, e.bind, { pattern: true, hasInit: true });
          if (ctx.da) ctx.da.add(v.id);
        }
        if (e.k === 'Unary' && e.op === '!') return go(e.e, !want);
        if (e.k === 'Bin' && e.op === '&&' && want) { go(e.l, true); go(e.r, true); }
        if (e.k === 'Bin' && e.op === '||' && !want) { go(e.l, false); go(e.r, false); }
      };
      if (intoOuter === false) return;
      go(cond, whenTrue);
    }
    function checkSwitch(s, sc, label, isExpr) {
      const st = expr(s.sel, sc);
      let selEnum = null;
      if (st) {
        const u = unbox(st);
        if (u && (u.n === 'long' || u.n === 'double' || u.n === 'float' || u.n === 'boolean') && !u.d && isPrim(st)) { err(`selector type ${u.n} is not allowed`, s.sel); s._badSel = true; }
        const ec = resolveType(st.n);
        if (ec && ec.kind === 'enum') selEnum = ec;
      }
      const before = daCopy(ctx.da);
      ctx.inSwitch++;
      ctx.breakDA.push({ label: null, das: [], loop: false });
      const prevYield = ctx.yieldTypes;
      if (isExpr) ctx.yieldTypes = [];
      let hasDefault = false, lastCompletes = true, anyCaseCompletes = false;
      const seenLabels = new Set();
      const ss = new Scope(sc);
      let fallDA = null;
      for (const c of s.cases) {
        if (c.labels === null) hasDefault = true;
        else for (const l of c.labels) {
          if (l.k === 'Default') { hasDefault = true; continue; }
          if (selEnum && l.k === 'Name') {
            if (!selEnum.fields.has(l.name)) err(`an enum switch case label must be the unqualified name of an enumeration constant`, l);
            if (seenLabels.has(l.name)) err('duplicate case label', l);
            seenLabels.add(l.name);
            continue;
          }
          const lt = expr(l, sc);
          const key = l.k === 'Lit' ? l.vt + ':' + l.v : null;
          if (key) { if (seenLabels.has(key)) err('duplicate case label', l); seenLabels.add(key); }
          if (st && lt && l.k !== 'Lit' && !(l.k === 'Name' && l._const !== undefined) && l.k !== 'Field' && !isConstInt(l) && !(lt && isStr(lt) && l.k === 'Bin')) err('constant expression required', l);
          if (st && lt && !(lt.n === 'null') && !s._badSel) {
            const su = unbox(st);
            if (isStr(su) !== isStr(lt) || (isPrim(su) && isPrim(lt) && !assignableT(su, lt, l))) incompatible(su, lt, l);
          }
        }
        // body
        if (s.arrow) {
          ctx.da = daCopy(before);
          const cs = new Scope(sc);
          const comp = checkStmts(c.body, cs);
          if (comp) { anyCaseCompletes = true; if (!isExpr) ctx.breakDA[ctx.breakDA.length - 1].das.push(daCopy(ctx.da)); }
          lastCompletes = comp;
        } else {
          ctx.da = daMeet(daCopy(before), fallDA === undefined ? null : fallDA);
          if (fallDA === null && s.cases.indexOf(c) > 0 && !lastCompletes) ctx.da = daCopy(before);
          if (s.cases.indexOf(c) === 0) ctx.da = daCopy(before);
          const comp = checkStmts(c.body, ss);
          lastCompletes = comp;
          fallDA = comp ? daCopy(ctx.da) : null;
        }
      }
      const bd = ctx.breakDA.pop();
      ctx.inSwitch--;
      let result;
      if (isExpr) {
        const ys = ctx.yieldTypes;
        ctx.yieldTypes = prevYield;
        if (!hasDefault && !selEnum) err('the switch expression does not cover all possible input values', s);
        ctx.da = before;
        result = ys.find(x => x) || null;
        if (ys.length && ys.every(x => x && isNumeric(x))) result = ys.reduce((a, b) => binPromote(a, b) || a);
        return result;
      }
      let completes;
      if (s.arrow) completes = !hasDefault || anyCaseCompletes || bd.das.length > 0;
      else completes = !hasDefault || lastCompletes || bd.das.length > 0;
      if (completes) {
        let d = hasDefault ? null : daCopy(before);
        if (!s.arrow && lastCompletes) d = daMeet(d, fallDA);
        for (const x of bd.das) d = daMeet(d, x);
        ctx.da = d === null && completes ? daCopy(before) : d;
      } else ctx.da = null;
      return completes;
    }
    function checkTry(s, sc) {
      const ts = new Scope(sc);
      const before = daCopy(ctx.da);
      for (const r of s.resources) {
        const t = expr(r.init, ts);
        if (r.name) { const v = declareVar(ts, r.name, r.type && r.type.name !== 'var' ? typeOf(r.type, ctx.ci) : t, r, { final: true, hasInit: true }); if (ctx.da) ctx.da.add(v.id); }
      }
      const catchTypes = [];
      for (const c of s.catches) for (const t of c.types) {
        const n = normName(t.name);
        const cc = resolveType(n);
        if (!cc) { err(`cannot find symbol\n  symbol:   class ${t.name}`, t); continue; }
        if (!isSubClass(cc, classes.get('Throwable'))) { err(`incompatible types: ${n} cannot be converted to Throwable`, t); continue; }
        if (NEEDS_IMPORT[n] && !libVisible(n) && cc.builtin) err(`cannot find symbol\n  symbol:   class ${n}\n  location: class ${ctx.ci.name}`, t);
        catchTypes.push(n);
      }
      const collector = { thrown: new Set(), catchTypes };
      ctx.handlers.push(catchTypes);
      ctx.collectors.push(collector);
      const ct = checkBlock(s.block, ts);
      ctx.collectors.pop();
      ctx.handlers.pop();
      let daAfter = ct ? daCopy(ctx.da) : null;
      let anyCompletes = ct;
      // later catch subsumed by earlier
      const seenCatch = [];
      for (const c of s.catches) {
        for (const t of c.types) {
          const n = normName(t.name);
          if (seenCatch.some(p => excSub(n, p))) err(`exception ${n} has already been caught`, t);
          if (isChecked(n) && n !== 'Exception' && n !== 'Throwable' && ![...collector.thrown].some(x => excSub(x, n) || excSub(n, x)))
            err(`exception ${n} is never thrown in body of corresponding try statement`, t);
        }
        for (const t of c.types) seenCatch.push(normName(t.name));
        ctx.da = daCopy(before);
        const cs = new Scope(sc);
        const ctype = c.types.length === 1 ? T(normName(c.types[0].name)) : T('Exception');
        const v = declareVar(cs, c.name, ctype, { line: c.nline, col: c.ncol }, { hasInit: true });
        if (ctx.da) ctx.da.add(v.id);
        const cc = checkBlock(c.body, cs);
        if (cc) { anyCompletes = true; daAfter = daMeet(daAfter, ctx.da); }
      }
      if (s.fin) {
        ctx.da = daCopy(before);
        const fc = checkBlock(s.fin, new Scope(sc));
        const daFin = ctx.da;
        if (!fc) { ctx.da = null; return false; }
        if (daAfter !== null && daFin !== null) for (const x of daFin) daAfter.add(x);
      }
      ctx.da = anyCompletes ? daAfter : null;
      return anyCompletes;
    }
    function noteThrow(n, node) {
      if (!isChecked(n)) return;
      // record in collectors up to the catching try
      for (let i = ctx.collectors.length - 1; i >= 0; i--) {
        ctx.collectors[i].thrown.add(n);
        if (ctx.collectors[i].catchTypes.some(h => excSub(n, h))) return;
      }
      if (ctx.lambdaDepth > 0 && ctx.lambdaHandlersBase !== undefined) {
        if (ctx.lambdaThrows && ctx.lambdaThrows.some(h => excSub(n, h))) return;
        err(`unreported exception ${n}; must be caught or declared to be thrown`, node);
        return;
      }
      if (ctx.throwsDecl.some(h => excSub(n, h))) return;
      if (ctx.inInit === 'static') { err(`unreported exception ${n}; must be caught or declared to be thrown`, node); return; }
      err(`unreported exception ${n}; must be caught or declared to be thrown`, node);
    }
    function checkTypeExists(tr, node) {
      if (!tr) return;
      const n = tr.name;
      if (PRIMS.has(n) || n === 'void' || n === 'var') return;
      if (isTypeParam(n, ctx.ci, ctx.mtps)) return;
      if (resolveType(n)) {
        const c = resolveType(n);
        if (c.builtin && NEEDS_IMPORT[n] && !libVisible(n) && !n.includes('.')) err(`cannot find symbol\n  symbol:   class ${n}\n  location: class ${ctx.ci.name}`, tr.line ? tr : node);
      } else {
        const nn = normName(n);
        if (!knownLib(nn) || imported.has('!' + nn)) {
          err(`cannot find symbol\n  symbol:   class ${n}\n  location: class ${ctx.ci.name}` + (imported.has('!' + nn) ? `\n  note: ${nn} is not available in this in-browser Java runtime` : ''), tr.line ? tr : node);
        } else if (NEEDS_IMPORT[nn] && !libVisible(nn) && !/^java\./.test(n)) {
          err(`cannot find symbol\n  symbol:   class ${n}\n  location: class ${ctx.ci.name}`, tr.line ? tr : node);
        }
      }
      if (tr.args) for (const a of tr.args) {
        if (a && PRIMS.has(a.name) && !a.dims) err('unexpected type\n  required: reference\n  found:    ' + a.name, a.line ? a : node);
        else checkTypeExists(a, node);
      }
    }
    function arrayInitCheck(init, t, sc) {
      const et = t && t.d ? T(t.n, t.a, t.d - 1) : null;
      for (const el of init.elems) {
        if (el.k === 'ArrayInit') { if (et && !et.d) err('illegal initializer for ' + tstr(et), el); arrayInitCheck(el, et, sc); }
        else { const vt = expr(el, sc, et); if (et) checkAssign(et, vt, el); }
      }
    }

    // ---------------- expressions
    function lookupVar(name, sc) {
      const v = sc.get(name);
      if (v) return v;
      return null;
    }
    function fieldFromCtx(name) {
      // search current class, its supers, then lexically enclosing classes
      for (let c = ctx.ci; c; c = c.outer) {
        const f = findField(c, name);
        if (f) return { f, via: c };
      }
      return null;
    }
    function markAssign(target, sc, node, compound) {
      if (target.k === 'Paren') return markAssign(target.e, sc, node, compound);
      if (target.k === 'Name') {
        const v = lookupVar(target.name, sc);
        if (v) {
          if (v.lambdaDepth < ctx.lambdaDepth) err(`local variables referenced from ${ctx.lambdaKind || 'a lambda expression'} must be final or effectively final`, target);
          if (v.final && (v.hasInit || v.param || (ctx.da && ctx.da.has(v.id)))) err(`cannot assign a value to final variable ${target.name}`, target);
          v.assignedCount++;
          if (!compound && ctx.da) ctx.da.add(v.id);
          return;
        }
        const r = fieldFromCtx(target.name);
        if (r && r.f.final) finalFieldAssign(r.f, target);
        return;
      }
      if (target.k === 'Field') {
        if (target.obj.k === 'This' || target.obj.k === 'Name') {
          const ot = target.obj.k === 'This' ? T(ctx.ci.name) : null;
          let f = null;
          if (ot) f = findField(ctx.ci, target.name);
          else {
            const c = !lookupVar(target.obj.name, sc) && resolveType(target.obj.name);
            if (c) f = findField(c, target.name);
            else { const vt = target.obj._t; const uc = vt && resolveType(vt.n); if (uc) f = findField(uc, target.name); }
          }
          if (f && f.final) finalFieldAssign(f, target);
        }
        if (target._isLength) err('cannot assign a value to final variable length', target);
      }
    }
    function finalFieldAssign(f, node) {
      const inCtorOfOwner = (ctx.isCtor || ctx.inInit) && f.cls === ctx.ci && ctx.lambdaDepth === 0;
      if (inCtorOfOwner && !f.init && (f.static ? ctx.inInit === 'static' : ctx.inInit !== 'static')) return;
      err(`cannot assign a value to ${f.static ? 'static final' : 'final'} variable ${f.name}`, node);
    }
    function useVar(v, node) {
      if (v.lambdaDepth < ctx.lambdaDepth) ctx.captures.push({ v, node, kind: ctx.lambdaKind || 'a lambda expression' });
      if (!v.param && !v.hasInit && ctx.da && !daHas(ctx.da, v) && v.method === ctx.methodToken) err(`variable ${v.name} might not have been initialized`, node);
    }
    function staticCtxErr(kind, name, node) {
      err(`non-static ${kind} ${name} cannot be referenced from a static context`, node);
    }
    function exprList(args, sc) { return args.map(a => expr(a, sc)); }

    function expr(e, sc, expected, isStmt) {
      const t = expr0(e, sc, expected, isStmt);
      e._t = t;
      return t;
    }
    function expr0(e, sc, expected, isStmt) {
      switch (e.k) {
        case 'Lit':
          switch (e.vt) { case 'int': return tInt; case 'long': return tLong; case 'double': return tDouble; case 'float': return tFloat; case 'char': return tChar; case 'String': return tStr; case 'boolean': return tBool; case 'null': return tNull; }
          return null;
        case 'Paren': return expr(e.e, sc, expected);
        case 'Name': return nameExpr(e, sc);
        case 'This':
          if (ctx.isStatic && !e.qual) { err('non-static variable this cannot be referenced from a static context', e); return null; }
          return T(e.qual ? normName(e.qual) : ctx.ci.name);
        case 'Field': return fieldExpr(e, sc);
        case 'Call': return callExpr(e, sc);
        case 'New': return newExpr(e, sc, expected);
        case 'NewArray': {
          for (const d of e.dims) { const dt = expr(d, sc); if (dt && !assignableT(tInt, dt, d)) incompatible(tInt, dt, d); }
          checkTypeExists(e.type, e);
          const t = T(normName(e.type.name), null, e.dims.length + e.extra);
          if (e.init) arrayInitCheck(e.init, t, sc);
          if (isTypeParam(e.type.name, ctx.ci, ctx.mtps)) { err('generic array creation', e); return null; }
          return t;
        }
        case 'ArrayInit': err('illegal start of expression', e); return null;
        case 'Index': {
          const at = expr(e.arr, sc), it = expr(e.idx, sc);
          if (it && !assignableT(tInt, it, e.idx)) incompatible(tInt, it, e.idx);
          if (at && !at.d) { if (at.n !== 'null') err(`array required, but ${tstr(at)} found`, e); return null; }
          return at ? T(at.n, at.a, at.d - 1) : null;
        }
        case 'Unary': {
          const t = expr(e.e, sc);
          if (!t) return null;
          if (e.op === '!') { if (!isBoolish(t)) { err(`bad operand type ${tstr(t)} for unary operator '!'`, e); return null; } return tBool; }
          if (!isNumeric(t)) { err(`bad operand type ${tstr(t)} for unary operator '${e.op}'`, e); return null; }
          if (e.op === '~' && !['int', 'long', 'char', 'short', 'byte'].includes(unbox(t).n)) { err(`bad operand type ${tstr(t)} for unary operator '~'`, e); return null; }
          return binPromote(t, tInt);
        }
        case 'PreInc': case 'PostInc': {
          const t = expr(e.e, sc);
          if (t && !isNumeric(t)) err(`bad operand type ${tstr(t)} for unary operator '${e.op}'`, e);
          markAssign(e.e, sc, e, true);
          return t;
        }
        case 'Bin': return binExpr(e, sc);
        case 'Assign': {
          if (e.target.k === 'Name' && !lookupVar(e.target.name, sc) && !fieldFromCtx(e.target.name)) {
            const tt0 = expr(e.target, sc);
            expr(e.value, sc);
            return tt0;
          }
          const isSimple = e.op === '=';
          let tt;
          if (isSimple && e.target.k === 'Name') {
            const v = lookupVar(e.target.name, sc);
            if (v) { tt = v.t; if (v.lambdaDepth < ctx.lambdaDepth) ctx.captures.push({ v, node: e.target, kind: ctx.lambdaKind || 'a lambda expression' }); }
            else tt = expr(e.target, sc);
          } else tt = expr(e.target, sc);
          const vt = expr(e.value, sc, tt);
          if (isSimple) checkAssign(tt, vt, e.value);
          else if (tt && vt) {
            const op = e.op.slice(0, -1);
            if (op === '+' && isStr(tt)) { /* string concat ok */ }
            else if (['&', '|', '^'].includes(op) && isBoolish(tt) && isBoolish(vt)) { }
            else if (!isNumeric(tt) || !isNumeric(vt)) err(`bad operand types for binary operator '${op}'\n  first type:  ${tstr(tt)}\n  second type: ${tstr(vt)}`, e);
          }
          markAssign(e.target, sc, e, !isSimple);
          return tt;
        }
        case 'Cond': {
          condCheck(e.c, sc);
          const before = daCopy(ctx.da);
          const a = expr(e.a, sc, expected);
          const daA = daCopy(ctx.da);
          ctx.da = before;
          const b = expr(e.b, sc, expected);
          ctx.da = daMeet(daA, ctx.da);
          if (!a || !b) return a && a.n !== 'null' ? a : (b && b.n !== 'null' ? b : null);
          if (isNumeric(a) && isNumeric(b) && (isPrim(a) || isPrim(b))) return binPromote(a, b);
          if (a.n === 'null') return isPrim(b) ? T(UNBOXES[b.n]) : b;
          if (b.n === 'null') return isPrim(a) ? T(UNBOXES[a.n]) : a;
          if (tstr(a) === tstr(b)) return a;
          if (isBoolish(a) && isBoolish(b)) return tBool;
          if (expected) return expected;
          if (isPrim(a) || isPrim(b)) return null;
          if (assignableT(a, b)) return a;
          if (assignableT(b, a)) return b;
          return null;
        }
        case 'Cast': {
          const ct = typeOf(e.type, ctx.ci);
          checkTypeExists(e.type, e);
          const vt = expr(e.e, sc, ct);
          if (ct && vt) {
            const castOk = (() => {
              if (vt.n === '$lambda' || vt.n === 'null') return !isPrim(ct) || vt.n === '$lambda';
              if (isPrim(ct) && isPrim(vt)) return (ct.n === 'boolean') === (vt.n === 'boolean');
              if (isPrim(ct)) return BOXES[vt.n] ? (BOXES[vt.n] === ct.n || (isNumPrim(ct) && isNumPrim(T(BOXES[vt.n])) && NUMRANK[ct.n] >= NUMRANK[BOXES[vt.n]])) : (vt.n === 'Object' || vt.n === 'Number' || vt.n === 'Comparable');
              if (isPrim(vt)) return ct.n === UNBOXES[vt.n] || ct.n === 'Object' || ct.n === 'Number' || ct.n === 'Comparable';
              if (isStr(ct) && vt.d === 0 && !isStr(vt)) { const vc = resolveType(vt.n); if (vc && vc.user && vc.kind === 'class') return false; if (BOXES[vt.n]) return false; }
              if (isStr(vt) && ct.d === 0 && !isStr(ct) && (resolveType(ct.n) && resolveType(ct.n).user && resolveType(ct.n).kind === 'class' || BOXES[ct.n])) return false;
              const a = resolveType(ct.n), b = resolveType(vt.n);
              if (a && b && a.user && b.user && a.kind === 'class' && b.kind === 'class' && !ct.d && !vt.d) return isSubClass(a, b) || isSubClass(b, a);
              return true;
            })();
            if (!castOk) err(`incompatible types: ${tstr(vt)} cannot be converted to ${tstr(ct)}`, e);
          }
          return ct;
        }
        case 'InstanceOf': {
          const vt = expr(e.e, sc);
          checkTypeExists(e.type, e);
          const it = typeOf(e.type, ctx.ci);
          if (vt && isPrim(vt)) err(`unexpected type\n  required: reference\n  found:    ${tstr(vt)}`, e.e);
          else if (vt && it && vt.d === 0 && it.d === 0) {
            const a = resolveType(it.n), b = resolveType(vt.n);
            if (a && b && a.user && b.user && a.kind === 'class' && b.kind === 'class' && !isSubClass(a, b) && !isSubClass(b, a)) err(`incompatible types: ${tstr(vt)} cannot be converted to ${tstr(it)}`, e);
            if (isStr(vt) && a && a.user && a.kind === 'class') err(`incompatible types: String cannot be converted to ${tstr(it)}`, e);
          }
          if (e.bind) { /* bindings added by enclosing if/&& handling */ const v = declareVar(sc, e.bind.name, it, e.bind, { pattern: true, hasInit: true }); if (ctx.da) ctx.da.add(v.id); }
          return tBool;
        }
        case 'Lambda': return lambdaExpr(e, sc, expected);
        case 'MethodRef': return methodRefExpr(e, sc);
        case 'SwitchExpr': return checkSwitch(e, sc, null, true);
        case 'ClassLit': return T('Class');
        case 'CtorCall': {
          if (!ctx.isCtor) { err(`call to ${e.kind} must be first statement in constructor`, e); exprList(e.args, sc); return tVoid; }
          const ats = exprList(e.args, sc);
          const target = e.kind === 'this' ? ctx.ci : ctx.ci.sup;
          if (target && target.user) resolveCall(target.ctors, ats, e.args, e, target.name, target, true, 'constructor');
          else if (target && target.builtin && target.exc && e.args.length > 2) err(`no suitable constructor found for ${target.name}(${ats.map(tstr).join(',')})`, e);
          return tVoid;
        }
        case 'Super': err("'.' expected", e); return null;
      }
      return null;
    }
    function nameExpr(e, sc) {
      const v = lookupVar(e.name, sc);
      if (v) {
        useVar(v, e);
        if (v.constVal !== undefined) e._const = v.constVal;
        return v.t;
      }
      const r = fieldFromCtx(e.name);
      if (r) {
        const f = r.f;
        if (!accessible(f, ctx.ci)) { err(`${e.name} has private access in ${f.cls.name}`, e); return f.t; }
        if (!f.static) {
          if (ctx.isStatic && ctx.lambdaDepthStaticBase === undefined) { staticCtxErr('variable', e.name, e); return f.t; }
          if (r.via !== ctx.ci && !ctx.ci.isStaticNested === false) { }
          if (r.via !== ctx.ci && staticChainBlocks(r.via)) { staticCtxErr('variable', e.name, e); return f.t; }
        }
        if (f.static && f.final && f.init && isConstInt(f.init)) e._const = constVal(f.init);
        return f.t;
      }
      const c = resolveType(e.name);
      if (c) {
        if (c.builtin && NEEDS_IMPORT[e.name] && !libVisible(e.name)) { err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${ctx.ci.name}`, e); return null; }
        return T('$class:' + c.name);
      }
      if (knownLib(e.name) || STATIC_M[e.name] || STATIC_F[e.name]) {
        if (NEEDS_IMPORT[e.name] && !libVisible(e.name)) { err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${ctx.ci.name}`, e); return null; }
        return T('$class:' + e.name);
      }
      for (const si of staticImports) {
        if (si.member !== '*' && si.member !== e.name) continue;
        const sf = own(STATIC_F, si.cls);
        if (sf && own(sf, e.name)) return parseSig(sf[e.name]);
        const uc = resolveType(si.cls);
        if (uc && uc.user) { const f = findField(uc, e.name); if (f && f.static) return f.t; }
      }
      if (/^[a-z]/.test(e.name) && e._qualifier) { err(`package ${e.name} does not exist`, e); return null; }
      err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${ctx.ci.name}` + (imported.has('!' + e.name) ? `\n  note: ${e.name} is not available in this in-browser Java runtime` : ''), e);
      return null;
    }
    // inner (non-static) class chain: accessing an instance member of an outer class from a static nested class
    function staticChainBlocks(via) {
      for (let c = ctx.ci; c && c !== via; c = c.outer) if (c.isStaticNested && c.outer) return true;
      return false;
    }
    const isClassT = t => t && t.n.startsWith('$class:');
    const className = t => t.n.slice(7);
    function fieldExpr(e, sc) {
      if (e.obj.k === 'Super') {
        if (ctx.isStatic) { err('non-static variable super cannot be referenced from a static context', e.obj); return null; }
        const f = ctx.ci.sup ? findField(ctx.ci.sup, e.name) : null;
        if (!f) { err(`cannot find symbol\n  symbol: variable ${e.name}`, e); return null; }
        if (!accessible(f, ctx.ci)) err(`${e.name} has private access in ${f.cls.name}`, e);
        return f.t;
      }
      if (e.obj.k === 'Name') e.obj._qualifier = true;
      // package-qualified class names e.g. java.util.Scanner
      const qn = qualName(e);
      if (qn && /^java\./.test(qn)) {
        const simple = qn.slice(qn.lastIndexOf('.') + 1);
        if (knownLib(simple) || resolveType(simple)) return T('$class:' + simple);
      }
      if (qn && /^java(\.\w+)*$/.test(qn)) return T('$pkg');
      const ot = expr(e.obj, sc);
      if (!ot) return null;
      if (ot.n === '$pkg') return null;
      if (isClassT(ot)) {
        const cn = className(ot);
        const c = resolveType(cn);
        if (c && c.user) {
          const f = findField(c, e.name);
          if (f) {
            if (!accessible(f, ctx.ci)) err(`${e.name} has private access in ${f.cls.name}`, e);
            if (!f.static) staticCtxErr('variable', e.name, e);
            if (f.static && f.final && f.init && isConstInt(f.init)) e._const = constVal(f.init);
            return f.t;
          }
          const inner = [...classes.values()].find(x => x.user && x.outer === c && x.name === e.name);
          if (inner) return T('$class:' + inner.name);
          if (e.name === 'length') { err(`cannot find symbol\n  symbol:   variable length\n  location: class ${cn}`, e); return null; }
          err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${cn}`, e);
          return null;
        }
        const sf = own(STATIC_F, cn);
        if (sf && own(sf, e.name)) return parseSig(sf[e.name]);
        if (cn === 'Map' && e.name === 'Entry') return T('$class:Map.Entry');
        if (STATIC_M[cn] || knownLib(cn)) { err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${cn}`, e); return null; }
        return null;
      }
      if (ot.n === 'null') return null;
      if (ot.d > 0) {
        if (e.name === 'length') { e._isLength = true; return tInt; }
        err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: class ${tstr(ot)}`, e);
        return null;
      }
      if (isPrim(ot)) { err(`${ot.n} cannot be dereferenced`, e); return null; }
      const c = resolveType(ot.n);
      if (c && c.user) {
        const f = findField(c, e.name);
        if (!f) { err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: ${varLoc(e.obj, ot)}`, e); return null; }
        if (!accessible(f, ctx.ci)) err(`${e.name} has private access in ${f.cls.name}`, e);
        return substTP(f.t, f.cls, ot, f.tr);
      }
      if (LIBM[ot.n] || isStr(ot)) {
        if (ot.n === 'ArrayList' && e.name === 'size') { err('size has private access in ArrayList', e); return tInt; }
        err(`cannot find symbol\n  symbol:   variable ${e.name}\n  location: ${varLoc(e.obj, ot)}`, e);
        return null;
      }
      return null;
    }
    function varLoc(objExpr, t) {
      if (objExpr && objExpr.k === 'Name' && lookupVarLoose(objExpr.name)) return `variable ${objExpr.name} of type ${tstr(t)}`;
      return `class ${tstr(t).replace(/<.*>/, '')}`;
    }
    let curScopeForLoc = null;
    function lookupVarLoose(n) { return true; }
    function qualName(e) {
      if (e.k === 'Name') return e.name;
      if (e.k === 'Field') { const q = qualName(e.obj); return q ? q + '.' + e.name : null; }
      return null;
    }
    // substitute class type params using receiver type args (only when declared type is exactly a type param)
    function substRef(tr, map) {
      if (!tr) return null;
      if (Object.prototype.hasOwnProperty.call(map, tr.name)) { const r = map[tr.name]; return r ? (tr.dims ? T(r.n, r.a, r.d + tr.dims) : r) : null; }
      const n = normName(tr.name);
      if (PRIMS.has(n) && !tr.dims) return T(n);
      return T(n === 'Entry' ? 'Map.Entry' : n, tr.args ? tr.args.map(x => substRef(x, map)) : null, tr.dims);
    }
    function substTP(t, declCls, recvT, tr) {
      if (tr && recvT && recvT.a && declCls.decl && declCls.name === recvT.n && (declCls.decl.typeParams || []).length === recvT.a.length) {
        const map = {};
        declCls.decl.typeParams.forEach((p, i) => { map[p] = recvT.a[i]; });
        if (mentionsTP(tr, map)) return substRef(tr, map);
      }
      if (t) return t;
      if (!tr || !recvT || !recvT.a || !declCls.decl) return null;
      const tps = declCls.decl.typeParams || [];
      const i = tps.indexOf(tr.name);
      if (i >= 0 && recvT.a[i] && declCls.name === recvT.n) return tr.dims ? T(recvT.a[i].n, recvT.a[i].a, recvT.a[i].d + tr.dims) : recvT.a[i];
      return null;
    }
    function mentionsTP(tr, map) { return !!tr && (Object.prototype.hasOwnProperty.call(map, tr.name) || (tr.args || []).some(a => mentionsTP(a, map))); }
    function argsDesc(ats) { return ats.map(t => t ? tstr(t) : 'Object').join(','); }
    // choose a user method; report errors like javac
    function resolveCall(cands, ats, argNodes, node, name, ownerCi, isCtor, kindWord) {
      const n = ats.length;
      const appl = [];
      for (const m of cands) {
        const ps = m.params;
        let ok;
        if (m.varargs) {
          ok = n >= ps.length - 1;
          if (ok) for (let i = 0; i < n; i++) {
            let pt;
            if (i < ps.length - 1) pt = ps[i].t;
            else { const vt = ps[ps.length - 1].t; pt = vt ? (i === ps.length - 1 && n === ps.length && ats[i] && ats[i].d === vt.d ? vt : T(vt.n, vt.a, vt.d - 1)) : null; }
            if (!assignableT(pt, ats[i], null, true)) { ok = false; break; }
          }
        } else {
          ok = ps.length === n && ps.every((p, i) => assignableT(p.t, ats[i], null, true));
        }
        if (ok) appl.push(m);
      }
      if (appl.length) {
        // most specific: prefer exact matches
        let best = appl[0];
        if (appl.length > 1) {
          const score = m => m.params.reduce((s, p, i) => s + (p.t && ats[i] && tstr(p.t) === tstr(ats[i]) ? 0 : 1), 0) + (m.varargs ? 10 : 0) + (m.abstract ? 0.5 : 0);
          best = appl.slice().sort((a, b) => score(a) - score(b))[0];
        }
        if (!accessible(best, ctx.ci)) err(`${isCtor ? ownerCi.name : name}(${paramStr(best)}) has private access in ${best.cls.name}`, node);
        return best;
      }
      const what = isCtor ? 'constructor' : 'method';
      if (cands.length === 1) {
        const m = cands[0];
        const req = paramStr(m) || 'no arguments';
        let reason;
        if (!m.varargs && m.params.length !== n) reason = 'actual and formal argument lists differ in length';
        else {
          const i = m.params.findIndex((p, i) => !assignableT(p.t, ats[i], null, true));
          const p = m.params[i], a = ats[i];
          if (!m.varargs && p && argNodes && argNodes[i]) { incompatible(p.t, a, argNodes[i]); return null; }
          reason = p && a && isPrim(p.t) && isPrim(a) && isNumPrim(p.t) && isNumPrim(a) ? `argument mismatch; possible lossy conversion from ${tstr(a)} to ${tstr(p.t)}` : `argument mismatch; ${tstr(a)} cannot be converted to ${tstr(p ? p.t : null)}`;
        }
        err(`${what} ${isCtor ? ownerCi.name : name} in ${ownerCi.kind === 'interface' ? 'interface' : ownerCi.kind === 'enum' ? 'enum' : 'class'} ${m.cls.name} cannot be applied to given types;\n  required: ${req}\n  found:    ${argsDesc(ats) || 'no arguments'}\n  reason: ${reason}`, node);
      } else {
        err(`no suitable ${what} found for ${isCtor ? ownerCi.name : name}(${argsDesc(ats)})`, node);
      }
      return null;
    }
    function callExpr(e, sc) {
      const name = e.name;
      if (!e.obj) {
        const ats = exprList(e.args, sc);
        // search current class chain then outer classes
        for (let c = ctx.ci; c; c = c.outer) {
          const ms = findMethods(c, name).filter(m => m.cls !== objCi || ['toString', 'equals', 'hashCode', 'getClass'].includes(name));
          if (!ms.length) continue;
          const m = resolveCall(ms, ats, e.args, e, name, c, false);
          if (!m) return null;
          if (!m.static) {
            if (ctx.isStatic || (c !== ctx.ci && staticChainBlocks(c))) { staticCtxErr('method', `${name}(${paramStr(m)})`, e); return m.ret; }
          }
          noteThrowsOf(m, e);
          return m.ret;
        }
        for (const si of staticImports) {
          if (si.member !== '*' && si.member !== name) continue;
          const uc = resolveType(si.cls);
          if (uc && uc.user) { const ms = findMethods(uc, name).filter(m => m.static); if (ms.length) { const m = resolveCall(ms, ats, e.args, e, name, uc, false); return m ? m.ret : null; } continue; }
          const tb = own(STATIC_M, si.cls);
          if (tb && own(tb, name) !== undefined) return libStatic(si.cls, name, ats, e);
        }
        if (ctx.ci.libIfaces || ctx.ci.anonLib) return null;
        if (resolveType(name) || knownLib(name)) { err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: class ${ctx.ci.name}`, e); return null; }
        err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: class ${ctx.ci.name}`, e);
        return null;
      }
      if (e.obj.k === 'Super') {
        const ats = exprList(e.args, sc);
        if (ctx.isStatic) { err('non-static variable super cannot be referenced from a static context', e.obj); return null; }
        const sup = ctx.ci.sup;
        if (!sup) return null;
        const ms = findMethods(sup, name);
        for (const i of ctx.ci.ifaces) ms.push(...findMethods(i, name));
        if (!ms.length) { err(`cannot find symbol\n  symbol: method ${name}(${argsDesc(ats)})`, e); return null; }
        const m = resolveCall(ms, ats, e.args, e, name, sup, false);
        if (m && m.abstract) err(`abstract method ${name}(${paramStr(m)}) in ${m.cls.kind === 'interface' ? 'interface' : 'class'} ${m.cls.name} cannot be accessed directly`, e);
        if (m) noteThrowsOf(m, e);
        return m ? m.ret : null;
      }
      if (e.obj.k === 'Name') e.obj._qualifier = true;
      let ot;
      const qn = qualName(e.obj);
      if (qn && /^java\./.test(qn)) { const simple = qn.slice(qn.lastIndexOf('.') + 1); ot = (knownLib(simple) || resolveType(simple)) ? T('$class:' + simple) : null; }
      else ot = expr(e.obj, sc);
      const ats = e.args.map((a, i) => expr(a, sc, a.k === 'Lambda' ? lambdaTarget(ot, name, i, e.args.length) : null));
      if (!ot) return null;
      if (isClassT(ot)) {
        const cn = className(ot);
        const c = resolveType(cn);
        if (c && c.user) {
          if (c.kind === 'enum' && (name === 'values' && !ats.length)) return T(c.name, null, 1);
          if (c.kind === 'enum' && name === 'valueOf' && ats.length === 1) return T(c.name);
          const ms = findMethods(c, name);
          if (!ms.length) { err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: ${c.kind === 'interface' ? 'interface' : 'class'} ${cn}`, e); return null; }
          const m = resolveCall(ms, ats, e.args, e, name, c, false);
          if (!m) return null;
          if (!m.static) { staticCtxErr('method', `${name}(${paramStr(m)})`, e); return m.ret; }
          noteThrowsOf(m, e);
          return m.ret;
        }
        return libStatic(cn, name, ats, e);
      }
      if (ot.n === 'null') return null;
      if (ot.d > 0) {
        if (name === 'length') { err(`cannot find symbol\n  symbol:   method length()\n  location: class ${tstr(ot)}`, e); return null; }
        if (name === 'clone') return ot;
        if (own(OBJ_M, name)) return parseSig(OBJ_M[name]);
        err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: class ${tstr(ot)}`, e);
        return null;
      }
      if (isPrim(ot)) { err(`${ot.n} cannot be dereferenced`, e); return null; }
      const c = resolveType(ot.n);
      if (c && c.user) {
        const ms = findMethods(c, name);
        if (!ms.length) {
          if (c.libIfaces && c.libIfaces.length) return null;
          err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: ${varLocCall(e.obj, ot)}`, e);
          return null;
        }
        const m = resolveCall(ms, ats, e.args, e, name, c, false);
        if (!m) return null;
        noteThrowsOf(m, e);
        if (m.decl && m.decl.ret && m.decl.ret.name !== 'void') return substTP(m.ret, m.cls, ot, m.decl.ret);
        return m.ret;
      }
      if (c && c.builtin && !LIBM[ot.n]) {
        // exceptions / builtin interfaces
        const ms = findMethods(c, name);
        if (ms.length) return ms[0].ret;
        if (c.kind === 'interface' && (FUNCTIONAL.has(c.name) || ['Comparable', 'Iterable', 'Iterator'].includes(c.name))) return libInstance(ot, name, ats, e);
        err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: ${varLocCall(e.obj, ot)}`, e);
        return null;
      }
      return libInstance(ot, name, ats, e);
    }
    // expected functional type for lambda arguments of common library methods
    function lambdaTarget(ot, name, i, n) {
      if (!ot) return null;
      if (isClassT(ot)) {
        const cn = className(ot);
        if (cn === 'Collections' && name === 'sort' && i === 1) return null;
        return null;
      }
      const a = ot.a || [];
      const E = a[0], K = a[0], V = a[1];
      if (/Map$|^Hashtable$/.test(ot.n)) {
        if (name === 'forEach' && K && V) return T('BiConsumer', [K, V]);
        if (name === 'computeIfAbsent' && K) return T('Function', [K, tObj]);
        if ((name === 'computeIfPresent' || name === 'compute') && K && V) return T('BiFunction', [K, V]);
        if (name === 'merge' && V && i === 2) return T('BiFunction', [V, V]);
        return null;
      }
      if (!E || ot.d) return null;
      if (name === 'forEach') return T('Consumer', [E]);
      if (name === 'removeIf') return T('Predicate', [E]);
      if (name === 'sort') return T('Comparator', [E]);
      if (name === 'replaceAll') return T('UnaryOperator', [E]);
      return null;
    }
    function varLocCall(objExpr, t) {
      if (objExpr && objExpr.k === 'Name') return `variable ${objExpr.name} of type ${tstr(t)}`;
      return `class ${tstr(t).replace(/<.*>/, '')}`;
    }
    function noteThrowsOf(m, node) { if (m && m.throws) for (const x of m.throws) noteThrow(x, node); }
    function libInstance(ot, name, ats, e) {
      const n = ot.n;
      if (FUNCTIONAL.has(n)) {
        const r = own(FUNC_RET, name);
        if (r === '$self') return ot;
        return r ? parseSig(r) : null;
      }
      const table = own(LIBM, n);
      if (!table) return null;
      let ret = own(table, name);
      if (ret === undefined) {
        err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: ${varLocCall(e.obj, ot)}`, e);
        return null;
      }
      if (n === 'BufferedReader' && (name === 'readLine' || name === 'read' || name === 'close')) noteThrow('IOException', e);
      const names = libTypeArgsIndex(n);
      const sub = {};
      names.forEach((p, i) => { sub[p] = ot.a && ot.a[i] ? ot.a[i] : null; });
      // argument checks for common generic mutators
      const E = sub.E, K = sub.K, V = sub.V;
      let reported = false;
      const incompatible = (to, from, node) => { if (reported) return; reported = true; incompatible0(to, from, node); };
      if (E && (name === 'add' || name === 'offer' || name === 'push' || name === 'addFirst' || name === 'addLast') && table === LIST_M || E && name === 'add' && (table === SET_M || table === LINKED_M || table === STACK_M || table === DEQUE_M || table === PQ_M)) {
        const vi = ats.length === 2 ? 1 : 0;
        if (ats.length === 2 && ats[0] && !assignableT(tInt, ats[0], null, true)) incompatible(tInt, ats[0], e.args[0]);
        if (ats[vi] && !assignableT(E, ats[vi], null, true)) incompatible(E, ats[vi], e.args[vi]);
      }
      if (E && name === 'set' && ats.length === 2 && (table === LIST_M || table === LINKED_M || table === STACK_M)) {
        if (ats[0] && !assignableT(tInt, ats[0], null, true)) incompatible(tInt, ats[0], e.args[0]);
        if (ats[1] && !assignableT(E, ats[1], null, true)) incompatible(E, ats[1], e.args[1]);
      }
      if (name === 'get' && (table === LIST_M || table === LINKED_M || table === STACK_M) && ats.length === 1 && ats[0] && !assignableT(tInt, ats[0], null, true)) incompatible(tInt, ats[0], e.args[0]);
      if (K && V && name === 'put' && ats.length === 2) {
        if (ats[0] && !assignableT(K, ats[0], null, true)) incompatible(K, ats[0], e.args[0]);
        if (ats[1] && !assignableT(V, ats[1], null, true)) incompatible(V, ats[1], e.args[1]);
      }
      if (n === 'String' && ['charAt', 'substring', 'repeat'].includes(name)) ats.forEach((a, i) => { if (a && !assignableT(tInt, a, null, true)) incompatible(tInt, a, e.args[i]); });
      if (n === 'String' && name === 'equals' && ats.length !== 1) { err(`method equals in class String cannot be applied to given types;\n  required: Object\n  found:    ${argsDesc(ats) || 'no arguments'}\n  reason: actual and formal argument lists differ in length`, e); return tBool; }
      if (table === SCANNER_M && /^next/.test(name) && ats.length && name !== 'nextInt' && name !== 'nextLong') err(`method ${name} in class Scanner cannot be applied to given types;\n  required: no arguments\n  found:    ${argsDesc(ats)}\n  reason: actual and formal argument lists differ in length`, e);
      if (n === 'PrintStream' && (name === 'print' && ats.length !== 1)) err(`no suitable method found for print(${argsDesc(ats) || 'no arguments'})`, e);
      if (n === 'PrintStream' && (name === 'println' && ats.length > 1)) err(`no suitable method found for println(${argsDesc(ats)})`, e);
      const arT = ARITY[n] || (LIST_LIKE.has(n) ? ARITY.ArrayList : null);
      const ar = arT && Object.prototype.hasOwnProperty.call(arT, name) ? arT[name] : null;
      if (ar && !ar[0].includes(ats.length)) {
        if (ar[1]) err(`method ${name} in ${n === 'String' ? 'class' : 'class'} ${n === 'String' ? 'String' : n + (ot.a ? '<' + ot.a.map(tstr).join(',') + '>' : '')} cannot be applied to given types;\n  required: ${ar[1]}\n  found:    ${argsDesc(ats) || 'no arguments'}\n  reason: actual and formal argument lists differ in length`, e);
        else err(`no suitable method found for ${name}(${argsDesc(ats) || 'no arguments'})`, e);
        return ret && ret[0] !== '$' ? parseSig(ret, sub) : null;
      }
      if (ret === '$self') return ot;
      if (ret === '$listAdd') return ats.length === 2 ? tVoid : tBool;
      if (ret === '$listRemove') return ats.length === 1 && ats[0] && isPrim(ats[0]) && ats[0].n !== 'boolean' ? (E || null) : tBool;
      if (ret === '$linkedRemove') return !ats.length ? (E || null) : (ats[0] && isPrim(ats[0]) ? E || null : tBool);
      if (ret === '$dequeRemove') return !ats.length ? (E || null) : tBool;
      if (ret === '$mapRemove') return ats.length === 2 ? tBool : (V || null);
      if (ret === '$toArray') return ats.length && ats[0] && ats[0].d ? ats[0] : T('Object', null, 1);
      return parseSig(ret, sub);
    }
    function libStatic(cn, name, ats, e) {
      const table = own(STATIC_M, cn);
      if (!table) {
        const lc = resolveType(cn);
        if (lc && lc.builtin) { err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: class ${cn}`, e); return null; }
        if (knownLib(cn)) { err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: ${FUNCTIONAL.has(cn) || ABSTRACT_LIB.has(cn) ? 'interface' : 'class'} ${cn}`, e); }
        return null;
      }
      const ret = own(table, name);
      if (ret === undefined) { err(`cannot find symbol\n  symbol:   method ${name}(${argsDesc(ats)})\n  location: ${['Comparator', 'List', 'Set', 'Map'].includes(cn) ? 'interface' : 'class'} ${cn}`, e); return null; }
      if (cn === 'Thread' && name === 'sleep') noteThrow('InterruptedException', e);
      if (cn === 'Integer' && name === 'parseInt' && ats[0] && !isStr(ats[0]) && ats[0].n !== 'null') incompatible(tStr, ats[0], e.args[0]);
      if (cn === 'Double' && name === 'parseDouble' && ats[0] && !isStr(ats[0]) && ats[0].n !== 'null') incompatible(tStr, ats[0], e.args[0]);
      if (cn === 'Math' && (name === 'max' || name === 'min' || name === 'pow') && ats.length !== 2) err(`no suitable method found for ${name}(${argsDesc(ats)})`, e);
      if (cn === 'Math' && ['sqrt', 'abs', 'round', 'floor', 'ceil'].includes(name) && ats.length !== 1) err(`no suitable method found for ${name}(${argsDesc(ats)})`, e);
      if (cn === 'Math' && ats.some(a => a && !isNumeric(a))) err(`no suitable method found for ${name}(${argsDesc(ats)})`, e);
      switch (ret) {
        case '$num': { const r = ats.reduce((a, b) => a && b ? binPromote(a, b) : null, ats[0] ? binPromote(ats[0], tInt) : null); return r; }
        case '$round': return ats[0] && unbox(ats[0]).n === 'float' ? tInt : tLong;
        case '$charOrInt': return ats[0] && unbox(ats[0]).n === 'char' ? tChar : tInt;
        case '$arg0': return ats[0] || null;
        case '$elem': return ats[0] && ats[0].a ? ats[0].a[0] : null;
        case '$asList': return ats.length === 1 && ats[0] && ats[0].d === 1 && !isPrim(T(ats[0].n)) ? T('List', [T(ats[0].n, ats[0].a)]) : (ats.length && ats.every(a => a && ats[0] && tstr(a) === tstr(ats[0])) ? T('List', [isPrim(ats[0]) ? T(UNBOXES[ats[0].n]) : ats[0]]) : T('List'));
        case '$listOf': return ats.length && ats.every(a => a && ats[0] && tstr(a) === tstr(ats[0])) && !ats[0].d ? T('List', [isPrim(ats[0]) ? T(UNBOXES[ats[0].n]) : ats[0]]) : T('List');
      }
      return parseSig(ret);
    }
    function newExpr(e, sc, expected) {
      const name = normName(e.type.name);
      checkTypeExists(e.type, e);
      if (e.outer) expr(e.outer, sc);
      const ats = exprList(e.args, sc);
      const c = resolveType(name);
      let t = typeOf(e.type, ctx.ci) || T(name);
      if (e.type.args && e.type.args.length === 0) t = expected && expected.a && (expected.n === name || libSupers(name).includes(expected.n) || true) ? T(t.n, expected.a) : T(t.n, null);
      if (e.body) {
        // anonymous class
        if (c && c.user && c.kind === 'class' && c.ctors.length) resolveCall(c.ctors, ats, e.args, e, name, c, true);
        checkAnonBody(e, sc, c, name);
        return t;
      }
      if (c && c.user) {
        if (c.kind === 'interface' || c.isAbstract) { err(`${name} is abstract; cannot be instantiated`, e); return t; }
        if (c.kind === 'enum') { err('enum classes may not be instantiated', e); return t; }
        if (!c.isStaticNested && !e.outer) {
          // needs an enclosing instance
          let ok = false;
          for (let k = ctx.ci; k; k = k.outer) { if (k === c.outer || isSubClass(k, c.outer)) { ok = !ctx.isStatic && !staticChainBlocks(k); break; } }
          if (!ok) err(`non-static variable this cannot be referenced from a static context`, e);
        }
        if (c.ctors.length) { const m = resolveCall(c.ctors, ats, e.args, e, name, c, true); noteThrowsOf(m, e); }
        else if (ats.length) err(`constructor ${name} in class ${name} cannot be applied to given types;\n  required: no arguments\n  found:    ${argsDesc(ats)}\n  reason: actual and formal argument lists differ in length`, e);
        return t;
      }
      if (c && c.builtin) {
        if (c.kind === 'interface') { err(`${name} is abstract; cannot be instantiated`, e); return t; }
        if (c.exc && ats.length > 2) err(`no suitable constructor found for ${name}(${argsDesc(ats)})`, e);
        if (c.exc && ats.length === 1 && ats[0] && !isStr(ats[0]) && ats[0].n !== 'null' && !(resolveType(ats[0].n) && isSubClass(resolveType(ats[0].n), classes.get('Throwable')))) err(`no suitable constructor found for ${name}(${argsDesc(ats)})`, e);
        return t;
      }
      if (ABSTRACT_LIB.has(name) || FUNCTIONAL.has(name)) { err(`${name} is abstract; cannot be instantiated`, e); return t; }
      if (name === 'Scanner' && ats.length === 0) err('no suitable constructor found for Scanner(no arguments)', e);
      if (LIB_CLASSES_NEW.has(name) || knownLib(name)) return t;
      return t;
    }
    function checkAnonBody(e, sc, c, name) {
      const decl = e.body;
      const anon = { name: (c ? c.name : name), decl, kind: 'class', outer: ctx.ci, fields: new Map(), methods: new Map(), ctors: [], sup: c && c.kind !== 'interface' ? c : objCi, ifaces: c && c.kind === 'interface' ? [c] : [], typeParams: new Set(), isAbstract: false, isStaticNested: false, user: true, anon: true };
      anon.top = ctx.ci.top;
      if (!c) { anon.libIfaces = [name]; anon.anonLib = true; }
      for (const fd of decl.fields) for (const dc of fd.decls) anon.fields.set(dc.name, { name: dc.name, t: typeOf(dc.type, anon), tr: dc.type, static: fd.mods.has('static'), final: fd.mods.has('final'), mods: fd.mods, cls: anon, node: dc, init: dc.init });
      for (const md of decl.methods) addM(anon, { name: md.name, params: md.params.map(p => ({ t: typeOf(p.type, anon, md.typeParams), name: p.name, varargs: p.varargs })), ret: md.ret.name === 'void' ? tVoid : typeOf(md.ret, anon, md.typeParams), static: md.mods.has('static'), abstract: false, mods: md.mods, cls: anon, decl: md, varargs: false, throws: md.throws.map(t => normName(t.name)), sig: md.name + '(' + md.params.map(p => p.type.name).join(',') + ')' });
      // abstract methods implemented?
      if (c) {
        for (const sc2 of supers(c)) for (const [n, ms] of sc2.methods) for (const m of ms) {
          if (!m.abstract || m.anyArgs) continue;
          const impl = findMethods(anon, n).some(x => !x.abstract && x.params.length === m.params.length);
          if (!impl) { err(`<anonymous ${ctx.ci.top.name}$> is not abstract and does not override abstract method ${n}(${paramStr(m)}) in ${sc2.name}`, e); }
        }
      }
      const prevCtx = ctx;
      const savedDepth = ctx.lambdaDepth;
      for (const md of decl.methods) {
        const m = anon.methods.get(md.name).find(x => x.decl === md);
        const msc = new Scope(sc);
        const outerCtx = ctx;
        ctx = mkCtx(anon, { isStatic: false, ret: m.ret, methodName: md.name, throwsDecl: m.throws, methodToken: {}, da: new Set(), lambdaDepth: savedDepth + 1, lambdaKind: 'an inner class', captures: outerCtx.captures });
        ctx.locDesc = `method ${md.name}(${paramStr(m)})`;
        for (const p of md.params) { const v = declareVar(msc, p.name, typeOf(p.type, anon, md.typeParams), p, { param: true }); ctx.da.add(v.id); }
        if (md.body) { const comp = checkBlock(md.body, msc); if (comp && m.ret && m.ret.n !== 'void') err('missing return statement', { line: md.body.endLine, col: 1 }); }
        ctx = outerCtx;
      }
      ctx = prevCtx;
    }
    function lambdaExpr(e, sc, expected) {
      const ls = new Scope(sc);
      // parameter types from expected functional type when possible
      let ptypes = [];
      if (expected && expected.a && expected.a.length) {
        if (expected.n === 'Comparator' || expected.n === 'BinaryOperator' || expected.n === 'BiPredicate') ptypes = [expected.a[0], expected.a[0]];
        else if (['Consumer', 'Predicate', 'Function', 'UnaryOperator', 'ToIntFunction', 'ToDoubleFunction'].includes(expected.n)) ptypes = [expected.a[0]];
        else if (['BiFunction', 'BiConsumer'].includes(expected.n)) ptypes = [expected.a[0], expected.a[1]];
      } else if (expected) {
        const uc = resolveType(expected.n);
        if (uc && uc.user && uc.kind === 'interface') {
          const am = [...uc.methods.values()].flat().find(m => m.abstract);
          if (am) { ptypes = am.params.map(p => p.t); e._iface = am; }
        }
      }
      const prevDepth = ctx.lambdaDepth, prevKind = ctx.lambdaKind, prevRet = ctx.lambdaRet, prevLB = ctx.lambdaHandlersBase, prevLT = ctx.lambdaThrows, prevCollectors = ctx.collectors, prevLoop = ctx.inLoop, prevSwitch = ctx.inSwitch, prevDA = ctx.da, prevBreak = ctx.breakDA, prevLabels = ctx.labels;
      ctx.lambdaDepth++;
      ctx.lambdaKind = 'a lambda expression';
      ctx.lambdaRet = null;
      ctx.lambdaHandlersBase = true;
      ctx.lambdaThrows = [];
      ctx.collectors = [];
      ctx.inLoop = 0; ctx.inSwitch = 0; ctx.breakDA = []; ctx.labels = [];
      ctx.da = prevDA === null ? new Set() : new Set(prevDA);
      e.params.forEach((p, i) => {
        const t = p.type ? typeOf(p.type, ctx.ci) : (ptypes[i] || null);
        const v = declareVar(ls, p.name, t, e, { param: true });
        ctx.da.add(v.id);
      });
      if (e.body.k === 'Block') {
        const comp = checkBlock(e.body, ls);
        if (comp && e._iface && e._iface.ret && e._iface.ret.n !== 'void' && hasValueReturn(e.body)) err('missing return statement', { line: e.body.endLine, col: 1 });
      } else expr(e.body, ls);
      ctx.lambdaDepth = prevDepth; ctx.lambdaKind = prevKind; ctx.lambdaRet = prevRet; ctx.lambdaHandlersBase = prevLB; ctx.lambdaThrows = prevLT; ctx.collectors = prevCollectors;
      ctx.inLoop = prevLoop; ctx.inSwitch = prevSwitch; ctx.da = prevDA; ctx.breakDA = prevBreak; ctx.labels = prevLabels;
      return tLambda;
    }
    function hasValueReturn(b) {
      let r = false;
      const walk = n => { if (!n || typeof n !== 'object' || r) return; if (Array.isArray(n)) return n.forEach(walk); if (n.k === 'Lambda' || n.k === 'Class') return; if (n.k === 'Return' && n.e) { r = true; return; } for (const k of ['stmts', 'body', 'then', 'els', 'block', 'catches', 'fin', 'cases']) if (n[k]) walk(n[k]); };
      walk(b);
      return r;
    }
    function methodRefExpr(e, sc) {
      const t = e.target;
      if (t.k === 'Name' && !lookupVar(t.name, sc) && !fieldFromCtx(t.name)) {
        const c = resolveType(t.name);
        if (c && c.user) {
          if (e.name !== 'new' && !findMethods(c, e.name).length) err(`invalid method reference\n  cannot find symbol\n    symbol:   method ${e.name}()\n    location: class ${t.name}`, e);
          return tLambda;
        }
        if (!knownLib(t.name)) err(`cannot find symbol\n  symbol:   variable ${t.name}\n  location: class ${ctx.ci.name}`, t);
        else if (NEEDS_IMPORT[t.name] && !libVisible(t.name)) err(`cannot find symbol\n  symbol:   variable ${t.name}\n  location: class ${ctx.ci.name}`, t);
        return tLambda;
      }
      if (t.k !== 'TypeRef' && t.k !== 'Super') {
        const ot = expr(t, sc);
        if (ot && !isClassT(ot)) {
          const c = resolveType(ot.n);
          if (c && c.user && !findMethods(c, e.name).length) err(`invalid method reference\n  cannot find symbol\n    symbol:   method ${e.name}`, e);
        }
      }
      return tLambda;
    }
    function binExpr(e, sc) {
      const op = e.op;
      if (op === '&&' || op === '||') {
        const a = expr(e.l, sc);
        const before = daCopy(ctx.da);
        const rs = new Scope(sc);
        if (op === '&&') addPatternBindings(e.l, rs, true);
        const b = expr(e.r, rs);
        ctx.da = before;
        if ((a && !isBoolish(a)) || (b && !isBoolish(b))) { err(`bad operand types for binary operator '${op}'\n  first type:  ${tstr(a)}\n  second type: ${tstr(b)}`, e, e.opcol); }
        return tBool;
      }
      const a = expr(e.l, sc), b = expr(e.r, sc);
      if (!a || !b) {
        if (op === '+' && ((a && isStr(a)) || (b && isStr(b)))) return tStr;
        if (['==', '!=', '<', '>', '<=', '>='].includes(op)) return tBool;
        if (['+', '-', '*', '/', '%'].includes(op) && (a && isNumeric(a) || b && isNumeric(b))) return null;
        return null;
      }
      const bad = () => { err(`bad operand types for binary operator '${op}'\n  first type:  ${tstr(a)}\n  second type: ${tstr(b)}`, e, e.opcol); return null; };
      switch (op) {
        case '+':
          if (isStr(a) || isStr(b)) {
            if ((a.n === 'void') || (b.n === 'void')) return bad();
            return tStr;
          }
          // fallthrough
        case '-': case '*': case '/': case '%': {
          if (!isNumeric(a) || !isNumeric(b)) return bad();
          if ((op === '/' || op === '%') && e.r.k === 'Lit' && e.r.v === 0 && (e.r.vt === 'int' || e.r.vt === 'long') && !['double', 'float'].includes(binPromote(a, b).n)) warn('division by zero', e);
          return binPromote(a, b);
        }
        case '<': case '>': case '<=': case '>=':
          if (!isNumeric(a) || !isNumeric(b)) return bad();
          return tBool;
        case '==': case '!=': {
          const pa = isPrim(a) || isPrim(b);
          if (pa) {
            if (isNumeric(a) && isNumeric(b)) return tBool;
            if (isBoolish(a) && isBoolish(b)) return tBool;
            if (a.n === 'null' || b.n === 'null' || !(BOXES[a.n] || BOXES[b.n] || a.n === 'Object' || b.n === 'Object' || a.n === 'Number' || b.n === 'Number')) { err(`bad operand types for binary operator '${op}'\n  first type:  ${tstr(a)}\n  second type: ${tstr(b)}`, e, e.opcol); return tBool; }
            err(`incomparable types: ${tstr(a)} and ${tstr(b)}`, e, e.opcol);
            return tBool;
          }
          if (a.n === 'null' || b.n === 'null') return tBool;
          if (isStr(a) && isStr(b)) {
            const lit = x => x.k === 'Lit' || (x.k === 'Paren' && lit(x.e));
            if (!(lit(e.l) && lit(e.r))) warn(`comparing Strings with ${op} checks whether they are the same object, not the same text \u2014 use .equals() instead`, e);
            return tBool;
          }
          if (!assignableT(a, b) && !assignableT(b, a)) {
            const ca = resolveType(a.n), cb = resolveType(b.n);
            const iface = (ca && ca.kind === 'interface') || (cb && cb.kind === 'interface');
            if (!iface && a.d === b.d) err(`incomparable types: ${tstr(a)} and ${tstr(b)}`, e, e.opcol);
          }
          return tBool;
        }
        case '&': case '|': case '^':
          if (isBoolish(a) && isBoolish(b)) return tBool;
          if (isNumeric(a) && isNumeric(b) && !['double', 'float'].includes(binPromote(a, b).n)) return binPromote(a, b);
          return bad();
        case '<<': case '>>': case '>>>':
          if (!isNumeric(a) || !isNumeric(b) || ['double', 'float'].includes(unbox(a).n) || ['double', 'float'].includes(unbox(b).n)) return bad();
          return binPromote(a, tInt);
      }
      return null;
    }

    // ---------------- class bodies
    function checkClassDecl(d, sc) {
      // local class: register on the fly (best effort)
      if (!d.cci) {
        const ci = regClass(d, ctx ? ctx.ci : null);
        ci.isStaticNested = true; ci.local = true;
        if (d.ext) { const s = resolveType(d.ext.name); if (s) ci.sup = s; } else if (d.kind !== 'interface') ci.sup = objCi;
        for (const it of d.impls) { const s = resolveType(it.name); if (s) ci.ifaces.push(s); else ci.libIfaces = (ci.libIfaces || []).concat(normName(it.name)); }
        for (const fd of d.fields) for (const dc of fd.decls) ci.fields.set(dc.name, { name: dc.name, t: typeOf(dc.type, ci), tr: dc.type, static: fd.mods.has('static'), final: fd.mods.has('final'), mods: fd.mods, cls: ci, node: dc, init: dc.init });
        for (const md of d.methods) addM(ci, { name: md.name, params: md.params.map(p => ({ t: typeOf(p.type, ci, md.typeParams), name: p.name, varargs: p.varargs })), ret: md.ret.name === 'void' ? tVoid : typeOf(md.ret, ci, md.typeParams), static: md.mods.has('static'), abstract: md.mods.has('abstract'), mods: md.mods, cls: ci, decl: md, varargs: false, throws: [], sig: md.name + '(' + md.params.map(p => p.type.name).join(',') + ')' });
        for (const cd of d.ctors) ci.ctors.push({ name: ci.name, params: cd.params.map(p => ({ t: typeOf(p.type, ci), name: p.name })), mods: cd.mods, cls: ci, decl: cd, varargs: false, throws: [], ctor: true });
      }
    }
    function checkClass(ci) {
      const d = ci.decl;
      // field initializers
      for (const fd of d.fields) {
        if (!(d.kind === 'interface') && !fd.mods.has('static') && false) { }
        for (const dc of fd.decls) {
          const isStatic = d.kind === 'interface' || fd.mods.has('static');
          if (!PRIMS.has(dc.type.name)) { ctx = mkCtx(ci, { methodToken: {}, isStatic }); ctx.locDesc = 'class ' + ci.name; checkTypeExists(dc.type, dc); ctx = null; }
          if (d.kind === 'interface' && !dc.init) err('= expected', dc);
          if (!dc.init) continue;
          ctx = mkCtx(ci, { isStatic, methodToken: {}, inInit: isStatic ? 'static' : 'inst', da: new Set() });
          ctx.locDesc = 'class ' + ci.name;
          const ft = typeOf(dc.type, ci);
          if (dc.init.k === 'ArrayInit') arrayInitCheck(dc.init, ft, new Scope(null));
          else { const it = expr(dc.init, new Scope(null), ft); checkAssign(ft, it, dc.init); }
          ctx = null;
        }
        if (fd.mods.has('abstract')) err('modifier abstract not allowed here', fd);
      }
      for (const it of d.inits) {
        ctx = mkCtx(ci, { isStatic: it.static, methodToken: {}, inInit: it.static ? 'static' : 'inst', da: new Set() });
        ctx.locDesc = 'class ' + ci.name;
        checkBlock(it.body, new Scope(null));
        ctx = null;
      }
      // enum constant args
      if (d.kind === 'enum') for (const ec of d.enumConsts) {
        ctx = mkCtx(ci, { isStatic: true, methodToken: {}, da: new Set() });
        ctx.locDesc = 'class ' + ci.name;
        const ats = exprList(ec.args, new Scope(null));
        if (ci.ctors.length) resolveCall(ci.ctors, ats, ec.args, ec, ci.name, ci, true);
        else if (ats.length) err(`constructor ${ci.name} in enum ${ci.name} cannot be applied to given types;\n  required: no arguments\n  found:    ${argsDesc(ats)}\n  reason: actual and formal argument lists differ in length`, ec);
        if (ec.body) {
          const sub = { name: ci.name, decl: ec.body, kind: 'class', outer: ci, fields: new Map(), methods: new Map(), ctors: [], sup: ci, ifaces: [], typeParams: new Set(), isAbstract: false, isStaticNested: true, user: true, top: ci.top };
          for (const md of ec.body.methods) {
            const m = { name: md.name, params: md.params.map(p => ({ t: typeOf(p.type, sub), name: p.name })), ret: md.ret.name === 'void' ? tVoid : typeOf(md.ret, sub), static: false, mods: md.mods, cls: sub, decl: md, throws: [] };
            checkMethodBody(sub, m, md, false);
          }
        }
        ctx = null;
      }
      for (const [n, ms] of ci.methods) for (const m of ms) {
        if (!m.decl) continue;
        if (ci.kind === 'interface' && m.decl.body && !m.static && !m.decl.mods.has('default') && !m.decl.mods.has('private')) err('interface abstract methods cannot have body', m.decl);
        for (const p of m.decl.params) if (!PRIMS.has(p.type.name)) { ctx = mkCtx(ci, { methodToken: {}, mtps: m.decl.typeParams }); ctx.locDesc = ''; checkTypeExists(p.type, p); ctx = null; }
        if (m.decl.ret.name !== 'void' && !PRIMS.has(m.decl.ret.name)) { ctx = mkCtx(ci, { methodToken: {}, mtps: m.decl.typeParams }); checkTypeExists(m.decl.ret, m.decl); ctx = null; }
        for (const t of m.decl.throws) { const c = resolveType(t.name); if (!c) { ctx = mkCtx(ci, { methodToken: {} }); checkTypeExists(t, m.decl); ctx = null; } }
        if (m.decl.body) { const prevMtps = m.decl.typeParams; checkMethodBody(ci, m, m.decl, false); }
      }
      for (const c of ci.ctors) {
        if (c.mods.has('static')) err('modifier static not allowed here', c.decl);
        for (const p of c.decl.params) if (!PRIMS.has(p.type.name)) { ctx = mkCtx(ci, { methodToken: {} }); checkTypeExists(p.type, p); ctx = null; }
        checkMethodBody(ci, c, c.decl, true);
      }
      // final fields must be initialized
      for (const [n, f] of ci.fields) {
        if (!f.final || f.init || !f.node || f.node.ord !== undefined || ci.kind === 'interface' || ci.kind === 'enum' && f.t && f.t.n === ci.name && f.static) continue;
        if (f.static) {
          const assigned = d.inits.some(it => it.static && assignsField(it.body, n));
          if (!assigned) err(`variable ${n} not initialized in the default constructor`, f.node);
        } else {
          const ctorsOk = ci.ctors.length ? ci.ctors.every(c => assignsField(c.decl.body, n) || (c.decl.body.stmts[0] && c.decl.body.stmts[0].k === 'ExprStmt' && c.decl.body.stmts[0].e.k === 'CtorCall' && c.decl.body.stmts[0].e.kind === 'this')) : false;
          const initOk = d.inits.some(it => !it.static && assignsField(it.body, n));
          if (!ctorsOk && !initOk) {
            if (!ci.ctors.length) err(`variable ${n} not initialized in the default constructor`, f.node);
            else { const bad = ci.ctors.find(c => !assignsField(c.decl.body, n) && !(c.decl.body.stmts[0] && c.decl.body.stmts[0].k === 'ExprStmt' && c.decl.body.stmts[0].e.k === 'CtorCall' && c.decl.body.stmts[0].e.kind === 'this')); err(`variable ${n} might not have been initialized`, { line: bad.decl.body.endLine, col: 1 }); }
          }
        }
      }
    }
    function assignsField(body, name) {
      let found = false;
      const walk = n => {
        if (!n || typeof n !== 'object' || found) return;
        if (Array.isArray(n)) return n.forEach(walk);
        if (n.k === 'Assign' && n.op === '=') {
          const t = n.target;
          if ((t.k === 'Name' && t.name === name) || (t.k === 'Field' && t.name === name && t.obj.k === 'This')) { found = true; return; }
        }
        if (n.k === 'Lambda' || n.k === 'Class') return;
        for (const k in n) if (k !== 'cci' && k !== 'ci' && k !== 'outer' && k !== 'cls' && k !== '_t') { const v = n[k]; if (v && typeof v === 'object') walk(v); }
      };
      walk(body);
      return found;
    }

    try {
      for (const ci of allDecls.slice()) if (!ci.anon && !ci.local) checkClass(ci);
    } catch (ex) {
      // never let a checker bug block running the program
      if (typeof console !== 'undefined') console.warn('checker internal error', ex);
      ctx = null;
    }
    const FLOW = /^(missing return statement|unreachable statement|variable \S+ might not have been initialized|unreported exception|exception \S+ is never thrown|exception \S+ has already been caught|local variables referenced from|the switch expression does not cover|variable \S+ not initialized in the default constructor|variable \S+ might already have been assigned)/;
    let result = errors;
    if (errors.some(e => !FLOW.test(e.msg))) result = errors.filter(e => !FLOW.test(e.msg));
    result.sort((a, b) => a.line - b.line || a.col - b.col);
    check.lastWarnings = warnings;
    return result;
  }
  JR.check = check;
  JR.checkWarnings = () => check.lastWarnings || [];
})(typeof window !== 'undefined' ? (window.JR = window.JR || {}) : (globalThis.JR = globalThis.JR || {}));

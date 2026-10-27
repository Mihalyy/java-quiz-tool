// usage: node run.js File.java [inputfile]
const fs = require('fs');
require('./src/parser.js'); require('./src/values.js'); require('./src/lib.js'); require('./src/interp.js');
try { require('./src/checker.js'); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; }
const src = fs.readFileSync(process.argv[2], 'utf8');
const input = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
const lines = input.length ? input.replace(/\n$/, '').split('\n') : [];
let unit;
try { unit = JavaParser.parse(src); } catch (e) { console.log('COMPILE ERROR line ' + e.line + ': ' + e.message); process.exit(0); }
if (JR.check) { const errs = JR.check(unit, src); if (errs.length) { for (const e of errs) console.log('COMPILE ERROR line ' + e.line + ': ' + e.msg); process.exit(0); } }
const rt = new JR.Interp({ input: lines, interactive: false, timeLimit: 10000 });
try { rt.load(unit); } catch (e) { console.log('COMPILE ERROR line ' + e.line + ': ' + e.message); process.exit(0); }
const res = rt.run();
let out = '', err = '';
for (const seg of res.out) { if (seg.k === 'o') out += seg.s; else if (seg.k === 'e') err += seg.s; }
process.stdout.write(out);
if (err) process.stdout.write('[stderr]\n' + err);
if (res.status !== 'done' && res.status !== 'exception') console.log('[status ' + res.status + '] ' + (res.error ? res.error.msg + (res.error.line ? ' (line ' + res.error.line + ')' : '') : '') + (res.error && res.error.stack ? '\n' + res.error.stack : ''));

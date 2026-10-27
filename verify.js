// verify model answers: compile clean, pass all tests & reqs; starters compile-status reported
const fs = require('fs');
for (const f of ['parser', 'values', 'lib', 'interp', 'checker', 'grader']) require('./src/' + f + '.js');
const qs = JSON.parse(fs.readFileSync('content/questions.json', 'utf8'));
let bad = 0;
for (const q of qs) {
  const ans = fs.readFileSync(`content/q${q.n}_answer.java`, 'utf8');
  const g = JR.grade(ans, q);
  const fails = g.results.filter(r => !r.ok);
  console.log(`Q${q.n} answer score=${g.score}` + (g.compileErrors.length ? ' COMPILE: ' + JSON.stringify(g.compileErrors) : '') + (fails.length ? ' FAILS: ' + fails.map(f => f.label + ' -> ' + f.detail).join(' | ') : ''));
  if (g.score !== 100) bad++;
  const st = fs.readFileSync(`content/q${q.n}_starter.java`, 'utf8');
  const gs = JR.grade(st, q);
  console.log(`   starter score=${gs.score} compileErrors=${gs.compileErrors.length}` + (gs.compileErrors.length ? ' first: ' + gs.compileErrors[0].line + ' ' + gs.compileErrors[0].msg.split('\n')[0] : ''));
  // dump test inputs for java comparison
  q.tests.forEach((t, i) => fs.writeFileSync(`/tmp/claude-0/-home-user/b646caea-22c8-5b26-9c20-6ca7dbf5d9ec/scratchpad/q${q.n}_t${i}.in`, t.input + '\n'));
}
process.exit(bad ? 1 : 0);

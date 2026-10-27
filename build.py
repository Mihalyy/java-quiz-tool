#!/usr/bin/env python3
"""Bundle engine + content + app into a single self-contained HTML file."""
import json, os, re
ROOT = os.path.dirname(os.path.abspath(__file__))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()

engine = '\n'.join(rd('src/%s.js' % m) for m in ['parser', 'values', 'lib', 'interp', 'checker', 'grader'])
assert '</script' not in engine.lower()
questions = json.loads(rd('content/questions.json'))
for q in questions:
    q['answer'] = rd('content/q%d_answer.java' % q['n'])
    q['starter'] = rd('content/q%d_starter.java' % q['n'])
examples = []
for f in sorted(os.listdir(os.path.join(ROOT, 'content/examples'))):
    code = rd('content/examples/' + f)
    title = code.split('\n', 1)[0].lstrip('/ ').strip()
    examples.append({'title': title, 'code': code})
data = {'questions': questions, 'theory': json.loads(rd('content/theory.json')), 'examples': examples}
data_js = json.dumps(data, ensure_ascii=True).replace('</', '<\\/')
app = rd('content/app.js')
html = rd('content/page.template.html')
html = html.replace('/*__ENGINE__*/', engine).replace('/*__DATA__*/null', data_js).replace('/*__APP__*/', app)
out = os.path.join(ROOT, 'Java_OOP_Practice.html')
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html), 'bytes')

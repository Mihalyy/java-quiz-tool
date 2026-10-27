# Hehe Groceries – Java OOP practice (UTS P1–P7)

`Java_OOP_Practice.html` is the whole app in one file. Open it in Chrome, Edge or Firefox. It works offline; nothing is installed or uploaded.

- **Practice (70%)**: 13 coding questions, from encapsulation to full CRUD menu apps with `ArrayList`. **Run** compiles the code and runs it in an interactive console where you type the input. **Submit** grades it against hidden test cases and code requirements. The page saves your scores and code in the browser.
- **Theory (30%)**: 28 multiple-choice questions on OOP concepts, Java data structures and access modifiers, plus cheat-sheet tables.
- **Playground**: free coding with example programs.

The page runs Java with its own interpreter, written in JavaScript:

- `src/parser.js` turns Java source into a syntax tree.
- `src/checker.js` reports javac-style compile errors: cannot find symbol, private access, incompatible types, missing return, unreachable code, uninitialised variables, unreported exceptions, and more.
- `src/interp.js` runs the program, with `src/lib.js` providing the Java library subset: String, Math, wrapper classes, Scanner, ArrayList/LinkedList/Stack/ArrayDeque/PriorityQueue, HashMap/TreeMap/HashSet, StringBuilder, Arrays, Collections, Random (same sequence as Java), printf and basic streams.
- `src/grader.js` grades submissions.

The program runs in a Web Worker so it can be stopped at any time. It is not a full JVM. Threads, files, `java.time` and similar libraries are not available, and recursion deeper than a few hundred calls hits the browser's stack limit.

## Rebuilding

```
python3 build.py          # src/*.js + content/* -> Java_OOP_Practice.html
```

Questions live in `content/questions.json`, with a `qN_answer.java` and a `qN_starter.java` for each. Theory questions are in `content/theory.json`, and playground examples in `content/examples/`.

## Tests (need a JDK)

```
./compare.sh      # tests/cases/*.java: interpreter output vs real java
./errcmp.sh       # tests/errors/*.java: checker errors vs javac
node verify.js    # every model answer must score 100
./javacheck.sh    # model answers on every test input vs real java
```

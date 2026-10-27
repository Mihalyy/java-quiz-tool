#!/bin/bash
# run model answers with real java on every test input, compare stdout with the interpreter
cd /home/user/java-practice
S=/tmp/claude-0/-home-user/b646caea-22c8-5b26-9c20-6ca7dbf5d9ec/scratchpad
for a in content/q*_answer.java; do
  n=$(basename $a _answer.java)
  rm -rf $S/jq/$n; mkdir -p $S/jq/$n; cp $a $S/jq/$n/Main.java
  (cd $S/jq/$n && javac Main.java 2>&1 | grep -v 'Picked up')
  for inp in $S/${n}_t*.in; do
    (cd $S/jq/$n && java Main < $inp 2>/dev/null) > $S/jq/$n/real.txt
    node run.js $a $inp > $S/jq/$n/mine.txt 2>&1
    if diff -q $S/jq/$n/real.txt $S/jq/$n/mine.txt >/dev/null; then echo "OK $n $(basename $inp)"; else echo "DIFF $n $(basename $inp)"; diff $S/jq/$n/real.txt $S/jq/$n/mine.txt | head -10; fi
  done
done

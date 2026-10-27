#!/bin/bash
# compare interpreter vs real java for tests/cases/*.java (or given files)
cd /home/user/java-practice
files="$@"; [ -z "$files" ] && files=$(ls tests/cases/*.java)
pass=0; fail=0
mkdir -p /tmp/claude-0/-home-user/b646caea-22c8-5b26-9c20-6ca7dbf5d9ec/scratchpad/jcmp
W=/tmp/claude-0/-home-user/b646caea-22c8-5b26-9c20-6ca7dbf5d9ec/scratchpad/jcmp
for f in $files; do
  b=$(basename $f .java); inp=/home/user/java-practice/tests/cases/$b.in; [ -f $inp ] || inp=/dev/null
  rm -rf $W/$b; mkdir -p $W/$b; cp $f $W/$b/Main.java
  if [ ! -f $W/$b.expected ] || [ $f -nt $W/$b.expected ] || [ $inp -nt $W/$b.expected ]; then
    (cd $W/$b && javac -nowarn Main.java 2>/dev/null >/dev/null && timeout 10 java -Xss512k Main < $inp > out.txt 2> err.txt; 
     cat out.txt; grep -v '^\s*at \|^Picked up\|^\s*\.\.\. ' err.txt > err2.txt; if [ -s err2.txt ]; then echo "[stderr]"; cat err2.txt; fi) > $W/$b.expected 2>&1
  fi
  node run.js $f $inp 2>&1 | grep -v '^\s*at ' > $W/$b.mine
  if diff -q $W/$b.expected $W/$b.mine >/dev/null; then pass=$((pass+1)); else fail=$((fail+1)); echo "=== FAIL $b"; diff $W/$b.expected $W/$b.mine | head -${LINES_SHOWN:-30}; fi
done
echo "pass=$pass fail=$fail"

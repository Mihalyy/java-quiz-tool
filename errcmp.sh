#!/bin/bash
cd /home/user/java-practice
W=/tmp/claude-0/-home-user/b646caea-22c8-5b26-9c20-6ca7dbf5d9ec/scratchpad/jerr; mkdir -p $W
files="$@"; [ -z "$files" ] && files=$(ls tests/errors/*.java)
for f in $files; do
  b=$(basename $f .java)
  rm -rf $W/$b; mkdir -p $W/$b; cp $f $W/$b/Main.java
  (cd $W/$b && javac -Xmaxerrs 100 Main.java 2>&1 | grep -v '^Picked up' | grep -E '^Main.java:[0-9]+: error' | sed -E 's/^Main.java:([0-9]+): error: /\1: /' ) | sort -u > $W/$b.javac
  node run.js $f /dev/null 2>&1 | grep '^COMPILE ERROR' | sed -E 's/^COMPILE ERROR line ([0-9]+): /\1: /' | sort -u > $W/$b.mine
  if diff -q $W/$b.javac $W/$b.mine > /dev/null; then echo "OK   $b"; else echo "DIFF $b"; diff $W/$b.javac $W/$b.mine | sed 's/^/     /'; fi
done

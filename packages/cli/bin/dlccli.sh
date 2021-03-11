#!/bin/bash

rl=0
cmd='../dist/commands.js'

if ! type perl > /dev/null 2>& 1; then
  if uname | grep -i 'darwin' > /dev/null; then
    echo 'DLCd requires perl to start on OSX.' >& 2
    exit 1
  fi
  rl=1
fi

if test $rl -eq 1; then
  file=$(readlink -f "$0")
else
  # Have to do it this way
  # because OSX isn't a real OS
  file=$(perl -MCwd -e "print Cwd::realpath('$0')")
fi

dir=$(dirname "$file")

exec "${dir}/${cmd}" "$@"
exit 1

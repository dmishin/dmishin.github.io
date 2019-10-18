#!/bin/sh

set -e

echo =======================
echo ==  Publishing site  ==
echo =======================

#Do not need to clear since 
#ark clear
malt build

ODIR=./out

#cp -r out/* $ODIR

cd $ODIR

git add -A
git status

git commit -m "Automatic commit"

git push

#!/bin/sh

set -e

echo Publishing

ark clear
ark build

ODIR=../dmishin.github.io

cp -r out/* $ODIR

cd $ODIR

git add -A
git status

git commit -m "Automatic commit"

git push

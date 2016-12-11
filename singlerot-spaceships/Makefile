JSREVCA=~/Prog/js-revca
singlerot-spaceships.html: singlerot-spaceships.json template.html
	python $(JSREVCA)/tools/library2html.py -t template.html singlerot-spaceships.json

singlerot-spaceships.csv: singlerot-spaceships.json
	coffee $(JSREVCA)/scripts-src/library2csv.coffee singlerot-spaceships.json > singlerot-spaceships.csv

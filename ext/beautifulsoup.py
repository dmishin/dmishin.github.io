from ark import hooks, site
from bs4 import BeautifulSoup, Tag
# Intermediate-level extension, allowing pre-processing HTML tree of the written pages
# Requires BeautifulSoup library:
# pip install beautifulsoup4

def fix_tags(root, tag_set):
    for child in root.contents:
        if isinstance(child, Tag):
            fix_tags(child, tag_set)
            if child.name in tag_set:
                for sub in list(child.contents):
                    sub.extract()
                    child.insert_after(sub)
                
def parse(html):
    soup = BeautifulSoup(html, 'html.parser' )
    fix_tags(soup, {'link','meta','br'})
    return soup
            
#Parses HTML and fires page_soup events
@hooks.register('page_html')
def transform_tree(html, page):
    try:

        soup = parse(html)
    except Exception as err:
        print("Error parsing HTML:", err, "will not postprocess tree for", page.get('path'))
        return html
    
    hooks.event('page_soup', soup, page)

    return str(soup)

@hooks.register('record_html')
def transform_record_html(html, record):
    try:
        soup = parse(html)
    except Exception as err:
        print("Error parsing HTML:", err, "will not postprocess tree for", record['src'])
        return html
    hooks.event('record_soup', soup, record)
    return str(soup)

if __name__=="__main__":
    #Testing tag fixer
    s="""<html>
<head>
	<meta charset="utf-8">
	<title>
    Potassium Magnesium Sulfate
</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<link rel="stylesheet" href="../css/theme.css">
	<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto+Sans:400,700,400italic,700italic&subset=latin,latin-ext">
	<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto+Serif:400,700,400italic,700italic&subset=latin,latin-ext">
	<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inconsolata:400,700&subset=latin,latin-ext">
	<link rel="stylesheet" href="../genericons/genericons.css">
	<link rel="stylesheet" href="../css/pygments.css">

	<!--[if lt IE 9]><script src="../js/html5shiv.min.js"></script><![endif]-->
	<script src="../js/jquery-1.11.3.min.js"></script>
	<script src="../js/theme.js"></script>
</head>
</html>"""
    print(str(parse(s)))

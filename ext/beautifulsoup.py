from ark import hooks, site
from bs4 import BeautifulSoup, Tag
# Intermediate-level extension, allowing pre-processing HTML tree of the written pages
# Requires BeautifulSoup library:
# pip install beautifulsoup4


#Parses HTML and fires page_soup events
@hooks.register('page_html')
def transform_tree(html, page):
    try:
        soup = BeautifulSoup(html, 'html.parser')
    except Exception as err:
        print("Error parsing HTML:", err, "will not postprocess tree for", page.get('path'))
        return html
    
    hooks.event('page_soup', soup, page)

    return str(soup)

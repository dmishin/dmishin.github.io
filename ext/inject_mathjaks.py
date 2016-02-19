from ark import hooks, site

#MATHJAKS_SOURCE = "@root/scripts/MathJax.js?config=TeX-MML-AM_CHTML"
MATHJAKS_SOURCE = "https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-MML-AM_CHTML"

#Add mathjaks: yes to the pages that need it.
MATHJAKS_TAG = "mathjaks"

#page_soup is fired by the beautifulsoup extension.
#allows to manipulate HTML structure
@hooks.register('page_soup')
def inject_mathjaks(soup, page):
    if page_needs_mathjaks(page):
        script = soup.new_tag("script",
                              src = MATHJAKS_SOURCE,
                              type="text/javascript",
                              async=None)
        try:
            soup.head.append(script)
        except Exception as err:
            print("Error: failed to append script to head in", page.get('path'))


def page_needs_mathjaks(page):
    if page['is_single']:
        return page['record'].get(MATHJAKS_TAG)
    else:
        for record in page.get('records',()):
            if record.get(MATHJAKS_TAG):
                return True
    return False

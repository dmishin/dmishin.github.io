from malt import hooks, site
from bs4 import BeautifulSoup

#    /**
#     *  RECOMMENDED CONFIGURATION VARIABLES: EDIT AND UNCOMMENT THE SECTION BELOW TO INSERT DYNAMIC VALUES FROM YOUR PLATFORM OR CMS.
#     *  LEARN WHY DEFINING THESE VARIABLES IS IMPORTANT: https://disqus.com/admin/universalcode/#configuration-variables
#     */

code_template="""
    /*
    var disqus_config = function () {{
        this.page.url = {PAGE_URL};  // Replace PAGE_URL with your page's canonical URL variable
        this.page.identifier = {PAGE_IDENTIFIER}; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
    }};
    */
(function() {{
var d=document,s=d.createElement('script');
s.src = '//dmishin.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
}})();
"""

#page_soup is fired by the beautifulsoup extension.
#allows to manipulate HTML structure
@hooks.register('page_soup')
def inject_comments(soup, page):
    disqs_div = soup.find(name="div", id="disqus_thread")
    if disqs_div is None: return

    url = None
    if page['is_single']:
        record = page.get('record')
        if record:
            url = record.get('url')
    else:
        url = page.get('url')

    if url is None:
        print("Warning: can't determine url for", page.get('path'))
        return


    
    #site.out()
    #print(page['path'], url)
    code = soup.new_tag("script")
    code.string = code_template.format(PAGE_URL = repr(page.get('url')),
                                       PAGE_IDENTIFIER = repr(url))
    disqs_div.insert_after(code)

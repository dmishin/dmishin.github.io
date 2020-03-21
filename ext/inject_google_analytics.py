
#from malt import hooks, site
#from bs4 import BeautifulSoup

#TRACK_ID = 'UA-74087176-1'

#code="""
#  (function(i,s,o,g,r,a,m){{i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){{
#  (i[r].q=i[r].q||[]).push(arguments)}},i[r].l=1*new Date();a=s.createElement(o),
#  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
#  }})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
#
#  ga('create', '{TRACK_ID}', 'auto');
#  ga('send', 'pageview');
#"""

#@hooks.register('page_soup')
#def inject_analytics(soup, page):
#    tag = soup.new_tag("script")
#    tag.string = code.format(TRACK_ID = TRACK_ID)
#    soup.body.append(tag)

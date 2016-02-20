"""Record abridger extension for ARK
Based on BeautifulSoup parser extension that provides filter event "record_soup"

Searches for the <span> tag with class="cut", and generates truncated version of HTML before the cut.
Also, extracts this span from the final record HTML.

Abridger must be the last tree manipulator run.

It generates 2 additional attrbutes of teh Record that can be used in the template:
  abridged_html : shortened version of HTML
  read_more_label : text of the <span> extracted, or some default string

Template must support it, like this (taken from index.ibis):

    {% if record.abridged_html %}
    <div class="record-content">
            {{ record.abridged_html }}
            <br/><a href="{{record.url}}">{{record.read_more_text}}</a>
    </div>
    {% else %}
    <div class="record-content">
            {{ record.html }}
            <br/>(full)
    </div>
    {% endif %}

Testing:

>>> from bs4 import BeautifulSoup
>>> s = BeautifulSoup('<p>Hello, here<span> is a <span class="cut">More...</span>cut!</span> end of span!</p><p>new para</p>', 'html.parser')
>>> sab, label = abridge(s)
>>> str(s)
'<p>Hello, here<span> is a cut!</span> end of span!</p><p>new para</p>'
>>> sab
'<p>Hello, here<span> is a </span></p>'
>>> label
'More...'
"""
from ark import hooks, site
from bs4 import BeautifulSoup, Tag, NavigableString

#Default label when not specified
READ_MORE_TEXT = "Read more..."
ABRIDGE_MARKER_CLASS = "cut"

#record_soup is fired by the beautifulsoup extension.
#allows to manipulate HTML structure

@hooks.register('record_soup', order = 1000) #abridger must be the very last
def make_abridged_html(soup, record):
    abridged, label = abridge(soup)
    if abridged is not None:
        record['abridged_html'] = abridged
        record['read_more_text'] = label or record.get('read_more_text') or READ_MORE_TEXT
        
def abridge(soup):
    cut = soup.find(name='span', attrs={'class':ABRIDGE_MARKER_CLASS})
    if cut is not None:
        rval = abridgeTo(soup, cut)
        cut.extract()
        return rval, str(cut.text)
    else:
        return None, None
    
def shallowCloneTag(el):
    """From http://stackoverflow.com/questions/23057631/clone-element-with-beautifulsoup
    """
    if isinstance(el, NavigableString):
        return type(el)(el)

    copy = Tag(None, el.builder, el.name, el.namespace, el.nsprefix)
    # work around bug where there is no builder set
    # https://bugs.launchpad.net/beautifulsoup/+bug/1307471
    copy.attrs = dict(el.attrs)
    for attr in ('can_be_empty_element', 'hidden'):
        setattr(copy, attr, getattr(el, attr))
    return copy


def abridgeTo( soup, cutMargin ):
    """Extract tags before given tag"""
    def copyTruncatedRecursively( root, copyRoot ):
        for child in root.contents:
            if child is cutMargin:
                return True            
            childCopy = shallowCloneTag(child)
            copyRoot.append( childCopy )
            if isinstance(child, Tag):
                if copyTruncatedRecursively( child, childCopy ):
                    return True
        return False
    
    copySoup = BeautifulSoup('', "html.parser")
    copyTruncatedRecursively( soup, copySoup )
    return str(copySoup)
            
if __name__=="__main__":
    import doctest
    doctest.testmod()


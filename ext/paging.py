# --------------------------------------------------------------------------
# This extension generates a customizable string of page navigation links
# for index pages.
#
# The links can be accessed in templates as:
#
#     {{ paging }}
#
# Default settings can be overridden by including a 'paging' dictionary in
# the site's config.py file containing one or more of the following options:
#
#     paging = {
#         'first': 'First',  # text for link to first page
#         'last': 'Last',    # text for link to last page
#         'prev': 'Prev',    # text for link to previous page
#         'next': 'Next',    # text for link to next page
#         'delta': 2,        # number of neighbouring pages to include
#         'multiples': 2,    # number of larger/smaller multiples
#         'multiple': 10,    # link to page numbers in multiples of...
#     }
#
# Author: Darren Mulholland <darren@mulholland.xyz>
# License: Public Domain
# --------------------------------------------------------------------------

from ark import hooks, site


# Register a callback on the 'render_page' event hook to generate our
# string of page navigation links and add it to the page object.
@hooks.register('render_page')
def add_paging_links(page):
    if page['is_paged']:
        page['paging'] = generate_paging_links(
            page['slugs'][:-1],
            page['page'],
            page['total']
        )


# Generates a string of page navigation links.
def generate_paging_links(slugs, page_number, total_pages):

    # Default settings can be overridden in the site's configuration file.
    data = {
        'first': 'First',
        'last': 'Last',
        'prev': 'Prev',
        'next': 'Next',
        'delta': 2,
        'multiples': 2,
        'multiple': 10,
    }
    data.update(site.config('paging', {}))

    # Start and end points for the sequence of numbered links.
    start = page_number - data['delta']
    end = page_number + data['delta']

    if start < 1:
        start = 1
        end = 1 + 2 * data['delta']

    if end > total_pages:
        start = total_pages - 2 * data['delta']
        end = total_pages

    if start < 1:
        start = 1

    out = []

    # First page link.
    if start > 1:
        out.append("<a class='first' href='%s'>%s</a>" % (
            site.paged_url(slugs, 1, total_pages),
            data['first']
        ))

    # Previous page link.
    if page_number > 1:
        out.append("<a class='prev' href='%s'>%s</a>" % (
            site.paged_url(slugs, page_number - 1, total_pages),
            data['prev']
        ))

    # Smaller multiple links.
    if data['multiples']:
        multiples = list(range(data['multiple'], start, data['multiple']))
        for multiple in multiples[-data['multiples']:]:
            out.append("<a class='pagenum multiple' href='%s'>%s</a>" % (
                site.paged_url(slugs, multiple, total_pages), multiple
            ))

    # Sequence of numbered page links.
    for i in range(start, end + 1):
        if i == page_number:
            out.append("<span class='pagenum current'>%s</span>" % i)
        else:
            out.append("<a class='pagenum' href='%s'>%s</a>" % (
                site.paged_url(slugs, i, total_pages), i
            ))

    # Larger multiple links.
    if data['multiples']:
        starting_multiple = (int(end / data['multiple']) + 1) * data['multiple']
        multiples = list(range(starting_multiple, total_pages, data['multiple']))
        for multiple in multiples[:data['multiples']]:
            out.append("<a class='pagenum multiple' href='%s'>%s</a>" % (
                site.paged_url(slugs, multiple, total_pages), multiple
            ))

    # Next page link.
    if page_number < total_pages:
        out.append("<a class='next' href='%s'>%s</a>" % (
            site.paged_url(slugs, page_number + 1, total_pages),
            data['next']
        ))

    # Last page link.
    if end < total_pages:
        out.append("<a class='last' href='%s'>%s</a>" % (
            site.paged_url(slugs, total_pages, total_pages),
            data['last']
        ))

    return ''.join(out)

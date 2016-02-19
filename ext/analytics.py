# --------------------------------------------------------------------------
# This sample plugin adds a snippet of JavaScript analytics code (e.g. code
# for Google Analytics) to each page of a site.
#
# To use this plugin add your analytics code to a file named `analytics.js`
# in your site's `inc` directory. The code will be automatically included
# at the foot of each page.
#
# (Note that the snippet should omit any `<script>` tags.)
#
# Author: Darren Mulholland <darren@mulholland.xyz>
# License: Public Domain
# --------------------------------------------------------------------------

import ark


# Plugin version number.
__version__ = "0.1.0"


# We run our filter registration function on the `init` event hook. We could
# just register the filter directly but we want to run a test first to see if
# any analytics code is present in the site's `inc` directory.
@ark.hooks.register('init')
def register_analytics_filter():

    if 'analytics' in ark.includes.inc():
        fmt_str = '<script>%s</script></body>'
        inj_str =  fmt_str % ark.includes.inc('analytics')

        # We register our filter callback on the `page_html` filter hook.
        # This hook gives us an opportunity to alter a page's html before
        # it gets written to disk.
        @ark.hooks.register('page_html')
        def inject_analytics_code(html, page):
            return html.replace('</body>', inj_str)

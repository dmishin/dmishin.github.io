"""Optional site hooks. Every function is optional; delete what you don't need.

    setup_jinja(env, site)          add filters / globals to Jinja
    on_load(page, site)             after a page is loaded and its body rendered (pass 1)
    on_site_loaded(site)            all pages loaded, tags collected
    on_render(page, ctx, site)      modify the template context of a page (pass 2)
    on_output(html, out_rel, site)  final HTML of any output file; return the new HTML
"""
import re


def setup_jinja(env, site):
    env.filters["reading_time"] = lambda html: max(1, len(re.sub(r"<[^>]+>", " ", html).split()) // 200)

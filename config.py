# --------------------------------------------------------------------------
# Site Configuration File
# --------------------------------------------------------------------------

# This is a sample site configuration file. You can use this file to
# customise how Ark builds your site. Variables you set here are also
# available to themes and plugins.

# You can safely delete this file if you don't need to change any of
# the default settings.

# --------------------------------------------------------------------------
# Theme Directory
# --------------------------------------------------------------------------

# The name of the active theme directory in your site's 'lib' folder.

theme = "twentyfifteen"

# --------------------------------------------------------------------------
# Root URL
# --------------------------------------------------------------------------

# Your root url can be an explicit domain ("http://example.com/) for
# absolute urls, a single forward slash ("/") for site-relative urls, or an
# empty string (the default) for page-relative urls.

root = ""

# --------------------------------------------------------------------------
# File Extension
# --------------------------------------------------------------------------

# You can choose an arbitrary file extension for generated files (".html")
# or pass an empty string ("") to use no extension at all. Specify a single
# forward slash ("/") to generate directory-style urls.

extension = ".html"


crystals = {                # id corresponding to the [type] directory
    "name": "Crystal growing gallery",     # defaults to the titlecased id
    "slug": "crystals",     # defaults to the slugified id
    "tag_slug": "tags",    # defaults to "tags"
    "indexed": True,       # build directory indexes for this type?
#    "order_by": "date",    # order index entries by this attribute
    "reverse": True,       # display index entries in reverse order?
    "per_index": 10,       # number of entries per index page
    "per_tag_index": 10,   # number of entries per tag index page
    "homepage": False,     # use this type's index as the site homepage?
}

markdown = {
    'extensions': ['simplechem'],
}

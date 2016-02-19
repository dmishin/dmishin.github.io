from ark import hooks, site
from bs4 import Tag
from PIL import Image
import os.path
from urllib.parse import parse_qs

DEFAULT_MAX_WIDTH = 640 #integer or None

_visited_images = {}
#page_soup is fired by the beautifulsoup extension.
#allows to manipulate HTML structure
@hooks.register('page_soup')
def scale_images(soup, page):
    for img in soup.find_all('img'):
        process_img_tag( soup, img, page )
        
@hooks.register('exit')
def images_report():
    print("Image scaler: found {} images".format(len(_visited_images)))

def process_img_tag( soup, img, page ):
    """soup: beautifulsoup object
    img: <img> tag object
    page: ark page object"""

    imgSrc = img.get('src')
    if '?' in imgSrc:
        imgSrc, _args = imgSrc.split('?',1)
        args = parse_qs(_args)
    else:
        args = None
        
    src = imgSrc.split('/')

    #won't process relative links, because I don't know how to expand them.
    if src[0] != '@root': return
    
    linkToOriginal = True
    maxwidth = DEFAULT_MAX_WIDTH
    if args is not None:
        if "w" in args:
            maxwidth = int(args['w'][0])
        if "original" in args:
            if args['original'][0].lower() in ('no','false'):
                linkToOriginal = False

    if maxwidth is None:
        return
                
    image_source = site.src(*src[1:])
    image_output = site.out(*src[1:])

    if not os.path.exists(image_source):
        print("Source image not found:", image_source)
        return

    image_key = (image_source, maxwidth)
    try:
        substitution = _visited_images[image_key]
    except KeyError:
        substitution = build_image_substitution( imgSrc, image_source, image_output, maxwidth )
        _visited_images[image_key] = substitution
                                                 
    if substitution is not None:
        replace_image_src_with_scaled( soup, img, substitution, linkToOriginal )
    else:
        #remove arguments, if there were
        img['src']=imgSrc

def build_image_substitution( src, source_file, output_file, maxwidth ):
    img = Image.open( source_file )
    #print( "Image dimensions:", img.size)
    w, h = img.size
    if w <= maxwidth:
        #No need for substitution
        return None
    
    new_height = int( h / w * maxwidth )
    scaled = img.resize( (maxwidth, new_height), Image.ANTIALIAS )

    out_dir, out_name = os.path.split(output_file)
    scaled_out_name = "s" + str(maxwidth)+ "-" + out_name
    scaled.save( os.path.join( out_dir, scaled_out_name ) )

    scaled_src = '/'.join((src.rsplit('/', 1)[0], scaled_out_name))
    
    return {"scaled": scaled_src, "original": src}
    

def replace_image_src_with_scaled( soup, img, substitution, linkToOriginal ):
    """Change SRC of the image to point to the scaled version
    and put an A tag around it, pointing to the original"""
    
    if substitution is None: return
    img['src'] = substitution['scaled']

    if linkToOriginal:
        atag = Tag(name='a')
        atag['href'] = substitution['original']
        img.replaceWith(atag)
        atag.append(img)
    

from ark import hooks, site
from bs4 import Tag
from PIL import Image
import os.path
from urllib.parse import parse_qs
import re

DEFAULT_MAX_WIDTH = 640 #integer or None

_visited_images = {}
_visited_files = set()

#page_soup is fired by the beautifulsoup extension.
#allows to manipulate HTML structure
@hooks.register('record_soup')
def scale_images(soup, page):
    for img in soup.find_all('img'):
        process_img_tag( soup, img, page )
        
@hooks.register('exit')
def images_report():
    print("Image scaler: found {} images".format(len(_visited_images)))
    delete_unused_images()

_IMAGE_EXTS={".jpg", ".jpeg", ".png"}

#Format, used by scaler.
_DELETE_IMAGE_REGEXP=re.compile(r"s\d{2,4}-.*\.jpg")

def delete_unused_images():
    #set of all directories, where image files were created.
    dirs = {os.path.dirname(fname) for fname in _visited_files}
    for directory in dirs:
        for fname in os.listdir(directory):
            fpath = os.path.join(directory,fname)
            if os.path.isfile(fpath) and os.path.splitext(fname)[1].lower() in _IMAGE_EXTS:
                if (fpath not in _visited_files) and _DELETE_IMAGE_REGEXP.match(fname):
                    print("Deleting unused image file:", fpath)
                    try:
                        os.remove(fpath)
                        pass
                    except Exception as err:
                        print("Error:", err)
                        
        

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
                
    image_source = site.res(*src[1:])
    image_output = site.out(*src[1:])

    if not os.path.exists(image_source):
        print("Source image not found:", image_source)
        return

    _visited_files.add(image_output)
    
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

    out_dir, out_name = os.path.split(output_file)
    scaled_out_name = "s" + str(maxwidth)+ "-" + out_name
    scaled_out_path = os.path.join( out_dir, scaled_out_name )
    scaled_src = '/'.join((src.rsplit('/', 1)[0], scaled_out_name))

    
    _visited_files.add( scaled_out_path )
    if os.path.exists( scaled_out_path ):
        if os.path.getmtime( scaled_out_path ) > os.path.getmtime( source_file ):
            #print("File",output_file,"already exists and up to date")
            return {"scaled": scaled_src, "original": src}
    
    scaled = img.resize( (maxwidth, new_height), Image.ANTIALIAS )
    scaled.save( scaled_out_path )
    
    
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
    

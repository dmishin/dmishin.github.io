import os
import shutil

def make_stub(folder):
    compound_name = os.path.basename(folder)

    photos_source = os.path.join("crystals/images",compound_name)
    photos_orig = os.path.join(folder, "processed")

    print("Compound internal name:", compound_name )
    new_name = input("New name or nothing to leave as-is:").strip()
    compound_name = new_name or compound_name
    
    image_names = []

    try:
        os.makedirs(os.path.join("src",photos_source))
    except: pass
    
    for name in os.listdir(photos_orig):
        print(name)
        if os.path.splitext(name)[1].lower() not in (".jpg", ".jpeg", ".png"):
            continue

        opath = os.path.join("src",photos_source, name.lower())
        ipath = os.path.join(photos_orig, name)
        shutil.copy(ipath, opath)
        print("copy", ipath, opath )
        image_names.append(os.path.join("@root",photos_source, name.lower()))
            
    #writing post
    post_file = os.path.join("src","[crystals]", compound_name+".md")

    title = input("Enter title: ").strip()
    formula = input("Enter forumla: ").strip()
    tags = input("Enter tags: ").strip()

    with open(post_file, "w") as post:
        post.write("""---
title: {title}
tags: {tags}
---
Formula: {{{formula}}}
## Properties
Crystal system:
Crystal shape:
Stability on air:
## Preparation
## Growing
## Safety
## More photos
""".format(**locals()))
                   
        for iname in image_names:
            post.write("![{title}]({iname})\n\n".format(**locals()))
                   
    
if __name__=="__main__":
    import sys
    make_stub(sys.argv[1])

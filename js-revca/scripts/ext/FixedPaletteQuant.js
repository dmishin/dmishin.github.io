// Generated by CoffeeScript 1.6.3
"use strict";
/*
Interface, used by GIF Encoder
process()::Palette; // create reduced palette
map( R, G, B :: Byte ) :: Int
*/

var makeFixedPalette, simplePalette;

makeFixedPalette = function(pal) {
  var fastLookup, fastLookupKeys, mapDirect, mapFast, maxLookupTable, palettizer, rgbdist;
  rgbdist = function(r1, g1, b1, r2, g2, b2) {
    return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
  };
  if (pal.length === 0) {
    throw "Empty palette";
  }
  if (pal.length % 3 !== 0) {
    throw "Palette length must divide by 3";
  }
  fastLookup = {};
  fastLookupKeys = [];
  maxLookupTable = 1024;
  mapDirect = function(r, g, b) {
    var d, dbest, i, ibest, l;
    dbest = 0;
    ibest = -1;
    i = 0;
    l = (pal.length / 3) | 0;
    while (i < l) {
      d = rgbdist(r, g, b, pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2]);
      if (i === 0 || d < dbest) {
        dbest = d;
        ibest = i;
      }
      ++i;
    }
    return ibest;
  };
  mapFast = function(r, g, b) {
    var idx, keyToDelete, rgb;
    if (maxLookupTable > 0) {
      rgb = r | (g << 8) | (b << 16);
      idx = fastLookup[rgb];
      if (idx === undefined) {
        idx = mapDirect(r, g, b);
        fastLookup[rgb] = idx;
        fastLookupKeys.push(rgb);
        if (fastLookupKeys.length > maxLookupTable) {
          keyToDelete = fastLookupKeys[0];
          fastLookupKeys.splice(0, 1);
          delete fastLookup[keyToDelete];
        }
      }
      return idx;
    } else {
      return mapDirect(r, g, b);
    }
  };
  palettizer = function(rgbaImage, indexImage) {
    var i, j, len;
    len = rgbaImage.length;
    i = 0;
    j = 0;
    while (i < len) {
      indexImage[j] = mapFast(rgbaImage[i], rgbaImage[i + 1], rgbaImage[i + 2]);
      i += 4;
      ++j;
    }
    return pal;
  };
  return palettizer;
};

simplePalette = [0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0, 255, 0, 255, 0, 255, 255, 255, 255, 255, 128, 128, 128];

/*
//@ sourceMappingURL=FixedPaletteQuant.map
*/

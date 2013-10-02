"use strict";

var proj4 = require('proj4');
// Checks if `list` looks like a `[x, y]`.
function isXY(list) {
  return list.length === 2 &&
    typeof list[0] === 'number' &&
    typeof list[1] === 'number';
}
 
function traverseCoords(coordinates, callback) {
  if (isXY(coordinates)) return callback(coordinates);
  return coordinates.map(function(coord){return traverseCoords(coord, callback);});
}

// Simplistic shallow clone that will work for a normal GeoJSON object.
function clone(obj) {
  if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function traverseGeoJson(geojson, callback) {
  var r = clone(geojson);
  if (geojson.type == 'Feature') {
    r.geometry = traverseGeoJson(geojson.geometry, callback);
  } else if (geojson.type == 'FeatureCollection') {
    r.features = r.features.map(function(gj) { return traverseGeoJson(gj, callback); });
  } else if (geojson.type == 'GeometryCollection') {
    r.geometries = r.geometries.map(function(gj) { return traverseGeoJson(gj, callback); });
  } else {
    callback(r);
  }

  return r;
}

function detectCrs(geojson, projs) {
  var crsInfo = geojson['crs'],
      name,
      crs;

  if (crsInfo === undefined) {
    throw new Error("Unable to detect CRS, GeoJSON has no \"crs\" property.");
  }

  if (crsInfo.type == 'name') {
    crs = projs[crsInfo.properties.name];
  } else if (crsInfo.type == 'EPSG') {
    crs = projs["EPSG:" + crsInfo.properties.code];
  }

  if (!crs) {
    throw new Error("CRS defined in crs section could not be identified: " + JSON.stringify(crsInfo));
  }

  return crs;
}

function determineCrs(crs, projs) {
  if (typeof crs == 'string' || crs instanceof String) {
    return projs[crs];
  }

  return crs;
}

function reproject(geojson, from, to, projs) {
  if (!from) {
    from = detectCrs(geojson, projs);
  } else {
    from = determineCrs(from, projs);
  }

  to = determineCrs(to, projs);
  var transform = proj4(from, to);

  return traverseGeoJson(geojson, function(gj) {
    // No easy way to put correct CRS info into the GeoJSON,
    // and definitely wrong to keep the old, so delete it.
    if (gj.crs) {
      delete gj.crs;
    }
    gj.coordinates = traverseCoords(gj.coordinates, function(xy) {
      return transform.forward(xy);
    });
  });
}

module.exports = {
    detectCrs: detectCrs,

    reproject: reproject,

    reverse: function(geojson) {
      return traverseGeoJson(geojson, function(gj) {
        gj.coordinates = traverseCoords(gj.coordinates, function(xy) {
          return [ xy[1], xy[0] ];
        });
      });
    },

    toWgs84: function(geojson, from) {
      return reproject(geojson, from, proj4.WGS84);
    }
}

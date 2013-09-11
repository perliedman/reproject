var proj4node = require('proj4node');

// Checks if `list` looks like a `[x, y]`.
function isXY(list) {
  return list.length === 2 &&
    typeof list[0] === 'number' &&
    typeof list[1] === 'number';
}
 
// Move recursively through nested lists and call `callback` for each `[x,y]`.
// `callback` should return `[x,y]` which will be added to the final result.
// This is slower and more memory consuming then `transformInplace` but returns
// a new `Array`.
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

function detectProjection(geojson) {
  // TODO
  return undefined;
}

function reproject(geojson, from, to) {
  if (from === undefined) {
    from = detectProjection(geojson);
  }

  return traverseGeoJson(geojson, function(gj) {
    gj.coordinates = traverseCoords(gj.coordinates, function(xy) {
      var coord = to.transform(from, { x:xy[0], y:xy[1] });
      return [ coord.x, coord.y ];
    });
  });
}

module.exports = {
    detectProjection: detectProjection,

    reproject: reproject,

    toWgs84: function(geojson, proj) {
      return reproject(geojson, proj, proj4node.WGS84);
    }
}

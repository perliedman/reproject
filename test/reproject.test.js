var reproj = require('../'),
	expect = require('expect.js'),
	proj4node = require('proj4node');

var sweref99tm = proj4node('+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Simplistic shallow clone that will work for a normal GeoJSON object.
function clone(obj) {
  if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

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
function assertCoords(actual, expected) {
	if (isXY(expected)) {
  		expect(actual).to.be.coordinate(expected);
  	} else {
		expect(actual.length).to.be(expected.length);
	  	for (var i = 0; i < expected.length; i++) {
		  	assertCoords(actual[i], expected[i]);
	    }
	}
}

expect.Assertion.prototype.coordinate = function(obj) {
	this.assert(
		this.obj.length == 2
		&& Math.abs(this.obj[0] - obj[0]) < 1e-5
		&& Math.abs(this.obj[1] - obj[1]) < 1e-5,
		function() { return "expected " + this.obj + " to be a coordinate close to " + obj; },
		function() { return "expected " + this.obj + " to not be a coordinate close to " + obj; });
}

expect.Assertion.prototype.geojson = function(obj) {
	var copyThis = clone(this.obj),
		copyObj = clone(obj),
		i;

	delete copyThis.coordinates;
	delete copyObj.coordinates;
	delete copyThis.geometry;
	delete copyObj.geometry;
	delete copyThis.geometries;
	delete copyObj.geometries;
	delete copyThis.features;
	delete copyObj.features;

	expect(copyThis).to.eql(copyObj);
	if (obj.coordinates) {
		assertCoords(this.obj.coordinates, obj.coordinates);
	}
	if (obj.geometry) {
		expect(this.obj.geometry).to.be.geojson(obj.geometry);
	}
	if (obj.geometries) {
		for (i = 0; i < obj.geometries.length; i++) {
			expect(this.obj.geometries[i]).to.be.geojson(obj.geometries[i]);
		}
	}
	if (obj.features) {
		for (i = 0; i < obj.features.length; i++) {
			expect(this.obj.features[i]).to.be.geojson(obj.features[i]);
		}
	}
}

describe('toWgs84', function() {
	describe('primitives', function() {
		it('point', function() {
			expect(reproj.toWgs84({
				"type": "Point",
				"coordinates": [319180, 6399862]
			}, sweref99tm)).to.be.geojson({
				"type": "Point",
				"coordinates": [11.96526, 57.70451]
			});
		});
		it('linestring', function() {
			expect(reproj.toWgs84({
				"type": "LineString",
				"coordinates": [[319180, 6399862], [319637, 6400617]]
			}, sweref99tm)).to.be.geojson({
				"type": "LineString",
				"coordinates": [[11.96526, 57.70451], [11.97235, 57.71146]]
			});
		});
		it('polygon', function() {
			expect(reproj.toWgs84({
				"type": "Polygon",
				"coordinates": [[[319180, 6399862], [319637, 6400617], [319675, 6400239]]]
			}, sweref99tm)).to.be.geojson({
				"type": "Polygon",
				"coordinates": [[[11.96526, 57.70451], [11.97235, 57.71146], [11.97327, 57.70808]]]
			});
		});
	});
	describe('collections', function() {
		it('geometrycollection', function() {
			expect(reproj.toWgs84({
				"type": "GeometryCollection",
				"geometries": [
					{
						"type": "Point",
						"coordinates": [319180, 6399862]
					},
					{
						"type": "LineString",
						"coordinates": [[319180, 6399862], [319637, 6400617]]
					},
					{
						"type": "Polygon",
						"coordinates": [[[319180, 6399862], [319637, 6400617], [319675, 6400239]]]
					}
				]
			}, sweref99tm)).to.be.geojson({
				"type": "GeometryCollection",
				"geometries": [
					{
						"type": "Point",
						"coordinates": [11.96526, 57.70451]
					},
					{
						"type": "LineString",
						"coordinates": [[11.96526, 57.70451], [11.97235, 57.71146]]
					},
					{
						"type": "Polygon",
						"coordinates": [[[11.96526, 57.70451], [11.97235, 57.71146], [11.97327, 57.70808]]]
					}
				]
			});
		});
		it('featurecollection', function() {
			expect(reproj.toWgs84({
				"type": "FeatureCollection",
				"features": [
					{
						type: "Feature",
						attributes: {
							"name": "Domkyrkan"
						},
						geometry: {
							"type": "Point",
							"coordinates": [319180, 6399862]
						},
					},
					{
						type: "Feature",
						attributes: {
							"name": "en linje"
						},
						geometry: {
							"type": "LineString",
							"coordinates": [[319180, 6399862], [319637, 6400617]]
						},
					}
				]
			}, sweref99tm)).to.be.geojson({
				"type": "FeatureCollection",
				"features": [
					{
						type: "Feature",
						attributes: {
							"name": "Domkyrkan"
						},
						geometry: {
							"type": "Point",
							"coordinates": [11.96526, 57.70451]
						},
					},
					{
						type: "Feature",
						attributes: {
							"name": "en linje"
						},
						geometry: {
							"type": "LineString",
							"coordinates": [[11.96526, 57.70451], [11.97235, 57.71146]]
						},
					}
				]
			});
		});
	});
});

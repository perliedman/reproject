#!/usr/bin/env node

var geojsonStream = require('geojson-stream'),
    reproject = require('./'),
    proj4 = require('proj4'),
    fs = require('fs'),
    argv = require('minimist')(process.argv.slice(2)),
    useSpatialReference = argv["sr"] || argv["use-spatialreference"],
    useEpsgIo = argv["eio"] || argv["use-epsg-io"],
    http = require('http'),
    crss,
    fromCrs,
    toCrs;

try {
    crss = (argv['crs-defs'] ? loadJson(argv['crs-defs']) : {});
} catch (e) {
    process.exit(1);
}

for (var k in crss) {
    crss[k] = proj4(crss[k]);
}

lookupCrs(argv.from, function(crs) {
    fromCrs = crs;
    readStream();
});

lookupCrs(argv.to, function(crs) {
    toCrs = crs;
    readStream();
});

function readStream() {
    if ((fromCrs && toCrs) || (!argv.from && !argv.to)) {
        ((argv._[0] && fs.createReadStream(argv._[0])) || process.stdin).pipe(geojsonStream.parse())
            .on('header', openData)
            .on('footer', openData)
            .on('data', openData)
            .on('error', function (err) {
                console.error(err);
            });
    }
}

function openData(geojson) {
    // geojson-stream will break a FeaturesCollection's features into chunks that are fed to openData;
    // single geometries or GeometryCollection will be fed to as "header", so
    // we have to handle them here.
    if (geojson) {
        var isGeomCol = geojson.type === 'GeometryCollection' && geojson.geometries;
        var isFeature = geojson.type === 'Feature' && geojson.geometry;
        var isGeometry = geojson.coordinates;

        if (isGeomCol || isFeature || isGeometry) {
            if (argv["reverse"]) {
                geojson = reproject.reverse(geojson);
            }

            geojson = reproject.reproject(geojson, fromCrs, toCrs, crss);
        }
    }

    outputJson(geojson);
}

function outputJson(json) {
    console.log(JSON.stringify(json, null, 2));
}

function loadJson(f) {
    var data;
    try {
        data = fs.readFileSync(f, 'utf8');
    } catch (e) {
        console.log("Could not open file \"" + f + "\": " + e);
        throw e;
    }

    try {
        return JSON.parse(data);
    } catch (e) {
        console.log("Could not parse JSON from file \"" + f + "\": " + e);
        throw e;
    }
}

function lookupCrs(crsName, cb) {
    if (!crsName) {
        cb(null);
        return;
    }

    if (!crss[crsName]) {
        if (useSpatialReference) {
            var crsPath = crsName.toLowerCase().replace(':', '/');
            getCrs(crsName, "http://www.spatialreference.org/ref/"+ crsPath + "/proj4/", cb);
        } else if (useEpsgIo) {
            getCrs(crsName, "http://epsg.io/" + crsName.split(":")[1] + ".proj4", cb);
        } else {
            throw new Error("Could not find definition for CRS \"" + crsName + "\".");
        }
    } else {
        cb(crss[crsName]);
    }
}

function getCrs(crsName, url, cb) {
    var crsDef = '';
    http.get(url, function(res) {
        if (res.statusCode != 200) {
            throw new Error("spatialreference.org responded with HTTP " + res.statusCode +
                " when looking up \"" + crsName + "\".");
        }
        res.on('data', function(chunk) {
            crsDef += chunk;
        }).on('end', function() {
            crss[crsName] = proj4(crsDef);
            cb(crss[crsName]);
        });
    });
}
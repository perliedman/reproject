#!/usr/bin/env node

var concat = require('concat-stream'),
	reproject = require('./'),
	proj4 = require('proj4node'),
	fs = require('fs'),
    argv = require('minimist')(process.argv.slice(2)),
    crss,
    e;

try {
	crss = (argv['crs-defs'] ? loadJson(argv['crs-defs']) : {});
} catch (e) {
	process.exit(1);
}

for (var k in crss) {
	crss[k] = proj4(crss[k]);
}

((argv._[0] && fs.createReadStream(argv._[0])) || process.stdin).pipe(concat(openData));

function openData(body) {
	var geojson = JSON.parse(body.toString());

	if (argv["reverse"]) {
		geojson = reproject.reverse(geojson);
	}

	if (argv["from"] || argv["to"]) {
		geojson = reproject.reproject(geojson, argv["from"], argv["to"], crss)
	}

	console.log(JSON.stringify(geojson, null, 2));
}

function loadJson(f) {
	var data,
		e;
	try {
		var data = fs.readFileSync(f, 'utf8')
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
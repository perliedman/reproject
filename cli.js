#!/usr/bin/env node

var concat = require('concat-stream'),
	reproject = require('./'),
	proj4 = require('proj4node'),
	fs = require('fs'),
    argv = require('minimist')(process.argv.slice(2)),
    crss = (argv['crs-defs'] ? require("./" + argv['crs-defs']) : {});

for (var k in crss) {
	crss[k] = proj4(crss[k]);
}

((argv._[0] && fs.createReadStream(argv._[0])) || process.stdin).pipe(concat(openData));

function openData(body) {
	var geojson = JSON.parse(body.toString());
	console.log(JSON.stringify(reproject.reproject(geojson, argv["from"], argv["to"], crss), null, 2));
}
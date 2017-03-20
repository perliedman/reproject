/// <reference types="geojson" />


declare namespace reproj {
  export function detectCrs(geojson: GeoJSON.GeoJsonObject, crs: GeoJSON.CoordinateReferenceSystem): GeoJSON.CoordinateReferenceSystem;
  export function reproject(
    geojson: GeoJSON.GeoJsonObject,
    from: string | GeoJSON.CoordinateReferenceSystem,
    to: string | GeoJSON.CoordinateReferenceSystem,
    projs?: {[projection: string]: string}
  ): GeoJSON.GeoJsonObject;
  export function reverse(geojson: GeoJSON.GeoJsonObject): GeoJSON.GeoJsonObject;
  export function toWgs84(
    geojson: GeoJSON.GeoJsonObject,
    from: string | GeoJSON.CoordinateReferenceSystem,
    projs?: {[projection: string]: string}
  ): GeoJSON.GeoJsonObject;
}

declare module 'reproject' {
  export = reproj;
}

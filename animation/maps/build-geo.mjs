/*
 * Builds geo-data.js for the map reveal animations:
 *  - Spain (mainland + Balearics, Canaries excluded), counts to 90%
 *  - Africa (continent, merged countries), counts to 40%
 * Outputs SVG path strings (1920x1080 space), uniformly scattered dot
 * positions inside each shape (seeded, shuffled) and a label anchor.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { geoMercator, geoPath, geoContains, geoArea } from 'd3-geo';
import * as topojson from 'topojson-client';

const topo = JSON.parse(readFileSync(new URL('./countries-50m.json', import.meta.url)));
const countries = topo.objects.countries;

const AFRICA_NAMES = new Set([
  'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon',
  'Central African Rep.','Chad','Comoros','Congo','Côte d\'Ivoire','Dem. Rep. Congo',
  'Djibouti','Egypt','Eq. Guinea','Eritrea','eSwatini','Ethiopia','Gabon','Gambia','Ghana',
  'Guinea','Guinea-Bissau','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali',
  'Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda',
  'São Tomé and Principe','Senegal','Seychelles','Sierra Leone','Somalia','Somaliland',
  'South Africa','S. Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','W. Sahara',
  'Zambia','Zimbabwe'
]);

const africaGeoms = countries.geometries.filter(g => AFRICA_NAMES.has(g.properties.name));
console.log(`Africa: matched ${africaGeoms.length} countries`);
const africaMerged = topojson.merge(topo, africaGeoms);
/* keep mainland + Madagascar, drop remote small islands (Cape Verde, Mauritius, ...) */
const africa = {
  type: 'MultiPolygon',
  coordinates: africaMerged.coordinates.filter(
    poly => geoArea({ type: 'Polygon', coordinates: poly }) > 0.005
  ),
};

const spainTopo = countries.geometries.find(g => g.properties.name === 'Spain');
const spainFull = topojson.feature(topo, spainTopo).geometry;
/* Drop the Canary Islands (centroid west of 10°W), keep mainland + Balearics */
const spainPolys = spainFull.coordinates.filter(poly => {
  const ring = poly[0];
  const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  return lon > -10;
});
const spain = { type: 'MultiPolygon', coordinates: spainPolys };

/* Deterministic RNG */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMap(geom, { step, margin, seed, labelFrac = [0.5, 0.5] }) {
  const projection = geoMercator().fitExtent(
    [[margin[0], margin[1]], [1920 - margin[0], 1080 - margin[1]]],
    { type: 'Feature', geometry: geom }
  );
  const path = geoPath(projection);
  const d = path(geom);
  const [[x0, y0], [x1, y1]] = path.bounds(geom);
  const rand = mulberry32(seed);

  /* jittered grid in projected space, kept if inside the shape */
  const dots = [];
  for (let y = y0 + step / 2; y < y1; y += step) {
    for (let x = x0 + step / 2; x < x1; x += step) {
      const px = x + (rand() - 0.5) * step * 0.7;
      const py = y + (rand() - 0.5) * step * 0.7;
      const ll = projection.invert([px, py]);
      if (ll && geoContains({ type: 'Feature', geometry: geom }, ll)) {
        dots.push([Math.round(px * 10) / 10, Math.round(py * 10) / 10]);
      }
    }
  }
  /* shuffle so dots appear scattered "everywhere" as the counter climbs */
  for (let i = dots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [dots[i], dots[j]] = [dots[j], dots[i]];
  }

  return {
    path: d,
    dots,
    label: [
      Math.round(x0 + (x1 - x0) * labelFrac[0]),
      Math.round(y0 + (y1 - y0) * labelFrac[1]),
    ],
    bounds: [x0, y0, x1, y1],
  };
}

const data = {
  spain: {
    ...buildMap(spain, { step: 30, margin: [330, 130], seed: 41, labelFrac: [0.46, 0.46] }),
    target: 90,
  },
  africa: {
    ...buildMap(africa, { step: 25, margin: [560, 60], seed: 7, labelFrac: [0.40, 0.27] }),
    target: 40,
  },
};

console.log(`Spain: ${data.spain.dots.length} dots, label @ ${data.spain.label}`);
console.log(`Africa: ${data.africa.dots.length} dots, label @ ${data.africa.label}`);

writeFileSync(new URL('./geo-data.js', import.meta.url), 'window.GEO = ' + JSON.stringify(data) + ';\n');
console.log('Wrote geo-data.js');

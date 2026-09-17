import assert from 'node:assert/strict';
import { solarPosition } from '../js/sun.js';
import { bearingDeg, angleDiffDeg } from '../js/geometry.js';
import { analyzeTrip, parseKstDateTime } from '../js/recommendation.js';
import { BUS_ROUTES, KTX_ROUTES } from '../data/routes.js';

function near(v, lo, hi, message) {
  assert.ok(v >= lo && v <= hi, `${message}: ${v}`);
}

const noon = parseKstDateTime('2026-06-21', '12:30');
assert.ok(noon instanceof Date);
assert.equal(noon.toISOString(), '2026-06-21T03:30:00.000Z');
assert.equal(parseKstDateTime('2026-02-30', '12:00'), null);

const summer = solarPosition(noon, 37.5665, 126.9780);
near(summer.elevation, 73, 78, 'summer noon elevation');
near(summer.azimuth, 160, 200, 'summer noon azimuth');

const winter = solarPosition(parseKstDateTime('2026-12-21','16:30'), 37.5665, 126.9780);
near(winter.elevation, 3, 15, 'winter 16:30 elevation');
near(winter.azimuth, 220, 270, 'winter 16:30 azimuth');

const midnight = solarPosition(parseKstDateTime('2026-06-21','00:30'), 37.5665, 126.9780);
assert.ok(midnight.elevation < 0, '00:30 KST must be below horizon');

near(bearingDeg({lat:37.5,lon:127.0},{lat:37.6,lon:127.0}), 0, 5, 'north bearing');
assert.equal(angleDiffDeg(5,355),10);

const bus = BUS_ROUTES.find(r=>r.id==='bus-160');
const dep = parseKstDateTime('2026-09-17','16:30');
const fwd = analyzeTrip(bus, 4, 16, dep);
assert.ok(Number.isFinite(fwd.leftPct) && Number.isFinite(fwd.rightPct));
assert.ok(fwd.totalMinutes > 20);
assert.equal(fwd.from.name, '미아사거리역');
assert.equal(fwd.to.name, '여의도환승센터');
const rev = analyzeTrip(bus, 16, 4, dep);
assert.equal(rev.direction, 'reverse');
assert.equal(rev.from.name, '여의도환승센터');
assert.equal(rev.to.name, '미아사거리역');

const ktx = KTX_ROUTES.find(r=>r.id==='ktx-gyeongbu');
const ktxTrip = analyzeTrip(ktx, 0, ktx.stops.length-1, parseKstDateTime('2026-09-17','14:00'));
near(ktxTrip.totalMinutes, 120, 210, 'Seoul-Busan duration');
assert.ok(ktxTrip.segments.length >= 8);

const nightTrip = analyzeTrip(bus, 4, 6, parseKstDateTime('2026-12-21','23:00'));
assert.equal(Math.round(nightTrip.leftPct), 0);
assert.equal(Math.round(nightTrip.rightPct), 0);
assert.equal(nightTrip.confidence, 'night');

console.log('All tests passed');
console.log('summer sun', summer);
console.log('winter sun', winter);
console.log('bus 160 fwd', {left:fwd.leftPct,right:fwd.rightPct,min:fwd.totalMinutes,rec:fwd.recommendation});
console.log('bus 160 rev', {left:rev.leftPct,right:rev.rightPct,min:rev.totalMinutes,rec:rev.recommendation});
console.log('KTX Seoul-Busan', {left:ktxTrip.leftPct,right:ktxTrip.rightPct,min:ktxTrip.totalMinutes,rec:ktxTrip.recommendation});

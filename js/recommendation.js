import { solarPosition, cardinalDirection } from './sun.js';
import { haversineKm, bearingDeg, midpoint, angleDiffDeg } from './geometry.js';

function busSpeedKmh(date) {
  const local = new Date(date.getTime() + 9 * 3600000);
  const hour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const day = local.getUTCDay();
  const weekday = day >= 1 && day <= 5;
  if (weekday && ((hour >= 7 && hour < 9.5) || (hour >= 17 && hour < 19.5))) return 13.5;
  if (hour >= 22 || hour < 6) return 21;
  return 17.5;
}

function segmentMinutes(route, a, b, startDate) {
  const dist = haversineKm(a, b);
  if (route.mode === 'bus') {
    const speed = busSpeedKmh(startDate);
    return Math.max(1.1, dist / speed * 60 + 0.45);
  }
  const speed = route.avgKmh || 145;
  return Math.max(3, dist / speed * 60 + 1.2);
}

function clearSkyAltitudeWeight(elevationDeg) {
  if (elevationDeg <= 0) return 0;
  const s = Math.sin(elevationDeg * Math.PI / 180);
  return Math.pow(Math.max(0, s), 0.35);
}

function sideIncidence(sunAzimuth, elevation, vehicleBearing, side) {
  const normal = side === 'left' ? vehicleBearing - 90 : vehicleBearing + 90;
  const azDiff = angleDiffDeg(sunAzimuth, normal) * Math.PI / 180;
  const horizontalProjection = Math.cos(elevation * Math.PI / 180);
  return Math.max(0, Math.cos(azDiff)) * Math.max(0, horizontalProjection);
}

export function parseKstDateTime(dateText, timeText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !/^\d{2}:\d{2}$/.test(timeText)) return null;
  const [y, m, d] = dateText.split('-').map(Number);
  const [hh, mm] = timeText.split(':').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return null;
  const utc = Date.UTC(y, m - 1, d, hh - 9, mm, 0);
  const dt = new Date(utc);
  const roundTrip = new Date(dt.getTime() + 9 * 3600000);
  if (roundTrip.getUTCFullYear() !== y || roundTrip.getUTCMonth() !== m - 1 || roundTrip.getUTCDate() !== d) return null;
  return dt;
}

export function formatKstTime(date) {
  const kst = new Date(date.getTime() + 9 * 3600000);
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

export function analyzeTrip(route, fromIndex, toIndex, departure) {
  if (fromIndex === toIndex) throw new Error('출발지와 도착지가 같습니다.');
  const step = toIndex > fromIndex ? 1 : -1;
  const points = [];
  for (let i = fromIndex; i !== toIndex; i += step) {
    points.push([route.stops[i], route.stops[i + step]]);
  }

  let current = new Date(departure);
  let leftScore = 0;
  let rightScore = 0;
  let potentialScore = 0;
  let daylightMinutes = 0;
  let totalMinutes = 0;
  const segments = [];

  for (const [a, b] of points) {
    const mins = segmentMinutes(route, a, b, current);
    const midDate = new Date(current.getTime() + mins * 30000);
    const mid = midpoint(a, b);
    const bearing = bearingDeg(a, b);
    const sun = solarPosition(midDate, mid.lat, mid.lon);
    const altitudeWeight = clearSkyAltitudeWeight(sun.elevation);
    const lInc = sideIncidence(sun.azimuth, sun.elevation, bearing, 'left');
    const rInc = sideIncidence(sun.azimuth, sun.elevation, bearing, 'right');
    const potential = mins * altitudeWeight;
    const l = potential * lInc;
    const r = potential * rInc;

    leftScore += l;
    rightScore += r;
    potentialScore += potential;
    totalMinutes += mins;
    if (sun.elevation > 0) daylightMinutes += mins;

    let segmentRecommendation = '양쪽 비슷';
    if (sun.elevation <= 0) segmentRecommendation = '직사광 없음';
    else if (Math.abs(l - r) > potential * 0.06) segmentRecommendation = l < r ? '왼쪽' : '오른쪽';

    segments.push({
      from: a.name,
      to: b.name,
      minutes: mins,
      startTime: formatKstTime(current),
      endTime: formatKstTime(new Date(current.getTime() + mins * 60000)),
      bearing,
      sunAzimuth: sun.azimuth,
      sunElevation: sun.elevation,
      sunCardinal: cardinalDirection(sun.azimuth),
      left: l,
      right: r,
      potential,
      recommendation: segmentRecommendation
    });

    current = new Date(current.getTime() + mins * 60000);
  }

  const leftPct = potentialScore > 0 ? Math.min(100, leftScore / potentialScore * 100) : 0;
  const rightPct = potentialScore > 0 ? Math.min(100, rightScore / potentialScore * 100) : 0;
  const diff = Math.abs(leftPct - rightPct);
  let recommendation = 'either';
  if (potentialScore > 0.01 && diff >= 4) recommendation = leftPct < rightPct ? 'left' : 'right';

  const first = route.stops[fromIndex];
  const last = route.stops[toIndex];
  const departSun = solarPosition(departure, first.lat, first.lon);
  const arrivalSun = solarPosition(current, last.lat, last.lon);
  const confidence = potentialScore <= 0.01 ? 'night' : diff >= 28 ? 'high' : diff >= 12 ? 'medium' : 'low';

  return {
    route,
    direction: step > 0 ? 'forward' : 'reverse',
    from: first,
    to: last,
    departure,
    arrival: current,
    totalMinutes,
    daylightMinutes,
    leftPct,
    rightPct,
    recommendation,
    confidence,
    departSun,
    arrivalSun,
    segments
  };
}

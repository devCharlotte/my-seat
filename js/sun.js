const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const KST_OFFSET_HOURS = 9;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function localPartsAtOffset(date, timezoneHours) {
  const shifted = new Date(date.getTime() + timezoneHours * 3600000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds()
  };
}

function dayOfYearFromParts(year, month, day) {
  const start = Date.UTC(year, 0, 0);
  return Math.floor((Date.UTC(year, month, day) - start) / 86400000);
}

function normalize360(x) {
  return ((x % 360) + 360) % 360;
}

export function solarPosition(date, latDeg, lonDeg, timezoneHours = KST_OFFSET_HOURS) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error('Invalid date');
  if (!Number.isFinite(latDeg) || latDeg < -90 || latDeg > 90) throw new Error('Invalid latitude');
  if (!Number.isFinite(lonDeg) || lonDeg < -180 || lonDeg > 180) throw new Error('Invalid longitude');

  const p = localPartsAtOffset(date, timezoneHours);
  const lat = latDeg * RAD;
  const doy = dayOfYearFromParts(p.year, p.month, p.day);
  const days = isLeapYear(p.year) ? 366 : 365;
  const localHour = p.hour + p.minute / 60 + p.second / 3600;
  const gamma = (2 * Math.PI / days) * (doy - 1 + (localHour - 12) / 24);

  const eqTime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const timeOffset = eqTime + 4 * lonDeg - 60 * timezoneHours;
  const trueSolarMinutes = ((localHour * 60 + timeOffset) % 1440 + 1440) % 1440;
  let hourAngleDeg = trueSolarMinutes / 4 - 180;
  if (hourAngleDeg < -180) hourAngleDeg += 360;
  const hourAngle = hourAngleDeg * RAD;

  const cosZenith = Math.min(1, Math.max(-1,
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle)
  ));
  const zenith = Math.acos(cosZenith);
  const elevation = 90 - zenith * DEG;

  const azSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)
  ) * DEG;
  const azimuth = normalize360(azSouth + 180);

  return {
    azimuth,
    elevation,
    declination: decl * DEG,
    equationOfTimeMinutes: eqTime
  };
}

export function cardinalDirection(azimuth) {
  const dirs = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return dirs[Math.round(normalize360(azimuth) / 45) % 8];
}

export { normalize360, KST_OFFSET_HOURS };

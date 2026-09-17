const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EARTH_KM = 6371.0088;

export function haversineKm(a, b) {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

export function bearingDeg(a, b) {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * DEG) % 360 + 360) % 360;
}

export function midpoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
}

export function angleDiffDeg(a, b) {
  return ((a - b + 540) % 360) - 180;
}

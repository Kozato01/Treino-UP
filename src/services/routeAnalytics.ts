import type { RouteLocation } from './healthConnect';

export interface RouteStats {
  totalDistanceMeters: number;
  totalAscent: number;
  totalDescent: number;
  maxAltitude: number | null;
  minAltitude: number | null;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  durationSeconds: number;
}

export interface Split {
  km: number;
  durationSeconds: number;
  paceMinPerKm: number;
  startIndex: number;
  endIndex: number;
}

export interface KmMarker {
  km: number;
  lat: number;
  lng: number;
}

function haversine(a: RouteLocation, b: RouteLocation): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sLat1 = toRad(a.lat);
  const sLat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function computeRouteStats(route: RouteLocation[]): RouteStats {
  if (route.length < 2) {
    return {
      totalDistanceMeters: 0,
      totalAscent: 0,
      totalDescent: 0,
      maxAltitude: null,
      minAltitude: null,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      durationSeconds: 0,
    };
  }

  let totalDistance = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  let maxSpeedKmh = 0;
  let maxAltitude: number | null = null;
  let minAltitude: number | null = null;

  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];

    const d = haversine(prev, curr);
    totalDistance += d;

    const t1 = new Date(prev.timestamp).getTime();
    const t2 = new Date(curr.timestamp).getTime();
    const dtSec = (t2 - t1) / 1000;
    if (dtSec > 0) {
      const speedKmh = (d / 1000) / (dtSec / 3600);
      if (speedKmh < 60 && speedKmh > maxSpeedKmh) maxSpeedKmh = speedKmh;
    }

    if (prev.altitude != null && curr.altitude != null) {
      const dAlt = curr.altitude - prev.altitude;
      if (dAlt > 0) totalAscent += dAlt;
      else totalDescent += -dAlt;
    }

    if (curr.altitude != null) {
      if (maxAltitude == null || curr.altitude > maxAltitude) maxAltitude = curr.altitude;
      if (minAltitude == null || curr.altitude < minAltitude) minAltitude = curr.altitude;
    }
  }

  const tStart = new Date(route[0].timestamp).getTime();
  const tEnd = new Date(route[route.length - 1].timestamp).getTime();
  const durationSeconds = (tEnd - tStart) / 1000;
  const avgSpeedKmh =
    durationSeconds > 0 ? (totalDistance / 1000) / (durationSeconds / 3600) : 0;

  return {
    totalDistanceMeters: totalDistance,
    totalAscent: Math.round(totalAscent),
    totalDescent: Math.round(totalDescent),
    maxAltitude: maxAltitude != null ? Math.round(maxAltitude) : null,
    minAltitude: minAltitude != null ? Math.round(minAltitude) : null,
    avgSpeedKmh,
    maxSpeedKmh,
    durationSeconds,
  };
}

export function computeSplits(route: RouteLocation[]): Split[] {
  if (route.length < 2) return [];

  const splits: Split[] = [];
  let cumulativeDistance = 0;
  let lastKmIndex = 0;
  let lastKmTime = new Date(route[0].timestamp).getTime();
  let nextKmTarget = 1000;

  for (let i = 1; i < route.length; i++) {
    cumulativeDistance += haversine(route[i - 1], route[i]);

    while (cumulativeDistance >= nextKmTarget) {
      const tNow = new Date(route[i].timestamp).getTime();
      const durationSec = (tNow - lastKmTime) / 1000;
      const km = Math.round(nextKmTarget / 1000);
      const paceMinPerKm = durationSec / 60;
      splits.push({
        km,
        durationSeconds: durationSec,
        paceMinPerKm,
        startIndex: lastKmIndex,
        endIndex: i,
      });
      lastKmIndex = i;
      lastKmTime = tNow;
      nextKmTarget += 1000;
    }
  }

  return splits;
}

export function computeKmMarkers(route: RouteLocation[]): KmMarker[] {
  if (route.length < 2) return [];

  const markers: KmMarker[] = [];
  let cumulativeDistance = 0;
  let nextKmTarget = 1000;

  for (let i = 1; i < route.length; i++) {
    cumulativeDistance += haversine(route[i - 1], route[i]);
    while (cumulativeDistance >= nextKmTarget) {
      markers.push({
        km: Math.round(nextKmTarget / 1000),
        lat: route[i].lat,
        lng: route[i].lng,
      });
      nextKmTarget += 1000;
    }
  }

  return markers;
}

export function formatPace(paceMinPerKm: number): string {
  const min = Math.floor(paceMinPerKm);
  const sec = Math.round((paceMinPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Estimativa de calorias por MET (sem wearable), a partir da velocidade média.
// MET aproximado para corrida/caminhada; cal = MET * 3.5 * peso(kg) / 200 * min.
export function estimateCalories(
  distanceMeters: number,
  durationSeconds: number,
  weightKg: number
): number {
  if (durationSeconds <= 0 || weightKg <= 0 || distanceMeters <= 0) return 0;
  const speedKmh = (distanceMeters / 1000) / (durationSeconds / 3600);
  let met: number;
  if (speedKmh >= 16) met = 14.5;
  else if (speedKmh >= 12) met = 11.5;
  else if (speedKmh >= 9.7) met = 9.8;
  else if (speedKmh >= 8) met = 8.3;
  else if (speedKmh >= 6.4) met = 6.0;
  else if (speedKmh >= 5) met = 4.3;
  else met = 3.3; // caminhada leve
  return Math.round((met * 3.5 * weightKg) / 200 * (durationSeconds / 60));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

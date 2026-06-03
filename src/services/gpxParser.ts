import type { RouteLocation } from './healthConnect';

export interface ParsedGpx {
  name?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  route: RouteLocation[];
}

export function parseGpx(xml: string): ParsedGpx | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const errNode = doc.querySelector('parsererror');
    if (errNode) return null;

    const trackName = doc.querySelector('trk > name')?.textContent ?? undefined;
    const trackType = doc.querySelector('trk > type')?.textContent ?? undefined;

    const points: RouteLocation[] = [];
    const trkpts = doc.querySelectorAll('trkpt');
    trkpts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') ?? '');
      const lng = parseFloat(pt.getAttribute('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const eleEl = pt.querySelector('ele');
      const timeEl = pt.querySelector('time');
      const altitude = eleEl ? parseFloat(eleEl.textContent ?? '') : undefined;
      const timestamp = timeEl?.textContent ?? new Date().toISOString();
      points.push({
        lat,
        lng,
        altitude: Number.isNaN(altitude as number) ? undefined : altitude,
        timestamp,
      });
    });

    if (points.length === 0) return null;

    return {
      name: trackName,
      type: trackType,
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      route: points,
    };
  } catch {
    return null;
  }
}

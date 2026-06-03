// Captura de GPS ao vivo de alta precisão (foreground) para corrida/cardio.
// Independente de autoTracker.ts — não altera nenhuma API existente.
//
// Pipeline de precisão (o ganho real vem de rejeitar leituras ruins, não de
// suavização pesada — Android/iOS já suavizam no chip):
//  1. enableHighAccuracy + maximumAge:0 -> força o GPS, nunca cache.
//  2. Gate de acurácia -> descarta leituras com accuracy pior que ACCURACY_MAX.
//  3. Warm-up -> status 'searching'|'weak'|'good' enquanto o sinal estabiliza.
//  4. Rejeição de salto -> ignora "teleporte" (velocidade implícita absurda).
//  5. Distância mínima por passo -> não acumula tremor quando parado.
//  6. Velocidade do dispositivo (Doppler) quando válida; senão deriva.
//  7. Auto-pausa -> congela tempo/distância quando parado.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { RouteLocation } from './healthConnect';

// Plugin de background: mantém o GPS gravando com a tela apagada / app no fundo,
// via notificação persistente (foreground service no Android).
interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (
      position?: {
        latitude: number;
        longitude: number;
        accuracy: number;
        altitude: number | null;
        speed: number | null;
        time: number | null;
      },
      error?: { code?: string; message?: string }
    ) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export type GpsStatus = 'searching' | 'weak' | 'good';

export interface LiveStats {
  isTracking: boolean;
  isPaused: boolean;
  status: GpsStatus;
  accuracy: number | null; // metros (última leitura aceita)
  points: RouteLocation[];
  distanceM: number;
  movingSec: number; // tempo em movimento (exclui pausas)
  currentSpeed: number; // m/s
  avgSpeed: number; // m/s
  currentPaceMinKm: number; // min/km (0 se parado)
  startedAt: number | null;
}

// ---- Limiares ----
const ACCURACY_GOOD = 15; // m
const ACCURACY_MAX = 35; // m — pior acurácia aceita
const MIN_STEP_DISTANCE = 3; // m
const MAX_PLAUSIBLE_SPEED = 12; // m/s (~43 km/h)
const AUTO_PAUSE_SPEED = 0.4; // m/s
const AUTO_PAUSE_AFTER_MS = 8000;

function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

class LiveGps {
  private isTracking = false;
  private isPaused = false;
  private autoPaused = false;
  private webWatchId: string | null = null;
  private bgWatcherId: string | null = null;

  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  private points: RouteLocation[] = [];
  private startedAt: number | null = null;
  private status: GpsStatus = 'searching';
  private lastAccuracy: number | null = null;
  private currentSpeed = 0;
  private distanceM = 0;
  private lastMovementTs = 0;
  private lastPt: { lat: number; lng: number; ts: number } | null = null;

  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify() {
    this.listeners.forEach((l) => l());
  }

  /** Garante permissão de localização (dispara o prompt nativo se preciso). */
  async ensurePermissions(): Promise<boolean> {
    try {
      const st = await Geolocation.checkPermissions();
      if (st.location === 'granted' || st.coarseLocation === 'granted') return true;
      const req = await Geolocation.requestPermissions({ permissions: ['location'] });
      return req.location === 'granted' || req.coarseLocation === 'granted';
    } catch {
      return false;
    }
  }

  /** Pré-aquece o chip de GPS (reduz o tempo de "buscando sinal"). */
  async warmUp(): Promise<void> {
    try {
      await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
    } catch {
      /* sem sinal/permissão: a UI cuida do estado */
    }
  }

  async start(): Promise<void> {
    if (this.isTracking) return;
    this.points = [];
    this.startedAt = Date.now();
    this.isTracking = true;
    this.isPaused = false;
    this.autoPaused = false;
    this.status = 'searching';
    this.lastAccuracy = null;
    this.currentSpeed = 0;
    this.distanceM = 0;
    this.lastMovementTs = Date.now();
    this.lastPt = null;

    if (this.isNative()) {
      // Background real: notificação persistente, segue gravando com a tela
      // apagada / app no fundo. distanceFilter:0 — filtramos por conta própria.
      try {
        this.bgWatcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: 'Corrida em andamento',
            backgroundMessage: 'Gravando seu percurso por GPS',
            requestPermissions: true,
            stale: false,
            distanceFilter: 0,
          },
          (position, error) => {
            if (error || !position) return;
            this.ingest({
              lat: position.latitude,
              lng: position.longitude,
              accuracy: position.accuracy ?? 999,
              altitude: position.altitude ?? undefined,
              speed: position.speed ?? null,
              timestamp: position.time ?? Date.now(),
            });
          }
        );
      } catch (e) {
        console.error('liveGps: erro no background watcher', e);
      }
    } else {
      // Web: watchPosition padrão (foreground).
      try {
        this.webWatchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
          (position, err) => {
            if (err || !position) return;
            this.ingest({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy ?? 999,
              altitude: position.coords.altitude ?? undefined,
              speed: position.coords.speed ?? null,
              timestamp: position.timestamp ?? Date.now(),
            });
          }
        );
      } catch (e) {
        console.error('liveGps: erro ao iniciar watch', e);
      }
    }
    this.notify();
  }

  pause() {
    if (!this.isTracking) return;
    this.isPaused = true;
    this.notify();
  }
  resume() {
    if (!this.isTracking) return;
    this.isPaused = false;
    this.autoPaused = false;
    this.lastMovementTs = Date.now();
    this.notify();
  }

  async stop(): Promise<RouteLocation[]> {
    if (this.bgWatcherId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: this.bgWatcherId });
      } catch {}
      this.bgWatcherId = null;
    }
    if (this.webWatchId) {
      try {
        await Geolocation.clearWatch({ id: this.webWatchId });
      } catch {}
      this.webWatchId = null;
    }
    this.isTracking = false;
    this.isPaused = false;
    this.notify();
    return this.points;
  }

  private ingest(raw: {
    lat: number;
    lng: number;
    accuracy: number;
    altitude?: number;
    speed: number | null;
    timestamp: number;
  }): void {
    const { accuracy } = raw;
    const ts = raw.timestamp || Date.now();

    // Status de sinal sempre atualizado.
    this.lastAccuracy = accuracy;
    if (accuracy <= ACCURACY_GOOD) this.status = 'good';
    else if (accuracy <= ACCURACY_MAX) this.status = 'weak';
    else this.status = 'searching';

    // 2. Gate de acurácia.
    if (accuracy > ACCURACY_MAX) {
      this.notify();
      return;
    }

    const cur = { lat: raw.lat, lng: raw.lng };

    // Primeiro ponto válido (fim do warm-up).
    if (!this.lastPt) {
      this.lastPt = { ...cur, ts };
      this.pushPoint(cur.lat, cur.lng, raw.altitude, ts);
      this.notify();
      return;
    }

    const dt = (ts - this.lastPt.ts) / 1000;
    if (dt <= 0) {
      this.notify();
      return;
    }

    const stepDist = haversine(this.lastPt, cur);
    const derived = stepDist / dt;

    // 4. Rejeição de salto/teleporte.
    if (derived > MAX_PLAUSIBLE_SPEED) {
      this.notify();
      return;
    }

    // 6. Velocidade: prefere a do dispositivo quando válida.
    const speed =
      raw.speed != null && raw.speed >= 0 && raw.speed <= MAX_PLAUSIBLE_SPEED
        ? raw.speed
        : derived;
    this.currentSpeed = speed;

    // 7. Auto-pausa / detecção de movimento.
    if (speed >= AUTO_PAUSE_SPEED) {
      this.lastMovementTs = ts;
      if (this.autoPaused) {
        this.autoPaused = false;
        this.isPaused = false;
      }
    } else if (!this.isPaused && ts - this.lastMovementTs > AUTO_PAUSE_AFTER_MS) {
      this.autoPaused = true;
      this.isPaused = true;
    }

    this.lastPt = { ...cur, ts };

    if (this.isPaused) {
      this.notify();
      return;
    }

    // 5. Distância mínima por passo (filtra tremor residual).
    const tolerance = Math.max(MIN_STEP_DISTANCE, accuracy * 0.5);
    if (stepDist < tolerance) {
      this.notify();
      return;
    }

    this.distanceM += stepDist;
    this.pushPoint(cur.lat, cur.lng, raw.altitude, ts);
    this.notify();
  }

  private pushPoint(lat: number, lng: number, altitude: number | undefined, ts: number) {
    this.points.push({
      lat,
      lng,
      altitude,
      timestamp: new Date(ts).toISOString(),
    });
  }

  private getMovingSeconds(): number {
    if (this.points.length < 2) return 0;
    const first = new Date(this.points[0].timestamp).getTime();
    const last = new Date(this.points[this.points.length - 1].timestamp).getTime();
    return (last - first) / 1000;
  }

  getStats(): LiveStats {
    const movingSec = this.getMovingSeconds();
    const avgSpeed = movingSec > 0 ? this.distanceM / movingSec : 0;
    const speed = this.isPaused ? 0 : this.currentSpeed;
    return {
      isTracking: this.isTracking,
      isPaused: this.isPaused,
      status: this.status,
      accuracy: this.lastAccuracy,
      points: this.points,
      distanceM: this.distanceM,
      movingSec,
      currentSpeed: speed,
      avgSpeed,
      currentPaceMinKm: speed > 0.1 ? 1000 / speed / 60 : 0,
      startedAt: this.startedAt,
    };
  }
}

export const liveGps = new LiveGps();

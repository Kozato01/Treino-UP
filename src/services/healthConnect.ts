// Wrapper sobre @capgo/capacitor-health. Mantém a interface pública
// estável para o resto do app (SaudePage, SessaoAtivaPage, HealthDiagnostic).

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import type { RouteLocation } from '../types';

export type { RouteLocation };

interface HealthRoutePlugin {
  readExerciseRoute(options: { sessionId: string }): Promise<{
    route?: RouteLocation[];
    consentRequired?: boolean;
  }>;
  requestRoutePermission(): Promise<void>;
}

const HealthRoute = registerPlugin<HealthRoutePlugin>('HealthRoute');

const isWeb = () => Capacitor.getPlatform() === 'web';

export type HealthAvailability = 'Available' | 'NotInstalled' | 'NotSupported';

const READ_TYPES = [
  'steps',
  'heartRate',
  'restingHeartRate',
  'calories',       // ActiveCaloriesBurnedRecord
  'totalCalories',  // TotalCaloriesBurnedRecord — Samsung Health geralmente escreve aqui
  'weight',
  'bodyFat',
  'sleep',
  'distance',
  'height',
] as const;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysAgo(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

function iso(d: Date): string {
  return d.toISOString();
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function isAvailable(): Promise<HealthAvailability> {
  if (isWeb()) return 'Available';
  try {
    const res = await Health.isAvailable();
    // @capgo/capacitor-health retorna { available: boolean, reason?: string }
    if ((res as { available?: boolean }).available) return 'Available';
    const reason = String((res as { reason?: string }).reason ?? '');
    if (reason.toLowerCase().includes('install')) return 'NotInstalled';
    return 'NotSupported';
  } catch {
    return 'NotSupported';
  }
}

export async function hasPermissions(): Promise<boolean> {
  if (isWeb()) return true;
  try {
    const status = await Health.checkAuthorization({
      read: [...READ_TYPES],
      write: [],
    } as Parameters<typeof Health.checkAuthorization>[0]);
    const arr = (status as unknown as { readAuthorized?: unknown[] }).readAuthorized;
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (isWeb()) return true;
  try {
    const status = await Health.requestAuthorization({
      read: [...READ_TYPES],
      write: [],
    } as Parameters<typeof Health.requestAuthorization>[0]);
    const arr = (status as unknown as { readAuthorized?: unknown[] }).readAuthorized;
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

export async function openSettings(): Promise<void> {
  try {
    await Health.openHealthConnectSettings();
  } catch {
    // ignore
  }
}

export function openBluetoothSettings(): void {
  try {
    window.location.href =
      'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end';
  } catch {
    // ignore
  }
}

// ─────────────────────────── Leituras ───────────────────────────

async function aggregatedSum(
  dataType: string,
  start: Date,
  end: Date,
): Promise<number> {
  try {
    const res = await Health.queryAggregated({
      dataType,
      startDate: iso(start),
      endDate: iso(end),
      bucket: 'day',
      aggregation: 'sum',
    } as Parameters<typeof Health.queryAggregated>[0]);
    const samples = (res as { samples?: Array<{ value?: number }> }).samples ?? [];
    return samples.reduce((s, x) => s + (Number(x.value) || 0), 0);
  } catch {
    return 0;
  }
}

async function readSamples(
  dataType: string,
  start: Date,
  end: Date,
): Promise<Array<{ value: number; startDate: string }>> {
  try {
    const res = await Health.readSamples({
      dataType,
      startDate: iso(start),
      endDate: iso(end),
      limit: 1000,
    } as Parameters<typeof Health.readSamples>[0]);
    return ((res as { samples?: Array<{ value?: number; startDate?: string }> }).samples ?? []).map(
      (s) => ({ value: Number(s.value) || 0, startDate: String(s.startDate ?? '') }),
    );
  } catch {
    return [];
  }
}

export async function readTodaySteps(): Promise<number> {
  if (isWeb()) return 8423;
  return aggregatedSum('steps', startOfToday(), endOfToday());
}

export async function readStepsForDay(date: Date): Promise<number> {
  if (isWeb()) {
    // mock: variação pseudo-aleatória estável por dia (4000-12000)
    const seed = date.getDate() + date.getMonth() * 31;
    return 4000 + ((seed * 1331) % 8000);
  }
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return aggregatedSum('steps', start, end);
}

export type HeartRateStats = {
  avg: number | null;
  max: number | null;
  samples: number;
};

export async function readHeartRateForPeriod(
  start: Date | number,
  end: Date | number,
): Promise<HeartRateStats> {
  if (isWeb()) return { avg: 132, max: 168, samples: 240 };
  const s = typeof start === 'number' ? new Date(start) : start;
  const e = typeof end === 'number' ? new Date(end) : end;
  const samples = await readSamples('heartRate', s, e);
  if (samples.length === 0) return { avg: null, max: null, samples: 0 };
  let sum = 0;
  let max = 0;
  for (const x of samples) {
    sum += x.value;
    if (x.value > max) max = x.value;
  }
  return { avg: Math.round(sum / samples.length), max: Math.round(max), samples: samples.length };
}

export async function readTodayRestingHeartRate(): Promise<number | null> {
  if (isWeb()) return 62;
  try {
    const samples = await readSamples('restingHeartRate', startOfToday(), endOfToday());
    if (samples.length === 0) return null;
    const last = samples[samples.length - 1];
    return Math.round(last.value);
  } catch {
    return null;
  }
}

async function caloriesSumWithFallback(start: Date, end: Date): Promise<number> {
  // Samsung Health, Mi Fit e outros muitas vezes escrevem só TotalCaloriesBurned.
  // Tentamos active primeiro; se zerado, caímos para total.
  const active = await aggregatedSum('calories', start, end);
  if (active > 0) return active;
  return aggregatedSum('totalCalories', start, end);
}

export async function readTodayActiveCalories(): Promise<number> {
  if (isWeb()) return 412;
  return Math.round(await caloriesSumWithFallback(startOfToday(), endOfToday()));
}

export async function readTodayTotalCalories(): Promise<number> {
  if (isWeb()) return 1856;
  return Math.round(await aggregatedSum('totalCalories', startOfToday(), endOfToday()));
}

export async function readTodayHeartRateStats(): Promise<HeartRateStats> {
  if (isWeb()) return { avg: 78, max: 142, samples: 1200 };
  return readHeartRateForPeriod(startOfToday(), endOfToday());
}

export async function readActiveCaloriesForPeriod(
  start: Date | number,
  end: Date | number,
): Promise<number> {
  if (isWeb()) return 285;
  const s = typeof start === 'number' ? new Date(start) : start;
  const e = typeof end === 'number' ? new Date(end) : end;
  return Math.round(await caloriesSumWithFallback(s, e));
}

export type DailySnapshot = { date: string; steps: number };
export type DailyCaloriesSnapshot = { date: string; calories: number };

export async function readLastNDaysSteps(n: number): Promise<DailySnapshot[]> {
  const out: DailySnapshot[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = daysAgo(i);
    const steps = await readStepsForDay(day);
    out.push({ date: isoDay(day), steps });
  }
  return out;
}

export async function readCaloriesForDay(date: Date): Promise<number> {
  if (isWeb()) {
    const seed = date.getDate() + date.getMonth() * 31;
    return 200 + ((seed * 271) % 400);
  }
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return Math.round(await caloriesSumWithFallback(start, end));
}

export async function readLastNDaysCalories(n: number): Promise<DailyCaloriesSnapshot[]> {
  const out: DailyCaloriesSnapshot[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = daysAgo(i);
    const calories = await readCaloriesForDay(day);
    out.push({ date: isoDay(day), calories });
  }
  return out;
}

export async function readTodayBodyFat(): Promise<number | null> {
  if (isWeb()) return 17.8;
  try {
    const samples = await readSamples('bodyFat', startOfToday(), endOfToday());
    if (samples.length === 0) return null;
    const last = samples[samples.length - 1];
    return Math.round(last.value * 10) / 10;
  } catch {
    return null;
  }
}

export async function readTodayWeight(): Promise<number | null> {
  if (isWeb()) return 75.2;
  try {
    const samples = await readSamples('weight', startOfToday(), endOfToday());
    if (samples.length === 0) return null;
    const last = samples[samples.length - 1];
    return Math.round(last.value * 10) / 10;
  } catch {
    return null;
  }
}

// O @capgo/capacitor-health não expõe metadata.dataOrigin nas amostras
// de forma estável entre plataformas. Retornamos sets vazios — a UI
// trata como "fontes não detectadas" e mostra o card de troubleshooting.
export type DataSources = {
  steps: Set<string>;
  heartRate: Set<string>;
  calories: Set<string>;
};

export async function readDataSources(): Promise<DataSources> {
  return { steps: new Set(), heartRate: new Set(), calories: new Set() };
}

// ─────────────────── Distance (metros → km) ───────────────────

export async function readTodayDistance(): Promise<number> {
  if (isWeb()) return 5234;
  return Math.round(await aggregatedSum('distance', startOfToday(), endOfToday()));
}

export async function readDistanceForDay(date: Date): Promise<number> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return Math.round(await aggregatedSum('distance', start, end));
}

// ─────────────────── Height (instantânea, latest) ───────────────────

export async function readLatestHeight(): Promise<number | null> {
  if (isWeb()) return 1.78;
  try {
    // Pega últimos 365 dias — altura muda pouco
    const start = new Date();
    start.setDate(start.getDate() - 365);
    const samples = await readSamples('height', start, new Date());
    if (samples.length === 0) return null;
    const last = samples[samples.length - 1];
    return Math.round(last.value * 100) / 100; // metros
  } catch {
    return null;
  }
}

// ─────────────────── Sleep ───────────────────

export type SleepData = {
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  startDate: string | null;
  endDate: string | null;
};

export async function readLastNightSleep(): Promise<SleepData | null> {
  if (isWeb()) {
    return {
      totalMinutes: 432,
      deepMinutes: 92,
      remMinutes: 108,
      lightMinutes: 232,
      awakeMinutes: 14,
      startDate: new Date(Date.now() - 9 * 3600_000).toISOString(),
      endDate: new Date(Date.now() - 1 * 3600_000).toISOString(),
    };
  }
  try {
    // Janela: ontem 18h → hoje 12h (cobre noite completa)
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    start.setHours(18, 0, 0, 0);

    const res = await Health.readSamples({
      dataType: 'sleep',
      startDate: iso(start),
      endDate: iso(end),
      limit: 200,
    } as Parameters<typeof Health.readSamples>[0]);

    const samples =
      (res as { samples?: Array<{ startDate?: string; endDate?: string; sleepState?: string }> })
        .samples ?? [];
    if (samples.length === 0) return null;

    let deepMs = 0;
    let remMs = 0;
    let lightMs = 0;
    let awakeMs = 0;
    let minStart: number | null = null;
    let maxEnd: number | null = null;

    for (const s of samples) {
      const sStart = s.startDate ? new Date(s.startDate).getTime() : null;
      const sEnd = s.endDate ? new Date(s.endDate).getTime() : null;
      if (sStart == null || sEnd == null) continue;
      const dur = sEnd - sStart;
      switch (s.sleepState) {
        case 'deep':
          deepMs += dur;
          break;
        case 'rem':
          remMs += dur;
          break;
        case 'light':
        case 'asleep':
        case 'inBed':
          lightMs += dur;
          break;
        case 'awake':
          awakeMs += dur;
          break;
      }
      if (minStart == null || sStart < minStart) minStart = sStart;
      if (maxEnd == null || sEnd > maxEnd) maxEnd = sEnd;
    }

    const totalMs = deepMs + remMs + lightMs;
    return {
      totalMinutes: Math.round(totalMs / 60000),
      deepMinutes: Math.round(deepMs / 60000),
      remMinutes: Math.round(remMs / 60000),
      lightMinutes: Math.round(lightMs / 60000),
      awakeMinutes: Math.round(awakeMs / 60000),
      startDate: minStart != null ? new Date(minStart).toISOString() : null,
      endDate: maxEnd != null ? new Date(maxEnd).toISOString() : null,
    };
  } catch {
    return null;
  }
}

// ─────────────────── Workouts (ExerciseSession) ───────────────────

export type ExternalWorkout = {
  type: string;
  durationMinutes: number;
  kcal: number | null;
  distanceMeters: number | null;
  startDate: string;
  endDate: string;
  sourceName: string | null;
  platformId?: string;
  route?: RouteLocation[] | null;
};

export async function readWorkoutsForPeriod(
  start: Date,
  end: Date,
): Promise<ExternalWorkout[]> {
  if (isWeb()) {
    const now = Date.now();
    const samples: ExternalWorkout[] = [
      { type: 'running', durationMinutes: 32, kcal: 312, distanceMeters: 5200,
        startDate: new Date(now - 1 * 86_400_000).toISOString(),
        endDate: new Date(now - 1 * 86_400_000 + 32 * 60_000).toISOString(),
        sourceName: 'Strava',
        platformId: 'route-001' },
      { type: 'cycling', durationMinutes: 48, kcal: 480, distanceMeters: 16000,
        startDate: new Date(now - 3 * 86_400_000).toISOString(),
        endDate: new Date(now - 3 * 86_400_000 + 48 * 60_000).toISOString(),
        sourceName: 'Garmin',
        platformId: 'route-002' },
      { type: 'walking', durationMinutes: 22, kcal: 95, distanceMeters: 1800,
        startDate: new Date(now - 4 * 86_400_000).toISOString(),
        endDate: new Date(now - 4 * 86_400_000 + 22 * 60_000).toISOString(),
        sourceName: 'Samsung Health',
        platformId: 'route-003' },
      { type: 'hiit', durationMinutes: 18, kcal: 210, distanceMeters: null,
        startDate: new Date(now - 6 * 86_400_000).toISOString(),
        endDate: new Date(now - 6 * 86_400_000 + 18 * 60_000).toISOString(),
        sourceName: 'Samsung Health' },
    ];
    return samples.filter((w) => {
      const t = new Date(w.startDate).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }
  try {
    const res = await Health.queryWorkouts({
      startDate: iso(start),
      endDate: iso(end),
      limit: 100,
    } as Parameters<typeof Health.queryWorkouts>[0]);
    const workouts =
      (res as {
        workouts?: Array<{
          workoutType?: string;
          duration?: number;
          totalEnergyBurned?: number;
          totalDistance?: number;
          startDate?: string;
          endDate?: string;
          sourceName?: string;
          platformId?: string;
        }>;
      }).workouts ?? [];
    return workouts.map((w) => ({
      type: String(w.workoutType ?? 'other'),
      durationMinutes: Math.round(Number(w.duration ?? 0) / 60),
      kcal: w.totalEnergyBurned != null ? Math.round(w.totalEnergyBurned) : null,
      distanceMeters: w.totalDistance != null ? Math.round(w.totalDistance) : null,
      startDate: String(w.startDate ?? ''),
      endDate: String(w.endDate ?? ''),
      sourceName: w.sourceName ?? null,
      platformId: w.platformId ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function readLastNDaysWorkouts(n: number): Promise<ExternalWorkout[]> {
  const end = endOfToday();
  const start = daysAgo(n - 1);
  return readWorkoutsForPeriod(start, end);
}

// ─────────────────── Exercise Route (GPS) ───────────────────

function generateMockRoute(sessionId: string, distance: number): RouteLocation[] {
  // Gera rota fake baseada no sessionId para consistência
  const points: RouteLocation[] = [];
  const baseTime = new Date(Date.now() - 1 * 86_400_000).getTime();
  const seed = sessionId.charCodeAt(6) || 1;

  let lat = -23.550520 + (seed % 100) * 0.001; // São Paulo region
  let lng = -46.633308 + (seed % 100) * 0.001;

  const numPoints = Math.max(20, Math.floor(distance / 100));
  const timeStep = (32 * 60 * 1000) / numPoints; // 32 min total spread

  for (let i = 0; i < numPoints; i++) {
    lat += (Math.random() - 0.5) * 0.0008;
    lng += (Math.random() - 0.5) * 0.0008;
    const altitude = 750 + Math.random() * 50;

    points.push({
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
      altitude: Math.round(altitude * 10) / 10,
      timestamp: new Date(baseTime + i * timeStep).toISOString(),
    });
  }

  return points;
}

export async function requestRoutePermissionNative(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false;
  try {
    const plugin = HealthRoute as unknown as {
      requestRoutePermission?: () => Promise<{ ok: boolean }>;
    };
    if (!plugin.requestRoutePermission) return false;
    const res = await plugin.requestRoutePermission();
    return !!res?.ok;
  } catch (e) {
    console.warn('requestRoutePermissionNative error:', e);
    return false;
  }
}

export async function getGrantedHealthPermissions(): Promise<{
  permissions: string[];
  hasRoutes: boolean;
}> {
  if (Capacitor.getPlatform() !== 'android') {
    return { permissions: [], hasRoutes: false };
  }
  try {
    const plugin = HealthRoute as unknown as {
      getGrantedPermissions?: () => Promise<{ permissions: string[]; hasRoutes: boolean }>;
    };
    if (!plugin.getGrantedPermissions) return { permissions: [], hasRoutes: false };
    return await plugin.getGrantedPermissions();
  } catch (e) {
    console.warn('getGrantedHealthPermissions error:', e);
    return { permissions: [], hasRoutes: false };
  }
}

export type ExerciseRouteResult =
  | { status: 'ok'; route: RouteLocation[] }
  | { status: 'empty' }
  | { status: 'consent_required' }
  | { status: 'timeout' }
  | { status: 'error'; message: string }
  | { status: 'unsupported' };

export async function readExerciseRouteDetailed(sessionId: string): Promise<ExerciseRouteResult> {
  if (isWeb()) {
    if (sessionId === 'route-001') return { status: 'ok', route: generateMockRoute(sessionId, 5200) };
    if (sessionId === 'route-002') return { status: 'ok', route: generateMockRoute(sessionId, 16000) };
    if (sessionId === 'route-003') return { status: 'ok', route: generateMockRoute(sessionId, 1800) };
    return { status: 'empty' };
  }
  if (Capacitor.getPlatform() === 'ios') {
    return { status: 'unsupported' };
  }

  const timeoutPromise = new Promise<{ status: 'timeout' }>((resolve) => {
    setTimeout(() => resolve({ status: 'timeout' }), 5000);
  });

  try {
    const res = await Promise.race([
      HealthRoute.readExerciseRoute({ sessionId }).then((r) => ({ kind: 'data', value: r } as const)),
      timeoutPromise,
    ]);
    if ('status' in res && res.status === 'timeout') return { status: 'timeout' };
    const value = (res as { kind: 'data'; value: unknown }).value as Record<string, unknown>;
    if (value?.consentRequired) return { status: 'consent_required' };
    const route = value?.route;
    if (Array.isArray(route) && route.length > 0) return { status: 'ok', route: route as RouteLocation[] };
    if (Array.isArray(route)) return { status: 'empty' };
    if (typeof value?.error === 'string') return { status: 'error', message: value.error };
    return { status: 'empty' };
  } catch (e) {
    return { status: 'error', message: (e as Error)?.message ?? 'unknown' };
  }
}

export async function readExerciseRoute(sessionId: string): Promise<RouteLocation[] | null> {
  if (isWeb()) {
    // Mock data para visualizar no dev
    if (sessionId === 'route-001') {
      return generateMockRoute(sessionId, 5200);
    } else if (sessionId === 'route-002') {
      return generateMockRoute(sessionId, 16000);
    } else if (sessionId === 'route-003') {
      return generateMockRoute(sessionId, 1800);
    }
    return null;
  }
  if (Capacitor.getPlatform() === 'ios') {
    return null;
  }

  // Timeout de 5 segundos para evitar travamento
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn('Route reading timeout - plugin not responding');
      resolve(null);
    }, 5000);
  });

  try {
    const res = await Promise.race([
      HealthRoute.readExerciseRoute({ sessionId }),
      timeoutPromise,
    ]);

    if (!res) return null;

    if ((res as any).consentRequired) {
      console.log('User needs to consent to share route data');
      return null;
    }

    if ((res as any).route && Array.isArray((res as any).route)) {
      return (res as any).route;
    }

    return null;
  } catch (e) {
    console.error('Failed to read exercise route:', e);
    return null; // Fallback silencioso
  }
}

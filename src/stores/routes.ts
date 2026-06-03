import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RouteLocation } from '../services/healthConnect';

export interface StoredRoute {
  id: string;
  source: 'gpx_import' | 'live_tracking' | 'health_connect';
  platformId?: string;
  name?: string;
  startTime: string;
  endTime: string;
  route: RouteLocation[];
  importedAt: string;
}

interface RoutesState {
  routes: StoredRoute[];
  addRoute: (route: Omit<StoredRoute, 'id' | 'importedAt'>) => StoredRoute;
  linkToWorkout: (routeId: string, platformId: string) => void;
  removeRoute: (id: string) => void;
  findByPlatformId: (platformId: string) => StoredRoute | undefined;
  findByTimeRange: (startTime: string, endTime: string, toleranceMinutes?: number) => StoredRoute | undefined;
}

export const useRoutes = create<RoutesState>()(
  persist(
    (set, get) => ({
      routes: [],
      addRoute: (data) => {
        const route: StoredRoute = {
          ...data,
          id: `${data.source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          importedAt: new Date().toISOString(),
        };
        set((state) => ({ routes: [route, ...state.routes] }));
        return route;
      },
      linkToWorkout: (routeId, platformId) => {
        set((state) => ({
          routes: state.routes.map((r) => (r.id === routeId ? { ...r, platformId } : r)),
        }));
      },
      removeRoute: (id) => {
        set((state) => ({ routes: state.routes.filter((r) => r.id !== id) }));
      },
      findByPlatformId: (platformId) => get().routes.find((r) => r.platformId === platformId),
      findByTimeRange: (startTime, endTime, toleranceMinutes = 30) => {
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const tol = toleranceMinutes * 60_000;
        return get().routes.find((r) => {
          const rStart = new Date(r.startTime).getTime();
          const rEnd = new Date(r.endTime).getTime();
          return Math.abs(rStart - start) < tol && Math.abs(rEnd - end) < tol;
        });
      },
    }),
    { name: 'academia-routes' }
  )
);

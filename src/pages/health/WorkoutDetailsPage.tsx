import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiHeartPulse,
  mdiFire,
  mdiRun,
  mdiMapMarkerDistance,
  mdiArrowUpBold,
  mdiArrowDownBold,
  mdiSpeedometer,
  mdiTimerOutline,
} from '@mdi/js';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  readExerciseRoute,
  readHeartRateForPeriod,
  readActiveCaloriesForPeriod,
  readLastNDaysWorkouts,
  type ExternalWorkout,
  type HeartRateStats,
  type RouteLocation,
} from '../../services/healthConnect';
import { parseGpx } from '../../services/gpxParser';
import { useRoutes } from '../../stores/routes';
import { mdiUpload } from '@mdi/js';
import {
  computeRouteStats,
  computeSplits,
  computeKmMarkers,
  formatPace,
  formatDuration,
} from '../../services/routeAnalytics';
import './SaudePage.css';

function Kpi({
  icon,
  tint,
  value,
  label,
}: {
  icon: string;
  tint: string;
  value: string | number | undefined;
  label: string;
}) {
  const hasValue = value != null && value !== '' && value !== 0;
  return (
    <div className="sd-kpi">
      <Icon path={icon} size={0.9} color={tint} />
      <span className="sd-kpi__value">
        {hasValue ? value : <span className="sd-kpi__nd">N/D</span>}
      </span>
      <span className="sd-kpi__label">{label}</span>
    </div>
  );
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [bounds, map]);
  return null;
}

function makeKmIcon(km: number) {
  return L.divIcon({
    className: 'route-km-marker',
    html: `<div style="
      background: var(--neon-green, #C6FF4A);
      color: #0A0B0F;
      font-weight: 700;
      font-size: 11px;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #0A0B0F;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    ">${km}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function WorkoutDetailsPage() {
  const { platformId } = useParams<{ platformId: string }>();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<ExternalWorkout | null>(null);
  const [route, setRoute] = useState<RouteLocation[] | null>(null);
  const [routeSource, setRouteSource] = useState<'health_connect' | 'gpx_import' | 'live_tracking' | null>(null);
  const [hrData, setHrData] = useState<HeartRateStats | null>(null);
  const [calData, setCalData] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const storedRoutes = useRoutes((s) => s.routes);
  const addStoredRoute = useRoutes((s) => s.addRoute);
  const linkRoute = useRoutes((s) => s.linkToWorkout);
  const findByPlatformId = useRoutes((s) => s.findByPlatformId);
  const findByTimeRange = useRoutes((s) => s.findByTimeRange);

  const start = useMemo(
    () => (workout ? new Date(workout.startDate) : new Date()),
    [workout?.startDate]
  );
  const end = useMemo(
    () => (workout ? new Date(workout.endDate) : new Date()),
    [workout?.endDate]
  );
  const pace = useMemo(
    () =>
      workout && workout.distanceMeters != null && workout.durationMinutes > 0
        ? workout.durationMinutes / (workout.distanceMeters / 1000)
        : null,
    [workout?.distanceMeters, workout?.durationMinutes]
  );

  const routeStats = useMemo(() => (route ? computeRouteStats(route) : null), [route]);
  const splits = useMemo(() => (route ? computeSplits(route) : []), [route]);
  const kmMarkers = useMemo(() => (route ? computeKmMarkers(route) : []), [route]);
  const routeBounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!route || route.length < 2) return null;
    return route.map((p) => [p.lat, p.lng]);
  }, [route]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workouts = await readLastNDaysWorkouts(30);
        const found = workouts.find((w) => w.platformId === platformId) ?? null;
        setWorkout(found);

        if (!found) {
          setLoading(false);
          return;
        }

        const wStart = new Date(found.startDate);
        const wEnd = new Date(found.endDate);

        const [routeResult, hrResult, calResult] = await Promise.all([
          readExerciseRoute(platformId || ''),
          readHeartRateForPeriod(wStart, wEnd),
          readActiveCaloriesForPeriod(wStart, wEnd),
        ]);

        if (routeResult && routeResult.length > 0) {
          setRoute(routeResult);
          setRouteSource('health_connect');
        } else {
          const linked = findByPlatformId(platformId || '');
          const matched = linked ?? findByTimeRange(found.startDate, found.endDate);
          if (matched) {
            setRoute(matched.route);
            setRouteSource(matched.source);
            if (!matched.platformId && platformId) linkRoute(matched.id, platformId);
          }
        }

        setHrData(hrResult.samples > 0 ? hrResult : null);
        setCalData(calResult > 0 ? calResult : null);
      } catch (err) {
        console.error('Failed to fetch workout details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [platformId, storedRoutes.length]);

  const handleImportGpx = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseGpx(text);
      if (!parsed) {
        setImportError('Arquivo GPX inválido ou vazio.');
        return;
      }
      const stored = addStoredRoute({
        source: 'gpx_import',
        platformId,
        name: parsed.name ?? file.name,
        startTime: parsed.startTime ?? new Date().toISOString(),
        endTime: parsed.endTime ?? new Date().toISOString(),
        route: parsed.route,
      });
      setRoute(stored.route);
      setRouteSource('gpx_import');
    } catch (e) {
      setImportError(`Erro ao importar: ${(e as Error).message}`);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/atividades" />
            </IonButtons>
            <IonTitle>Carregando...</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}>
            <IonSpinner name="dots" color="primary" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!workout) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/atividades" />
            </IonButtons>
            <IonTitle>Atividade não encontrada</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="sd-wrap">
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-mute)', margin: 0 }}>
                Esta atividade não está disponível.
              </p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Maior split (mais lento)
  const maxSplit = splits.length > 0 ? Math.max(...splits.map((s) => s.paceMinPerKm)) : 0;
  const minSplit = splits.length > 0 ? Math.min(...splits.map((s) => s.paceMinPerKm)) : 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/atividades" />
          </IonButtons>
          <IonTitle style={{ textTransform: 'capitalize' }}>{workout.type}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          <div className="card sd-how">
            <span className="section-label" style={{ margin: 0 }}>QUANDO</span>
            <p style={{ margin: '8px 0 0', color: 'var(--text)' }}>
              {start.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-mute)', fontSize: 13 }}>
              {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} →{' '}
              {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <span className="section-label">MÉTRICAS BÁSICAS</span>
          <div className="sd-kpi-row">
            <Kpi
              icon={mdiRun}
              tint="var(--neon-green)"
              value={`${workout.durationMinutes}min`}
              label="Duração"
            />
            {workout.kcal != null && (
              <Kpi
                icon={mdiFire}
                tint="var(--neon-orange)"
                value={workout.kcal}
                label="Kcal"
              />
            )}
            {workout.distanceMeters != null && (
              <Kpi
                icon={mdiMapMarkerDistance}
                tint="var(--neon-cyan)"
                value={`${(workout.distanceMeters / 1000).toFixed(2)} km`}
                label="Distância"
              />
            )}
          </div>

          {pace != null && (
            <div className="sd-kpi-row">
              <Kpi
                icon={mdiRun}
                tint="var(--neon-pink)"
                value={`${pace.toFixed(2)} min/km`}
                label="Pace médio"
              />
              {workout.kcal != null && workout.durationMinutes > 0 && (
                <Kpi
                  icon={mdiFire}
                  tint="var(--neon-yellow)"
                  value={`${(workout.kcal / workout.durationMinutes).toFixed(1)} kcal/min`}
                  label="Intensidade"
                />
              )}
            </div>
          )}

          {hrData && (
            <>
              <span className="section-label">FREQUÊNCIA CARDÍACA</span>
              <div className="sd-kpi-row">
                <Kpi
                  icon={mdiHeartPulse}
                  tint="var(--neon-pink)"
                  value={hrData.avg != null ? Math.round(hrData.avg) : 'N/D'}
                  label="FC média"
                />
                <Kpi
                  icon={mdiHeartPulse}
                  tint="#FF3B3B"
                  value={hrData.max != null ? Math.round(hrData.max) : 'N/D'}
                  label="FC máxima"
                />
                {calData != null && (
                  <Kpi
                    icon={mdiFire}
                    tint="var(--neon-yellow)"
                    value={calData}
                    label="Kcal período"
                  />
                )}
              </div>
            </>
          )}

          {route && route.length > 0 && routeBounds && (
            <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
              <span className="section-label" style={{ margin: '0 0 12px' }}>ROTA GPS</span>
              <MapContainer
                center={[route[0].lat, route[0].lng]}
                zoom={14}
                style={{
                  height: '300px',
                  width: '100%',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <FitBounds bounds={routeBounds} />
                <Polyline
                  positions={route.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: '#C6FF4A', weight: 4, opacity: 0.85 }}
                />
                <Marker
                  position={[route[0].lat, route[0].lng]}
                  icon={L.divIcon({
                    className: 'route-start-marker',
                    html: `<div style="
                      background: #4AE3FF;
                      color: #0A0B0F;
                      font-weight: 700;
                      font-size: 10px;
                      border-radius: 50%;
                      width: 28px;
                      height: 28px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 2px solid #0A0B0F;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                    ">A</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  })}>
                  <Popup>Início</Popup>
                </Marker>
                <Marker
                  position={[route[route.length - 1].lat, route[route.length - 1].lng]}
                  icon={L.divIcon({
                    className: 'route-end-marker',
                    html: `<div style="
                      background: #FF3B3B;
                      color: #fff;
                      font-weight: 700;
                      font-size: 10px;
                      border-radius: 50%;
                      width: 28px;
                      height: 28px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 2px solid #0A0B0F;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                    ">B</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  })}>
                  <Popup>Fim</Popup>
                </Marker>
                {kmMarkers.map((m) => (
                  <Marker
                    key={`km-${m.km}`}
                    position={[m.lat, m.lng]}
                    icon={makeKmIcon(m.km)}>
                    <Popup>Km {m.km}</Popup>
                  </Marker>
                ))}
              </MapContainer>
              <p style={{ margin: 0, color: 'var(--text-mute)', fontSize: 12 }}>
                {route.length} pontos GPS · {kmMarkers.length > 0 && `${kmMarkers.length} marcador${kmMarkers.length > 1 ? 'es' : ''} de Km · `}
                <span style={{ color: 'var(--neon-cyan)' }}>A</span> início ·{' '}
                <span style={{ color: '#FF3B3B' }}>B</span> fim
              </p>
            </div>
          )}

          {routeStats && route && route.length > 0 && (
            <>
              <span className="section-label">ESTATÍSTICAS DA ROTA</span>
              <div className="sd-kpi-row">
                <Kpi
                  icon={mdiArrowUpBold}
                  tint="var(--neon-green)"
                  value={`${routeStats.totalAscent}m`}
                  label="Subida"
                />
                <Kpi
                  icon={mdiArrowDownBold}
                  tint="var(--neon-cyan)"
                  value={`${routeStats.totalDescent}m`}
                  label="Descida"
                />
                {routeStats.maxAltitude != null && (
                  <Kpi
                    icon={mdiArrowUpBold}
                    tint="var(--neon-yellow)"
                    value={`${routeStats.maxAltitude}m`}
                    label="Alt. máx"
                  />
                )}
              </div>
              <div className="sd-kpi-row">
                <Kpi
                  icon={mdiSpeedometer}
                  tint="var(--neon-orange)"
                  value={`${routeStats.avgSpeedKmh.toFixed(1)} km/h`}
                  label="Vel. média"
                />
                <Kpi
                  icon={mdiSpeedometer}
                  tint="var(--neon-pink)"
                  value={`${routeStats.maxSpeedKmh.toFixed(1)} km/h`}
                  label="Vel. máx"
                />
                <Kpi
                  icon={mdiTimerOutline}
                  tint="var(--neon-cyan)"
                  value={formatDuration(routeStats.durationSeconds)}
                  label="Tempo"
                />
              </div>
            </>
          )}

          {splits.length > 0 && (
            <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
              <span className="section-label" style={{ margin: '0 0 12px' }}>SPLITS POR KM</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {splits.map((s) => {
                  const isFastest = s.paceMinPerKm === minSplit;
                  const isSlowest = s.paceMinPerKm === maxSplit && splits.length > 1;
                  const range = maxSplit - minSplit;
                  const widthPct = range > 0
                    ? 30 + ((s.paceMinPerKm - minSplit) / range) * 60
                    : 60;

                  return (
                    <div
                      key={s.km}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 6,
                      }}>
                      <span
                        style={{
                          minWidth: 36,
                          fontWeight: 700,
                          color: 'var(--text)',
                          fontSize: 13,
                        }}>
                        Km {s.km}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: 'var(--bg-surface-2)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}>
                        <div
                          style={{
                            width: `${widthPct}%`,
                            height: '100%',
                            background: isFastest
                              ? 'var(--neon-green)'
                              : isSlowest
                                ? 'var(--neon-pink)'
                                : 'var(--neon-cyan)',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          minWidth: 60,
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: 13,
                          color: isFastest
                            ? 'var(--neon-green)'
                            : isSlowest
                              ? 'var(--neon-pink)'
                              : 'var(--text)',
                          fontWeight: 600,
                        }}>
                        {formatPace(s.paceMinPerKm)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-mute)' }}>
                <span style={{ color: 'var(--neon-green)' }}>●</span> mais rápido ·{' '}
                <span style={{ color: 'var(--neon-pink)' }}>●</span> mais lento · pace em min/km
              </p>
            </div>
          )}

          {!route && !loading && (
            <div className="card" style={{ padding: '12px', marginBottom: '16px', backgroundColor: 'var(--bg-surface-2)' }}>
              <span className="section-label" style={{ margin: '0 0 8px' }}>ROTA GPS</span>
              <p style={{ margin: 0, color: 'var(--text-mute)', fontSize: 13 }}>
                Sem rota GPS no Health Connect. Você pode importar um arquivo .gpx exportado do Samsung Health, Strava, Garmin, etc.
              </p>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  background: 'var(--neon-cyan)',
                  color: '#0A0B0F',
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                <Icon path={mdiUpload} size={0.7} color="#0A0B0F" />
                IMPORTAR ARQUIVO GPX
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml,application/xml,text/xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportGpx(file);
                    e.target.value = '';
                  }}
                />
              </label>
              {importError && (
                <p style={{ margin: '8px 0 0', color: 'var(--neon-pink)', fontSize: 12 }}>
                  {importError}
                </p>
              )}
            </div>
          )}

          {route && routeSource && routeSource !== 'health_connect' && (
            <p style={{ margin: '4px 0', color: 'var(--text-mute)', fontSize: 11, textAlign: 'center' }}>
              Rota {routeSource === 'gpx_import' ? 'importada via GPX' : 'gravada localmente'}
            </p>
          )}

          {workout.sourceName && (
            <p style={{ margin: '8px 0 4px', color: 'var(--text-mute)', fontSize: 11, textAlign: 'center' }}>
              Fonte: <span style={{ color: 'var(--text)' }}>{workout.sourceName}</span>
            </p>
          )}

          <div className="sd-foot">
            Dados lidos via Health Connect (somente leitura).
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

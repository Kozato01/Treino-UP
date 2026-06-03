import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiArrowUpBold,
  mdiArrowDownBold,
  mdiSpeedometer,
  mdiTimerOutline,
  mdiTrashCan,
  mdiRun,
  mdiFire,
  mdiFlagCheckered,
} from '@mdi/js';
import { useMemo, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRoutes } from '../../stores/routes';
import { useData } from '../../stores/data';
import {
  computeRouteStats,
  computeSplits,
  estimateCalories,
  formatDuration,
  formatPace,
} from '../../services/routeAnalytics';
import './LocalRoutePage.css';

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

export function LocalRoutePage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const routes = useRoutes((s) => s.routes);
  const removeRoute = useRoutes((s) => s.removeRoute);
  const bodyMeasurements = useData((s) => s.bodyMeasurements);

  const stored = useMemo(() => routes.find((r) => r.id === id), [routes, id]);
  const stats = useMemo(() => (stored ? computeRouteStats(stored.route) : null), [stored]);
  const splits = useMemo(() => (stored ? computeSplits(stored.route) : []), [stored]);

  // Peso mais recente para estimar calorias (fallback 70kg).
  const weightKg = useMemo(() => {
    const withW = bodyMeasurements
      .filter((b) => b.weightKg != null)
      .sort((a, b) => b.date - a.date);
    return withW[0]?.weightKg ?? 70;
  }, [bodyMeasurements]);

  const calories = useMemo(
    () =>
      stats
        ? estimateCalories(stats.totalDistanceMeters, stats.durationSeconds, weightKg)
        : 0,
    [stats, weightKg]
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!stored || stored.route.length < 2) return null;
    return stored.route.map((p) => [p.lat, p.lng]);
  }, [stored]);

  // Ritmo médio (min/km) a partir de distância e duração.
  const avgPace = useMemo(() => {
    if (!stats || stats.totalDistanceMeters < 10 || stats.durationSeconds <= 0) return 0;
    return stats.durationSeconds / 60 / (stats.totalDistanceMeters / 1000);
  }, [stats]);

  const maxSplitPace = useMemo(
    () => splits.reduce((m, s) => Math.max(m, s.paceMinPerKm), 0),
    [splits]
  );

  if (!stored || !stats) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/rotas" />
            </IonButtons>
            <IonTitle>Rota não encontrada</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: 16 }}>
            <p style={{ color: 'var(--text-mute)' }}>Esta rota não existe ou foi removida.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const start = stored.route[0];
  const end = stored.route[stored.route.length - 1];
  const km = (stats.totalDistanceMeters / 1000).toFixed(2);
  const startDate = new Date(stored.startTime);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/rotas" />
          </IonButtons>
          <IonTitle>{stored.name ?? 'Rota'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="rd-page">
          {/* HERO */}
          <div className="rd-hero">
            <div className="rd-hero__top">
              <Icon path={mdiRun} size={0.8} color="#0a0b0f" />
              <span>
                {startDate.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="rd-hero__dist">
              {km}
              <small>km</small>
            </div>
            <div className="rd-hero__row">
              <div>
                <span className="rd-hero__v">{formatDuration(stats.durationSeconds)}</span>
                <span className="rd-hero__l">Tempo</span>
              </div>
              <div>
                <span className="rd-hero__v">{avgPace > 0 ? `${formatPace(avgPace)}` : '--'}</span>
                <span className="rd-hero__l">Ritmo /km</span>
              </div>
              <div>
                <span className="rd-hero__v">{calories || '--'}</span>
                <span className="rd-hero__l">kcal</span>
              </div>
            </div>
          </div>

          {/* MAPA */}
          {bounds && (
            <div className="rd-map">
              <MapContainer
                center={[start.lat, start.lng]}
                zoom={15}
                zoomControl={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds bounds={bounds} />
                <Polyline
                  positions={stored.route.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: '#C6FF4A', weight: 5 }}
                />
                <CircleMarker
                  center={[start.lat, start.lng]}
                  radius={7}
                  pathOptions={{ color: '#0A0B0F', fillColor: '#C6FF4A', fillOpacity: 1, weight: 3 }}
                />
                <CircleMarker
                  center={[end.lat, end.lng]}
                  radius={7}
                  pathOptions={{ color: '#0A0B0F', fillColor: '#FF4AD1', fillOpacity: 1, weight: 3 }}
                />
              </MapContainer>
            </div>
          )}

          {/* KPIs secundários */}
          <div className="rd-kpis">
            <div className="rd-kpi">
              <Icon path={mdiSpeedometer} size={0.8} color="var(--neon-orange)" />
              <span className="rd-kpi__v">{stats.avgSpeedKmh.toFixed(1)}</span>
              <span className="rd-kpi__l">km/h méd</span>
            </div>
            <div className="rd-kpi">
              <Icon path={mdiSpeedometer} size={0.8} color="var(--neon-pink)" />
              <span className="rd-kpi__v">{stats.maxSpeedKmh.toFixed(1)}</span>
              <span className="rd-kpi__l">km/h máx</span>
            </div>
            <div className="rd-kpi">
              <Icon path={mdiArrowUpBold} size={0.8} color="var(--neon-green)" />
              <span className="rd-kpi__v">{stats.totalAscent}m</span>
              <span className="rd-kpi__l">Subida</span>
            </div>
            <div className="rd-kpi">
              <Icon path={mdiArrowDownBold} size={0.8} color="var(--neon-cyan)" />
              <span className="rd-kpi__v">{stats.totalDescent}m</span>
              <span className="rd-kpi__l">Descida</span>
            </div>
            <div className="rd-kpi">
              <Icon path={mdiFire} size={0.8} color="var(--neon-orange)" />
              <span className="rd-kpi__v">{calories || '--'}</span>
              <span className="rd-kpi__l">kcal</span>
            </div>
            <div className="rd-kpi">
              <Icon path={mdiTimerOutline} size={0.8} color="var(--neon-cyan)" />
              <span className="rd-kpi__v">{stored.route.length}</span>
              <span className="rd-kpi__l">pontos</span>
            </div>
          </div>

          {/* SPLITS por km */}
          {splits.length > 0 && (
            <>
              <span className="rd-section">PARCIAIS POR KM</span>
              <div className="rd-splits">
                {splits.map((s) => {
                  const pct = maxSplitPace > 0 ? (s.paceMinPerKm / maxSplitPace) * 100 : 0;
                  const fastest = s.paceMinPerKm === Math.min(...splits.map((x) => x.paceMinPerKm));
                  return (
                    <div key={s.km} className="rd-split">
                      <span className="rd-split__km">{s.km}</span>
                      <div className="rd-split__bar">
                        <div
                          className="rd-split__fill"
                          style={{
                            width: `${Math.max(8, pct)}%`,
                            background: fastest ? 'var(--neon-green)' : 'var(--neon-cyan)',
                          }}
                        />
                      </div>
                      <span className="rd-split__pace">{formatPace(s.paceMinPerKm)}/km</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="rd-foot">
            <Icon path={mdiFlagCheckered} size={0.6} color="var(--text-mute)" />
            Origem:{' '}
            {stored.source === 'gpx_import'
              ? 'arquivo GPX'
              : stored.source === 'health_connect'
              ? 'Health Connect'
              : 'gravada pelo app'}{' '}
            · {new Date(stored.importedAt).toLocaleDateString('pt-BR')}
          </div>

          <button
            className="rd-delete"
            onClick={() => {
              removeRoute(stored.id);
              history.replace('/rotas');
            }}>
            <Icon path={mdiTrashCan} size={0.7} color="var(--neon-pink)" />
            EXCLUIR ROTA
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}

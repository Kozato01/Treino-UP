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
  mdiPlay,
  mdiStop,
  mdiMapMarker,
  mdiMapMarkerDistance,
  mdiTimerOutline,
  mdiSpeedometer,
} from '@mdi/js';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Geolocation } from '@capacitor/geolocation';
import { useRoutes } from '../../stores/routes';
import { computeRouteStats, formatDuration } from '../../services/routeAnalytics';
import type { RouteLocation } from '../../services/healthConnect';
import './SaudePage.css';

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [bounds, map]);
  return null;
}

export function TrackingPage() {
  const history = useHistory();
  const addStoredRoute = useRoutes((s) => s.addRoute);
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState<RouteLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const watchIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopWatchInternal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopWatchInternal = () => {
    if (watchIdRef.current) {
      void Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startTracking = async () => {
    setError(null);
    setPoints([]);
    setElapsedSec(0);
    try {
      const perm = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (perm.location !== 'granted') {
        setError('Permissão de localização negada.');
        return;
      }

      startTimeRef.current = Date.now();
      tickRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (pos, err) => {
          if (err) {
            setError(`Erro GPS: ${err.message}`);
            return;
          }
          if (!pos) return;
          const pt: RouteLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altitude: pos.coords.altitude ?? undefined,
            timestamp: new Date(pos.timestamp).toISOString(),
          };
          setPoints((prev) => [...prev, pt]);
        }
      );
      watchIdRef.current = id;
      setTracking(true);
    } catch (e) {
      setError(`Erro ao iniciar: ${(e as Error).message}`);
    }
  };

  const stopTracking = () => {
    stopWatchInternal();
    setTracking(false);

    if (points.length >= 2) {
      const stored = addStoredRoute({
        source: 'live_tracking',
        startTime: points[0].timestamp,
        endTime: points[points.length - 1].timestamp,
        route: points,
      });
      history.replace(`/rota/${stored.id}`);
    }
  };

  const stats = points.length >= 2 ? computeRouteStats(points) : null;
  const bounds: LatLngBoundsExpression | null =
    points.length >= 2 ? points.map((p) => [p.lat, p.lng]) : null;
  const last = points[points.length - 1];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/saude" />
          </IonButtons>
          <IonTitle>{tracking ? 'Rastreando GPS...' : 'Rastrear rota'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          {!tracking && points.length === 0 && (
            <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
              <span className="section-label" style={{ margin: 0 }}>GRAVAR ROTA</span>
              <p style={{ margin: '8px 0 0', color: 'var(--text-mute)', fontSize: 13 }}>
                Toque em INICIAR antes do treino. O app grava sua rota GPS em paralelo ao seu
                relógio/celular. Útil quando o app de saúde não envia a rota ao Health Connect.
              </p>
            </div>
          )}

          {points.length > 0 && bounds && (
            <div className="card" style={{ padding: 12, marginBottom: 16 }}>
              <MapContainer
                center={[points[0].lat, points[0].lng]}
                zoom={15}
                style={{
                  height: '280px',
                  width: '100%',
                  borderRadius: 8,
                }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <FitBounds bounds={bounds} />
                <Polyline
                  positions={points.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: '#C6FF4A', weight: 4, opacity: 0.9 }}
                />
                {last && (
                  <Marker
                    position={[last.lat, last.lng]}
                    icon={L.divIcon({
                      className: 'live-pos-marker',
                      html: `<div style="
                        background: #C6FF4A;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        border: 3px solid #0A0B0F;
                        box-shadow: 0 0 12px rgba(198,255,74,0.9);
                      "></div>`,
                      iconSize: [22, 22],
                      iconAnchor: [11, 11],
                    })}
                  />
                )}
              </MapContainer>
            </div>
          )}

          <div className="sd-kpi-row">
            <div className="sd-kpi">
              <Icon path={mdiTimerOutline} size={0.9} color="var(--neon-cyan)" />
              <span className="sd-kpi__value">{formatDuration(elapsedSec)}</span>
              <span className="sd-kpi__label">Tempo</span>
            </div>
            <div className="sd-kpi">
              <Icon path={mdiMapMarkerDistance} size={0.9} color="var(--neon-green)" />
              <span className="sd-kpi__value">
                {stats ? `${(stats.totalDistanceMeters / 1000).toFixed(2)} km` : '0 km'}
              </span>
              <span className="sd-kpi__label">Distância</span>
            </div>
            <div className="sd-kpi">
              <Icon path={mdiSpeedometer} size={0.9} color="var(--neon-orange)" />
              <span className="sd-kpi__value">
                {stats ? `${stats.avgSpeedKmh.toFixed(1)} km/h` : '0 km/h'}
              </span>
              <span className="sd-kpi__label">Vel. média</span>
            </div>
          </div>

          <div className="sd-kpi-row">
            <div className="sd-kpi">
              <Icon path={mdiMapMarker} size={0.9} color="var(--neon-pink)" />
              <span className="sd-kpi__value">{points.length}</span>
              <span className="sd-kpi__label">Pontos GPS</span>
            </div>
          </div>

          {error && (
            <div
              className="card"
              style={{
                padding: 12,
                marginBottom: 12,
                borderLeft: '3px solid var(--neon-pink)',
              }}>
              <p style={{ margin: 0, color: 'var(--neon-pink)', fontSize: 13 }}>{error}</p>
            </div>
          )}

          {!tracking ? (
            <button
              onClick={() => void startTracking()}
              style={{
                width: '100%',
                background: 'var(--neon-green)',
                color: '#0A0B0F',
                border: 'none',
                borderRadius: 8,
                padding: '14px',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}>
              <Icon path={mdiPlay} size={0.9} color="#0A0B0F" />
              INICIAR RASTREAMENTO
            </button>
          ) : (
            <button
              onClick={() => stopTracking()}
              style={{
                width: '100%',
                background: 'var(--neon-pink)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '14px',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}>
              <Icon path={mdiStop} size={0.9} color="#fff" />
              PARAR E SALVAR
            </button>
          )}

          <div className="sd-foot" style={{ marginTop: 12 }}>
            Mantenha a tela ligada durante o treino para máxima precisão.
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

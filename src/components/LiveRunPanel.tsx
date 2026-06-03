// Painel de corrida ao vivo: mapa em tempo real + sinal GPS + métricas + controles.
// Reutilizável (hoje usado no Cardio). Recebe LiveStats e callbacks por props.
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from '@mdi/react';
import { mdiCrosshairsGps, mdiPlay, mdiPause, mdiStop } from '@mdi/js';
import type { LiveStats, GpsStatus } from '../services/liveGps';
import './LiveRunPanel.css';

const GPS_LABEL: Record<GpsStatus, string> = {
  searching: 'Buscando sinal GPS…',
  weak: 'Sinal fraco',
  good: 'Sinal bom',
};

function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function fmtPace(minPerKm: number): string {
  if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0) return "--'--\"";
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

// Recentraliza o mapa na posição atual enquanto grava.
function FollowMarker({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface Props {
  stats: LiveStats;
  elapsedSec: number;
  hasStarted: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}

export function LiveRunPanel({ stats, elapsedSec, hasStarted, onStart, onTogglePause, onStop }: Props) {
  const last = stats.points[stats.points.length - 1] ?? null;
  const initRef = useRef<[number, number]>([-23.55, -46.63]);
  if (last && initRef.current[0] === -23.55) initRef.current = [last.lat, last.lng];

  const positions = stats.points.map((p) => [p.lat, p.lng] as [number, number]);
  const gpsClass =
    stats.status === 'good' ? 'lrp-good' : stats.status === 'weak' ? 'lrp-weak' : 'lrp-searching';

  return (
    <div className="lrp">
      <div className="lrp-map">
        <MapContainer
          center={initRef.current}
          zoom={16}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {positions.length > 0 && (
            <Polyline positions={positions} pathOptions={{ color: '#C6FF4A', weight: 5 }} />
          )}
          {last && (
            <CircleMarker
              center={[last.lat, last.lng]}
              radius={8}
              pathOptions={{ color: '#0A0B0F', fillColor: '#C6FF4A', fillOpacity: 1, weight: 3 }}
            />
          )}
          <FollowMarker lat={last?.lat ?? null} lng={last?.lng ?? null} />
        </MapContainer>

        <div className={`lrp-gps ${gpsClass}`}>
          <Icon path={mdiCrosshairsGps} size={0.7} />
          <span>{GPS_LABEL[stats.status]}</span>
          {stats.accuracy != null && <em>±{Math.round(stats.accuracy)}m</em>}
        </div>
      </div>

      <div className="lrp-metrics">
        <div className="lrp-metric">
          <span className="lrp-value">{(stats.distanceM / 1000).toFixed(2)}</span>
          <span className="lrp-label">km</span>
        </div>
        <div className="lrp-metric">
          <span className="lrp-value">{fmtTime(elapsedSec)}</span>
          <span className="lrp-label">tempo</span>
        </div>
        <div className="lrp-metric">
          <span className="lrp-value">{fmtPace(stats.currentPaceMinKm)}</span>
          <span className="lrp-label">ritmo /km</span>
        </div>
        <div className="lrp-metric">
          <span className="lrp-value">{(stats.currentSpeed * 3.6).toFixed(1)}</span>
          <span className="lrp-label">km/h</span>
        </div>
      </div>

      {hasStarted && (
        <div className="lrp-controls">
          <button className="lrp-btn pause" onClick={onTogglePause}>
            <Icon path={stats.isPaused ? mdiPlay : mdiPause} size={0.9} />
            {stats.isPaused ? 'Retomar' : 'Pausar'}
          </button>
          <button className="lrp-btn stop" onClick={onStop}>
            <Icon path={mdiStop} size={0.9} />
            Parar e salvar
          </button>
        </div>
      )}
      {!hasStarted && (
        <button className="lrp-btn start" onClick={onStart}>
          <Icon path={mdiPlay} size={1} />
          Iniciar {stats.status === 'searching' ? '(buscando GPS…)' : ''}
        </button>
      )}
    </div>
  );
}

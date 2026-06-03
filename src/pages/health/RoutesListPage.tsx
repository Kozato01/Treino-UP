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
  mdiMapMarkerDistance,
  mdiUpload,
  mdiWatch,
  mdiCellphone,
  mdiRun,
  mdiChevronRight,
  mdiMapMarkerPlus,
} from '@mdi/js';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  readLastNDaysWorkouts,
  readExerciseRoute,
  type ExternalWorkout,
} from '../../services/healthConnect';
import { parseGpx } from '../../services/gpxParser';
import { useRoutes } from '../../stores/routes';
import './SaudePage.css';

interface UnifiedRoute {
  key: string;
  source: 'health_connect' | 'gpx_import' | 'live_tracking';
  date: string;
  title: string;
  detail: string;
  onClick: () => void;
}

function SourceBadge({ source }: { source: UnifiedRoute['source'] }) {
  const cfg = {
    health_connect: { label: 'Wearable', color: 'var(--neon-green)', icon: mdiWatch },
    gpx_import: { label: 'GPX', color: 'var(--neon-cyan)', icon: mdiUpload },
    live_tracking: { label: 'Celular', color: 'var(--neon-pink)', icon: mdiCellphone },
  }[source];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--bg-surface-2)',
        color: cfg.color,
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}>
      <Icon path={cfg.icon} size={0.45} color={cfg.color} />
      {cfg.label}
    </span>
  );
}

export function RoutesListPage() {
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<ExternalWorkout[]>([]);
  const storedRoutes = useRoutes((s) => s.routes);
  const addRoute = useRoutes((s) => s.addRoute);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  // Importa um arquivo .gpx (exportado de Samsung Health, Strava, Garmin, etc.).
  const handleGpxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reimportar o mesmo arquivo depois
    if (!file) return;
    setImportMsg(null);
    try {
      const xml = await file.text();
      const parsed = parseGpx(xml);
      if (!parsed || parsed.route.length < 2) {
        setImportMsg('Arquivo GPX inválido ou sem pontos de rota.');
        return;
      }
      const r = addRoute({
        source: 'gpx_import',
        name: parsed.name ?? file.name.replace(/\.gpx$/i, ''),
        startTime: parsed.startTime ?? new Date().toISOString(),
        endTime: parsed.endTime ?? new Date().toISOString(),
        route: parsed.route,
      });
      history.push(`/rota/${r.id}`);
    } catch {
      setImportMsg('Não foi possível ler o arquivo GPX.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const list = await readLastNDaysWorkouts(30);
        setWorkouts(list);
      } catch (err) {
        console.error('Failed to fetch workouts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Importa o traçado GPS das corridas de outros apps (Strava/Garmin/Samsung)
  // que tenham rota no Health Connect e ainda não estejam salvas localmente.
  const importFromHealth = async () => {
    setImporting(true);
    setImportMsg(null);
    let added = 0;
    try {
      const list = workouts.length ? workouts : await readLastNDaysWorkouts(30);
      for (const w of list) {
        if (!w.platformId) continue;
        if (storedRoutes.some((r) => r.platformId === w.platformId)) continue;
        try {
          const pts = await readExerciseRoute(w.platformId);
          if (pts && pts.length >= 2) {
            addRoute({
              source: 'health_connect',
              platformId: w.platformId,
              name: w.type,
              startTime: w.startDate,
              endTime: w.endDate,
              route: pts,
            });
            added++;
          }
        } catch {
          /* sem rota nessa atividade — ignora */
        }
      }
      setImportMsg(
        added > 0
          ? `${added} rota(s) importada(s) do Health Connect.`
          : 'Nenhuma rota nova encontrada. Alguns apps não compartilham o traçado GPS (verifique a permissão de "rotas de exercício").'
      );
    } catch {
      setImportMsg('Não foi possível ler o Health Connect agora.');
    } finally {
      setImporting(false);
    }
  };

  const unified: UnifiedRoute[] = [];

  // 1) Atividades do Health Connect com platformId (potencialmente com rota)
  for (const w of workouts) {
    if (!w.platformId) continue;
    const startDate = new Date(w.startDate);
    const linked = storedRoutes.find((r) => r.platformId === w.platformId);
    unified.push({
      key: `hc-${w.platformId}`,
      source: linked ? linked.source : 'health_connect',
      date: w.startDate,
      title: w.type,
      detail: `${startDate.toLocaleDateString('pt-BR')} · ${w.durationMinutes}min${
        w.distanceMeters ? ` · ${(w.distanceMeters / 1000).toFixed(2)}km` : ''
      }`,
      onClick: () => history.push(`/workout/${w.platformId}`),
    });
  }

  // 2) Rotas locais não vinculadas (gravadas via app sem workout correspondente)
  for (const r of storedRoutes) {
    if (r.platformId) continue;
    const startDate = new Date(r.startTime);
    unified.push({
      key: `local-${r.id}`,
      source: r.source,
      date: r.startTime,
      title: r.name ?? (r.source === 'gpx_import' ? 'Rota importada' : 'Rastreamento'),
      detail: `${startDate.toLocaleDateString('pt-BR')} · ${r.route.length} pontos GPS`,
      onClick: () => history.push(`/rota/${r.id}`),
    });
  }

  unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/saude" />
            </IonButtons>
            <IonTitle>Carregando rotas...</IonTitle>
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/saude" />
          </IonButtons>
          <IonTitle>Minhas Rotas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          {unified.length === 0 ? (
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <Icon path={mdiMapMarkerDistance} size={1.5} color="var(--text-mute)" />
              <p style={{ color: 'var(--text-mute)', margin: '12px 0 0' }}>
                Nenhuma rota encontrada.
              </p>
              <p style={{ color: 'var(--text-mute)', fontSize: 12, marginTop: 8 }}>
                Faça uma atividade com GPS, importe um arquivo GPX ou rastreie pelo app.
              </p>
            </div>
          ) : (
            <>
              <span className="section-label">
                {unified.length} rota{unified.length > 1 ? 's' : ''} (últimos 30 dias)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unified.map((r) => (
                  <button
                    key={r.key}
                    onClick={r.onClick}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: 12,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                      <Icon
                        path={mdiMapMarkerDistance}
                        size={0.7}
                        color="var(--neon-green)"
                      />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text)',
                          textTransform: 'capitalize',
                          flex: 1,
                        }}>
                        {r.title}
                      </span>
                      <SourceBadge source={r.source} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      {r.detail}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <span className="section-label" style={{ marginTop: 20 }}>FONTES DE ROTAS</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={importFromHealth}
              disabled={importing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                background: 'var(--bg-surface)',
                border: '1px solid var(--neon-green)',
                borderRadius: 8,
                cursor: importing ? 'default' : 'pointer',
                textAlign: 'left',
                opacity: importing ? 0.7 : 1,
              }}>
              {importing ? (
                <IonSpinner name="dots" color="primary" style={{ width: 22, height: 22 }} />
              ) : (
                <Icon path={mdiMapMarkerPlus} size={0.8} color="var(--neon-green)" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Importar rotas do Health Connect
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                  Traz o traçado GPS das corridas feitas no Strava/Garmin/Samsung Health
                </div>
              </div>
            </button>
            {importMsg && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '0 4px' }}>
                {importMsg}
              </div>
            )}

            <input
              ref={gpxInputRef}
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              style={{ display: 'none' }}
              onChange={handleGpxFile}
            />
            <button
              onClick={() => gpxInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}>
              <Icon path={mdiUpload} size={0.8} color="var(--neon-cyan)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Importar arquivo GPX
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                  Para corridas do Samsung Health e outros apps: exporte o .gpx e abra aqui
                </div>
              </div>
              <Icon path={mdiChevronRight} size={0.7} color="var(--text-mute)" />
            </button>

            <button
              onClick={() => history.push('/atividades')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}>
              <Icon path={mdiRun} size={0.8} color="var(--neon-green)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Atividades do relógio
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                  Workouts vindos do Samsung Health / Google Fit via Health Connect
                </div>
              </div>
              <Icon path={mdiChevronRight} size={0.7} color="var(--text-mute)" />
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

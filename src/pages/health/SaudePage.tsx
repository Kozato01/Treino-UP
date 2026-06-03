import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  type RefresherEventDetail,
} from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiBluetooth,
  mdiCheckCircle,
  mdiChevronDown,
  mdiChevronRight,
  mdiCloseCircle,
  mdiFire,
  mdiHeartPulse,
  mdiInformationOutline,
  mdiLightbulbOnOutline,
  mdiLinkVariant,
  mdiMapMarkerDistance,
  mdiPencil,
  mdiPercent,
  mdiRefresh,
  mdiScaleBathroom,
  mdiShoePrint,
  mdiTarget,
  mdiTrophy,
  mdiWatch,
} from '@mdi/js';
import { useEffect, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

import { Health } from '@capgo/capacitor-health';
import { useBackOverride } from '../../stores/backOverride';
import { useData, toIsoDay } from '../../stores/data';
import { HealthDiagnostic } from './HealthDiagnostic';
import { useSettings } from '../../stores/settings';
import {
  isAvailable,
  hasPermissions,
  openSettings,
  readTodaySteps,
  readTodayActiveCalories,
  readTodayTotalCalories,
  readTodayRestingHeartRate,
  readTodayHeartRateStats,
  readTodayBodyFat,
  readTodayWeight,
  readTodayDistance,
  readLastNDaysSteps,
  readLastNDaysCalories,
  type HealthAvailability,
} from '../../services/healthConnect';
import './SaudePage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip);

type Status = 'unknown' | 'unavailable' | 'not_installed' | 'no_permission' | 'connected';

export function SaudeContent() {
  const dailyMetrics = useData((s) => s.dailyMetrics);
  const upsertDailyMetrics = useData((s) => s.upsertDailyMetrics);
  const dailyStepsGoal = useSettings((s) => s.dailyStepsGoal);
  const setDailyStepsGoal = useSettings((s) => s.setDailyStepsGoal);

  const [status, setStatus] = useState<Status>('unknown');
  const [syncing, setSyncing] = useState(false);
  const [stepsHistory, setStepsHistory] = useState<{ date: string; steps: number }[]>([]);
  const [caloriesHistory, setCaloriesHistory] = useState<{ date: string; calories: number }[]>([]);
  const [howOpen, setHowOpen] = useState(false);
  const [alertCaloriesOpen, setAlertCaloriesOpen] = useState(false);
  const [alertHrOpen, setAlertHrOpen] = useState(false);
  const [samsungHelpOpen, setSamsungHelpOpen] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [connectLogs, setConnectLogs] = useState<string[]>([]);
  const [connectLogOpen, setConnectLogOpen] = useState(false);
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(dailyStepsGoal));

  // Additional health metrics
  const [todayBodyFat, setTodayBodyFat] = useState<number | null>(null);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [todayTotalCalories, setTodayTotalCalories] = useState<number | null>(null);
  const [todayHrAvg, setTodayHrAvg] = useState<number | null>(null);
  const [todayHrMax, setTodayHrMax] = useState<number | null>(null);
  const [todayDistance, setTodayDistance] = useState<number | null>(null);

  const today = toIsoDay(new Date());
  const todayMetrics = dailyMetrics.find((d) => d.date === today);

  useEffect(() => {
    void checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'connected') void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  // Hardware back: fecha modals/alerts em ordem de prioridade antes de sair.
  useEffect(() => {
    const anyOpen =
      diagnosticOpen ||
      connectLogOpen ||
      samsungHelpOpen ||
      howOpen ||
      alertCaloriesOpen ||
      alertHrOpen ||
      goalEditing;
    if (!anyOpen) {
      useBackOverride.getState().set(null);
      return;
    }
    useBackOverride.getState().set(() => {
      if (diagnosticOpen) setDiagnosticOpen(false);
      else if (connectLogOpen) setConnectLogOpen(false);
      else if (samsungHelpOpen) setSamsungHelpOpen(false);
      else if (howOpen) setHowOpen(false);
      else if (alertCaloriesOpen) setAlertCaloriesOpen(false);
      else if (alertHrOpen) setAlertHrOpen(false);
      else if (goalEditing) setGoalEditing(false);
      return true;
    });
    return () => useBackOverride.getState().set(null);
  }, [
    diagnosticOpen,
    connectLogOpen,
    samsungHelpOpen,
    howOpen,
    alertCaloriesOpen,
    alertHrOpen,
    goalEditing,
  ]);

  async function checkStatus(): Promise<Status> {
    const avail: HealthAvailability = await isAvailable();
    if (avail === 'NotSupported') {
      setStatus('unavailable');
      return 'unavailable';
    }
    if (avail === 'NotInstalled') {
      setStatus('not_installed');
      return 'not_installed';
    }
    const granted = await hasPermissions();
    const next: Status = granted ? 'connected' : 'no_permission';
    setStatus(next);
    if (granted) void sync();
    return next;
  }

  async function handleGrantPermissions() {
    const logs: string[] = [];
    const READ_DATA_TYPES = [
      'steps',
      'heartRate',
      'restingHeartRate',
      'calories',
      'totalCalories',
      'weight',
      'bodyFat',
      'sleep',
      'distance',
      'height',
      'route',
      'hydration',
      'oxygenSaturation',
      'bloodPressure',
      'bloodGlucose',
      'bodyTemperature',
      'floorsClimbed',
      'elevationGained',
      'vo2Max',
    ];

    // 1) Disponibilidade — chamada CRUA, sem catch silencioso.
    try {
      const avail = await Health.isAvailable();
      logs.push(`isAvailable: ${JSON.stringify(avail)}`);
    } catch (e) {
      logs.push(`isAvailable ERROR: ${(e as Error)?.message ?? String(e)}`);
    }

    // 2) Authorization status atual
    try {
      const check = await Health.checkAuthorization({
        read: READ_DATA_TYPES,
        write: [],
      } as Parameters<typeof Health.checkAuthorization>[0]);
      logs.push(`checkAuthorization: ${JSON.stringify(check)}`);
    } catch (e) {
      logs.push(`checkAuthorization ERROR: ${(e as Error)?.message ?? String(e)}`);
    }

    // 3) Request — É AQUI que o diálogo nativo deveria abrir.
    let granted = false;
    try {
      const req = await Health.requestAuthorization({
        read: READ_DATA_TYPES,
        write: [],
      } as Parameters<typeof Health.requestAuthorization>[0]);
      logs.push(`requestAuthorization: ${JSON.stringify(req)}`);
      const readArr = (req as unknown as { readAuthorized?: unknown[] }).readAuthorized;
      granted = Array.isArray(readArr) && readArr.length > 0;
    } catch (e) {
      logs.push(`requestAuthorization ERROR: ${(e as Error)?.message ?? String(e)}`);
      logs.push(`stack: ${(e as Error)?.stack?.split('\n').slice(0, 4).join(' | ') ?? ''}`);
    }

    // 4) Re-check pós request
    try {
      const after = await Health.checkAuthorization({
        read: READ_DATA_TYPES,
        write: [],
      } as Parameters<typeof Health.checkAuthorization>[0]);
      logs.push(`pós-request: ${JSON.stringify(after)}`);
      const readArr = (after as unknown as { readAuthorized?: unknown[] }).readAuthorized;
      if (Array.isArray(readArr) && readArr.length > 0) granted = true;
    } catch (e) {
      logs.push(`re-check ERROR: ${(e as Error)?.message ?? String(e)}`);
    }

    setConnectLogs(logs);
    setConnectLogOpen(true);

    if (granted) {
      setStatus('connected');
      void sync();
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const [steps, calories, totalKcal, restingHr, hrStats, bodyFat, weight, distance, history, calHistory] = await Promise.all([
        readTodaySteps(),
        readTodayActiveCalories(),
        readTodayTotalCalories(),
        readTodayRestingHeartRate(),
        readTodayHeartRateStats(),
        readTodayBodyFat(),
        readTodayWeight(),
        readTodayDistance(),
        readLastNDaysSteps(periodDays),
        readLastNDaysCalories(periodDays),
      ]);
      upsertDailyMetrics({
        date: today,
        steps,
        activeCalories: calories,
        restingHeartRate: restingHr ?? undefined,
        bodyFatPct: bodyFat ?? undefined,
        source: 'health_connect',
        syncedAt: Date.now(),
      });
      setStepsHistory(history);
      setCaloriesHistory(calHistory);
      setTodayBodyFat(bodyFat);
      setTodayWeight(weight);
      setTodayTotalCalories(totalKcal > 0 ? totalKcal : null);
      setTodayHrAvg(hrStats.avg);
      setTodayHrMax(hrStats.max);
      setTodayDistance(distance > 0 ? distance : null);
    } finally {
      setSyncing(false);
    }
  }

  const stepsChartData = {
    labels: stepsHistory.map((s) => s.date.slice(5)),
    datasets: [
      {
        label: 'Passos',
        data: stepsHistory.map((s) => s.steps),
        backgroundColor: 'rgba(198, 255, 74, 0.6)',
        borderColor: 'var(--neon-green)',
        borderWidth: 1,
      },
    ],
  };

  const last7Metrics = dailyMetrics
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
  const hrChartData = {
    labels: last7Metrics.map((m) => m.date.slice(5)),
    datasets: [
      {
        label: 'FC Repouso (bpm)',
        data: last7Metrics.map((m) => m.restingHeartRate ?? null),
        borderColor: '#FF4AD1',
        backgroundColor: 'rgba(255, 74, 209, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#13151C',
        borderColor: '#1F222C',
        borderWidth: 1,
        titleColor: '#F2F4F8',
        bodyColor: '#F2F4F8',
        padding: 8,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      x: { ticks: { color: '#9BA0B0' }, grid: { display: false } },
      y: { ticks: { color: '#9BA0B0' }, grid: { color: '#1F222C' } },
    },
  };

  async function handleRefresh(ev: CustomEvent<RefresherEventDetail>) {
    await sync();
    ev.detail.complete();
  }

  function saveGoal() {
    const n = parseInt(goalDraft, 10);
    if (!isNaN(n) && n > 0 && n <= 100000) {
      setDailyStepsGoal(n);
    }
    setGoalEditing(false);
  }

  const todaySteps = todayMetrics?.steps ?? 0;
  const goalProgress = dailyStepsGoal > 0 ? Math.min(100, (todaySteps / dailyStepsGoal) * 100) : 0;
  const goalHit = todaySteps >= dailyStepsGoal && dailyStepsGoal > 0;

  const avgSteps =
    stepsHistory.length > 0
      ? Math.round(stepsHistory.reduce((a, b) => a + b.steps, 0) / stepsHistory.length)
      : 0;

  const caloriesChartData = {
    labels: caloriesHistory.map((c) => c.date.slice(5)),
    datasets: [
      {
        label: 'Kcal',
        data: caloriesHistory.map((c) => c.calories),
        backgroundColor: 'rgba(255, 139, 74, 0.6)',
        borderColor: 'var(--neon-orange)',
        borderWidth: 1,
      },
    ],
  };
  const avgCalories =
    caloriesHistory.length > 0
      ? Math.round(caloriesHistory.reduce((a, b) => a + b.calories, 0) / caloriesHistory.length)
      : 0;
  const hasAnyCalories = caloriesHistory.some((c) => c.calories > 0);

  return (
    <>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingText="Puxe para sincronizar"
            refreshingSpinner="circles"
            refreshingText="Sincronizando..."
          />
        </IonRefresher>
        <div className="sd-wrap">

          {/* Status da conexão */}
          <div className="sd-status card">
            <div className="sd-status__head">
              <Icon path={mdiWatch} size={0.9} color="var(--neon-cyan)" />
              <span className="sd-status__title">Health Connect</span>
            </div>
            {status === 'unknown' && <span className="sd-status__sub">Verificando...</span>}
            {status === 'unavailable' && (
              <>
                <span className="sd-status__sub" style={{ color: 'var(--neon-yellow)' }}>
                  <Icon path={mdiCloseCircle} size={0.7} /> Não detectado
                </span>
                <span className="sd-hint">
                  O sistema reportou Health Connect indisponível, mas em alguns devices isso é um
                  falso negativo. Toque em "Tentar conectar" — se o diálogo de permissões abrir, está
                  funcionando.
                </span>
                <button
                  className="neon-cta sd-cta"
                  onClick={() => void handleGrantPermissions()}>
                  <Icon path={mdiLinkVariant} size={0.8} color="#0A0B0F" />
                  TENTAR CONECTAR MESMO ASSIM
                </button>
                <button
                  className="sd-apps__manage sd-apps__manage--full"
                  style={{ marginTop: 8 }}
                  onClick={() => void openSettings()}>
                  Abrir Health Connect →
                </button>
              </>
            )}
            {status === 'not_installed' && (
              <>
                <span className="sd-status__sub" style={{ color: 'var(--neon-yellow)' }}>
                  <Icon path={mdiCloseCircle} size={0.7} /> Não instalado
                </span>
                <span className="sd-hint">Instale "Health Connect" pela Play Store.</span>
                <button className="neon-cta sd-cta" onClick={() => void openSettings()}>
                  ABRIR PLAY STORE
                </button>
              </>
            )}
            {status === 'no_permission' && (
              <>
                <span className="sd-status__sub" style={{ color: 'var(--neon-yellow)' }}>
                  Não conectado
                </span>
                <span className="sd-hint">
                  Toque para conectar e sincronizar passos, FC e calorias do seu relógio.
                </span>
                <button className="neon-cta sd-cta" onClick={() => void handleGrantPermissions()}>
                  <Icon path={mdiLinkVariant} size={0.8} color="#0A0B0F" />
                  CONECTAR AGORA
                </button>
              </>
            )}
            {status === 'connected' && (
              <>
                <span className="sd-status__sub" style={{ color: 'var(--neon-green)' }}>
                  <Icon path={mdiCheckCircle} size={0.7} /> Conectado
                </span>
                {todayMetrics && (
                  <span className="sd-hint">
                    Último sync: {new Date(todayMetrics.syncedAt).toLocaleString('pt-BR')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* KPIs hoje */}
          <span className="section-label">HOJE</span>
          <div className="sd-kpi-row">
            <Kpi
              icon={mdiShoePrint}
              tint="var(--neon-green)"
              value={todayMetrics?.steps?.toLocaleString('pt-BR')}
              label="Passos"
            />
            <Kpi
              icon={mdiFire}
              tint="var(--neon-orange)"
              value={todayMetrics?.activeCalories}
              label="Kcal ativas"
            />
            <Kpi
              icon={mdiHeartPulse}
              tint="var(--neon-pink)"
              value={todayMetrics?.restingHeartRate}
              label="FC Repouso"
            />
          </div>

          {/* FC e Calorias Totais — vindos do relógio */}
          {(todayTotalCalories != null || todayHrAvg != null || todayHrMax != null) && (
            <>
              <span className="section-label">WEARABLE</span>
              <div className="sd-kpi-row">
                {todayTotalCalories != null && (
                  <Kpi
                    icon={mdiFire}
                    tint="var(--neon-yellow)"
                    value={todayTotalCalories}
                    label="Kcal totais"
                  />
                )}
                {todayHrAvg != null && (
                  <Kpi
                    icon={mdiHeartPulse}
                    tint="var(--neon-cyan)"
                    value={todayHrAvg}
                    label="FC média"
                  />
                )}
                {todayHrMax != null && (
                  <Kpi
                    icon={mdiHeartPulse}
                    tint="var(--neon-pink)"
                    value={todayHrMax}
                    label="FC máxima"
                  />
                )}
              </div>
            </>
          )}

          {/* Weight and Body Fat */}
          {(todayBodyFat != null || todayWeight != null) && (
            <div className="sd-kpi-row">
              {todayWeight != null && (
                <Kpi
                  icon={mdiScaleBathroom}
                  tint="var(--neon-cyan)"
                  value={todayWeight}
                  label="Peso (kg)"
                />
              )}
              {todayBodyFat != null && (
                <Kpi
                  icon={mdiPercent}
                  tint="var(--neon-orange)"
                  value={`${todayBodyFat}%`}
                  label="Gordura"
                />
              )}
            </div>
          )}

          {todayDistance != null && (
            <div className="sd-kpi-row">
              <Kpi
                icon={mdiMapMarkerDistance}
                tint="var(--neon-cyan)"
                value={`${(todayDistance / 1000).toFixed(2)} km`}
                label="Distância"
              />
            </div>
          )}


          <IonModal isOpen={diagnosticOpen} onDidDismiss={() => setDiagnosticOpen(false)}>
            <HealthDiagnostic onClose={() => setDiagnosticOpen(false)} />
          </IonModal>

          <IonModal isOpen={connectLogOpen} onDidDismiss={() => setConnectLogOpen(false)}>
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonButtons slot="start">
                    <button
                      onClick={() => setConnectLogOpen(false)}
                      style={{
                        background: 'transparent',
                        color: 'var(--neon-cyan)',
                        border: 'none',
                        padding: '8px 12px',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}>
                      ← Fechar
                    </button>
                  </IonButtons>
                  <IonTitle>Diagnóstico Health Connect</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <div className="sd-wrap">
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(74, 227, 255, 0.1), rgba(198, 255, 74, 0.1))',
                      borderRadius: 12,
                      padding: '16px',
                      border: '1px solid rgba(198, 255, 74, 0.2)',
                    }}>
                      <Icon path={mdiWatch} size={1.2} color="var(--neon-cyan)" style={{ marginBottom: 8 }} />
                      <h3 style={{ margin: '0 0 4px 0', color: 'var(--text)' }}>Teste de Conexão</h3>
                      <p style={{ margin: '0 0 12px 0', color: 'var(--text-mute)', fontSize: '0.9em' }}>
                        Informações técnicas da tentativa de conectar
                      </p>
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {connectLogs.map((log, i) => (
                        <div key={i} style={{
                          background: 'var(--bg-surface-2)',
                          borderLeft: '3px solid var(--neon-cyan)',
                          padding: '12px',
                          borderRadius: 6,
                          fontSize: '0.85em',
                          color: 'var(--text-mute)',
                          fontFamily: 'monospace',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 200,
                          overflow: 'auto',
                        }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card sd-how" style={{
                    background: 'linear-gradient(135deg, rgba(74, 227, 255, 0.1), rgba(74, 227, 255, 0.05))',
                    border: '1px solid rgba(74, 227, 255, 0.2)',
                    marginTop: 16,
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon path={mdiInformationOutline} size={0.7} color="var(--neon-cyan)" />
                      <strong>O que significa</strong>
                    </p>
                    <ul style={{ margin: '8px 0 0 16px', color: 'var(--text-mute)', fontSize: '0.85em', lineHeight: '1.6' }}>
                      <li><strong>isAvailable:</strong> Se o Health Connect é suportado no seu Android</li>
                      <li><strong>checkAuthorization:</strong> Se você já concedeu permissões antes</li>
                      <li><strong>requestAuthorization:</strong> Tentativa de pedir novas permissões</li>
                      <li><strong>readAuthorized:</strong> Lista de tipos de dados autorizados (vazio = negado)</li>
                    </ul>
                  </div>

                  <button
                    className="neon-cta"
                    onClick={() => setConnectLogOpen(false)}
                    style={{ width: '100%', marginTop: 16, background: 'var(--neon-cyan)', color: '#0A0B0F' }}>
                    OK
                  </button>
                </div>
              </IonContent>
            </IonPage>
          </IonModal>


          {/* Meta de passos */}
          {status === 'connected' && (
            <div className="card sd-goal">
              <div className="sd-goal__head">
                <Icon path={goalHit ? mdiTrophy : mdiTarget} size={0.8} color={goalHit ? 'var(--neon-yellow)' : 'var(--neon-green)'} />
                <span className="sd-goal__title">
                  {goalHit ? 'Meta batida!' : 'Meta diária de passos'}
                </span>
                {!goalEditing && (
                  <button
                    className="sd-goal__edit"
                    onClick={() => { setGoalDraft(String(dailyStepsGoal)); setGoalEditing(true); }}
                    aria-label="Editar meta">
                    <Icon path={mdiPencil} size={0.6} color="var(--text-mute)" />
                  </button>
                )}
              </div>
              {goalEditing ? (
                <div className="sd-goal__edit-row">
                  <input
                    type="number"
                    className="sd-goal__input"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    min={1000}
                    max={50000}
                    step={500}
                    autoFocus
                  />
                  <button className="neon-cta sd-goal__save" onClick={saveGoal}>
                    SALVAR
                  </button>
                  <button className="sd-goal__cancel" onClick={() => setGoalEditing(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div className="sd-goal__bar">
                    <div
                      className="sd-goal__fill"
                      style={{
                        width: `${goalProgress}%`,
                        background: goalHit ? 'var(--neon-yellow)' : 'var(--neon-green)',
                      }}
                    />
                  </div>
                  <div className="sd-goal__numbers">
                    <span className="sd-goal__current">
                      {todaySteps.toLocaleString('pt-BR')}
                    </span>
                    <span className="sd-goal__sep">/</span>
                    <span className="sd-goal__target">
                      {dailyStepsGoal.toLocaleString('pt-BR')} passos
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Toggle período do gráfico */}
          {status === 'connected' && stepsHistory.length > 0 && (
            <>
              <div className="sd-period">
                <button
                  className={`sd-period__btn${periodDays === 7 ? ' is-active' : ''}`}
                  onClick={() => setPeriodDays(7)}>
                  7 dias
                </button>
                <button
                  className={`sd-period__btn${periodDays === 30 ? ' is-active' : ''}`}
                  onClick={() => setPeriodDays(30)}>
                  30 dias
                </button>
              </div>
              <div className="card sd-chart">
                <div className="sd-chart__head">
                  <span className="sd-chart__title">Passos — {periodDays} dias</span>
                  <span className="sd-chart__avg">média {avgSteps.toLocaleString('pt-BR')}</span>
                </div>
                <div className="sd-chart__canvas">
                  <Bar data={stepsChartData} options={chartOpts} />
                </div>
              </div>
            </>
          )}

          {status === 'connected' && hasAnyCalories && (
            <div className="card sd-chart">
              <div className="sd-chart__head">
                <span className="sd-chart__title">Calorias ativas — {periodDays} dias</span>
                <span className="sd-chart__avg">média {avgCalories.toLocaleString('pt-BR')} kcal</span>
              </div>
              <div className="sd-chart__canvas">
                <Bar data={caloriesChartData} options={chartOpts} />
              </div>
            </div>
          )}

          {status === 'connected' && !hasAnyCalories && caloriesHistory.length > 0 && (
            <>
              <button className="sd-how-head" onClick={() => setAlertCaloriesOpen((v) => !v)}>
                <Icon path={mdiFire} size={0.8} color="var(--neon-yellow)" />
                <span>Calorias não detectadas</span>
                <Icon
                  path={alertCaloriesOpen ? mdiChevronDown : mdiChevronRight}
                  size={0.8}
                  color="var(--text-mute)"
                  style={{ marginLeft: 'auto' }}
                />
              </button>
              {alertCaloriesOpen && (
                <div className="card sd-how">
                  <p className="sd-apps__hint" style={{ marginTop: 0 }}>
                    O app lê tanto <strong>Calorias ativas</strong> quanto <strong>Calorias
                    totais</strong>. Para aparecer aqui, o Samsung Health (ou Mi Fit, Garmin etc.)
                    precisa estar autorizado a escrever pelo menos um dos dois no Health Connect.
                  </p>
                  <ol className="sd-how__steps" style={{ marginTop: 8 }}>
                    <li>Abra Samsung Health → Menu → Configurações → Health Connect</li>
                    <li>Marque <strong>Calorias ativas queimadas</strong> e <strong>Calorias totais queimadas</strong></li>
                    <li>Volte aqui e puxe para sincronizar</li>
                  </ol>
                  <button
                    className="sd-apps__manage sd-apps__manage--full"
                    style={{ marginTop: 8 }}
                    onClick={() => void openSettings()}>
                    Abrir Health Connect →
                  </button>
                </div>
              )}
            </>
          )}

          {status === 'connected' && last7Metrics.some((m) => m.restingHeartRate != null) && (
            <div className="card sd-chart">
              <span className="sd-chart__title">FC de Repouso — últimos 7 dias</span>
              <div className="sd-chart__canvas">
                <Line data={hrChartData} options={chartOpts} />
              </div>
            </div>
          )}

          {status === 'connected' && !last7Metrics.some((m) => m.restingHeartRate != null) && todayMetrics && (
            <>
              <button className="sd-how-head" onClick={() => setAlertHrOpen((v) => !v)}>
                <Icon path={mdiHeartPulse} size={0.8} color="var(--neon-yellow)" />
                <span>FC de repouso não detectada</span>
                <Icon
                  path={alertHrOpen ? mdiChevronDown : mdiChevronRight}
                  size={0.8}
                  color="var(--text-mute)"
                  style={{ marginLeft: 'auto' }}
                />
              </button>
              {alertHrOpen && (
                <div className="card sd-how">
                  <p className="sd-apps__hint" style={{ marginTop: 0 }}>
                    A FC de repouso é calculada pelo seu relógio durante o sono / inatividade.
                    Verifique se <strong>Frequência cardíaca</strong> está autorizada no Health
                    Connect e que o relógio está sincronizando com Samsung Health / app do
                    fabricante.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Botão sincronizar */}
          {status === 'connected' && (
            <button
              className="neon-cta sd-cta"
              onClick={() => void sync()}
              disabled={syncing}
              style={{ background: 'var(--neon-cyan)' }}>
              <Icon path={mdiRefresh} size={0.8} color="#0A0B0F" />
              {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}
            </button>
          )}

          {/* Botão diagnóstico */}
          {status === 'connected' && (
            <button
              className="neon-cta sd-cta"
              onClick={() => setDiagnosticOpen(true)}
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-mute)' }}>
              🔍 DIAGNÓSTICO TÉCNICO
            </button>
          )}

          {/* Pareamento do relógio — Bluetooth */}
          {status !== 'connected' && (
            <>
              <button className="sd-how-head" onClick={() => setSamsungHelpOpen((v) => !v)}>
                <Icon path={mdiWatch} size={0.8} color="var(--neon-cyan)" />
                <span>Conectar relógio (Samsung Health, Mi Fit, Garmin…)</span>
                <Icon
                  path={samsungHelpOpen ? mdiChevronDown : mdiChevronRight}
                  size={0.8}
                  color="var(--text-mute)"
                  style={{ marginLeft: 'auto' }}
                />
              </button>
              {samsungHelpOpen && (
                <div className="card sd-how">
                  <p className="sd-apps__hint" style={{ marginTop: 0 }}>
                    Samsung Health já é uma fonte do Health Connect. Você só precisa autorizar ele
                    a <strong>escrever</strong> dados lá:
                  </p>
                  <ol className="sd-how__steps" style={{ marginTop: 8 }}>
                    <li>Abra o <strong>Samsung Health</strong></li>
                    <li>Menu (≡) → <strong>Configurações</strong> → <strong>Health Connect</strong></li>
                    <li>Marque <strong>Passos, Frequência cardíaca, Calorias ativas</strong></li>
                    <li>Volte aqui e toque em "TENTAR CONECTAR"</li>
                  </ol>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <a
                      className="sd-apps__manage"
                      href="market://details?id=com.sec.android.app.shealth"
                      target="_blank"
                      rel="noopener noreferrer">
                      Abrir Samsung Health
                    </a>
                    <a
                      className="sd-apps__manage"
                      href="market://details?id=com.google.android.apps.healthdata"
                      target="_blank"
                      rel="noopener noreferrer">
                      Abrir Health Connect
                    </a>
                    <a
                      className="sd-apps__manage"
                      href="intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end"
                      target="_blank"
                      rel="noopener noreferrer">
                      <Icon path={mdiBluetooth} size={0.7} color="var(--neon-cyan)" />
                      Bluetooth
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Como funciona — só antes de conectar */}
          {status !== 'connected' && (
            <button className="sd-how-head" onClick={() => setHowOpen((v) => !v)}>
              <Icon path={mdiInformationOutline} size={0.8} color="var(--neon-cyan)" />
              <span>Como funciona</span>
              <Icon
                path={howOpen ? mdiChevronDown : mdiChevronRight}
                size={0.8}
                color="var(--text-mute)"
                style={{ marginLeft: 'auto' }}
              />
            </button>
          )}
          {howOpen && status !== 'connected' && (
            <div className="card sd-how">
              <p><strong>Fluxo dos dados:</strong></p>
              <ol className="sd-how__steps">
                <li>Seu relógio mede passos, FC, calorias, sono</li>
                <li>O app do fabricante (Samsung Health, Mi Fit, Fitbit, etc.) recebe via Bluetooth</li>
                <li>Esse app escreve os dados no <strong>Health Connect</strong></li>
                <li>O Ac-N-Version1 lê do Health Connect (apenas leitura)</li>
              </ol>
              <p className="sd-apps__hint" style={{ marginTop: 8 }}>
                <Icon path={mdiLightbulbOnOutline} size={0.6} color="var(--neon-yellow)" />{' '}
                Se uma métrica está vazia, o app do seu relógio pode não estar enviando esse dado.
              </p>
            </div>
          )}

          {/* Apps compatíveis — clicáveis */}
          {status !== 'connected' && (
            <div className="card sd-apps">
              <span className="sd-apps__title">Apps que enviam dados ao Health Connect</span>
              <p className="sd-apps__hint">
                Toque para abrir (ou instalar). Depois autorize cada um a escrever no Health
                Connect.
              </p>
              <div className="sd-apps__grid">
                {[
                  { name: 'Samsung Health', pkg: 'com.sec.android.app.shealth' },
                  { name: 'Google Fit', pkg: 'com.google.android.apps.fitness' },
                  { name: 'MActivePro', pkg: 'com.njj.mactivepro' },
                  { name: 'Fitbit', pkg: 'com.fitbit.FitbitMobile' },
                  { name: 'Garmin Connect', pkg: 'com.garmin.android.apps.connectmobile' },
                  { name: 'Polar Flow', pkg: 'fi.polar.polarflow' },
                  { name: 'Strava', pkg: 'com.strava' },
                  { name: 'Zepp / Mi Fit', pkg: 'com.huami.watch.hmwatchmanager' },
                  { name: 'Huawei Health', pkg: 'com.huawei.health' },
                  { name: 'MyFitnessPal', pkg: 'com.myfitnesspal.android' },
                  { name: 'Withings', pkg: 'com.withings.wiscale2' },
                  { name: 'Oura', pkg: 'com.ouraring.oura' },
                  { name: 'Whoop', pkg: 'com.whoop.android' },
                ].map((app) => (
                  <a
                    key={app.pkg}
                    className="sd-apps__chip"
                    href={`market://details?id=${app.pkg}`}
                    target="_blank"
                    rel="noopener noreferrer">
                    {app.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quando conectado: ação rápida para gerenciar fontes */}
          {status === 'connected' && (
            <button className="sd-apps__manage sd-apps__manage--full" onClick={() => void openSettings()}>
              Gerenciar conexões no Health Connect →
            </button>
          )}

          <div className="sd-foot">
            Os dados ficam no seu dispositivo. Nada é enviado para servidores.
          </div>
        </div>
    </>
  );
}

export function SaudePage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ajustes" />
          </IonButtons>
          <IonTitle>Saúde & Wearable</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <SaudeContent />
      </IonContent>
    </IonPage>
  );
}

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

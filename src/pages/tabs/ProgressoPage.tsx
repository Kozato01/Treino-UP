import { IonContent, IonModal, IonPage } from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiAlertCircleOutline,
  mdiChevronDown,
  mdiChevronRight,
  mdiDumbbell,
  mdiFire,
  mdiHistory,
  mdiWeightLifter,
} from '@mdi/js';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { getExerciseById } from '../../data/exercises';
import { MUSCLE_GROUPS } from '../../data/workoutGenerator';
import { useData } from '../../stores/data';
import { formatDate, formatVolumeKg, formatTonnage, startOfWeek } from '../../utils/format';
import './ProgressoPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type SessionListItem = {
  id: number;
  workoutName: string;
  startedAt: number;
  endedAt: number | null;
  volume: number;
  sets: number;
  avgHeartRateBpm?: number | null;
  maxHeartRateBpm?: number | null;
  caloriesBurned?: number | null;
};

type MonthGroup = {
  key: string;
  label: string;
  totalVolume: number;
  sessions: SessionListItem[];
};

type MuscleOption = { id: string; label: string };
type ChartPoint = { date: Date; volume: number; sets: number };

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: {
    x: { ticks: { color: '#9BA0B0', font: { size: 10 } }, grid: { color: '#1F222C' } },
    y: { ticks: { color: '#9BA0B0', font: { size: 10 } }, grid: { color: '#1F222C' } },
  },
} as const;

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ProgressoPage() {
  const history = useHistory();
  const [tab, setTab] = useState<'historico' | 'graficos'>('historico');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showPastMonths, setShowPastMonths] = useState(false);
  const [expandedPastMonths, setExpandedPastMonths] = useState<Set<string>>(new Set());

  const sessions = useData((s) => s.sessions);
  const sessionSets = useData((s) => s.sessionSets);

  const togglePastMonth = (key: string) =>
    setExpandedPastMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const sessionsByMonth = useMemo<MonthGroup[]>(() => {
    const vol = new Map<number, { volume: number; sets: number }>();
    for (const s of sessionSets) {
      const agg = vol.get(s.sessionId) ?? { volume: 0, sets: 0 };
      agg.volume += (s.reps ?? 0) * (s.weightKg ?? 0);
      agg.sets += 1;
      vol.set(s.sessionId, agg);
    }
    const items: SessionListItem[] = sessions
      .filter((s) => s.endedAt != null)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((s) => {
        const agg = vol.get(s.id) ?? { volume: 0, sets: 0 };
        return {
          id: s.id,
          workoutName: s.workoutName,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          volume: agg.volume,
          sets: agg.sets,
          avgHeartRateBpm: s.avgHeartRateBpm ?? null,
          maxHeartRateBpm: s.maxHeartRateBpm ?? null,
          caloriesBurned: s.caloriesBurned ?? null,
        };
      });

    const groupMap = new Map<string, SessionListItem[]>();
    for (const item of items) {
      const key = monthKey(new Date(item.startedAt));
      const arr = groupMap.get(key) ?? [];
      arr.push(item);
      groupMap.set(key, arr);
    }

    return Array.from(groupMap.entries()).map(([key, list]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        key,
        label: `${FULL_MONTH_NAMES[month - 1]} ${year}`,
        totalVolume: list.reduce((acc, s) => acc + s.volume, 0),
        sessions: list,
      };
    });
  }, [sessions, sessionSets]);

  const trackedMuscles = useMemo<MuscleOption[]>(() => {
    const seen = new Set<string>();
    for (const s of sessionSets) {
      const ex = getExerciseById(s.exerciseId);
      if (!ex) continue;
      for (const m of ex.primaryMuscles) seen.add(m);
    }
    return MUSCLE_GROUPS.filter((g) => seen.has(g.id));
  }, [sessionSets]);

  const effectiveMuscle = selectedMuscle ?? trackedMuscles[0]?.id ?? null;

  // === KPI 1: STREAK ===
  const streak = useMemo(() => {
    const daysWithSession = new Set<string>();
    for (const s of sessions) {
      if (s.endedAt == null) continue;
      daysWithSession.add(isoDay(new Date(s.startedAt)));
    }
    let count = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!daysWithSession.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (daysWithSession.has(isoDay(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [sessions]);

  // === KPI 2: VOLUME TOTAL ===
  const totalVolume = useMemo(() => {
    let v = 0;
    for (const s of sessionSets) {
      if (!s.completed || s.technique === 'warmup') continue;
      v += (s.reps ?? 0) * (s.weightKg ?? 0);
    }
    return v;
  }, [sessionSets]);

  // === KPI 3: MÊS ATUAL (sempre visível; comparativo com ano passado quando disponível) ===
  const monthCompare = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const prevYear = curYear - 1;

    const sumMonth = (year: number, month: number) => {
      const start = new Date(year, month, 1).getTime();
      const end = new Date(year, month + 1, 1).getTime();
      let volume = 0;
      let sessionsCount = 0;
      const sessionsInRange = new Set<number>();
      for (const sess of sessions) {
        if (sess.startedAt >= start && sess.startedAt < end && sess.endedAt != null) {
          sessionsInRange.add(sess.id);
          sessionsCount++;
        }
      }
      for (const ss of sessionSets) {
        if (!sessionsInRange.has(ss.sessionId)) continue;
        volume += (ss.reps ?? 0) * (ss.weightKg ?? 0);
      }
      return { volume, sessions: sessionsCount };
    };

    const current = sumMonth(curYear, curMonth);
    const previous = sumMonth(prevYear, curMonth);
    const hasPrevious = previous.sessions > 0 || previous.volume > 0;
    const volumeDelta =
      hasPrevious && previous.volume > 0
        ? ((current.volume - previous.volume) / previous.volume) * 100
        : null;

    return { monthName: MONTH_NAMES[curMonth], current, previous, hasPrevious, volumeDelta };
  }, [sessions, sessionSets]);

  // === KPI 4: PLATEAU DETECTOR ===
  const plateaus = useMemo(() => {
    const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 60 * 60 * 1000;
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const byExercise = new Map<string, { date: number; maxWeight: number }[]>();
    for (const ss of sessionSets) {
      if (!ss.completed || ss.weightKg == null) continue;
      const sess = sessionById.get(ss.sessionId);
      if (!sess || sess.startedAt < eightWeeksAgo) continue;
      const arr = byExercise.get(ss.exerciseId) ?? [];
      const existing = arr.find((x) => x.date === sess.startedAt);
      if (existing) {
        if (ss.weightKg > existing.maxWeight) existing.maxWeight = ss.weightKg;
      } else {
        arr.push({ date: sess.startedAt, maxWeight: ss.weightKg });
      }
      byExercise.set(ss.exerciseId, arr);
    }
    const result: { exerciseId: string; name: string; weight: number; sessions: number }[] = [];
    byExercise.forEach((arr, exerciseId) => {
      if (arr.length < 3) return;
      arr.sort((a, b) => a.date - b.date);
      const last3 = arr.slice(-3);
      const max = Math.max(...last3.map((x) => x.maxWeight));
      const min = Math.min(...last3.map((x) => x.maxWeight));
      if (max === min && max > 0) {
        const ex = getExerciseById(exerciseId);
        result.push({ exerciseId, name: ex?.namePt ?? ex?.name ?? exerciseId, weight: max, sessions: last3.length });
      }
    });
    return result.slice(0, 5);
  }, [sessions, sessionSets]);

  const chartData = useMemo(() => {
    if (!effectiveMuscle) return { points: [] as ChartPoint[], totalVolume: 0, totalSets: 0 };
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const bySession = new Map<number, { volume: number; sets: number }>();
    for (const s of sessionSets) {
      if (!s.completed) continue;
      const ex = getExerciseById(s.exerciseId);
      if (!ex || !ex.primaryMuscles.includes(effectiveMuscle)) continue;
      const agg = bySession.get(s.sessionId) ?? { volume: 0, sets: 0 };
      agg.volume += (s.reps ?? 0) * (s.weightKg ?? 0);
      agg.sets += 1;
      bySession.set(s.sessionId, agg);
    }
    const points: ChartPoint[] = [];
    let totalVol = 0;
    let totalSets = 0;
    bySession.forEach((agg, sid) => {
      const sess = sessionById.get(sid);
      if (!sess) return;
      points.push({ date: new Date(sess.startedAt), ...agg });
      totalVol += agg.volume;
      totalSets += agg.sets;
    });
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { points, totalVolume: totalVol, totalSets };
  }, [effectiveMuscle, sessions, sessionSets]);

  const weeklyVolume = useMemo(() => {
    const sessionsById = new Map(sessions.map((s) => [s.id, s]));
    const now = Date.now();
    const result: { label: string; value: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(new Date(now - i * 7 * 24 * 60 * 60 * 1000));
      const wsMs = weekStart.getTime();
      const weMs = wsMs + 7 * 24 * 60 * 60 * 1000;
      let volume = 0;
      for (const s of sessionSets) {
        const sess = sessionsById.get(s.sessionId);
        if (!sess) continue;
        if (sess.startedAt < wsMs || sess.startedAt >= weMs) continue;
        volume += (s.reps ?? 0) * (s.weightKg ?? 0);
      }
      result.push({ label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`, value: volume });
    }
    return result;
  }, [sessions, sessionSets]);

  const selectedMuscleOption = trackedMuscles.find((m) => m.id === effectiveMuscle) ?? null;

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="pr-tabs">
          <button
            className={`pr-tab${tab === 'historico' ? ' is-active' : ''}`}
            onClick={() => setTab('historico')}>
            HISTÓRICO
          </button>
          <button
            className={`pr-tab${tab === 'graficos' ? ' is-active' : ''}`}
            onClick={() => setTab('graficos')}>
            ESTATÍSTICAS
          </button>
        </div>

        {tab === 'historico' ? (
          <div className="pr-list">
            {sessionsByMonth.length === 0 ? (
              <div className="empty-state">
                <Icon path={mdiHistory} size={2.2} color="var(--outline)" />
                <span>Nenhuma sessão registrada ainda</span>
              </div>
            ) : (
              <>
                {/* Mês mais recente — sempre visível */}
                <span className="pr-month-label">{sessionsByMonth[0].label}</span>
                {sessionsByMonth[0].sessions.map((item) => (
                  <button
                    key={item.id}
                    className="pr-sess"
                    onClick={() => history.push(`/sessao/${item.id}`)}>
                    <span className="pr-sess__body">
                      <span className="pr-sess__title">{item.workoutName}</span>
                      <span className="pr-sess__date">{formatDate(item.startedAt).toUpperCase()}</span>
                      <span className="pr-sess__tags">
                        <span className="tag">{item.sets} SÉRIES</span>
                        <span className="tag tag--outline">{formatVolumeKg(item.volume)}</span>
                        {item.avgHeartRateBpm != null && (
                          <span className="tag tag--outline">{item.avgHeartRateBpm} BPM</span>
                        )}
                        {item.caloriesBurned != null && (
                          <span className="tag tag--outline">{item.caloriesBurned} KCAL</span>
                        )}
                      </span>
                    </span>
                    <Icon path={mdiChevronRight} size={0.9} color="var(--text-mute)" />
                  </button>
                ))}

                {/* Meses anteriores — colapsados por padrão */}
                {sessionsByMonth.length > 1 && (
                  <>
                    <button
                      className="pr-past-toggle"
                      onClick={() => setShowPastMonths((p) => !p)}>
                      <Icon path={mdiHistory} size={0.75} color="var(--text-mute)" />
                      <span>{showPastMonths ? 'Ocultar meses anteriores' : 'Ver meses anteriores'}</span>
                      <Icon
                        path={showPastMonths ? mdiChevronDown : mdiChevronRight}
                        size={0.8}
                        color="var(--text-mute)"
                      />
                    </button>

                    {showPastMonths &&
                      sessionsByMonth.slice(1).map((group) => (
                        <div key={group.key}>
                          <button
                            className="pr-month-row"
                            onClick={() => togglePastMonth(group.key)}>
                            <div className="pr-month-row__info">
                              <span className="pr-month-row__label">{group.label}</span>
                              <span className="pr-month-row__meta">
                                {group.sessions.length}{' '}
                                {group.sessions.length === 1 ? 'treino' : 'treinos'} ·{' '}
                                {formatVolumeKg(group.totalVolume)}
                              </span>
                            </div>
                            <Icon
                              path={expandedPastMonths.has(group.key) ? mdiChevronDown : mdiChevronRight}
                              size={0.8}
                              color="var(--text-mute)"
                            />
                          </button>
                          {expandedPastMonths.has(group.key) &&
                            group.sessions.map((item) => (
                              <button
                                key={item.id}
                                className="pr-sess"
                                onClick={() => history.push(`/sessao/${item.id}`)}>
                                <span className="pr-sess__body">
                                  <span className="pr-sess__title">{item.workoutName}</span>
                                  <span className="pr-sess__date">
                                    {formatDate(item.startedAt).toUpperCase()}
                                  </span>
                                  <span className="pr-sess__tags">
                                    <span className="tag">{item.sets} SÉRIES</span>
                                    <span className="tag tag--outline">{formatVolumeKg(item.volume)}</span>
                                    {item.avgHeartRateBpm != null && (
                                      <span className="tag tag--outline">{item.avgHeartRateBpm} BPM</span>
                                    )}
                                    {item.caloriesBurned != null && (
                                      <span className="tag tag--outline">{item.caloriesBurned} KCAL</span>
                                    )}
                                  </span>
                                </span>
                                <Icon path={mdiChevronRight} size={0.9} color="var(--text-mute)" />
                              </button>
                            ))}
                        </div>
                      ))}
                  </>
                )}
              </>
            )}
          </div>
        ) : sessionSets.length === 0 ? (
          <div className="empty-state">
            <Icon path={mdiHistory} size={2.2} color="var(--outline)" />
            <span>Faça seu primeiro treino para ver suas estatísticas aqui</span>
          </div>
        ) : (
          <div className="pr-charts">
            {/* DESTAQUES */}
            {totalVolume > 0 && (
              <div className="pr-kpi-row">
                <div className="pr-kpi">
                  <Icon path={mdiFire} size={1} color="var(--neon-orange)" />
                  <span className="pr-kpi__value" style={{ color: 'var(--neon-orange)' }}>
                    {streak}
                  </span>
                  <span className="pr-kpi__label">
                    {streak === 1 ? 'DIA SEGUIDO' : 'DIAS SEGUIDOS'}
                  </span>
                </div>
                <div className="pr-kpi">
                  <Icon path={mdiWeightLifter} size={1} color="var(--neon-green)" />
                  <span className="pr-kpi__value" style={{ color: 'var(--neon-green)' }}>
                    {formatTonnage(totalVolume)}
                  </span>
                  <span className="pr-kpi__label">VOLUME TOTAL</span>
                </div>
              </div>
            )}

            {/* MÊS ATUAL — sempre visível quando há sessões no mês */}
            {monthCompare.current.sessions > 0 && (
              <div className="card">
                <span className="pr-chart__title">
                  {monthCompare.monthName.toUpperCase()} — ESTE MÊS
                </span>
                {monthCompare.hasPrevious ? (
                  <div className="pr-compare">
                    <div className="pr-compare__col">
                      <span className="pr-compare__year">ESTE ANO</span>
                      <span className="pr-compare__value" style={{ color: 'var(--neon-green)' }}>
                        {formatVolumeKg(monthCompare.current.volume)}
                      </span>
                      <span className="pr-compare__sub">
                        {monthCompare.current.sessions}{' '}
                        {monthCompare.current.sessions === 1 ? 'sessão' : 'sessões'}
                      </span>
                    </div>
                    <div className="pr-compare__delta">
                      {monthCompare.volumeDelta != null && (
                        <span
                          className="pr-compare__pct"
                          style={{
                            color: monthCompare.volumeDelta >= 0 ? 'var(--neon-green)' : 'var(--neon-red)',
                          }}>
                          {monthCompare.volumeDelta >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(monthCompare.volumeDelta).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="pr-compare__col">
                      <span className="pr-compare__year">ANO PASSADO</span>
                      <span className="pr-compare__value" style={{ color: 'var(--text-dim)' }}>
                        {formatVolumeKg(monthCompare.previous.volume)}
                      </span>
                      <span className="pr-compare__sub">
                        {monthCompare.previous.sessions}{' '}
                        {monthCompare.previous.sessions === 1 ? 'sessão' : 'sessões'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pr-row" style={{ marginTop: 8 }}>
                    <PRBlock
                      label="VOLUME"
                      value={formatVolumeKg(monthCompare.current.volume)}
                      color="var(--neon-green)"
                    />
                    <PRBlock
                      label="SESSÕES"
                      value={String(monthCompare.current.sessions)}
                      color="var(--neon-cyan)"
                    />
                  </div>
                )}
              </div>
            )}

            {/* PLATEAU DETECTOR */}
            {plateaus.length > 0 && (
              <div className="card">
                <span className="pr-chart__title">EXERCÍCIOS EM PLATÔ</span>
                <span className="pr-chart__sub">Mesmo peso nas últimas 3 sessões</span>
                <div className="pr-plateau-list">
                  {plateaus.map((p) => (
                    <div key={p.exerciseId} className="pr-plateau-row">
                      <Icon path={mdiAlertCircleOutline} size={0.8} color="var(--neon-yellow)" />
                      <div className="pr-plateau-info">
                        <span className="pr-plateau-name">{p.name}</span>
                        <span className="pr-plateau-meta">Travado em {p.weight} kg</span>
                      </div>
                    </div>
                  ))}
                  <span className="pr-plateau-hint">
                    Dica: tente variar reps, descanso ou cadência para destravar.
                  </span>
                </div>
              </div>
            )}

            {/* VOLUME SEMANAL */}
            {!weeklyVolume.every((w) => w.value === 0) && (
              <div className="card">
                <span className="pr-chart__title">VOLUME SEMANAL</span>
                <span className="pr-chart__sub">Últimas 8 semanas</span>
                <div className="pr-canvas">
                  <Line
                    data={{
                      labels: weeklyVolume.map((w) => w.label),
                      datasets: [
                        {
                          data: weeklyVolume.map((w) => w.value),
                          borderColor: '#C6FF4A',
                          backgroundColor: 'rgba(198, 255, 74, 0.15)',
                          pointBackgroundColor: '#C6FF4A',
                          borderWidth: 3,
                          tension: 0.35,
                          fill: true,
                        },
                      ],
                    }}
                    options={CHART_BASE as object}
                  />
                </div>
              </div>
            )}

            {/* PROGRESSÃO POR GRUPO MUSCULAR */}
            {trackedMuscles.length > 0 && (
              <div className="card">
                <span className="pr-chart__title">PROGRESSÃO POR GRUPO MUSCULAR</span>
                <>
                  <button className="pr-picker" onClick={() => setPickerOpen(true)}>
                    <Icon path={mdiDumbbell} size={0.7} color="var(--neon-green)" />
                    <span className="pr-picker__text">
                      {selectedMuscleOption ? selectedMuscleOption.label : 'Selecionar'}
                    </span>
                    <Icon path={mdiChevronDown} size={0.8} color="var(--text-dim)" />
                  </button>
                  {chartData.points.length >= 1 ? (
                    <>
                      <div className="pr-row">
                        <PRBlock label="VOLUME TOTAL" value={formatVolumeKg(chartData.totalVolume)} color="var(--neon-green)" />
                        <PRBlock label="SÉRIES" value={String(chartData.totalSets)} color="var(--neon-cyan)" />
                        <PRBlock label="SESSÕES" value={String(chartData.points.length)} color="var(--neon-pink)" />
                      </div>
                      <div className="pr-canvas">
                        <Line
                          data={{
                            labels: chartData.points.map(
                              (p) => `${p.date.getDate()}/${p.date.getMonth() + 1}`
                            ),
                            datasets: [
                              {
                                data: chartData.points.map((p) => p.volume),
                                borderColor: '#4AE3FF',
                                backgroundColor: 'rgba(74, 227, 255, 0.15)',
                                pointBackgroundColor: '#4AE3FF',
                                borderWidth: 3,
                                tension: 0.35,
                                fill: true,
                              },
                            ],
                          }}
                          options={CHART_BASE as object}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="pr-hint">Sem dados para este grupo muscular ainda.</span>
                  )}
                </>
              </div>
            )}
          </div>
        )}

        <IonModal isOpen={pickerOpen} onDidDismiss={() => setPickerOpen(false)}>
          <div className="pr-modal">
            <h2 className="pr-modal__title">Grupos musculares</h2>
            <div className="pr-modal__list">
              {trackedMuscles.map((m) => (
                <button
                  key={m.id}
                  className="pr-modal__item"
                  onClick={() => {
                    setSelectedMuscle(m.id);
                    setPickerOpen(false);
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
            <button className="neon-cta" onClick={() => setPickerOpen(false)}>
              FECHAR
            </button>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

function PRBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="pr-block">
      <span className="pr-block__label">{label}</span>
      <span className="pr-block__value" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

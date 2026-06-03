import { IonContent, IonPage } from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiCalendarCheck,
  mdiCalendarToday,
  mdiChartBar,
  mdiCheckCircle,
  mdiChevronRight,
  mdiClipboardPlusOutline,
  mdiFire,
  mdiHistory,
  mdiLeaf,
  mdiPlay,
  mdiSleep,
  mdiTarget,
  mdiTrashCanOutline,
  mdiWeightKilogram,
  mdiWeightLifter,
} from '@mdi/js';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { toIsoDay, useData } from '../../stores/data';
import { useSettings } from '../../stores/settings';
import { getExerciseById } from '../../data/exercises';
import { confirmDestructive } from '../../utils/confirm';
import { formatDate, startOfWeek } from '../../utils/format';
import { getTodayWeekday } from '../../utils/weekday';
import { WEEKDAY_LABELS, WEEKDAYS } from '../../types';
import './HomePage.css';

const GOAL_TYPE_META: Record<string, { icon: string; color: string; unit: string }> = {
  weight: { icon: mdiWeightLifter, color: 'var(--neon-green)', unit: 'kg' },
  frequency: { icon: mdiCalendarCheck, color: 'var(--neon-cyan)', unit: 'x/sem' },
  volume: { icon: mdiChartBar, color: 'var(--neon-pink)', unit: 'kg' },
};

export function HomePage() {
  const history = useHistory();
  const workouts = useData((s) => s.workouts);
  const sessions = useData((s) => s.sessions);
  const sessionSets = useData((s) => s.sessionSets);
  const goals = useData((s) => s.goals);
  const deleteGoal = useData((s) => s.deleteGoal);
  const workoutPacks = useData((s) => s.workoutPacks);
  const activePackId = useData((s) => s.activePackId);
  const skippedDates = useData((s) => s.skippedDates);
  const skipDate = useData((s) => s.skipDate);
  const unskipDate = useData((s) => s.unskipDate);
  // const activeTimedSession = useData((s) => s.activeTimedSession);

  const today = new Date();
  const todayIso = toIsoDay(today);
  const todayWeekday = getTodayWeekday();
  const activePack = activePackId != null ? workoutPacks.find((p) => p.id === activePackId) : null;
  const todayWorkoutId = activePack ? activePack.assignments[todayWeekday] : undefined;
  const todayWorkout = todayWorkoutId != null ? workouts.find((w) => w.id === todayWorkoutId) : null;
  const isTodaySkipped = skippedDates.includes(todayIso);
  // Treino do dia já foi concluído (sessão hoje com workoutId match e endedAt != null)?
  const todayWorkoutDone = useMemo(() => {
    if (todayWorkoutId == null) return false;
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    return sessions.some(
      (s) =>
        s.workoutId === todayWorkoutId &&
        s.endedAt != null &&
        s.startedAt >= startOfDay.getTime() &&
        s.startedAt <= endOfDay.getTime(),
    );
  }, [sessions, todayWorkoutId, today]);

  const data = useMemo(() => {
    const weekStartMs = startOfWeek(new Date()).getTime();
    const weekSessionIds = new Set(
      sessions.filter((s) => s.startedAt >= weekStartMs).map((s) => s.id)
    );
    const totalVolumeThisWeek = sessionSets.reduce((acc, ss) => {
      if (!weekSessionIds.has(ss.sessionId)) return acc;
      if (ss.technique === 'warmup') return acc;
      return acc + (ss.reps ?? 0) * (ss.weightKg ?? 0);
    }, 0);
    const lastSession =
      sessions.length === 0
        ? null
        : sessions.slice().sort((a, b) => b.startedAt - a.startedAt)[0];
    const activeGoals = goals.filter((g) => !g.achieved).slice(0, 3);

    // streak: dias consecutivos com pelo menos 1 sessão até hoje
    const sorted = sessions.slice().sort((a, b) => b.startedAt - a.startedAt);
    let streak = 0;
    const checked = new Date(today);
    checked.setHours(0, 0, 0, 0);
    for (let d = 0; d < 365; d++) {
      const dayStart = new Date(checked); dayStart.setDate(checked.getDate() - d); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999);
      const hadSession = sorted.some(s => s.startedAt >= dayStart.getTime() && s.startedAt <= dayEnd.getTime() && s.endedAt != null);
      if (hadSession) streak++;
      else if (d > 0) break; // dia de hoje sem sessão ainda não quebra streak
    }

    return {
      sessionsThisWeek: weekSessionIds.size,
      lastSession,
      activeGoals,
      totalVolumeThisWeek,
      streak,
    };
  }, [workouts, sessions, sessionSets, goals]);

  const nextScheduledDays = useMemo(() => {
    if (!activePack) return [];
    const todayIdx = WEEKDAYS.indexOf(todayWeekday);
    const result = [];
    for (let i = 1; i <= 7 && result.length < 3; i++) {
      const idx = (todayIdx + i) % 7;
      const wd = WEEKDAYS[idx];
      const workoutId = activePack.assignments[wd];
      if (workoutId == null) continue;
      const workout = workouts.find((w) => w.id === workoutId) ?? null;
      if (!workout) continue;
      result.push({ weekday: wd, label: WEEKDAY_LABELS[wd], workout });
    }
    return result;
  }, [activePack, todayWeekday, workouts]);

  const userName = useSettings((s) => s.name);
  const greeting = getGreeting(today.getHours(), userName);

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="home-hero">
          <div className="row-between">
            <span className="home-hero__brand">ACADEMIA</span>
            <span className="home-hero__dot" />
          </div>
          <h1 className="home-hero__greeting">{greeting}</h1>
          <span className="home-hero__date">{formatDate(today).toUpperCase()}</span>
        </div>

        <div className="home-stats">
          <StatBox
            iconPath={mdiCalendarCheck}
            label="ESTA SEMANA"
            value={String(data.sessionsThisWeek)}
            suffix="sessões"
            accent="var(--neon-pink)"
          />
          <StatBox
            iconPath={mdiWeightKilogram}
            label="CARGA SEMANAL"
            value={formatKg(data.totalVolumeThisWeek)}
            suffix="kg"
            accent="var(--neon-cyan)"
          />
          <StatBox
            iconPath={mdiFire}
            label="SEQUÊNCIA"
            value={String(data.streak)}
            suffix="dias"
            accent="var(--neon-orange)"
          />
        </div>

        {!activePack && (
          <div className="home-block">
            <h2 className="home-block__title">Treino de hoje</h2>
            <button
              className="home-today home-onboard"
              onClick={() => history.push('/treinos')}>
              <Icon path={mdiCalendarCheck} size={1} color="var(--neon-cyan)" />
              <span className="home-today__body">
                <span className="home-today__title">ATIVE UMA ROTINA</span>
                <span className="home-today__sub">Defina seus dias de treino na aba Treinos</span>
              </span>
              <span className="home-today__cta" style={{ background: 'var(--neon-cyan)' }}>
                <Icon path={mdiChevronRight} size={0.8} color="#0A0B0F" />
                VER
              </span>
            </button>
          </div>
        )}

        {activePack && (
          <div className="home-block">
            <h2 className="home-block__title">Treino de hoje · {WEEKDAY_LABELS[todayWeekday]}</h2>
            {todayWorkout && todayWorkoutDone ? (
              <div className="home-today home-today--done">
                <Icon path={mdiCheckCircle} size={1} color="var(--neon-green)" />
                <span className="home-today__body">
                  <span className="home-today__title">TREINO CONCLUÍDO ✓</span>
                  <span className="home-today__sub">{todayWorkout.name} — manda mais amanhã!</span>
                </span>
              </div>
            ) : todayWorkout && isTodaySkipped ? (
              <div className="home-today home-today--rest">
                <Icon path={mdiSleep} size={1} color="var(--neon-cyan)" />
                <span className="home-today__body">
                  <span className="home-today__title">DESCANSO HOJE</span>
                  <span className="home-today__sub">Você marcou hoje como descanso.</span>
                </span>
                <button
                  className="home-today__undo"
                  onClick={() => unskipDate(todayIso)}>
                  DESFAZER
                </button>
              </div>
            ) : todayWorkout ? (
              <>
                <button
                  className="home-today"
                  onClick={() => history.push(`/treino/${todayWorkout.id}`)}>
                  <Icon path={mdiCalendarToday} size={1} color="var(--neon-green)" />
                  <span className="home-today__body">
                    <span className="home-today__title">{todayWorkout.name}</span>
                    <span className="home-today__sub">Ficha: {activePack.name}</span>
                  </span>
                  <span className="home-today__cta">
                    <Icon path={mdiPlay} size={0.8} color="#0A0B0F" />
                    INICIAR
                  </span>
                </button>
                <button
                  className="home-today__skip"
                  onClick={() => skipDate(todayIso)}>
                  Não vou treinar hoje
                </button>
              </>
            ) : (
              <div className="home-today home-today--rest">
                <Icon path={mdiLeaf} size={1} color="var(--neon-cyan)" />
                <span className="home-today__body">
                  <span className="home-today__title">DIA DE DESCANSO</span>
                  <span className="home-today__sub">Recupere — amanhã volta forte.</span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="home-block">
          <h2 className="home-block__title">Próximos treinos</h2>
          {activePack ? (
            nextScheduledDays.length === 0 ? (
              <EmptyHint iconPath={mdiCalendarCheck} text="Nenhum treino agendado nos próximos dias" />
            ) : (
              nextScheduledDays.map(({ weekday, label, workout }) => (
                <button
                  key={weekday}
                  className="home-workout"
                  onClick={() => history.push(`/treino/${workout.id}`)}>
                  <span
                    className="home-workout__bar"
                    style={{ background: workout.color ?? 'var(--neon-green)' }}
                  />
                  <span className="home-workout__body">
                    <span className="home-workout__day">{label}</span>
                    <span className="home-workout__title">{workout.name}</span>
                    {workout.description && (
                      <span className="home-workout__desc">{workout.description}</span>
                    )}
                  </span>
                  <Icon path={mdiChevronRight} size={1.1} color="var(--text-mute)" />
                </button>
              ))
            )
          ) : workouts.length === 0 ? (
            <EmptyHint iconPath={mdiClipboardPlusOutline} text="Crie seu primeiro treino na aba Treinos" />
          ) : (
            workouts.slice(0, 3).map((w) => (
              <button
                key={w.id}
                className="home-workout"
                onClick={() => history.push(`/treino/${w.id}`)}>
                <span
                  className="home-workout__bar"
                  style={{ background: w.color ?? 'var(--neon-green)' }}
                />
                <span className="home-workout__body">
                  <span className="home-workout__title">{w.name}</span>
                  {w.description && <span className="home-workout__desc">{w.description}</span>}
                </span>
                <Icon path={mdiChevronRight} size={1.1} color="var(--text-mute)" />
              </button>
            ))
          )}
        </div>

        {data.lastSession && (
          <div className="home-block">
            <h2 className="home-block__title">Última sessão</h2>
            <button
              className="home-last"
              onClick={() => history.push(`/sessao/${data.lastSession!.id}`)}>
              <Icon path={mdiHistory} size={1} color="var(--neon-cyan)" />
              <span className="home-last__body">
                <span className="home-last__title">{data.lastSession.workoutName}</span>
                <span className="home-last__sub">{formatDate(data.lastSession.startedAt)}</span>
              </span>
              <Icon path={mdiChevronRight} size={1} color="var(--text-mute)" />
            </button>
          </div>
        )}

        <div className="home-block">
          <div className="row-between">
            <h2 className="home-block__title">Metas</h2>
            <button className="home-add" onClick={() => history.push('/nova-meta')}>
              + NOVA
            </button>
          </div>
          {data.activeGoals.length === 0 ? (
            <EmptyHint iconPath={mdiTarget} text="Defina uma meta para acompanhar seu progresso" />
          ) : (
            data.activeGoals.map((g) => {
              const meta = GOAL_TYPE_META[g.type] ?? GOAL_TYPE_META.weight;
              const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100 || 0));
              const exercise = g.exerciseId ? getExerciseById(g.exerciseId) : null;
              const subtitle = exercise ? (exercise.namePt ?? exercise.name) : goalTypeLabel(g.type);
              return (
                <button key={g.id} className="home-goal" onClick={() => history.push(`/meta/${g.id}`)}>
                  <div className="home-goal__head">
                    <span className="home-goal__icon" style={{ background: meta.color }}>
                      <Icon path={meta.icon} size={0.7} color="#0A0B0F" />
                    </span>
                    <div className="home-goal__info">
                      <span className="home-goal__type">{goalTypeLabel(g.type).toUpperCase()}</span>
                      <span className="home-goal__sub">{subtitle}</span>
                    </div>
                    <div className="home-goal__right">
                      <span className="home-goal__value" style={{ color: meta.color }}>
                        {g.currentValue.toFixed(0)} / {g.targetValue.toFixed(0)} {meta.unit}
                      </span>
                      <span
                        className="home-goal__del"
                        onClick={(e) => { e.stopPropagation(); confirmDestructive('Excluir meta?', 'Esta ação não pode ser desfeita.', 'Excluir', () => deleteGoal(g.id)); }}>
                        <Icon path={mdiTrashCanOutline} size={0.7} color="var(--neon-pink)" />
                      </span>
                    </div>
                  </div>
                  <div className="home-goal__track">
                    <div className="home-goal__fill" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function StatBox({
  iconPath,
  label,
  value,
  suffix,
  accent,
}: {
  iconPath: string;
  label: string;
  value: string;
  suffix: string;
  accent: string;
}) {
  return (
    <div className="home-stat">
      <div className="home-stat__head">
        <Icon path={iconPath} size={0.7} color={accent} />
        <span className="home-stat__label">{label}</span>
      </div>
      <div className="home-stat__body">
        <span className="home-stat__value" style={{ color: accent }}>
          {value}
        </span>
        <span className="home-stat__suffix">{suffix}</span>
      </div>
    </div>
  );
}

function EmptyHint({ iconPath, text }: { iconPath: string; text: string }) {
  return (
    <div className="home-empty">
      <Icon path={iconPath} size={1.3} color="#3B4050" />
      <span>{text}</span>
    </div>
  );
}

function getGreeting(hour: number, name: string): string {
  const who = name.trim() ? name.trim().toUpperCase() : null;
  if (hour < 6) return who ? `BORA MADRUGAR, ${who}?` : 'BORA MADRUGAR?';
  if (hour < 12) return who ? `BOM DIA, ${who}` : 'BOM DIA, ATLETA';
  if (hour < 18) return who ? `BOA TARDE, ${who}` : 'BOA TARDE, FERA';
  return who ? `BOA NOITE, ${who}` : 'BOA NOITE, GUERREIRO';
}

function goalTypeLabel(type: string): string {
  if (type === 'weight') return 'Carga';
  if (type === 'frequency') return 'Frequência';
  if (type === 'volume') return 'Volume';
  return type;
}

function formatKg(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

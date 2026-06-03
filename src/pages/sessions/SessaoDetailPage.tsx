import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import { mdiCalendarClock, mdiTrashCanOutline } from '@mdi/js';
import { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import { getExerciseById } from '../../data/exercises';
import { useData } from '../../stores/data';
import { confirmDestructive } from '../../utils/confirm';
import { formatDateTime, formatMMSS, formatWeight } from '../../utils/format';
import './SessaoDetailPage.css';

type GroupedExercise = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNamePt: string | null;
  exerciseOrder: number;
  sets: {
    id: number;
    setNumber: number;
    reps: number | null;
    weightKg: number | null;
    rpe: number | null;
  }[];
};

export function SessaoDetailPage() {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);

  const sessions = useData((s) => s.sessions);
  const session = sessions.find((x) => x.id === sessionId);
  const sessionSets = useData((s) => s.sessionSets);
  const deleteSessionAction = useData((s) => s.deleteSession);

  const groups = useMemo<GroupedExercise[]>(() => {
    const rows = sessionSets
      .filter((s) => s.sessionId === sessionId)
      .sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.setNumber - b.setNumber);
    const grouped = new Map<string, GroupedExercise>();
    for (const r of rows) {
      const key = `${r.exerciseOrder}-${r.exerciseId}`;
      if (!grouped.has(key)) {
        const ex = getExerciseById(r.exerciseId);
        grouped.set(key, {
          key,
          exerciseId: r.exerciseId,
          exerciseName: ex?.name ?? r.exerciseId,
          exerciseNamePt: ex?.namePt ?? null,
          exerciseOrder: r.exerciseOrder,
          sets: [],
        });
      }
      grouped.get(key)!.sets.push({
        id: r.id,
        setNumber: r.setNumber,
        reps: r.reps,
        weightKg: r.weightKg,
        rpe: r.rpe,
      });
    }
    return Array.from(grouped.values());
  }, [sessionSets, sessionId]);

  if (!session) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/progresso" />
            </IonButtons>
            <IonTitle>Sessão</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="empty-state">
            <span>Sessão não encontrada.</span>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const durationSec =
    session.endedAt && session.startedAt
      ? Math.floor((session.endedAt - session.startedAt) / 1000)
      : 0;
  const totalVolume = groups.reduce(
    (acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.reps ?? 0) * (set.weightKg ?? 0), 0),
    0
  );
  const totalSets = groups.reduce((acc, ex) => acc + ex.sets.length, 0);
  const totalReps = groups.reduce(
    (acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.reps ?? 0), 0),
    0
  );
  const avgLoad = totalReps > 0 ? totalVolume / totalReps : 0;
  const durationMin = durationSec > 0 ? durationSec / 60 : 0;
  const density = durationMin > 0 ? totalVolume / durationMin : 0;

  const previousVolume = (() => {
    if (!session?.workoutId) return null;
    const prev = sessions
      .filter(
        (s) =>
          s.workoutId === session.workoutId &&
          s.id !== sessionId &&
          s.endedAt != null &&
          s.startedAt < session.startedAt
      )
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    if (!prev) return null;
    const vol = sessionSets
      .filter((s) => s.sessionId === prev.id)
      .reduce((acc, s) => acc + (s.reps ?? 0) * (s.weightKg ?? 0), 0);
    return vol > 0 ? vol : null;
  })();
  const volumeDelta =
    previousVolume != null && previousVolume > 0
      ? ((totalVolume - previousVolume) / previousVolume) * 100
      : null;

  const onDelete = () => {
    confirmDestructive('Excluir sessão?', 'Esta ação não pode ser desfeita.', 'Excluir', () => {
      deleteSessionAction(sessionId);
      history.goBack();
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/progresso" />
          </IonButtons>
          <IonTitle>{session.workoutName}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDelete}>
              <IonIcon slot="icon-only">
                <Icon path={mdiTrashCanOutline} size={0.9} color="var(--neon-pink)" />
              </IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          <div className="sd-hero">
            <div className="sd-hero__date">
              <Icon path={mdiCalendarClock} size={0.6} color="var(--neon-green)" />
              <span>{formatDateTime(session.startedAt).toUpperCase()}</span>
            </div>
            <h1 className="sd-hero__title">{session.workoutName}</h1>
            <div className="stat-row" style={{ marginTop: 12 }}>
              <div className="stat-cell">
                <span className="stat-cell__value" style={{ color: 'var(--neon-green)' }}>
                  {session.endedAt ? formatMMSS(durationSec) : '—'}
                </span>
                <span className="stat-cell__label">DURAÇÃO</span>
              </div>
              <span className="stat-divider" />
              <div className="stat-cell">
                <span className="stat-cell__value" style={{ color: 'var(--neon-cyan)' }}>
                  {totalSets}
                </span>
                <span className="stat-cell__label">SÉRIES</span>
              </div>
              <span className="stat-divider" />
              <div className="stat-cell">
                <span className="stat-cell__value" style={{ color: 'var(--neon-pink)' }}>
                  {totalVolume.toFixed(0)}
                </span>
                <span className="stat-cell__label">CARGA TOTAL</span>
                {volumeDelta != null && (
                  <span
                    className="sd-delta"
                    style={{ color: volumeDelta >= 0 ? 'var(--neon-green)' : 'var(--neon-pink)' }}>
                    {volumeDelta >= 0 ? '▲' : '▼'} {Math.abs(volumeDelta).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card sd-intensity">
            <span className="section-label" style={{ margin: 0 }}>INTENSIDADE</span>
            <div className="stat-row" style={{ marginTop: 10 }}>
              <div className="stat-cell">
                <span className="stat-cell__value" style={{ color: 'var(--neon-cyan)' }}>
                  {avgLoad.toFixed(1)}
                </span>
                <span className="stat-cell__label">CARGA MÉDIA (KG/REP)</span>
              </div>
              {durationSec > 0 && (
                <>
                  <span className="stat-divider" />
                  <div className="stat-cell">
                    <span className="stat-cell__value" style={{ color: 'var(--neon-green)' }}>
                      {density.toFixed(0)}
                    </span>
                    <span className="stat-cell__label">DENSIDADE (KG/MIN)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {(session.avgHeartRateBpm != null || session.maxHeartRateBpm != null || session.caloriesBurned != null) && (
            <div className="card sd-intensity">
              <span className="section-label" style={{ margin: 0 }}>WEARABLE</span>
              <div className="stat-row" style={{ marginTop: 10 }}>
                {session.avgHeartRateBpm != null && (
                  <div className="stat-cell">
                    <span className="stat-cell__value" style={{ color: 'var(--neon-pink)' }}>
                      {session.avgHeartRateBpm}
                    </span>
                    <span className="stat-cell__label">FC MÉDIA (BPM)</span>
                  </div>
                )}
                {session.maxHeartRateBpm != null && (
                  <>
                    <span className="stat-divider" />
                    <div className="stat-cell">
                      <span className="stat-cell__value" style={{ color: 'var(--neon-pink)' }}>
                        {session.maxHeartRateBpm}
                      </span>
                      <span className="stat-cell__label">FC MÁX (BPM)</span>
                    </div>
                  </>
                )}
                {session.caloriesBurned != null && (
                  <>
                    <span className="stat-divider" />
                    <div className="stat-cell">
                      <span className="stat-cell__value" style={{ color: 'var(--neon-orange)' }}>
                        {session.caloriesBurned}
                      </span>
                      <span className="stat-cell__label">KCAL</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <span className="section-label">EXERCÍCIOS</span>

          {groups.map((group, idx) => (
            <div key={group.key} className="card sd-ex">
              <div className="sd-ex__head">
                <div className="sd-ex__idx">{String(idx + 1).padStart(2, '0')}</div>
                <span className="sd-ex__title">
                  {group.exerciseNamePt ?? group.exerciseName}
                </span>
              </div>
              <div className="sd-table__head">
                <span style={{ width: 28 }}>#</span>
                <span style={{ flex: 1, textAlign: 'center' }}>PESO</span>
                <span style={{ flex: 1, textAlign: 'center' }}>REPS</span>
                <span style={{ width: 40, textAlign: 'center' }}>RPE</span>
              </div>
              {group.sets.map((s) => (
                <div key={s.id} className="sd-table__row">
                  <span style={{ width: 28, color: 'var(--neon-green)' }}>{s.setNumber}</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>{formatWeight(s.weightKg)}</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>{s.reps ?? '—'}</span>
                  <span style={{ width: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                    {s.rpe != null ? s.rpe.toFixed(1) : '—'}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {session.notes && (
            <div className="card">
              <span className="section-label" style={{ margin: 0 }}>ANOTAÇÕES</span>
              <p className="sd-notes">{session.notes}</p>
            </div>
          )}

          <button className="sd-back" onClick={() => history.goBack()}>
            VOLTAR
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}

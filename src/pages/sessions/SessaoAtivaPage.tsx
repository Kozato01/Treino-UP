import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiCheckAll,
  mdiCheckCircle,
  mdiCircleOutline,
  mdiClose,
  mdiPlus,
  mdiTimerOutline,
  mdiTimerSand,
} from '@mdi/js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { ExercisePreview } from '../../components/ExercisePreview';
import { useBackOverride } from '../../stores/backOverride';
import { useData } from '../../stores/data';
import { type ActiveSet, useSession } from '../../stores/session';
import type { SetTechnique } from '../../types';
import { confirmDestructive } from '../../utils/confirm';
import { formatMMSS } from '../../utils/format';
import {
  hasPermissions,
  readActiveCaloriesForPeriod,
  readHeartRateForPeriod,
} from '../../services/healthConnect';
import './SessaoAtivaPage.css';

export function SessaoAtivaPage() {
  const history = useHistory();
  const state = useSession();
  const addSessionSet = useData((s) => s.addSessionSet);
  const updateSession = useData((s) => s.updateSession);
  const deleteSession = useData((s) => s.deleteSession);
  const sessionSets = useData((s) => s.sessionSets);
  const [now, setNow] = useState(Date.now());
  const [isCompact, setIsCompact] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [prToast, setPrToast] = useState<string | null>(null);

  // PR baseline: max peso histórico por exerciseId (apenas sessões finalizadas)
  const maxWeightByExercise = useMemo(() => {
    const map = new Map<string, number>();
    for (const ss of sessionSets) {
      if (!ss.completed || ss.weightKg == null) continue;
      const cur = map.get(ss.exerciseId) ?? 0;
      if (ss.weightKg > cur) map.set(ss.exerciseId, ss.weightKg);
    }
    return map;
  }, [sessionSets]);

  // Sugestão de peso com progressão linear:
  // se todas as séries da última sessão bateram o targetReps → +2.5kg, senão → mesmo peso
  const sessionId = state.sessionId;
  const lastSessionWeightByExercise = useMemo(() => {
    // Passo 1: sessionId mais recente por exercício
    const lastSessIdByExercise = new Map<string, number>();
    for (const ss of sessionSets) {
      if (ss.sessionId === sessionId) continue;
      const cur = lastSessIdByExercise.get(ss.exerciseId);
      if (!cur || ss.sessionId > cur) lastSessIdByExercise.set(ss.exerciseId, ss.sessionId);
    }

    const result = new Map<string, number>();
    lastSessIdByExercise.forEach((lastSessId, exerciseId) => {
      const sets = sessionSets.filter(
        (ss) => ss.exerciseId === exerciseId && ss.sessionId === lastSessId && ss.technique !== 'warmup'
      );
      if (sets.length === 0) return;
      const maxWeight = Math.max(...sets.map((ss) => ss.weightKg ?? 0));
      if (maxWeight === 0) return;

      // Progressão: todas as séries completaram o targetReps?
      const allHitTarget = sets.every(
        (ss) => ss.targetReps != null && ss.reps != null && ss.reps >= ss.targetReps
      );
      result.set(exerciseId, allHitTarget ? maxWeight + 2.5 : maxWeight);
    });
    return result;
  }, [sessionSets, sessionId]);

  // Timer de descanso
  useEffect(() => {
    if (state.restEndsAt == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state.restEndsAt]);

  // Tempo total da sessão
  useEffect(() => {
    if (state.startedAt == null) return;
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, [state.startedAt]);

  const hasSession = sessionId != null;
  const transitioningOutRef = useRef(false);

  useEffect(() => {
    if (transitioningOutRef.current) return;
    if (!hasSession) history.replace('/treinos');
  }, [hasSession, history]);

  useEffect(() => {
    if (!hasSession) return;
    useBackOverride.getState().set(() => {
      const openModal = document.querySelector<HTMLIonModalElement>('ion-modal.show-modal');
      if (openModal) {
        openModal.dismiss();
        return true;
      }
      history.goBack();
      return true;
    });
    return () => useBackOverride.getState().set(null);
  }, [hasSession, history]);

  if (!hasSession) return null;

  const elapsedSec = state.startedAt ? Math.floor((now - state.startedAt) / 1000) : 0;
  const restRemaining =
    state.restEndsAt != null ? Math.max(0, Math.ceil((state.restEndsAt - now) / 1000)) : 0;

  const totalSets = state.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const doneSets = state.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const pendingSets = totalSets - doneSets;
  const progress = totalSets > 0 ? doneSets / totalSets : 0;

  const activeExerciseIdx = state.exercises.findIndex((ex) => ex.sets.some((s) => !s.completed));

  const finish = () => {
    const snapshot = useSession.getState();
    if (snapshot.sessionId == null) return;
    const completedAt = Date.now();
    snapshot.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (!s.completed) return;
        addSessionSet({
          sessionId: snapshot.sessionId!,
          exerciseId: ex.exerciseId,
          exerciseOrder: ex.orderIndex,
          setNumber: s.setNumber,
          reps: s.reps,
          targetReps: s.targetReps,
          weightKg: s.weightKg,
          rpe: s.rpe,
          technique: s.technique ?? 'normal',
          completed: true,
          completedAt,
        });
      });
    });
    updateSession(snapshot.sessionId, { endedAt: completedAt });
    const id = snapshot.sessionId;
    transitioningOutRef.current = true;
    state.finish();
    history.replace(`/sessao/${id}`);
    const { startedAt } = snapshot;
    if (startedAt != null) {
      hasPermissions().then((ok) => {
        if (!ok) return;
        Promise.all([
          readHeartRateForPeriod(startedAt, completedAt),
          readActiveCaloriesForPeriod(startedAt, completedAt),
        ]).then(([hr, kcal]) => {
          updateSession(id, {
            avgHeartRateBpm: hr.avg,
            maxHeartRateBpm: hr.max,
            caloriesBurned: kcal > 0 ? kcal : null,
          });
        }).catch(() => {});
      });
    }
  };

  const tryFinish = () => {
    if (pendingSets > 0) setConfirmFinishOpen(true);
    else finish();
  };

  const discard = () => {
    confirmDestructive(
      'Descartar sessão?',
      'Todo o registro desta sessão será perdido.',
      'Descartar',
      () => {
        if (state.sessionId != null) deleteSession(state.sessionId);
        transitioningOutRef.current = true;
        state.finish();
        history.replace('/home');
      }
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{state.workoutName}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={discard}>
              <IonIcon slot="icon-only">
                <Icon path={mdiClose} size={1} color="var(--neon-pink)" />
              </IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent
        scrollEvents
        onIonScroll={(e) => {
          const y = e.detail.scrollTop;
          setIsCompact((prev) => (prev ? y > 40 : y > 80));
        }}>
        <div className={`sa-header${isCompact ? ' is-compact' : ''}`}>
          <div className="row-between">
            <div>
              <span className="sa-header__label">TEMPO TOTAL</span>
              <div className="sa-header__value" style={{ color: 'var(--neon-green)' }}>
                {formatMMSS(elapsedSec)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="sa-header__label">PROGRESSO</span>
              <div className="sa-header__value" style={{ color: 'var(--neon-cyan)' }}>
                {doneSets}/{totalSets}
              </div>
            </div>
          </div>
          <div className="sa-progress">
            <div className="sa-progress__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>

        {restRemaining > 0 && (
          <div className="sa-rest">
            <Icon path={mdiTimerSand} size={0.9} color="var(--neon-yellow)" />
            <span className="sa-rest__text">DESCANSO · {formatMMSS(restRemaining)}</span>
            <button className="sa-rest__skip" onClick={state.clearRest}>
              PULAR
            </button>
          </div>
        )}

        <div className="sa-content">
          {state.exercises.map((_, exIdx) => (
            <ExerciseBlock
              key={exIdx}
              exerciseIdx={exIdx}
              isActive={exIdx === activeExerciseIdx}
              maxWeightByExercise={maxWeightByExercise}
              lastSessionWeightByExercise={lastSessionWeightByExercise}
              onPR={(msg) => setPrToast(msg)}
            />
          ))}

          <button className="neon-cta sa-finish" onClick={tryFinish}>
            <Icon path={mdiCheckAll} size={1} color="#0A0B0F" />
            FINALIZAR SESSÃO
          </button>
        </div>

        <IonAlert
          isOpen={confirmFinishOpen}
          header="Finalizar com séries pendentes?"
          message={`Você ainda tem ${pendingSets} ${pendingSets === 1 ? 'série pendente' : 'séries pendentes'}. Finalizar mesmo assim?`}
          buttons={[
            { text: 'Voltar', role: 'cancel', handler: () => setConfirmFinishOpen(false) },
            { text: 'Finalizar', role: 'destructive', handler: () => { setConfirmFinishOpen(false); finish(); } },
          ]}
        />

        <IonToast
          isOpen={prToast != null}
          message={prToast ?? ''}
          duration={2400}
          onDidDismiss={() => setPrToast(null)}
          position="top"
          color="success"
        />
      </IonContent>
    </IonPage>
  );
}

function ExerciseBlock({
  exerciseIdx,
  isActive,
  maxWeightByExercise,
  lastSessionWeightByExercise,
  onPR,
}: {
  exerciseIdx: number;
  isActive: boolean;
  maxWeightByExercise: Map<string, number>;
  lastSessionWeightByExercise: Map<string, number>;
  onPR: (msg: string) => void;
}) {
  const exercise = useSession((s) => s.exercises[exerciseIdx]);
  const updateSet = useSession((s) => s.updateSet);
  const completeSet = useSession((s) => s.completeSet);
  const addSet = useSession((s) => s.addSetToExercise);
  const setNotes = useSession((s) => s.setNotes);
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const [manualExpand, setManualExpand] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!exercise) return null;

  const lastWeight = lastSessionWeightByExercise.get(exercise.exerciseId) ?? null;
  const nextSetIdx = isActive ? exercise.sets.findIndex((s) => !s.completed) : -1;

  const handleComplete = (setIdx: number) => {
    const s = exercise.sets[setIdx];
    if (s?.weightKg != null) {
      const prev = maxWeightByExercise.get(exercise.exerciseId) ?? 0;
      if (s.weightKg > prev && prev > 0) {
        onPR(`🏆 Novo PR! ${exercise.exerciseName}: ${s.weightKg}kg`);
      }
    }
    completeSet(exerciseIdx, setIdx);
  };

  const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.completed);
  const collapsed = allDone && !manualExpand;
  const totalVolume = exercise.sets.reduce((acc, s) => acc + (s.reps ?? 0) * (s.weightKg ?? 0), 0);

  if (collapsed) {
    return (
      <>
        <button className="sa-ex sa-ex--collapsed" onClick={() => setManualExpand(true)}>
          <div className="sa-ex__check">
            <Icon path={mdiCheckCircle} size={0.9} color="var(--neon-green)" />
          </div>
          <div className="sa-ex__collapsed-body">
            <span className="sa-ex__label">EXERCÍCIO {exerciseIdx + 1} · CONCLUÍDO</span>
            <h3
              className="sa-ex__title sa-ex__title--link"
              onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}>
              {exercise.exerciseName}
            </h3>
            <span className="sa-ex__collapsed-meta">
              {exercise.sets.length} SÉRIES · {totalVolume.toFixed(0)} KG
            </span>
          </div>
        </button>
        <IonModal isOpen={previewOpen} onDidDismiss={() => setPreviewOpen(false)}>
          <ExercisePreview exerciseId={exercise.exerciseId} onClose={() => setPreviewOpen(false)} />
        </IonModal>
      </>
    );
  }

  return (
    <div className="sa-ex">
      <div className="row-between">
        <div>
          <span className="sa-ex__label">EXERCÍCIO {exerciseIdx + 1}</span>
          <h3 className="sa-ex__title sa-ex__title--link" onClick={() => setPreviewOpen(true)}>
            {exercise.exerciseName}
          </h3>
        </div>
        <span className="sa-ex__rest">
          <Icon path={mdiTimerOutline} size={0.5} color="var(--text-dim)" />
          {exercise.restSeconds}S
        </span>
      </div>

      <div className="sa-sets-head">
        <span style={{ width: 28 }}>#</span>
        <span style={{ flex: 1, textAlign: 'center' }}>PESO</span>
        <span style={{ flex: 1, textAlign: 'center' }}>REPS</span>
        <span style={{ width: 44 }} />
      </div>

      {exercise.sets.map((s, setIdx) => (
        <SetRow
          key={setIdx}
          set={s}
          isNext={setIdx === nextSetIdx}
          lastWeight={lastWeight}
          onEdit={() => setEditingSet(setIdx)}
          onComplete={() => handleComplete(setIdx)}
          onUncheck={() => updateSet(exerciseIdx, setIdx, { completed: false })}
        />
      ))}

      <button className="sa-add-set" onClick={() => addSet(exerciseIdx)}>
        <Icon path={mdiPlus} size={0.6} color="var(--neon-green)" />
        ADICIONAR SÉRIE
      </button>

      <textarea
        className="neon-input"
        style={{ marginTop: 10 }}
        placeholder="Anotações"
        value={exercise.notes}
        onChange={(e) => setNotes(exerciseIdx, e.target.value)}
        rows={2}
      />

      <IonModal isOpen={editingSet != null} onDidDismiss={() => setEditingSet(null)}>
        {editingSet != null && exercise.sets[editingSet] && (
          <EditSetForm
            set={exercise.sets[editingSet]}
            lastWeight={lastWeight}
            onSave={(patch) => {
              updateSet(exerciseIdx, editingSet, patch);
              setEditingSet(null);
            }}
            onCancel={() => setEditingSet(null)}
          />
        )}
      </IonModal>

      <IonModal isOpen={previewOpen} onDidDismiss={() => setPreviewOpen(false)}>
        <ExercisePreview exerciseId={exercise.exerciseId} onClose={() => setPreviewOpen(false)} />
      </IonModal>
    </div>
  );
}

function SetRow({
  set,
  isNext,
  lastWeight,
  onEdit,
  onComplete,
  onUncheck,
}: {
  set: ActiveSet;
  isNext: boolean;
  lastWeight: number | null;
  onEdit: () => void;
  onComplete: () => void;
  onUncheck: () => void;
}) {
  const isSuggested = set.weightKg == null && set.targetWeightKg == null && lastWeight != null;
  const weightText =
    set.weightKg != null
      ? String(set.weightKg)
      : set.targetWeightKg != null
        ? String(set.targetWeightKg)
        : lastWeight != null
          ? String(lastWeight)
          : '—';
  const repsText = set.reps != null ? String(set.reps) : String(set.targetReps);

  return (
    <div className={`sa-set${set.completed ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}>
      {isNext && <span className="sa-set__next-badge">PRÓXIMA</span>}
      <span
        className="sa-set__num"
        style={{ color: set.completed ? 'var(--neon-green)' : 'var(--text-dim)' }}>
        {set.setNumber}
      </span>
      <button
        className="sa-set__cell"
        onClick={onEdit}
        style={{
          color: set.weightKg != null
            ? 'var(--text)'
            : isSuggested
              ? 'var(--neon-yellow)'
              : 'var(--text-mute)',
        }}>
        {weightText}
      </button>
      <button
        className="sa-set__cell"
        onClick={onEdit}
        style={{ color: set.reps == null ? 'var(--text-mute)' : 'var(--text)' }}>
        {repsText}
      </button>
      {set.technique && set.technique !== 'normal' && (
        <span className={`sa-set__tech sa-set__tech--${set.technique}`}>
          {set.technique === 'dropset' ? 'DS' : set.technique === 'isometric' ? 'ISO' : 'WU'}
        </span>
      )}
      <button className="sa-set__check" onClick={set.completed ? onUncheck : onComplete}>
        <Icon
          path={set.completed ? mdiCheckCircle : mdiCircleOutline}
          size={1.1}
          color={set.completed ? 'var(--neon-green)' : 'var(--text-mute)'}
        />
      </button>
    </div>
  );
}

function EditSetForm({
  set,
  lastWeight,
  onSave,
  onCancel,
}: {
  set: ActiveSet;
  lastWeight?: number | null;
  onSave: (patch: Partial<ActiveSet>) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(
    set.weightKg != null
      ? String(set.weightKg)
      : set.targetWeightKg != null
        ? String(set.targetWeightKg)
        : lastWeight != null
          ? String(lastWeight)
          : ''
  );
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : String(set.targetReps));
  const [rpe, setRpe] = useState(set.rpe != null ? String(set.rpe) : '');
  const [tech, setTech] = useState<SetTechnique>(set.technique ?? 'normal');

  const showLastWeightHint =
    lastWeight != null && set.weightKg == null && set.targetWeightKg == null;

  return (
    <div className="sa-edit">
      <h2 className="sa-edit__title">Registrar série {set.setNumber}</h2>
      <div className="sa-edit__grid">
        <div className="form-field">
          <span className="section-label" style={{ margin: 0 }}>PESO (KG)</span>
          <input
            className="neon-input"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          {showLastWeightHint && (
            <span className="sa-edit__hint">Último treino: {lastWeight} kg</span>
          )}
        </div>
        <div className="form-field">
          <span className="section-label" style={{ margin: 0 }}>REPS</span>
          <input
            className="neon-input"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
      </div>
      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>RPE (OPCIONAL, 1-10)</span>
        <input
          className="neon-input"
          inputMode="decimal"
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
        />
      </div>
      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>TÉCNICA</span>
        <div className="sa-tech-row">
          <button type="button" className={`pill${tech === 'normal' ? ' is-active' : ''}`} onClick={() => setTech('normal')}>NORMAL</button>
          <button type="button" className={`pill${tech === 'warmup' ? ' is-active' : ''}`} onClick={() => setTech('warmup')}>AQUECIMENTO</button>
          <button type="button" className={`pill${tech === 'dropset' ? ' is-active' : ''}`} onClick={() => setTech('dropset')}>DROP SET</button>
          <button type="button" className={`pill${tech === 'isometric' ? ' is-active' : ''}`} onClick={() => setTech('isometric')}>ISOMETRIA</button>
        </div>
      </div>
      <div className="sa-edit__actions">
        <button
          className="neon-cta"
          onClick={onCancel}
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none', flex: 1 }}>
          CANCELAR
        </button>
        <button
          className="neon-cta"
          style={{ flex: 1 }}
          onClick={() =>
            onSave({
              weightKg: weight.trim() ? parseFloat(weight.replace(',', '.')) : null,
              reps: reps.trim() ? parseInt(reps, 10) : null,
              rpe: rpe.trim() ? parseFloat(rpe.replace(',', '.')) : null,
              technique: tech,
            })
          }>
          SALVAR
        </button>
      </div>
    </div>
  );
}

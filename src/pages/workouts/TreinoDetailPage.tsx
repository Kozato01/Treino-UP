import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiChevronRight,
  mdiDumbbell,
  mdiMagnify,
  mdiArrowDown,
  mdiArrowUp,
  mdiPencil,
  mdiPlay,
  mdiPlus,
  mdiShareVariant,
  mdiTrashCanOutline,
  mdiWeightLifter,
} from '@mdi/js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { getExerciseById, searchExercises } from '../../data/exercises';
import { ExercisePreview } from '../../components/ExercisePreview';
import { useBackOverride } from '../../stores/backOverride';
import { useData } from '../../stores/data';
import { type ActiveExercise, useSession } from '../../stores/session';
import type { SetTechnique, WorkoutExercise } from '../../types';
import { confirmDestructive } from '../../utils/confirm';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import './TreinoDetailPage.css';

type Row = WorkoutExercise & { exerciseName: string; exerciseNamePt: string | null };

export function TreinoDetailPage() {
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const workoutId = Number(id);
  const searchParams = new URLSearchParams(location.search);
  const start = searchParams.get('start');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [activeSessionAlertOpen, setActiveSessionAlertOpen] = useState(false);
  const [viewingExerciseId, setViewingExerciseId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: 'success' | 'danger' } | null>(null);
  const startSession = useSession((s) => s.start);
  const sessionStarted = useRef(false);

  // Hardware back: fecha modals/pickers em ordem antes de sair da página.
  useEffect(() => {
    const anyOpen =
      pickerOpen ||
      editingRow != null ||
      activeSessionAlertOpen ||
      viewingExerciseId != null;
    if (!anyOpen) {
      useBackOverride.getState().set(null);
      return;
    }
    useBackOverride.getState().set(() => {
      // Garante o fechamento do modal aberto (preview de exercício, picker,
      // etc.) antes de qualquer navegação — assim o back do Android fecha o
      // modal em vez de sair da página.
      const openModal = document.querySelector<HTMLIonModalElement>('ion-modal.show-modal');
      if (openModal) {
        openModal.dismiss();
        return true;
      }
      if (pickerOpen) setPickerOpen(false);
      else if (editingRow != null) setEditingRow(null);
      else if (activeSessionAlertOpen) setActiveSessionAlertOpen(false);
      else if (viewingExerciseId != null) setViewingExerciseId(null);
      return true;
    });
    return () => useBackOverride.getState().set(null);
  }, [pickerOpen, editingRow, activeSessionAlertOpen, viewingExerciseId]);

  const workout = useData((s) => s.workouts.find((w) => w.id === workoutId));
  const workoutExercises = useData((s) => s.workoutExercises);
  const addSession = useData((s) => s.addSession);
  const addWorkoutExerciseAction = useData((s) => s.addWorkoutExercise);
  const updateWorkoutExerciseAction = useData((s) => s.updateWorkoutExercise);
  const deleteWorkoutExerciseAction = useData((s) => s.deleteWorkoutExercise);
  const deleteWorkoutAction = useData((s) => s.deleteWorkout);
  const updateWorkoutAction = useData((s) => s.updateWorkout);
  const reorderWorkoutExercisesAction = useData((s) => s.reorderWorkoutExercises);
  const allWorkoutExercises = useData((s) => s.workoutExercises);

  const rows: Row[] = useMemo(() => {
    return workoutExercises
      .filter((we) => we.workoutId === workoutId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((we) => {
        const ex = getExerciseById(we.exerciseId);
        return {
          ...we,
          exerciseName: ex?.name ?? we.exerciseId,
          exerciseNamePt: ex?.namePt ?? null,
        };
      });
  }, [workoutExercises, workoutId]);

  function beginSession() {
    if (!workout) return;
    const activeSessionId = useSession.getState().sessionId;
    if (activeSessionId != null) {
      const persisted = useData.getState().sessions.find((s) => s.id === activeSessionId);
      if (persisted && persisted.endedAt == null) {
        setActiveSessionAlertOpen(true);
        return;
      }
      // Sessão "ativa" no store de sessão mas sem registro aberto correspondente — limpa lixo.
      if (persisted) useData.getState().deleteSession(activeSessionId);
      useSession.getState().reset();
    }
    startNewSession();
  }

  function startNewSession() {
    if (!workout) return;
    const sessionId = addSession({ workoutId: workout.id, workoutName: workout.name });
    const activeExercises: ActiveExercise[] = rows.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseNamePt ?? ex.exerciseName,
      orderIndex: ex.orderIndex,
      restSeconds: ex.restSeconds,
      notes: '',
      sets: Array.from({ length: ex.targetSets }, (_, i) => ({
        setNumber: i + 1,
        targetReps: ex.targetReps,
        targetWeightKg: ex.targetWeightKg,
        reps: null,
        weightKg: null,
        rpe: null,
        technique: ex.technique ?? 'normal',
        completed: false,
      })),
    }));
    startSession({
      sessionId,
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: activeExercises,
    });
    history.push('/sessao-ativa');
  }

  useEffect(() => {
    if (start === '1' && workout && rows.length > 0 && !sessionStarted.current) {
      sessionStarted.current = true;
      history.replace(`/treino/${workout.id}`);
      beginSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, workout?.id, rows.length]);

  if (!workout) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/treinos" />
            </IonButtons>
            <IonTitle>Treino</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="empty-state">
            <span>Treino não encontrado.</span>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const addExercise = (exerciseId: string) => {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.orderIndex), -1);
    addWorkoutExerciseAction({
      workoutId,
      exerciseId,
      orderIndex: maxOrder + 1,
      targetSets: 3,
      targetReps: 10,
      targetWeightKg: null,
      restSeconds: 90,
      notes: null,
      technique: 'normal',
    });
    setPickerOpen(false);
  };

  const shareWorkout = async () => {
    if (!workout) return;
    const exercises = allWorkoutExercises
      .filter((we) => we.workoutId === workoutId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(({ id: _id, workoutId: _wid, ...rest }) => rest);
    const payload = {
      version: 1,
      type: 'workout-share' as const,
      workout: {
        name: workout.name,
        description: workout.description,
        color: workout.color,
        createdAt: workout.createdAt,
      },
      exercises,
    };
    const json = JSON.stringify(payload, null, 2);
    const slug = workout.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `treino-${slug}.json`;

    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: workout.name,
        text: 'Dê uma olhada no meu treino do Academia App!',
        url: result.uri,
        dialogTitle: 'Compartilhar treino',
      });
      setToast({ msg: 'Treino compartilhado!', color: 'success' });
    } catch (e) {
      console.error('Erro ao compartilhar', e);
      setToast({ msg: 'Falha ao compartilhar treino.', color: 'danger' });
    }
  };

  const deleteWorkout = () => {
    confirmDestructive(
      'Apagar treino?',
      'Isto remove o treino e seus exercícios cadastrados. Sessões antigas são mantidas.',
      'Apagar',
      () => {
        deleteWorkoutAction(workoutId);
        history.goBack();
      }
    );
  };

  const accent = workout.color ?? 'var(--neon-green)';
  const canStart = rows.length > 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/treinos" />
          </IonButtons>
          <IonTitle>{workout.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={shareWorkout} aria-label="Compartilhar">
              <Icon path={mdiShareVariant} size={0.9} color="var(--neon-cyan)" />
            </IonButton>
            <IonButton onClick={deleteWorkout} aria-label="Apagar">
              <Icon path={mdiTrashCanOutline} size={0.9} color="var(--neon-pink)" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="td-wrap">
          <div className="td-hero" style={{ borderLeftColor: accent }}>
            <span className="td-hero__label" style={{ color: accent }}>TREINO</span>
            <h1 className="td-hero__title">{workout.name}</h1>
            {workout.description && <p className="td-hero__desc">{workout.description}</p>}
            <div className="td-hero__meta">
              <Icon path={mdiDumbbell} size={0.6} color="var(--text-mute)" />
              <span>
                {rows.length} exercício{rows.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {workout.isImported ? (
            <button className="neon-cta" onClick={() => {
              updateWorkoutAction(workout.id, { isImported: false });
              history.goBack();
            }}>
              <Icon path={mdiPlus} size={1} color="#0A0B0F" />
              IMPORTAR PARA MEUS TREINOS
            </button>
          ) : (
            <button className="neon-cta" disabled={!canStart} onClick={beginSession}>
              <Icon path={mdiPlay} size={1} color={canStart ? '#0A0B0F' : 'var(--text-mute)'} />
              {canStart ? 'INICIAR TREINO' : 'ADICIONE EXERCÍCIOS'}
            </button>
          )}

          <div className="row-between" style={{ marginTop: 8 }}>
            <span className="section-label" style={{ margin: 0 }}>
              EXERCÍCIOS ({rows.length})
            </span>
            {!workout.isImported && (
              <button className="td-add" onClick={() => setPickerOpen(true)}>
                <Icon path={mdiPlus} size={0.7} color="var(--neon-green)" />
                ADICIONAR
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="empty-state">
              <Icon path={mdiWeightLifter} size={2} color="var(--outline)" />
              <span>
                Nenhum exercício ainda.
                <br />
                Toque em ADICIONAR para escolher do catálogo.
              </span>
            </div>
          ) : (
            rows.map((ex, idx) => (
              <div key={ex.id} className="td-ex">
                <div className="td-ex__idx">
                  <span>{String(idx + 1).padStart(2, '0')}</span>
                </div>
                <button
                  className="td-ex__body td-ex__body--btn"
                  onClick={() => setViewingExerciseId(ex.exerciseId)}>
                  <span className="td-ex__title">
                    {ex.exerciseNamePt ?? ex.exerciseName}
                  </span>
                  <div className="td-ex__tags">
                    <span className="tag">
                      {ex.targetSets} × {ex.targetReps}
                    </span>
                    {ex.targetWeightKg != null && (
                      <span className="tag tag--cyan">{ex.targetWeightKg} KG</span>
                    )}
                    <span className="tag tag--outline">{ex.restSeconds}S</span>
                  </div>
                </button>
                {!workout.isImported && (
                  <div className="td-ex__actions">
                    <button
                      onClick={() => {
                        if (idx === 0) return;
                        const ids = rows.map((r) => r.id);
                        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                        reorderWorkoutExercisesAction(workoutId, ids);
                      }}
                      disabled={idx === 0}
                      aria-label="Mover para cima">
                      <Icon path={mdiArrowUp} size={0.8} color={idx === 0 ? 'var(--text-mute)' : 'var(--text-dim)'} />
                    </button>
                    <button
                      onClick={() => {
                        if (idx === rows.length - 1) return;
                        const ids = rows.map((r) => r.id);
                        [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                        reorderWorkoutExercisesAction(workoutId, ids);
                      }}
                      disabled={idx === rows.length - 1}
                      aria-label="Mover para baixo">
                      <Icon path={mdiArrowDown} size={0.8} color={idx === rows.length - 1 ? 'var(--text-mute)' : 'var(--text-dim)'} />
                    </button>
                    <button onClick={() => setEditingRow(ex)} aria-label="Editar">
                      <Icon path={mdiPencil} size={0.8} color="var(--text-dim)" />
                    </button>
                    <button onClick={() => deleteWorkoutExerciseAction(ex.id)} aria-label="Apagar">
                      <Icon path={mdiTrashCanOutline} size={0.8} color="var(--neon-pink)" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <IonModal isOpen={pickerOpen} onDidDismiss={() => setPickerOpen(false)}>
          <ExercisePickerContent onSelect={addExercise} onCancel={() => setPickerOpen(false)} />
        </IonModal>

        <IonModal isOpen={editingRow != null} onDidDismiss={() => setEditingRow(null)}>
          {editingRow && (
            <EditExerciseContent
              row={editingRow}
              onCancel={() => setEditingRow(null)}
              onSave={(patch) => {
                updateWorkoutExerciseAction(editingRow.id, patch);
                setEditingRow(null);
              }}
            />
          )}
        </IonModal>

        <IonModal isOpen={viewingExerciseId != null} onDidDismiss={() => setViewingExerciseId(null)}>
          {viewingExerciseId && (
            <ExercisePreview
              exerciseId={viewingExerciseId}
              onClose={() => setViewingExerciseId(null)}
            />
          )}
        </IonModal>
        <IonToast
          isOpen={toast != null}
          message={toast?.msg ?? ''}
          duration={2500}
          color={toast?.color}
          onDidDismiss={() => setToast(null)}
        />
        <IonAlert
          isOpen={activeSessionAlertOpen}
          header="Treino em andamento"
          message="Você já tem um treino em andamento. Deseja continuá-lo ou descartá-lo e iniciar um novo?"
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setActiveSessionAlertOpen(false) },
            { text: 'Continuar atual', handler: () => { setActiveSessionAlertOpen(false); history.push('/sessao-ativa'); } },
            { text: 'Descartar e iniciar', role: 'destructive', handler: () => {
                setActiveSessionAlertOpen(false);
                const sid = useSession.getState().sessionId;
                if (sid != null) useData.getState().deleteSession(sid);
                useSession.getState().reset();
                startNewSession();
              } },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}

function ExercisePickerContent({
  onSelect,
  onCancel,
}: {
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 150);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const list = useMemo(
    () =>
      searchExercises(debouncedQ)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [debouncedQ]
  );

  useEffect(() => {
    // Auto-focus ao abrir o modal — Ionic anima o modal, então usar timeout curto.
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="td-modal">
      <h2 className="td-modal__title">Escolher exercício</h2>
      <div className="ex-search">
        <Icon path={mdiMagnify} size={0.8} color="var(--text-dim)" />
        <input
          ref={inputRef}
          className="ex-search__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar"
        />
      </div>
      <div className="td-modal__count">
        {list.length} {list.length === 1 ? 'exercício' : 'exercícios'}
      </div>
      <div className="td-modal__list">
        {list.map((item) => (
          <button key={item.id} className="td-modal__item" onClick={() => onSelect(item.id)}>
            <span>{item.namePt ?? item.name}</span>
            <Icon path={mdiChevronRight} size={0.8} color="var(--text-mute)" />
          </button>
        ))}
      </div>
      <button className="neon-cta" onClick={onCancel} style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}>
        CANCELAR
      </button>
    </div>
  );
}

function EditExerciseContent({
  row,
  onCancel,
  onSave,
}: {
  row: Row;
  onCancel: () => void;
  onSave: (patch: Partial<WorkoutExercise>) => void;
}) {
  const [sets, setSets] = useState(String(row.targetSets));
  const [reps, setReps] = useState(String(row.targetReps));
  const [weight, setWeight] = useState(row.targetWeightKg != null ? String(row.targetWeightKg) : '');
  const [rest, setRest] = useState(String(row.restSeconds));
  const [tech, setTech] = useState<SetTechnique>(row.technique ?? 'normal');

  const save = () => {
    onSave({
      targetSets: Math.max(1, parseInt(sets, 10) || 1),
      targetReps: Math.max(1, parseInt(reps, 10) || 1),
      targetWeightKg: weight.trim() ? parseFloat(weight.replace(',', '.')) : null,
      restSeconds: Math.max(0, parseInt(rest, 10) || 0),
      technique: tech,
    });
  };

  return (
    <div className="td-modal">
      <h2 className="td-modal__title">Editar exercício</h2>
      <div className="td-edit__grid">
        <div className="form-field">
          <span className="section-label" style={{ margin: 0 }}>SÉRIES</span>
          <input className="neon-input" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
        </div>
        <div className="form-field">
          <span className="section-label" style={{ margin: 0 }}>REPS</span>
          <input className="neon-input" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
        <div className="form-field">
          <span className="section-label" style={{ margin: 0 }}>PESO ALVO (KG)</span>
          <input className="neon-input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="form-field">
          <span className="section-label" style={{ margin: 0 }}>DESCANSO (S)</span>
          <input className="neon-input" inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} />
        </div>
      </div>
      <div className="form-field" style={{ marginTop: 12 }}>
        <span className="section-label" style={{ margin: 0 }}>TÉCNICA</span>
        <div className="sa-tech-row">
          <button type="button" className={`pill${tech === 'normal' ? ' is-active' : ''}`} onClick={() => setTech('normal')}>NORMAL</button>
          <button type="button" className={`pill${tech === 'dropset' ? ' is-active' : ''}`} onClick={() => setTech('dropset')}>DROP SET</button>
          <button type="button" className={`pill${tech === 'isometric' ? ' is-active' : ''}`} onClick={() => setTech('isometric')}>ISOMETRIA</button>
        </div>
      </div>
      <div className="td-edit__actions">
        <button
          className="neon-cta"
          onClick={onCancel}
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none', flex: 1 }}>
          CANCELAR
        </button>
        <button className="neon-cta" onClick={save} style={{ flex: 1 }}>
          SALVAR
        </button>
      </div>
    </div>
  );
}


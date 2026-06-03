import { IonContent, IonModal, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle } from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiDumbbell,
  mdiPlay,
  mdiPlus,
  mdiTrashCanOutline,
  mdiAutoFix,
  mdiRefresh,
} from '@mdi/js';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useData } from '../../stores/data';
import { useBackOverride } from '../../stores/backOverride';
import { confirmDestructive } from '../../utils/confirm';
import { ExercisePreview } from '../../components/ExercisePreview';
import {
  buildWorkoutName,
  generateWorkout,
  GeneratedExercise,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  pickReplacement,
  WorkoutLevel,
} from '../../data/workoutGenerator';
import '../tabs/TreinosPage.css';

export function TreinosLivresPage() {
  const history = useHistory();
  const workouts = useData((s) => s.workouts);
  const workoutExercises = useData((s) => s.workoutExercises);
  const importWorkout = useData((s) => s.importWorkout);
  const deleteWorkout = useData((s) => s.deleteWorkout);
  const activePackId = useData((s) => s.activePackId);
  const packs = useData((s) => s.workoutPacks);

  const [wizardOpen, setWizardOpen] = useState(false);

  const activePack = useMemo(
    () => packs.find((p) => p.id === activePackId),
    [packs, activePackId]
  );

  // Treinos NÃO importados e NÃO na agenda ativa
  const localWorkouts = useMemo(() => {
    const agendaWorkoutIds = activePack
      ? Object.values(activePack.assignments).filter((id) => id != null)
      : [];

    return workouts
      .filter((w) => !w.isImported && !agendaWorkoutIds.includes(w.id))
      .map((w) => ({
        ...w,
        exercisesCount: workoutExercises.filter((we) => we.workoutId === w.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, workoutExercises, activePack]);

  const handleCreate = (name: string, exercises: GeneratedExercise[]) => {
    const newId = importWorkout(
      { name, description: null, color: null, createdAt: Date.now() },
      exercises
    );
    setWizardOpen(false);
    history.push(`/treino/${newId}`);
  };

  const renderWorkoutCard = (item: any) => (
    <div key={item.id} className="treinos-card">
      <span
        className="treinos-card__bar"
        style={{ background: item.color ?? 'var(--neon-green)' }}
      />
      <button
        className="treinos-card__body"
        onClick={() => history.push(`/treino/${item.id}`)}>
        <span className="treinos-card__title">{item.name}</span>
        {item.description && (
          <span className="treinos-card__desc">{item.description}</span>
        )}
        <span className="treinos-card__meta">
          <Icon path={mdiDumbbell} size={0.5} color="var(--text-mute)" />
          {item.exercisesCount} exercício{item.exercisesCount !== 1 ? 's' : ''}
        </span>
      </button>
      <button
        className="treinos-card__delete"
        onClick={() =>
          confirmDestructive(
            'Apagar treino?',
            'Isto remove o treino e seus exercícios cadastrados. Sessões antigas são mantidas.',
            'Apagar',
            () => deleteWorkout(item.id)
          )
        }
        aria-label="Apagar treino">
        <Icon path={mdiTrashCanOutline} size={0.8} color="var(--neon-pink)" />
      </button>
      <button
        className="treinos-card__play"
        onClick={() => history.push(`/treino/${item.id}`)}
        aria-label="Iniciar treino">
        <Icon path={mdiPlay} size={1} color="#0A0B0F" />
      </button>
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/treinos" />
          </IonButtons>
          <IonTitle>Treinos Livres</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="treinos-wrap">
          <div className="treinos-head" style={{ marginTop: 16 }}>
            <h1 className="treinos-title">TREINOS LIVRES</h1>
            <span className="treinos-sub">
              {localWorkouts.length} {localWorkouts.length === 1 ? 'treino' : 'treinos'}
            </span>
          </div>

          {localWorkouts.length === 0 ? (
            <div className="treinos-empty" style={{ marginTop: 0 }}>
              <Icon path={mdiDumbbell} size={2.5} color="var(--outline)" />
              <h2>Nenhum treino criado</h2>
              <p>Toque nos botões abaixo para montar treinos.</p>
              <button 
                className="neon-cta" 
                style={{ marginTop: 16 }}
                onClick={() => history.push('/novo-treino')}>
                + NOVO TREINO
              </button>
              <button 
                className="neon-cta" 
                style={{ marginTop: 8, background: 'var(--neon-cyan)', boxShadow: '0 0 14px rgba(74, 227, 255, 0.5)', color: '#0A0B0F' }}
                onClick={() => setWizardOpen(true)}>
                🪄 GERAR MÁGICO
              </button>
            </div>
          ) : (
            <>
              <div className="treinos-list">
                {localWorkouts.map((w) => renderWorkoutCard(w))}
              </div>

              <div className="treinos-fabs">
                <button 
                  className="treinos-fab-gen" 
                  onClick={() => setWizardOpen(true)} 
                  aria-label="Gerar treino">
                  <Icon path={mdiAutoFix} size={1} color="#0A0B0F" />
                </button>
                <button 
                  className="treinos-fab" 
                  onClick={() => history.push('/novo-treino')}>
                  <Icon path={mdiPlus} size={1.1} color="#0A0B0F" />
                  NOVO TREINO
                </button>
              </div>
            </>
          )}
        </div>

        <IonModal isOpen={wizardOpen} onDidDismiss={() => setWizardOpen(false)}>
          <WorkoutWizard onClose={() => setWizardOpen(false)} onCreate={handleCreate} />
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

type WizardStep = 'muscles' | 'level' | 'preview';

function WorkoutWizard({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, exercises: GeneratedExercise[]) => void;
}) {
  const [step, setStep] = useState<WizardStep>('muscles');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [level, setLevel] = useState<WorkoutLevel>('intermediate');
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [viewingExerciseId, setViewingExerciseId] = useState<string | null>(null);

  useEffect(() => {
    useBackOverride.getState().set(() => {
      if (viewingExerciseId) {
        setViewingExerciseId(null);
        return true;
      }
      if (step === 'preview') {
        setStep('level');
        return true;
      }
      if (step === 'level') {
        setStep('muscles');
        return true;
      }
      return false; // se tiver na step 'muscles', deixa o fallback do App.tsx fechar o modal
    });
    return () => useBackOverride.getState().set(null);
  }, [step, viewingExerciseId]);

  const toggleMuscle = (id: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const goToLevel = () => {
    setStep('level');
  };

  const goToPreview = () => {
    setWorkoutName(buildWorkoutName(selectedMuscles));
    setExercises(generateWorkout(selectedMuscles, level, Date.now()));
    setStep('preview');
  };

  const regenerate = () => {
    setExercises(generateWorkout(selectedMuscles, level, Date.now()));
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((ex, i) => ({ ...ex, orderIndex: i }))
    );
  };

  const replaceExercise = (idx: number) => {
    const excludeIds = exercises.map((e) => e.exerciseId);
    const replacement = pickReplacement(selectedMuscles, level, excludeIds);
    if (!replacement) return;
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...replacement, orderIndex: ex.orderIndex } : ex))
    );
  };

  const confirm = () => onCreate(workoutName || buildWorkoutName(selectedMuscles), exercises);

  return (
    <div className="wiz-wrap">
      {step === 'muscles' && (
        <>
          <div className="wiz-header">
            <span className="wiz-step">PASSO 1 DE 3</span>
            <h2 className="wiz-title">O que você quer treinar?</h2>
            <p className="wiz-sub">Selecione um ou mais grupos musculares</p>
          </div>
          <div className="wiz-muscles">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g.id}
                className={`wiz-muscle-pill${selectedMuscles.includes(g.id) ? ' is-active' : ''}`}
                onClick={() => toggleMuscle(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="wiz-actions">
            <button className="neon-cta" style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }} onClick={onClose}>
              CANCELAR
            </button>
            <button className="neon-cta" disabled={selectedMuscles.length === 0} onClick={goToLevel}>
              PRÓXIMO
            </button>
          </div>
        </>
      )}

      {step === 'level' && (
        <>
          <div className="wiz-header">
            <span className="wiz-step">PASSO 2 DE 3</span>
            <h2 className="wiz-title">Qual é o seu nível?</h2>
            <p className="wiz-sub">Isso define séries, reps e descanso</p>
          </div>
          <div className="wiz-levels">
            {(['beginner', 'intermediate', 'advanced'] as WorkoutLevel[]).map((l) => {
              const meta = {
                beginner: { desc: '3 séries · 12 reps · 60s descanso · 4 exercícios' },
                intermediate: { desc: '4 séries · 10 reps · 90s descanso · 5 exercícios' },
                advanced: { desc: '5 séries · 6 reps · 120s descanso · 6 exercícios' },
              };
              return (
                <button
                  key={l}
                  className={`wiz-level-card${level === l ? ' is-active' : ''}`}
                  onClick={() => setLevel(l)}>
                  <span className="wiz-level-card__title">{LEVEL_LABELS[l]}</span>
                  <span className="wiz-level-card__desc">{meta[l].desc}</span>
                </button>
              );
            })}
          </div>
          <div className="wiz-actions">
            <button className="neon-cta" style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }} onClick={() => setStep('muscles')}>
              VOLTAR
            </button>
            <button className="neon-cta" onClick={goToPreview}>
              GERAR TREINO
            </button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="wiz-header">
            <span className="wiz-step">PASSO 3 DE 3</span>
            <h2 className="wiz-title">Seu treino está pronto!</h2>
          </div>
          <div className="wiz-name-field">
            <span className="section-label" style={{ margin: 0 }}>NOME DO TREINO</span>
            <input
              className="neon-input"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
            />
          </div>
          <div className="wiz-preview-list">
            {exercises.map((ex, idx) => (
              <div key={`${ex.exerciseId}-${idx}`} className="wiz-ex-row">
                <span className="wiz-ex-row__idx">{String(idx + 1).padStart(2, '0')}</span>
                <button
                  className="wiz-ex-row__main"
                  onClick={() => setViewingExerciseId(ex.exerciseId)}>
                  <span className="wiz-ex-row__name">{ex.exerciseName}</span>
                  <span className="wiz-ex-row__meta">
                    {ex.targetSets}×{ex.targetReps} · {ex.restSeconds}s
                  </span>
                </button>
                <button
                  className="wiz-ex-row__action"
                  onClick={() => replaceExercise(idx)}
                  aria-label="Trocar exercício">
                  <Icon path={mdiRefresh} size={0.75} color="var(--neon-cyan)" />
                </button>
                <button
                  className="wiz-ex-row__action"
                  onClick={() => removeExercise(idx)}
                  aria-label="Remover exercício">
                  <Icon path={mdiTrashCanOutline} size={0.75} color="var(--neon-pink)" />
                </button>
              </div>
            ))}
          </div>
          {exercises.length === 0 && (
            <p className="wiz-empty">Nenhum exercício. Clique em OUTRO para gerar novamente.</p>
          )}
          <IonModal
            isOpen={viewingExerciseId != null}
            onDidDismiss={() => setViewingExerciseId(null)}>
            {viewingExerciseId && (
              <ExercisePreview
                exerciseId={viewingExerciseId}
                onClose={() => setViewingExerciseId(null)}
              />
            )}
          </IonModal>
          <div className="wiz-actions">
            <button
              className="neon-cta"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--neon-cyan)', boxShadow: 'none', flex: 1 }}
              onClick={regenerate}>
              <Icon path={mdiRefresh} size={0.9} color="var(--neon-cyan)" />
              OUTRO
            </button>
            <button className="neon-cta" style={{ flex: 2 }} disabled={exercises.length === 0} onClick={confirm}>
              CRIAR TREINO
            </button>
          </div>
        </>
      )}
    </div>
  );
}

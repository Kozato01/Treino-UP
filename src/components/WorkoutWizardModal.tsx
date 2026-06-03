import { IonModal } from '@ionic/react';
import Icon from '@mdi/react';
import { mdiMagnify, mdiRefresh, mdiTrashCanOutline } from '@mdi/js';
import { useState, useEffect, useMemo } from 'react';

import { useBackOverride } from '../stores/backOverride';
import { ExercisePreview } from './ExercisePreview';
import { searchExercises } from '../data/exercises';
import {
  buildWorkoutName,
  generateWorkout,
  GeneratedExercise,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_EXPANSION,
  pickReplacement,
  WorkoutLevel,
} from '../data/workoutGenerator';
import './WorkoutWizardModal.css';

type WizardStep = 'muscles' | 'level' | 'preview';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, exercises: GeneratedExercise[]) => void;
};

export function WorkoutWizardModal({ isOpen, onClose, onCreate }: Props) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      {isOpen && <WorkoutWizard onClose={onClose} onCreate={onCreate} />}
    </IonModal>
  );
}

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
  const [catalogFor, setCatalogFor] = useState<number | null>(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogOnlySelected, setCatalogOnlySelected] = useState(true);

  const catalogResults = useMemo(() => {
    const muscles = catalogOnlySelected && selectedMuscles.length > 0 ? selectedMuscles : undefined;
    return searchExercises(catalogQuery, muscles).slice(0, 80);
  }, [catalogQuery, catalogOnlySelected, selectedMuscles]);

  const toggleMuscle = (id: string) => {
    setSelectedMuscles((prev) => {
      const expansion = MUSCLE_GROUP_EXPANSION[id];
      if (expansion) {
        const allSelected = expansion.every((m) => prev.includes(m));
        if (allSelected) {
          return prev.filter((m) => !expansion.includes(m));
        } else {
          const toAdd = expansion.filter((m) => !prev.includes(m));
          return [...prev, ...toAdd];
        }
      }
      return prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
    });
  };

  const isMuscleGroupSelected = (id: string) => {
    const expansion = MUSCLE_GROUP_EXPANSION[id];
    if (expansion) {
      return expansion.every((m) => selectedMuscles.includes(m));
    }
    return selectedMuscles.includes(id);
  };

  const goToPreview = () => {
    setWorkoutName(buildWorkoutName(selectedMuscles));
    setExercises(generateWorkout(selectedMuscles, level, Date.now()));
    setStep('preview');
  };

  const regenerate = () => setExercises(generateWorkout(selectedMuscles, level, Date.now()));

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx).map((ex, i) => ({ ...ex, orderIndex: i })));
  };

  const replaceExercise = (idx: number) => {
    const excludeIds = exercises.map((e) => e.exerciseId);
    const replacement = pickReplacement(selectedMuscles, level, excludeIds);
    if (!replacement) return;
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...replacement, orderIndex: ex.orderIndex } : ex))
    );
  };

  const openCatalog = (idx: number) => {
    setCatalogQuery('');
    setCatalogOnlySelected(true);
    setCatalogFor(idx);
  };

  const pickFromCatalog = (exerciseId: string, exerciseName: string) => {
    if (catalogFor == null) return;
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === catalogFor ? { ...ex, exerciseId, exerciseName } : ex
      )
    );
    setCatalogFor(null);
  };

  useEffect(() => {
    if (catalogFor != null) {
      useBackOverride.getState().set(() => {
        setCatalogFor(null);
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    useBackOverride.getState().set(() => {
      setStep((s) => {
        if (s === 'preview') return 'level';
        if (s === 'level') return 'muscles';
        if (s === 'muscles') {
          onClose();
          return 'muscles';
        }
        return s;
      });
      return true;
    });
    return () => useBackOverride.getState().set(null);
  }, [step, onClose, catalogFor]);

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
                className={`wiz-muscle-pill${isMuscleGroupSelected(g.id) ? ' is-active' : ''}`}
                onClick={() => toggleMuscle(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="wiz-actions">
            <button
              className="neon-cta"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}
              onClick={onClose}>
              CANCELAR
            </button>
            <button className="neon-cta" disabled={selectedMuscles.length === 0} onClick={() => setStep('level')}>
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
            <button
              className="neon-cta"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}
              onClick={() => setStep('muscles')}>
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
            <span className="section-label" style={{ margin: 0 }}>
              NOME DO TREINO
            </span>
            <input className="neon-input" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
          </div>
          <div className="wiz-preview-list">
            {exercises.map((ex, idx) => (
              <div key={`${ex.exerciseId}-${idx}`} className="wiz-ex-row">
                <span className="wiz-ex-row__idx">{String(idx + 1).padStart(2, '0')}</span>
                <button className="wiz-ex-row__main" onClick={() => setViewingExerciseId(ex.exerciseId)}>
                  <span className="wiz-ex-row__name">{ex.exerciseName}</span>
                  <span className="wiz-ex-row__meta">
                    {ex.targetSets}×{ex.targetReps} · {ex.restSeconds}s
                  </span>
                </button>
                <button
                  className="wiz-ex-row__action"
                  onClick={() => replaceExercise(idx)}
                  aria-label="Trocar automaticamente">
                  <Icon path={mdiRefresh} size={0.75} color="var(--neon-cyan)" />
                </button>
                <button
                  className="wiz-ex-row__action"
                  onClick={() => openCatalog(idx)}
                  aria-label="Buscar no catálogo">
                  <Icon path={mdiMagnify} size={0.75} color="var(--neon-green)" />
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
          <IonModal isOpen={viewingExerciseId != null} onDidDismiss={() => setViewingExerciseId(null)}>
            {viewingExerciseId && (
              <ExercisePreview exerciseId={viewingExerciseId} onClose={() => setViewingExerciseId(null)} />
            )}
          </IonModal>

          <IonModal isOpen={catalogFor != null} onDidDismiss={() => setCatalogFor(null)}>
            <div className="wiz-catalog">
              <div className="wiz-catalog__head">
                <h3 className="wiz-catalog__title">Buscar no catálogo</h3>
                <button className="wiz-catalog__close" onClick={() => setCatalogFor(null)}>
                  ✕
                </button>
              </div>
              <input
                className="neon-input"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Nome do exercício..."
                autoFocus
              />
              {selectedMuscles.length > 0 && (
                <label className="wiz-catalog__filter">
                  <input
                    type="checkbox"
                    checked={catalogOnlySelected}
                    onChange={(e) => setCatalogOnlySelected(e.target.checked)}
                  />
                  Só os grupos selecionados ({selectedMuscles.length})
                </label>
              )}
              <div className="wiz-catalog__list">
                {catalogResults.length === 0 ? (
                  <p className="wiz-empty">Nenhum exercício encontrado.</p>
                ) : (
                  catalogResults.map((e) => (
                    <button
                      key={e.id}
                      className="wiz-catalog__item"
                      onClick={() => pickFromCatalog(e.id, e.namePt ?? e.name)}>
                      <span className="wiz-catalog__item-name">{e.namePt ?? e.name}</span>
                      <span className="wiz-catalog__item-meta">
                        {e.primaryMuscles.join(', ')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
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

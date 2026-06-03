import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import { mdiArrowLeft, mdiClose, mdiDumbbell, mdiPlus, mdiSwapHorizontal, mdiTrashCanOutline } from '@mdi/js';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { WorkoutWizardModal } from '../../components/WorkoutWizardModal';
import type { GeneratedExercise } from '../../data/workoutGenerator';
import { useBackOverride } from '../../stores/backOverride';
import { useData } from '../../stores/data';
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from '../../types';
import './NovaFichaPage.css';

type Step = 1 | 2 | 3;
type Assignments = Partial<Record<Weekday, number>>;

export function NovaFichaPage() {
  const history = useHistory();
  const location = useLocation();
  const editId = new URLSearchParams(location.search).get('edit');
  const editingId = editId ? Number(editId) : null;

  const packs = useData((s) => s.workoutPacks);
  const workouts = useData((s) => s.workouts);
  const addWorkoutPack = useData((s) => s.addWorkoutPack);
  const updateWorkoutPack = useData((s) => s.updateWorkoutPack);
  const setActivePack = useData((s) => s.setActivePack);
  const activePackId = useData((s) => s.activePackId);
  const importWorkout = useData((s) => s.importWorkout);

  const editing = useMemo(
    () => (editingId != null ? packs.find((p) => p.id === editingId) ?? null : null),
    [packs, editingId]
  );

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [assignments, setAssignments] = useState<Assignments>(editing?.assignments ?? {});
  const [setActive, setSetActive] = useState(editing?.id === activePackId);
  const [pickerDay, setPickerDay] = useState<Weekday | null>(null);
  const [pickerTab, setPickerTab] = useState<'existing' | 'generate'>('existing');
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    // Quando o componente monta, ele deve sempre registrar o handler principal da tela,
    // a não ser que tenhamos uma condição de "saída pura" e queiramos o comportamento nativo.
    if (step === 1) {
      useBackOverride.getState().set(null);
      return;
    }
    useBackOverride.getState().set(() => {
      if (pickerDay != null) {
        setPickerDay(null);
        return true;
      }
      setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
      return true;
    });
    return () => useBackOverride.getState().set(null);
  }, [step, pickerDay]);

  const filledCount = Object.values(assignments).filter((v) => v != null).length;
  const canNextFrom1 = name.trim().length > 0;
  const canNextFrom2 = filledCount > 0;

  const openPicker = (wd: Weekday) => {
    setPickerDay(wd);
    setPickerTab('existing');
  };

  const clearDay = (wd: Weekday) => {
    setAssignments((a) => {
      const n = { ...a };
      delete n[wd];
      return n;
    });
  };

  const assignWorkout = (wd: Weekday, workoutId: number) => {
    setAssignments((a) => ({ ...a, [wd]: workoutId }));
    setPickerDay(null);
  };

  const handleGenerate = (workoutName: string, exercises: GeneratedExercise[]) => {
    if (!pickerDay) return;
    const newId = importWorkout(
      { name: workoutName, description: null, color: null, createdAt: Date.now() },
      exercises
    );
    assignWorkout(pickerDay, newId);
    setWizardOpen(false);
  };

  const save = () => {
    if (editing) {
      updateWorkoutPack(editing.id, {
        name: name.trim(),
        description: description.trim() || null,
        assignments,
      });
      if (setActive) setActivePack(editing.id);
      else if (activePackId === editing.id) setActivePack(null);
      history.replace(`/ficha/${editing.id}`);
      return;
    }
    const id = addWorkoutPack({
      name: name.trim(),
      description: description.trim() || null,
      assignments,
    });
    if (setActive) setActivePack(id);
    history.replace(`/ficha/${id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              onClick={() => {
                if (pickerDay != null) {
                  setPickerDay(null);
                  return;
                }
                if (step > 1) {
                  setStep((s) => (s - 1) as Step);
                  return;
                }
                history.replace('/treinos');
              }}>
              <IonIcon slot="icon-only">
                <Icon path={mdiArrowLeft} size={1} color="var(--text)" />
              </IonIcon>
            </IonButton>
          </IonButtons>
          <IonTitle>{editing ? 'Editar Rotina' : 'Nova Rotina'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="np-wrap">
          <div className="np-steps">
            {[1, 2, 3].map((s) => (
              <span key={s} className={`np-step-pill${step === s ? ' is-active' : ''}`}>
                {s}
              </span>
            ))}
          </div>

          {step === 1 && (
            <>
              <span className="section-label">NOME</span>
              <input
                className="neon-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: PPL 5x, Upper/Lower..."
              />
              <span className="section-label">DESCRIÇÃO (OPCIONAL)</span>
              <textarea
                className="neon-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <div className="np-actions">
                <button className="neon-cta" disabled={!canNextFrom1} onClick={() => setStep(2)}>
                  PRÓXIMO
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="np-hint">Atribua um treino a cada dia. Dias vazios = descanso.</p>
              <div className="np-days">
                {WEEKDAYS.map((wd) => {
                  const workoutId = assignments[wd];
                  const workout = workoutId != null ? workouts.find((w) => w.id === workoutId) : null;
                  return (
                    <div key={wd} className="np-day">
                      <span className="np-day__label">{WEEKDAY_LABELS[wd]}</span>
                      {workout ? (
                        <>
                          <span className="np-day__name">{workout.name}</span>
                          <button
                            className="np-day__action"
                            onClick={() => openPicker(wd)}
                            aria-label="Trocar">
                            <Icon path={mdiSwapHorizontal} size={0.8} color="var(--neon-cyan)" />
                          </button>
                          <button
                            className="np-day__action"
                            onClick={() => clearDay(wd)}
                            aria-label="Remover">
                            <Icon path={mdiTrashCanOutline} size={0.8} color="var(--neon-pink)" />
                          </button>
                        </>
                      ) : (
                        <button className="np-day__empty" onClick={() => openPicker(wd)}>
                          + TREINO / DESCANSO
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="np-actions">
                <button
                  className="neon-cta"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}
                  onClick={() => setStep(1)}>
                  VOLTAR
                </button>
                <button className="neon-cta" disabled={!canNextFrom2} onClick={() => setStep(3)}>
                  PRÓXIMO
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <span className="section-label">RESUMO</span>
              <div className="card">
                <span className="np-summary__title">{name}</span>
                {description && <span className="np-summary__desc">{description}</span>}
                <div className="np-summary__grid">
                  {WEEKDAYS.map((wd) => {
                    const workoutId = assignments[wd];
                    const workout = workoutId != null ? workouts.find((w) => w.id === workoutId) : null;
                    return (
                      <div key={wd} className="np-summary__cell">
                        <span className="np-summary__day">{WEEKDAY_LABELS[wd]}</span>
                        <span className="np-summary__wk">{workout?.name ?? '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="np-toggle">
                <input
                  type="checkbox"
                  checked={setActive}
                  onChange={(e) => setSetActive(e.target.checked)}
                />
                <span>DEFINIR COMO ATIVO</span>
              </label>

              <div className="np-actions">
                <button
                  className="neon-cta"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}
                  onClick={() => setStep(2)}>
                  VOLTAR
                </button>
                <button className="neon-cta" onClick={save}>
                  SALVAR ROTINA
                </button>
              </div>
            </>
          )}
        </div>

        <IonModal isOpen={pickerDay != null} onDidDismiss={() => setPickerDay(null)}>
          {pickerDay && (
            <div className="np-picker">
              <div className="np-picker__head">
                <h2>{WEEKDAY_LABELS[pickerDay]} · Escolher treino</h2>
                <button onClick={() => setPickerDay(null)} aria-label="Fechar">
                  <Icon path={mdiClose} size={1} color="var(--text)" />
                </button>
              </div>
              <div className="np-picker__tabs">
                <button
                  className={`np-picker__tab${pickerTab === 'existing' ? ' is-active' : ''}`}
                  onClick={() => setPickerTab('existing')}>
                  MEUS TREINOS
                </button>
                <button
                  className={`np-picker__tab${pickerTab === 'generate' ? ' is-active' : ''}`}
                  onClick={() => setPickerTab('generate')}>
                  GERAR NOVO
                </button>
              </div>
              {pickerTab === 'existing' ? (
                <div className="np-picker__list">
                  {workouts.length === 0 ? (
                    <div className="np-picker__empty">
                      <Icon path={mdiDumbbell} size={1.5} color="var(--outline)" />
                      <p>Nenhum treino cadastrado ainda.</p>
                    </div>
                  ) : (
                    workouts.map((w) => (
                      <button
                        key={w.id}
                        className="np-picker__item"
                        onClick={() => assignWorkout(pickerDay, w.id)}>
                        <span
                          className="np-picker__bar"
                          style={{ background: w.color ?? 'var(--neon-green)' }}
                        />
                        <span className="np-picker__itemName">{w.name}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="np-picker__gen">
                  <p>Gere um novo treino agora e atribua a {WEEKDAY_LABELS[pickerDay]}.</p>
                  <button className="neon-cta" onClick={() => setWizardOpen(true)}>
                    <Icon path={mdiPlus} size={0.9} color="#0A0B0F" />
                    GERAR TREINO
                  </button>
                </div>
              )}
            </div>
          )}
        </IonModal>

        <WorkoutWizardModal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onCreate={handleGenerate}
        />
      </IonContent>
    </IonPage>
  );
}






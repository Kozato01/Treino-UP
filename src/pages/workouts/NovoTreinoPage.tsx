import {
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
import { mdiArrowLeft } from '@mdi/js';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useData } from '../../stores/data';
import { useBackOverride } from '../../stores/backOverride';
import { WorkoutWizardModal } from '../../components/WorkoutWizardModal';
import type { GeneratedExercise } from '../../data/workoutGenerator';
import './NovoTreinoPage.css';

const COLORS = ['#C6FF4A', '#4AE3FF', '#FF4AD1', '#FFE44A', '#FF8B4A', '#B74AFF', '#4A9DFF'];

type Mode = 'menu' | 'manual';

export function NovoTreinoPage() {
  const history = useHistory();
  const addWorkout = useData((s) => s.addWorkout);
  const importWorkout = useData((s) => s.importWorkout);

  const [mode, setMode] = useState<Mode>('menu');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const canSave = name.trim().length > 0;

  useEffect(() => {
    if (wizardOpen) return; // wizard has its own BackOverride
    if (mode === 'manual') {
      useBackOverride.getState().set(() => {
        setMode('menu');
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    useBackOverride.getState().set(null);
  }, [mode, wizardOpen]);

  const onSaveManual = () => {
    if (!canSave) return;
    const id = addWorkout({
      name: name.trim(),
      description: description.trim() || null,
      color,
    });
    history.replace(`/treino/${id}`);
  };

  const onGenerate = (workoutName: string, exercises: GeneratedExercise[]) => {
    const id = importWorkout(
      { name: workoutName, description: null, color: null, createdAt: Date.now() },
      exercises
    );
    setWizardOpen(false);
    history.replace(`/treino/${id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              onClick={() => {
                if (mode === 'manual') {
                  setMode('menu');
                  return;
                }
                history.replace('/treinos');
              }}>
              <IonIcon slot="icon-only">
                <Icon path={mdiArrowLeft} size={1} color="var(--text)" />
              </IonIcon>
            </IonButton>
          </IonButtons>
          <IonTitle>Novo treino</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="nt-wrap">
          {mode === 'menu' ? (
            <>
              <p className="nt-lead">Como você quer criar seu treino?</p>

              <button
                className="nt-mode-card nt-mode-card--magic"
                onClick={() => setWizardOpen(true)}>
                <span className="nt-mode-card__icon">🧙</span>
                <div className="nt-mode-card__body">
                  <div className="nt-mode-card__title">GERAR TREINO</div>
                  <div className="nt-mode-card__desc">
                    Sugestões automáticas por grupo muscular e nível
                  </div>
                </div>
              </button>

              <button
                className="nt-mode-card nt-mode-card--search"
                onClick={() => setMode('manual')}>
                <span className="nt-mode-card__icon">🔍</span>
                <div className="nt-mode-card__body">
                  <div className="nt-mode-card__title">BUSCAR EXERCÍCIOS</div>
                  <div className="nt-mode-card__desc">
                    Monte manualmente escolhendo exercícios no catálogo
                  </div>
                </div>
              </button>
            </>
          ) : (
            <>
              <span className="section-label">NOME</span>
              <input
                className="neon-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Push A, Perna Pesada..."
              />

              <span className="section-label">DESCRIÇÃO</span>
              <textarea
                className="neon-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                rows={3}
              />

              <span className="section-label">COR DO TREINO</span>
              <div className="nt-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="nt-swatch"
                    onClick={() => setColor(c)}
                    style={{
                      background: c,
                      borderColor: color === c ? 'var(--text)' : 'transparent',
                    }}
                  />
                ))}
              </div>

              <button
                className="neon-cta"
                style={{ marginTop: 24 }}
                disabled={!canSave}
                onClick={onSaveManual}>
                CRIAR E ADICIONAR EXERCÍCIOS
              </button>
            </>
          )}
        </div>

        <WorkoutWizardModal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onCreate={onGenerate}
        />
      </IonContent>
    </IonPage>
  );
}

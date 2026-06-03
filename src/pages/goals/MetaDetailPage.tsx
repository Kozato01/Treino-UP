import { IonContent, IonPage, IonAlert } from '@ionic/react';
import Icon from '@mdi/react';
import { mdiCheckCircle, mdiChevronLeft, mdiTrashCanOutline, mdiCalendarCheck, mdiChartBar, mdiWeightLifter } from '@mdi/js';
import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import { useData } from '../../stores/data';
import { getExerciseById } from '../../data/exercises';
import type { GoalType } from '../../types';
import './MetaDetailPage.css';

const TYPE_CONFIG: Record<GoalType, { label: string; icon: string; color: string; unit: string }> = {
  weight: { label: 'CARGA', icon: mdiWeightLifter, color: 'var(--neon-green)', unit: 'kg' },
  frequency: { label: 'FREQUÊNCIA', icon: mdiCalendarCheck, color: 'var(--neon-cyan)', unit: 'x/sem' },
  volume: { label: 'VOLUME', icon: mdiChartBar, color: 'var(--neon-pink)', unit: 'kg' },
};

export function MetaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { goals, updateGoal, deleteGoal } = useData();

  const goal = goals.find((g) => g.id === Number(id));

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  useEffect(() => {
    if (!goal) history.replace('/home');
  }, [goal, history]);

  if (!goal) return null;

  const config = TYPE_CONFIG[goal.type];
  const exercise = goal.exerciseId ? getExerciseById(goal.exerciseId) : null;
  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;

  const handleMarkAchieved = () => {
    updateGoal(goal.id, { achieved: true, currentValue: goal.targetValue });
  };

  const handleDelete = () => {
    deleteGoal(goal.id);
    history.goBack();
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="md-wrap">
          {/* HEADER */}
          <div className="md-header">
            <button className="md-back" onClick={() => history.goBack()}>
              <Icon path={mdiChevronLeft} size={1.2} />
            </button>
            <h1 className="md-title">Minha Meta</h1>
            <button className="md-delete-btn" onClick={() => setDeleteAlertOpen(true)}>
              <Icon path={mdiTrashCanOutline} size={1} />
            </button>
          </div>

          {/* HERO */}
          <div className={`md-hero ${goal.achieved ? 'is-achieved' : ''}`}>
            <div className="md-hero__top">
              <span className="md-hero__badge" style={{ background: config.color, color: goal.type === 'weight' ? '#0A0B0F' : 'white' }}>
                <Icon path={config.icon} size={0.65} />
                {config.label}
              </span>
              {goal.achieved && <span className="md-hero__achieved-badge">✓ CONCLUÍDA</span>}
            </div>

            <div className="md-hero__name">
              {exercise ? (exercise.namePt ?? exercise.name) : config.label}
            </div>

            {goal.notes && <p className="md-hero__notes">{goal.notes}</p>}
          </div>

          {/* PROGRESSO */}
          <div className="md-block">
            <h2 className="md-block__title">Progresso</h2>
            <div className="md-progress-card">
              <div className="md-progress-row">
                <span className="md-progress-label">Atual</span>
                <span className="md-progress-value" style={{ color: config.color }}>
                  {goal.currentValue} {config.unit}
                </span>
              </div>
              <div className="md-bar">
                <div className="md-bar__fill" style={{ width: `${pct}%`, background: config.color }} />
              </div>
              <div className="md-progress-row">
                <span className="md-progress-pct">{pct}%</span>
                <span className="md-progress-label">Alvo: {goal.targetValue} {config.unit}</span>
              </div>
            </div>
          </div>

          {/* PRAZO */}
          {deadline && (
            <div className="md-block">
              <h2 className="md-block__title">Prazo</h2>
              <div className="md-deadline-card">
                <span className="md-deadline-date">
                  {deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                {daysLeft !== null && (
                  <span className={`md-deadline-days ${daysLeft < 0 ? 'is-overdue' : daysLeft <= 7 ? 'is-soon' : ''}`}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} dias atrás` : daysLeft === 0 ? 'Vence hoje' : `${daysLeft} dias restantes`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* QUANTO FALTA + AÇÃO */}
          {!goal.achieved && (
            <div className="md-block">
              <div className="md-remaining" style={{ borderColor: config.color }}>
                <span className="md-remaining__label">Faltam</span>
                <span className="md-remaining__value" style={{ color: config.color }}>
                  {Math.max(0, goal.targetValue - goal.currentValue).toFixed(goal.type === 'frequency' ? 0 : 1)} {config.unit}
                </span>
                <span className="md-remaining__hint">para atingir o alvo</span>
              </div>
              <button className="md-mark-btn" onClick={handleMarkAchieved}>
                <Icon path={mdiCheckCircle} size={0.7} />
                MARCAR COMO CONCLUÍDA
              </button>
            </div>
          )}

          {goal.achieved && (
            <div className="md-achieved-msg">
              🎉 Meta concluída! Parabéns pela dedicação.
            </div>
          )}
        </div>

        <IonAlert
          isOpen={deleteAlertOpen}
          header="Excluir meta?"
          message="Esta ação não pode ser desfeita."
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setDeleteAlertOpen(false) },
            { text: 'Excluir', role: 'destructive', handler: handleDelete },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}

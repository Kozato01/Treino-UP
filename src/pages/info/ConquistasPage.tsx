import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useMemo } from 'react';

import { ACHIEVEMENTS, computeStats } from '../../data/achievements';
import { useData } from '../../stores/data';
import './ConquistasPage.css';

export function ConquistasPage() {
  const sessions = useData((s) => s.sessions);
  const sessionSets = useData((s) => s.sessionSets);
  const workouts = useData((s) => s.workouts);
  const goals = useData((s) => s.goals);
  const bodyMeasurements = useData((s) => s.bodyMeasurements);
  const dailyMetrics = useData((s) => s.dailyMetrics);

  const stats = useMemo(
    () => computeStats(sessions, sessionSets, workouts, goals, bodyMeasurements, dailyMetrics),
    [sessions, sessionSets, workouts, goals, bodyMeasurements, dailyMetrics]
  );

  const unlocked = ACHIEVEMENTS.filter((a) => a.check(stats)).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ajustes" />
          </IonButtons>
          <IonTitle>Conquistas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="cq-wrap">
          <div className="cq-summary">
            <span className="cq-summary__count" style={{ color: 'var(--neon-green)' }}>
              {unlocked}
            </span>
            <span className="cq-summary__sep">/</span>
            <span className="cq-summary__count" style={{ color: 'var(--text-dim)' }}>
              {ACHIEVEMENTS.length}
            </span>
            <span className="cq-summary__label">CONQUISTAS DESBLOQUEADAS</span>
          </div>

          <div className="cq-progress-bar">
            <div
              className="cq-progress-bar__fill"
              style={{ width: `${(unlocked / ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>

          <div className="cq-grid">
            {ACHIEVEMENTS.map((a) => {
              const done = a.check(stats);
              const prog = a.progress(stats);
              const pct = Math.round((prog.current / prog.target) * 100);
              return (
                <div key={a.id} className={`cq-card${done ? ' is-unlocked' : ''}`}>
                  <div className="cq-card__icon">
                    <span className={done ? '' : 'cq-card__icon--locked'}>{a.emoji}</span>
                    {!done && <span className="cq-card__lock">🔒</span>}
                  </div>
                  <span className="cq-card__title">{a.title}</span>
                  <span className="cq-card__desc">{a.description}</span>
                  {!done && (
                    <div className="cq-card__prog-bar">
                      <div className="cq-card__prog-fill" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <span className="cq-card__pct">
                    {done ? '✓ Desbloqueada' : `${prog.current} / ${prog.target}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

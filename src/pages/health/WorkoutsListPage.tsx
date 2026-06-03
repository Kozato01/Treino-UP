import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from '@ionic/react';
import Icon from '@mdi/react';
import { mdiRun, mdiMapMarkerDistance, mdiFire, mdiClock } from '@mdi/js';
import { useEffect, useState } from 'react';
import {
  readLastNDaysWorkouts,
  type ExternalWorkout,
} from '../../services/healthConnect';
import { useHistory } from 'react-router-dom';
import './SaudePage.css';

export function WorkoutsListPage() {
  const history = useHistory();
  const [workouts, setWorkouts] = useState<ExternalWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      try {
        const data = await readLastNDaysWorkouts(30);
        setWorkouts(data);
      } catch (err) {
        console.error('Failed to fetch workouts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/saude" />
            </IonButtons>
            <IonTitle>Carregando atividades...</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}>
            <IonSpinner name="dots" color="primary" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (workouts.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/saude" />
            </IonButtons>
            <IonTitle>Atividades do relógio</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="sd-wrap">
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-mute)', margin: 0 }}>
                Nenhuma atividade registrada nos últimos 30 dias
              </p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/saude" />
          </IonButtons>
          <IonTitle>Atividades do relógio</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          <span className="section-label">
            {workouts.length} atividades nos últimos 30 dias
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workouts.map((w, i) => {
              const startDate = new Date(w.startDate);
              const dateStr = startDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              });
              const timeStr = startDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={`${w.startDate}-${i}`}
                  onClick={() =>
                    w.platformId && history.push(`/workout/${w.platformId}`)
                  }
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-surface-2)';
                    e.currentTarget.style.borderColor = 'var(--neon-green)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-surface)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon
                      path={mdiRun}
                      size={0.7}
                      color="var(--neon-green)"
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                        textTransform: 'capitalize',
                      }}>
                      {w.type}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-mute)',
                        marginLeft: 'auto',
                      }}>
                      {dateStr} {timeStr}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      fontSize: 12,
                      color: 'var(--text-mute)',
                    }}>
                    {w.durationMinutes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon path={mdiClock} size={0.5} color="var(--text-mute)" />
                        <span>{w.durationMinutes}min</span>
                      </div>
                    )}
                    {w.distanceMeters && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon
                          path={mdiMapMarkerDistance}
                          size={0.5}
                          color="var(--text-mute)"
                        />
                        <span>{(w.distanceMeters / 1000).toFixed(2)}km</span>
                      </div>
                    )}
                    {w.kcal && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon path={mdiFire} size={0.5} color="var(--text-mute)" />
                        <span>{w.kcal}kcal</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

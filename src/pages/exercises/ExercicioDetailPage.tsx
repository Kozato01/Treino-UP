import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { getExerciseById } from '../../data/exercises';
import { exerciseImageUrl } from '../../data/imageUrl';
import { labelCategory, labelEquipment, labelForce, labelMechanic } from '../../data/labels';
import { useData } from '../../stores/data';
import { formatDate } from '../../utils/format';
import './ExercicioDetailPage.css';

export function ExercicioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const exercise = id ? getExerciseById(id) : undefined;
  const sessions = useData((s) => s.sessions);
  const sessionSets = useData((s) => s.sessionSets);

  const history = useMemo(() => {
    if (!id) return [];
    const sessionsById = new Map(sessions.map((s) => [s.id, s]));
    const byCession = new Map<number, { maxWeight: number; totalReps: number; sets: number }>();
    for (const ss of sessionSets) {
      if (ss.exerciseId !== id || !ss.completed) continue;
      const cur = byCession.get(ss.sessionId) ?? { maxWeight: 0, totalReps: 0, sets: 0 };
      if (ss.weightKg != null && ss.weightKg > cur.maxWeight) cur.maxWeight = ss.weightKg;
      cur.totalReps += ss.reps ?? 0;
      cur.sets += 1;
      byCession.set(ss.sessionId, cur);
    }
    const rows = Array.from(byCession.entries())
      .map(([sessionId, agg]) => {
        const sess = sessionsById.get(sessionId);
        return sess ? { sessionId, date: sess.startedAt, ...agg } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
    return rows;
  }, [id, sessions, sessionSets]);

  if (!exercise) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/exercicios" />
            </IonButtons>
            <IonTitle>Exercício</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="empty-state">
            <span>Exercício não encontrado.</span>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const displayName = exercise.name;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/exercicios" />
          </IonButtons>
          <IonTitle>{displayName}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="ed-wrap">
          <div>
            <h1 className="ed-title">{displayName}</h1>
          </div>

          {exercise.images.length > 0 && (
            <div className="ed-images">
              {exercise.images.map((img) => (
                <img
                  key={img}
                  loading="lazy"
                  src={exerciseImageUrl(img)}
                  alt={displayName}
                  className="ed-image"
                />
              ))}
            </div>
          )}

          <div className="card ed-info">
            <InfoRow label="CATEGORIA" value={labelCategory(exercise.category)} />
            <InfoRow label="EQUIPAMENTO" value={labelEquipment(exercise.equipment)} />
            <InfoRow label="NÍVEL" value={exercise.level} />
            <InfoRow label="MECÂNICA" value={labelMechanic(exercise.mechanic)} />
            <InfoRow label="TIPO" value={labelForce(exercise.force)} />
          </div>

          <span className="section-label">MÚSCULOS TRABALHADOS</span>
          <div className="ed-muscles">
            {exercise.primaryMuscles.length > 0 && (
              <div>
                <span className="ed-muscle__head">PRIMÁRIOS</span>
                <div className="ed-tag-row">
                  {exercise.primaryMuscles.map((m) => (
                    <span key={m} className="tag">
                      {m.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <span className="ed-muscle__head">SECUNDÁRIOS</span>
                <div className="ed-tag-row">
                  {exercise.secondaryMuscles.map((m) => (
                    <span key={m} className="tag tag--outline">
                      {m.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="section-label">SEU HISTÓRICO</span>
          {history.length === 0 ? (
            <div className="ed-history-empty">Sem registros ainda — comece um treino para ver seu progresso.</div>
          ) : (
            <div className="ed-history">
              {(() => {
                const allTimeMax = Math.max(...history.map((h) => h.maxWeight), 0);
                return history.map((h, idx) => {
                  const isPR = h.maxWeight > 0 && h.maxWeight === allTimeMax;
                  const pctOfMax = allTimeMax > 0 ? Math.round((h.maxWeight / allTimeMax) * 100) : 0;
                  return (
                    <div key={h.sessionId} className={`ed-hist${idx === 0 ? ' ed-hist--latest' : ''}`}>
                      <div className="ed-hist__top">
                        <span className="ed-hist__weight">
                          {h.maxWeight > 0 ? `${h.maxWeight}kg` : '—'}
                        </span>
                        {isPR && <span className="ed-hist__pr">PR</span>}
                        <span className="ed-hist__date">{formatDate(h.date)}</span>
                      </div>
                      <div className="ed-hist__bar">
                        <div className="ed-hist__bar-fill" style={{ width: `${pctOfMax}%` }} />
                      </div>
                      <div className="ed-hist__meta">
                        {h.sets} {h.sets === 1 ? 'série' : 'séries'} · {h.totalReps} reps
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          <span className="section-label">COMO EXECUTAR</span>
          <div className="ed-steps">
            {exercise.instructions.map((step, idx) => (
              <div key={idx} className="ed-step">
                <div className="ed-step__badge">{idx + 1}</div>
                <p className="ed-step__text">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ed-row">
      <span className="ed-row__label">{label}</span>
      <span className="ed-row__value">{value}</span>
    </div>
  );
}

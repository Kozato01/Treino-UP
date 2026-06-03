import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import { mdiPencil, mdiPlay, mdiShareVariant, mdiTrashCanOutline } from '@mdi/js';
import { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { useData } from '../../stores/data';
import { confirmDestructive } from '../../utils/confirm';
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday, type Workout, type WorkoutExercise } from '../../types';
import './FichaDetailPage.css';

type WorkoutPackShare = {
  version: 1;
  type: 'workout-pack-share';
  pack: {
    name: string;
    description: string | null;
    assignments: Partial<Record<Weekday, number>>;
  };
  workouts: Array<{
    workout: Omit<Workout, 'id'>;
    exercises: Omit<WorkoutExercise, 'id' | 'workoutId'>[];
  }>;
};

export function FichaDetailPage() {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const packId = Number(id);

  const pack = useData((s) => s.workoutPacks.find((p) => p.id === packId));
  const workouts = useData((s) => s.workouts);
  const workoutExercises = useData((s) => s.workoutExercises);
  const [toast, setToast] = useState<{ msg: string; color: 'success' | 'danger' } | null>(null);
  const activePackId = useData((s) => s.activePackId);
  const setActivePack = useData((s) => s.setActivePack);
  const deleteWorkoutPack = useData((s) => s.deleteWorkoutPack);

  const isActive = pack?.id === activePackId;

  const todayWd: Weekday = (() => {
    const map: Record<number, Weekday> = {
      1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
    };
    return map[new Date().getDay()];
  })();

  const daysList = useMemo(() => {
    if (!pack) return [];
    return WEEKDAYS.map((wd) => {
      const wid = pack.assignments[wd];
      const w = wid != null ? workouts.find((x) => x.id === wid) ?? null : null;
      const count = w ? workoutExercises.filter((we) => we.workoutId === w.id).length : 0;
      return { wd, workout: w, exerciseCount: count, isToday: wd === todayWd };
    });
  }, [pack, workouts, workoutExercises, todayWd]);

  const daysWithWorkoutCount = useMemo(
    () => (pack ? Object.values(pack.assignments).filter((v) => v != null).length : 0),
    [pack]
  );

  if (!pack) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/treinos" />
            </IonButtons>
            <IonTitle>Rotina</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="pd-missing">Rotina não encontrada.</div>
        </IonContent>
      </IonPage>
    );
  }

  const sharePack = async () => {
    const workoutIds = Object.values(pack.assignments).filter((v): v is number => v != null);
    const uniqueIds = [...new Set(workoutIds)].filter((wid) =>
      workouts.some((x) => x.id === wid)
    );
    const idToIndex = new Map(uniqueIds.map((wid, idx) => [wid, idx]));
    const workoutsOut = uniqueIds.map((wid) => {
      const w = workouts.find((x) => x.id === wid)!;
      const exs = workoutExercises
        .filter((we) => we.workoutId === wid)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(({ id: _id, workoutId: _wid, ...rest }) => rest);
      return {
        workout: { name: w.name, description: w.description, color: w.color, createdAt: w.createdAt },
        exercises: exs,
      };
    });
    const remappedAssignments: Partial<Record<Weekday, number>> = {};
    for (const [wd, wid] of Object.entries(pack.assignments) as [Weekday, number | undefined][]) {
      if (wid == null) continue;
      const idx = idToIndex.get(wid);
      if (idx != null) remappedAssignments[wd] = idx;
    }
    const payload: WorkoutPackShare = {
      version: 1,
      type: 'workout-pack-share',
      pack: {
        name: pack.name,
        description: pack.description,
        assignments: remappedAssignments,
      },
      workouts: workoutsOut,
    };
    const json = JSON.stringify(payload, null, 2);
    const slug = pack.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `rotina-${slug}.json`;

    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: pack.name,
        text: 'Dê uma olhada na minha Rotina de treino do Academia App!',
        url: result.uri,
        dialogTitle: 'Compartilhar Rotina',
      });
      setToast({ msg: 'Rotina compartilhada!', color: 'success' });
    } catch (e) {
      console.error('Erro ao compartilhar', e);
      setToast({ msg: 'Falha ao compartilhar rotina.', color: 'danger' });
    }
  };

  const doDelete = () => {
    confirmDestructive(
      'Apagar Rotina?',
      'Os treinos vinculados permanecem. Apenas a Rotina será removida.',
      'Apagar',
      () => {
        deleteWorkoutPack(pack.id);
        history.replace('/treinos');
      }
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/treinos" />
          </IonButtons>
          <IonTitle>{pack.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={sharePack} aria-label="Compartilhar">
              <Icon path={mdiShareVariant} size={0.8} color="var(--neon-cyan)" />
            </IonButton>
            <IonButton
              onClick={() => history.push(`/nova-ficha?edit=${pack.id}`)}
              aria-label="Editar">
              <Icon path={mdiPencil} size={0.8} color="var(--neon-green)" />
            </IonButton>
            <IonButton onClick={doDelete} aria-label="Apagar">
              <Icon path={mdiTrashCanOutline} size={0.8} color="var(--neon-pink)" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="pd-wrap">
          <div className="pd-hero">
            <div className="pd-hero__head">
              <span className="pd-hero__name">{pack.name}</span>
              {isActive && <span className="pd-hero__badge">ATIVO</span>}
            </div>
            <div className={`pd-hero__status${isActive ? ' is-active' : ''}`}>
              <span className="pd-hero__dot" />
              {isActive
                ? `ROTINA ATIVA · ${daysWithWorkoutCount} dias`
                : `${daysWithWorkoutCount} dias configurados`}
            </div>
            {pack.description && <span className="pd-hero__desc">{pack.description}</span>}
            <button
              className={`pd-active-toggle${isActive ? ' is-active' : ''}`}
              onClick={() => setActivePack(isActive ? null : pack.id)}>
              {isActive ? 'DESATIVAR ROTINA' : 'DEFINIR COMO ATIVA'}
            </button>
          </div>

          <span className="section-label">AGENDA DA SEMANA</span>
          <div className="pd-timeline">
            {daysList.map(({ wd, workout, exerciseCount, isToday }, i) => {
              const hasWorkout = !!workout;
              const state = isToday ? 'today' : hasWorkout ? 'workout' : 'rest';
              return (
                <div key={wd} className={`pd-tl-row is-${state}`}>
                  <div className="pd-tl-gutter">
                    <div className="pd-tl-node">
                      <span className="pd-tl-node__letter">{WEEKDAY_LABELS[wd][0]}</span>
                    </div>
                    <span className="pd-tl-node__label">{WEEKDAY_LABELS[wd]}</span>
                    {i < daysList.length - 1 && <span className="pd-tl-line" />}
                  </div>

                  <div className="pd-tl-card">
                    {hasWorkout ? (
                      <>
                        <button
                          className="pd-tl-card__body"
                          onClick={() => history.push(`/treino/${workout.id}`)}>
                          <span
                            className="pd-tl-card__bar"
                            style={{ background: workout.color ?? 'var(--neon-green)' }}
                          />
                          <div className="pd-tl-card__text">
                            <span className="pd-tl-card__name">{workout.name}</span>
                            <span className="pd-tl-card__meta">
                              {isToday && <em className="pd-tl-card__today">HOJE · </em>}
                              {exerciseCount} exercícios
                            </span>
                          </div>
                        </button>
                        <button
                          className="pd-tl-card__play"
                          onClick={() => history.push(`/treino/${workout.id}?start=1`)}
                          aria-label="Iniciar">
                          <Icon path={mdiPlay} size={0.8} color="#0A0B0F" />
                        </button>
                      </>
                    ) : (
                      <div className="pd-tl-card__body pd-tl-card__body--rest">
                        <span className="pd-tl-card__rest">
                          {isToday ? 'Descanso · HOJE' : 'Descanso'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <IonToast
          isOpen={toast != null}
          message={toast?.msg ?? ''}
          duration={2500}
          color={toast?.color}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
}



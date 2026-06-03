import { IonContent, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle } from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiChevronRight,
  mdiCloudDownload,
  mdiDumbbell,
  mdiPackageVariant,
} from '@mdi/js';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { useData } from '../../stores/data';
import './TreinosCompartilhadosPage.css';

export function TreinosCompartilhadosPage() {
  const history = useHistory();
  const workouts = useData((s) => s.workouts);
  const workoutExercises = useData((s) => s.workoutExercises);
  const packs = useData((s) => s.workoutPacks);
  const importWorkout = useData((s) => s.importWorkout);
  const importPack = useData((s) => s.importPack);

  const sharedWorkouts = useMemo(() => {
    return workouts
      .filter((w) => w.isImported)
      .map((w) => ({
        ...w,
        exercisesCount: workoutExercises.filter((we) => we.workoutId === w.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, workoutExercises]);

  const sharedPacks = useMemo(() => {
    return packs
      .filter((p) => p.isImported)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [packs]);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const share = JSON.parse(text);
        if (share.type === 'workout-share' && share.workout && share.exercises) {
          importWorkout({ ...share.workout, isImported: true }, share.exercises);
          alert('Treino importado com sucesso!');
        } else if (share.type === 'workout-pack-share' && share.pack && share.workouts) {
          importPack(share);
          alert('Rotina importada com sucesso!');
        } else {
          alert('Arquivo JSON inválido ou não reconhecido.');
        }
      } catch {
        alert('Falha ao ler o arquivo JSON.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const total = sharedWorkouts.length + sharedPacks.length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/treinos" />
          </IonButtons>
          <IonTitle>Importados</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="tc-wrap">

          {/* Hero */}
          <div className="tc-hero">
            <div className="tc-hero__icon">
              <Icon path={mdiCloudDownload} size={1.1} color="var(--neon-red)" />
            </div>
            <div className="tc-hero__body">
              <span className="tc-hero__title">Treinos Importados</span>
              <span className="tc-hero__sub">
                {total === 0
                  ? 'Nenhum item importado ainda'
                  : `${total} item${total !== 1 ? 's' : ''} importado${total !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Import button */}
          <label className="tc-import">
            <Icon path={mdiCloudDownload} size={0.85} color="var(--neon-red)" />
            IMPORTAR ARQUIVO JSON
            <input
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>

          {/* Empty state */}
          {total === 0 && (
            <div className="tc-empty">
              <Icon path={mdiCloudDownload} size={2.5} color="var(--outline)" />
              <p className="tc-empty__title">Nenhum item importado</p>
              <p className="tc-empty__sub">
                Peça a um amigo para compartilhar o treino dele com você e importe o arquivo JSON acima.
              </p>
            </div>
          )}

          {/* Rotinas importadas */}
          {sharedPacks.length > 0 && (
            <div className="tc-section">
              <span className="tc-section__label">Rotinas</span>
              {sharedPacks.map((pack) => {
                const filled = Object.values(pack.assignments).filter((v) => v != null).length;
                return (
                  <button
                    key={`pack-${pack.id}`}
                    className="tc-card"
                    onClick={() => history.push(`/ficha/${pack.id}`)}>
                    <span className="tc-card__bar" />
                    <span className="tc-card__body">
                      <span className="tc-card__title">{pack.name}</span>
                      {pack.description && (
                        <span className="tc-card__desc">{pack.description}</span>
                      )}
                      <span className="tc-card__tags">
                        <span className="tag tag--outline">
                          <Icon path={mdiPackageVariant} size={0.45} color="var(--text-mute)" />
                          &nbsp;{filled} dia{filled !== 1 ? 's' : ''}/semana
                        </span>
                        <span className="tag" style={{ background: 'rgba(255,59,59,0.12)', color: 'var(--neon-red)' }}>
                          ROTINA
                        </span>
                      </span>
                    </span>
                    <span className="tc-card__chevron">
                      <Icon path={mdiChevronRight} size={0.9} color="var(--text-mute)" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Treinos individuais importados */}
          {sharedWorkouts.length > 0 && (
            <div className="tc-section">
              <span className="tc-section__label">Treinos individuais</span>
              {sharedWorkouts.map((item) => (
                <button
                  key={item.id}
                  className="tc-card"
                  onClick={() => history.push(`/treino/${item.id}`)}>
                  <span className="tc-card__bar" />
                  <span className="tc-card__body">
                    <span className="tc-card__title">{item.name}</span>
                    {item.description && (
                      <span className="tc-card__desc">{item.description}</span>
                    )}
                    <span className="tc-card__tags">
                      <span className="tag tag--outline">
                        <Icon path={mdiDumbbell} size={0.45} color="var(--text-mute)" />
                        &nbsp;{item.exercisesCount} exercício{item.exercisesCount !== 1 ? 's' : ''}
                      </span>
                    </span>
                  </span>
                  <span className="tc-card__chevron">
                    <Icon path={mdiChevronRight} size={0.9} color="var(--text-mute)" />
                  </span>
                </button>
              ))}
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
}

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import { mdiPackageVariant, mdiPlus } from '@mdi/js';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { useData } from '../../stores/data';
import type { Weekday } from '../../types';
import './FichasPage.css';

export function FichasPage() {
  const history = useHistory();
  const packs = useData((s) => s.workoutPacks);
  const activePackId = useData((s) => s.activePackId);

  const list = useMemo(
    () => [...packs].sort((a, b) => a.name.localeCompare(b.name)),
    [packs]
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/treinos" />
          </IonButtons>
          <IonTitle>Minhas Rotinas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="pk-wrap">
          {list.length === 0 ? (
            <div className="pk-empty">
              <Icon path={mdiPackageVariant} size={2.5} color="var(--outline)" />
              <h2>Nenhuma Rotina ainda</h2>
              <p>Agrupe treinos por dia da semana.</p>
            </div>
          ) : (
            <div className="pk-list">
              {list.map((p) => {
                const filled = Object.keys(p.assignments).filter(
                  (k) => p.assignments[k as Weekday] != null
                ).length;
                const isActive = p.id === activePackId;
                return (
                  <button
                    key={p.id}
                    className="pk-card"
                    onClick={() => history.push(`/ficha/${p.id}`)}>
                    <div className="pk-card__head">
                      <span className="pk-card__title">{p.name}</span>
                      {isActive && <span className="pk-card__badge">ATIVO</span>}
                    </div>
                    {p.description && <span className="pk-card__desc">{p.description}</span>}
                    <span className="pk-card__meta">
                      {filled} {filled === 1 ? 'DIA' : 'DIAS'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className="pk-fab" onClick={() => history.push('/nova-ficha')}>
          <Icon path={mdiPlus} size={1.1} color="#0A0B0F" />
          CRIAR ROTINA
        </button>
      </IonContent>
    </IonPage>
  );
}




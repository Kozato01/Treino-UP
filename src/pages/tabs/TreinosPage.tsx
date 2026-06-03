import { IonContent, IonModal, IonPage } from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiChevronRight,
  mdiDownloadOutline,
  mdiPlay,
  mdiPlus,
  mdiTrashCanOutline,
} from '@mdi/js';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useData } from '../../stores/data';
import { useBackOverride } from '../../stores/backOverride';
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from '../../types';
import './TreinosPage.css';

type Tab = 'rotinas' | 'livres' | 'importados';

const DAY_MAP: Record<number, Weekday> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
};

export function TreinosPage() {
  const history = useHistory();
  const workouts = useData((s) => s.workouts);
  const workoutExercises = useData((s) => s.workoutExercises);
  const packs = useData((s) => s.workoutPacks);
  const activePackId = useData((s) => s.activePackId);
  const deleteWorkout = useData((s) => s.deleteWorkout);

  const [tab, setTab] = useState<Tab>('rotinas');
  const [pickerOpen, setPickerOpen] = useState(false);

  const activePack = useMemo(
    () => packs.find((p) => p.id === activePackId) ?? null,
    [packs, activePackId]
  );

  const todayWd = DAY_MAP[new Date().getDay()];

  const todayWorkout = useMemo(() => {
    if (!activePack) return null;
    const wid = activePack.assignments[todayWd];
    return wid != null ? workouts.find((w) => w.id === wid) ?? null : null;
  }, [activePack, workouts, todayWd]);

  const weekDays = useMemo(() => {
    return WEEKDAYS.map((wd) => {
      const wid = activePack?.assignments[wd];
      const w = wid != null ? workouts.find((x) => x.id === wid) ?? null : null;
      return { wd, workout: w, isToday: wd === todayWd };
    });
  }, [activePack, workouts, todayWd]);

  const minhasRotinas = useMemo(
    () => packs.filter((p) => !p.isImported),
    [packs]
  );
  const rotinasImportadas = useMemo(
    () => packs.filter((p) => p.isImported),
    [packs]
  );

  const countExercises = (workoutId: number) =>
    workoutExercises.filter((we) => we.workoutId === workoutId).length;

  const countDaysOfPack = (packId: number) => {
    const p = packs.find((x) => x.id === packId);
    if (!p) return 0;
    return Object.values(p.assignments).filter((v) => v != null).length;
  };

  // BackOverride unificado: modal tem prioridade > tab não-rotinas > fallback
  useEffect(() => {
    if (pickerOpen) {
      useBackOverride.getState().set(() => {
        setPickerOpen(false);
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    if (tab !== 'rotinas') {
      useBackOverride.getState().set(() => {
        setTab('rotinas');
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    useBackOverride.getState().set(null);
  }, [tab, pickerOpen]);

  const handleStartTodayWorkout = () => {
    if (todayWorkout) history.push(`/treino/${todayWorkout.id}`);
  };

  const handleStartFree = (workoutId: number) => {
    setPickerOpen(false);
    history.push(`/treino/${workoutId}`);
  };

  const handleDeleteWorkout = (id: number, name: string) => {
    if (confirm(`Excluir "${name}"?`)) deleteWorkout(id);
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="treinos-wrap">
          {/* HEADER */}
          <div className="tp-header">
            <h1 className="tp-title">Treinos</h1>
          </div>

          {/* HERO HOJE */}
          {activePack ? (
            <div className={`tp-hero ${todayWorkout ? 'is-workout' : 'is-rest'}`}>
              <div className="tp-hero__top">
                <span className="tp-hero__badge">HOJE</span>
                <span className="tp-hero__meta">
                  {WEEKDAY_LABELS[todayWd]} · {activePack.name}
                </span>
              </div>
              <div className="tp-hero__name">
                {todayWorkout ? todayWorkout.name : 'Descanso'}
              </div>
              <div className="tp-hero__sub">
                {todayWorkout
                  ? `${countExercises(todayWorkout.id)} exercícios`
                  : 'sem treino agendado para hoje'}
              </div>
              {todayWorkout ? (
                <button className="tp-hero__cta is-primary" onClick={handleStartTodayWorkout}>
                  <Icon path={mdiPlay} size={0.9} /> INICIAR
                </button>
              ) : (
                <button
                  className="tp-hero__cta is-secondary"
                  onClick={() => setPickerOpen(true)}
                  disabled={workouts.length === 0}>
                  <Icon path={mdiPlay} size={0.9} /> INICIAR ASSIM MESMO
                </button>
              )}
            </div>
          ) : (
            <div className="tp-hero is-empty">
              <div className="tp-hero__name">Sem Rotina Ativa</div>
              <div className="tp-hero__sub">
                Crie uma rotina pra organizar sua semana.
              </div>
              <button
                className="tp-hero__cta is-primary"
                onClick={() => history.push('/nova-ficha')}>
                <Icon path={mdiPlus} size={0.9} /> CRIAR ROTINA
              </button>
            </div>
          )}

          {/* WEEK STRIP */}
          <div className="tp-weekstrip">
            {weekDays.map(({ wd, workout, isToday }) => (
              <button
                key={wd}
                className={`tp-weekchip ${isToday ? 'is-today' : ''} ${workout ? 'has-workout' : ''}`}
                onClick={() => workout && history.push(`/treino/${workout.id}`)}
                disabled={!workout}
                aria-label={`${WEEKDAY_LABELS[wd]}${workout ? ': ' + workout.name : ' descanso'}`}>
                <span className="tp-weekchip__label">{WEEKDAY_LABELS[wd]}</span>
                {workout && <span className="tp-weekchip__dot" />}
              </button>
            ))}
          </div>

          {/* TABS */}
          <div className="tp-tabs">
            <button
              className={`tp-tab ${tab === 'rotinas' ? 'is-active is-cyan' : ''}`}
              onClick={() => setTab('rotinas')}>
              Minhas Rotinas
            </button>
            <button
              className={`tp-tab ${tab === 'livres' ? 'is-active is-green' : ''}`}
              onClick={() => setTab('livres')}>
              Treinos Livres
            </button>
            <button
              className={`tp-tab ${tab === 'importados' ? 'is-active is-red' : ''}`}
              onClick={() => setTab('importados')}>
              Importados
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="tp-tabcontent">
            {tab === 'rotinas' && (
              <>
                {minhasRotinas.length === 0 ? (
                  <div className="tp-empty">Nenhuma rotina criada ainda.</div>
                ) : (
                  minhasRotinas.map((p) => (
                    <button
                      key={p.id}
                      className="tp-item"
                      onClick={() => history.push(`/ficha/${p.id}`)}>
                      <div className="tp-item__body">
                        <div className="tp-item__title">{p.name}</div>
                        <div className="tp-item__sub">
                          {countDaysOfPack(p.id)} dias
                        </div>
                      </div>
                      {p.id === activePackId && (
                        <span className="tp-badge is-green">ATIVO</span>
                      )}
                      <Icon path={mdiChevronRight} size={0.9} color="var(--neon-cyan)" />
                    </button>
                  ))
                )}
                <button
                  className="tp-action is-dashed is-cyan"
                  onClick={() => history.push('/nova-ficha')}>
                  <Icon path={mdiPlus} size={0.8} /> CRIAR ROTINA
                </button>
              </>
            )}

            {tab === 'livres' && (
              <>
                {workouts.length === 0 ? (
                  <div className="tp-empty">Nenhum treino livre.</div>
                ) : (
                  workouts.map((w) => (
                    <div key={w.id} className="tp-item">
                      <button
                        className="tp-item__body tp-item__body--btn"
                        onClick={() => history.push(`/treino/${w.id}`)}>
                        <div className="tp-item__title">{w.name}</div>
                        <div className="tp-item__sub">
                          {countExercises(w.id)} exercícios
                        </div>
                      </button>
                      <button
                        className="tp-iconbtn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(w.id, w.name); }}
                        aria-label="Excluir">
                        <Icon path={mdiTrashCanOutline} size={0.8} color="var(--text-mute)" />
                      </button>
                      <button
                        className="tp-iconbtn is-play"
                        onClick={(e) => { e.stopPropagation(); history.push(`/treino/${w.id}`); }}
                        aria-label="Iniciar">
                        <Icon path={mdiPlay} size={0.8} color="#0A0B0F" />
                      </button>
                    </div>
                  ))
                )}
                <button
                  className="tp-action is-dashed is-green"
                  onClick={() => history.push('/novo-treino')}>
                  <Icon path={mdiPlus} size={0.8} /> NOVO TREINO
                </button>
              </>
            )}

            {tab === 'importados' && (
              <>
                <button
                  className="tp-action is-dashed is-red"
                  onClick={() => history.push('/compartilhados')}>
                  <Icon path={mdiDownloadOutline} size={0.8} /> IMPORTAR VIA JSON
                </button>
                {rotinasImportadas.length === 0 ? (
                  <div className="tp-empty">Nada importado ainda.</div>
                ) : (
                  rotinasImportadas.map((p) => (
                    <button
                      key={p.id}
                      className="tp-item is-imported"
                      onClick={() => history.push(`/ficha/${p.id}`)}>
                      <div className="tp-item__body">
                        <div className="tp-item__titleRow">
                          <span className="tp-item__title">{p.name}</span>
                          <span className="tp-badge is-red">IMPORTADO</span>
                        </div>
                        <div className="tp-item__sub">
                          {countDaysOfPack(p.id)} dias
                        </div>
                      </div>
                      <Icon path={mdiChevronRight} size={0.9} color="var(--neon-red)" />
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* MODAL: SELECIONAR TREINO LIVRE (INICIAR ASSIM MESMO) */}
        <IonModal
          isOpen={pickerOpen}
          onDidDismiss={() => setPickerOpen(false)}
          breakpoints={[0, 0.5, 0.85]}
          initialBreakpoint={0.5}>
          <div className="tp-picker">
            <h2 className="tp-picker__title">Escolha um treino livre</h2>
            {workouts.length === 0 ? (
              <div className="tp-empty">Crie um treino livre primeiro.</div>
            ) : (
              workouts.map((w) => (
                <button
                  key={w.id}
                  className="tp-item"
                  onClick={() => handleStartFree(w.id)}>
                  <div className="tp-item__body">
                    <div className="tp-item__title">{w.name}</div>
                    <div className="tp-item__sub">
                      {countExercises(w.id)} exercícios
                    </div>
                  </div>
                  <Icon path={mdiPlay} size={0.9} color="var(--neon-green)" />
                </button>
              ))
            )}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

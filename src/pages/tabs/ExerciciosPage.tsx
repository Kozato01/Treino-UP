import { IonContent, IonModal, IonPage } from '@ionic/react';
import Icon from '@mdi/react';
import { mdiChevronRight, mdiMagnify, mdiMagnifyClose, mdiPlus, mdiTrashCanOutline } from '@mdi/js';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { searchExercises } from '../../data/exercises';
import { labelEquipment } from '../../data/labels';
import { useBackOverride } from '../../stores/backOverride';
import { useCustomExercises } from '../../stores/customExercises';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { confirmDestructive } from '../../utils/confirm';
import './ExerciciosPage.css';

const MUSCLE_OPTIONS_PT = [
  'peito',
  'dorsais',
  'ombros',
  'biceps',
  'triceps',
  'quadriceps',
  'isquiotibiais',
  'gluteos',
  'panturrilhas',
  'abdominais',
];

const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'abdominals',
] as const;

const MUSCLE_GROUP_MAP: Record<string, string[]> = {
  chest: ['peito'],
  back: ['dorsais', 'meio-das-costas', 'inferior-das-costas', 'trapezio'],
  shoulders: ['ombros'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  legs: ['quadriceps', 'isquiotibiais', 'panturrilhas', 'abdutores', 'adutores'],
  glutes: ['gluteos'],
  abdominals: ['abdominais'],
};

const MUSCLE_GROUP_LABEL: Record<string, string> = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  legs: 'Pernas',
  glutes: 'Glúteos',
  abdominals: 'Abdômen',
};

export function ExerciciosPage() {
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 150);
  const addCustom = useCustomExercises((s) => s.addCustom);
  const deleteCustom = useCustomExercises((s) => s.deleteCustom);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState(MUSCLE_OPTIONS_PT[0]);
  const [newEquipment, setNewEquipment] = useState('');

  // Hardware back: prioridade fecha modal de criação, depois reseta filtro
  // de músculo, depois limpa busca antes de sair da tab.
  useEffect(() => {
    if (createOpen) {
      useBackOverride.getState().set(() => {
        setCreateOpen(false);
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    if (muscle != null) {
      useBackOverride.getState().set(() => {
        setMuscle(null);
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    if (search.trim() !== '') {
      useBackOverride.getState().set(() => {
        setSearch('');
        return true;
      });
      return () => useBackOverride.getState().set(null);
    }
    useBackOverride.getState().set(null);
  }, [createOpen, muscle, search]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    addCustom({ name: newName, primaryMuscle: newMuscle, equipment: newEquipment });
    setNewName('');
    setNewEquipment('');
    setCreateOpen(false);
  };

  const list = useMemo(() => {
    const muscleList = muscle ? MUSCLE_GROUP_MAP[muscle] : undefined;
    return searchExercises(debouncedSearch, muscleList)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [debouncedSearch, muscle]);

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="ex-header">
          <div className="ex-search">
            <Icon path={mdiMagnify} size={0.8} color="var(--text-dim)" />
            <input
              className="ex-search__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar exercício..."
            />
          </div>
          <div className="ex-chips">
            <button
              className={`pill${muscle === null ? ' is-active' : ''}`}
              onClick={() => setMuscle(null)}>
              TODOS
            </button>
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m}
                className={`pill${muscle === m ? ' is-active' : ''}`}
                onClick={() => setMuscle(muscle === m ? null : m)}>
                {MUSCLE_GROUP_LABEL[m].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="ex-count-row">
          <span className="ex-count">
            {list.length} {list.length === 1 ? 'exercício' : 'exercícios'}
          </span>
          <button className="ex-create-btn" onClick={() => setCreateOpen(true)}>
            <Icon path={mdiPlus} size={0.7} color="var(--neon-green)" />
            CRIAR
          </button>
        </div>

        <div className="ex-list">
          {list.length === 0 ? (
            <div className="empty-state">
              <Icon path={mdiMagnifyClose} size={2} color="var(--outline)" />
              <span>Nenhum exercício encontrado</span>
            </div>
          ) : (
            list.map((item) => {
              const isCustom = item.id.startsWith('custom-');
              return (
                <div key={item.id} className="ex-card-wrap">
                  <button
                    className="ex-card"
                    onClick={() => history.push(`/exercicio/${item.id}`)}>
                    <div className="ex-card__body">
                      <div className="ex-card__title-row">
                        <span className="ex-card__title">{item.name}</span>
                        {isCustom && <span className="ex-card__badge">MEUS</span>}
                      </div>
                      <div className="ex-card__tags">
                        {item.primaryMuscles.slice(0, 2).map((m) => (
                          <span key={m} className="tag">
                            {m.toUpperCase()}
                          </span>
                        ))}
                        <span className="tag tag--outline">
                          {labelEquipment(item.equipment).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Icon path={mdiChevronRight} size={0.9} color="var(--text-mute)" />
                  </button>
                  {isCustom && (
                    <button
                      className="ex-card__del"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDestructive(
                          'Excluir exercício?',
                          'Treinos que usam este exercício podem quebrar.',
                          'Excluir',
                          () => deleteCustom(item.id),
                        );
                      }}>
                      <Icon path={mdiTrashCanOutline} size={0.7} color="var(--neon-pink)" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <IonModal isOpen={createOpen} onDidDismiss={() => setCreateOpen(false)}>
          <div className="ex-create">
            <h2 className="ex-create__title">Criar exercício</h2>
            <label className="ex-create__field">
              <span>NOME</span>
              <input
                className="neon-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Pulley Costas Reverso"
                autoFocus
              />
            </label>
            <label className="ex-create__field">
              <span>MÚSCULO PRIMÁRIO</span>
              <select
                className="neon-input"
                value={newMuscle}
                onChange={(e) => setNewMuscle(e.target.value)}>
                {MUSCLE_OPTIONS_PT.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="ex-create__field">
              <span>EQUIPAMENTO (OPCIONAL)</span>
              <input
                className="neon-input"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                placeholder="Ex: cabo, halter, barra"
              />
            </label>
            <div className="ex-create__actions">
              <button
                className="neon-cta"
                style={{ flex: 1, background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}
                onClick={() => setCreateOpen(false)}>
                CANCELAR
              </button>
              <button
                className="neon-cta"
                style={{ flex: 1 }}
                disabled={!newName.trim()}
                onClick={handleCreate}>
                CRIAR
              </button>
            </div>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

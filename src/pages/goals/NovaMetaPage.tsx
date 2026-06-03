import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiCalendarCheck,
  mdiChartBar,
  mdiChevronDown,
  mdiChevronRight,
  mdiDumbbell,
  mdiLightbulbOnOutline,
  mdiMagnify,
  mdiWeightLifter,
} from '@mdi/js';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { searchExercises } from '../../data/exercises';
import { useData } from '../../stores/data';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import type { GoalType } from '../../types';
import './NovaMetaPage.css';

const TYPE_OPTIONS: {
  value: GoalType;
  label: string;
  iconPath: string;
  color: string;
  hint: string;
  presets: number[];
  unit: string;
}[] = [
  {
    value: 'weight',
    label: 'CARGA',
    iconPath: mdiWeightLifter,
    color: 'var(--neon-green)',
    hint: 'Ex: agachar 120 kg',
    presets: [60, 80, 100, 120, 150],
    unit: 'kg',
  },
  {
    value: 'frequency',
    label: 'FREQ',
    iconPath: mdiCalendarCheck,
    color: 'var(--neon-cyan)',
    hint: 'Ex: treinar 4x por semana',
    presets: [3, 4, 5, 6],
    unit: 'x/sem',
  },
  {
    value: 'volume',
    label: 'VOLUME',
    iconPath: mdiChartBar,
    color: 'var(--neon-pink)',
    hint: 'Ex: 20.000 kg por semana',
    presets: [5000, 10000, 20000, 30000],
    unit: 'kg/sem',
  },
];

export function NovaMetaPage() {
  const history = useHistory();
  const addGoal = useData((s) => s.addGoal);
  const [type, setType] = useState<GoalType>('weight');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const canSave =
    target.trim().length > 0 &&
    parseFloat(target.replace(',', '.')) > 0 &&
    (type !== 'weight' || exerciseId != null);

  const save = () => {
    if (!canSave) return;
    let deadlineMs: number | null = null;
    // Aceita formato HTML5 yyyy-mm-dd (input type=date) ou dd/mm/aaaa (legado).
    const dIso = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dBr = deadline.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dIso) {
      const [, yyyy, mm, dd] = dIso;
      deadlineMs = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
    } else if (dBr) {
      const [, dd, mm, yyyy] = dBr;
      deadlineMs = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
    }
    addGoal({
      type,
      exerciseId: type === 'weight' ? exerciseId : null,
      targetValue: parseFloat(target.replace(',', '.')),
      deadline: deadlineMs,
      notes: notes.trim() || null,
    });
    history.goBack();
  };

  const currentType = TYPE_OPTIONS.find((t) => t.value === type)!;
  const targetLabel =
    type === 'frequency'
      ? 'SESSÕES POR SEMANA'
      : type === 'volume'
      ? 'VOLUME ALVO (KG/SEMANA)'
      : 'CARGA ALVO (KG)';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="Voltar" />
          </IonButtons>
          <IonTitle>Nova meta</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="nm-wrap">
          <span className="section-label">TIPO DE META</span>
          <div className="nm-type-row">
            {TYPE_OPTIONS.map((opt) => {
              const active = opt.value === type;
              return (
                <button
                  key={opt.value}
                  className={`nm-type${active ? ' is-active' : ''}`}
                  style={active ? { background: opt.color, borderColor: opt.color } : undefined}
                  onClick={() => setType(opt.value)}>
                  <Icon path={opt.iconPath} size={0.9} color={active ? '#0A0B0F' : opt.color} />
                  <span style={{ color: active ? '#0A0B0F' : 'var(--text-dim)' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="nm-hint">
            <Icon path={mdiLightbulbOnOutline} size={0.6} color={currentType.color} />
            <span>{currentType.hint}</span>
          </div>

          {type === 'weight' && (
            <>
              <span className="section-label">EXERCÍCIO</span>
              <button className="nm-picker" onClick={() => setPickerOpen(true)}>
                <Icon path={mdiDumbbell} size={0.8} color="var(--neon-green)" />
                <span
                  className="nm-picker__text"
                  style={{ color: exerciseName ? 'var(--text)' : 'var(--text-mute)' }}>
                  {exerciseName || 'Selecionar exercício...'}
                </span>
                <Icon path={mdiChevronDown} size={0.8} color="var(--text-mute)" />
              </button>
            </>
          )}

          <span className="section-label">{targetLabel}</span>
          <input
            className="neon-input"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={type === 'frequency' ? '4' : type === 'volume' ? '20000' : '100'}
          />
          <div className="nm-presets">
            {currentType.presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`nm-preset${parseFloat(target.replace(',', '.')) === p ? ' is-active' : ''}`}
                style={parseFloat(target.replace(',', '.')) === p ? { borderColor: currentType.color, color: currentType.color } : undefined}
                onClick={() => setTarget(String(p))}>
                {p >= 1000 ? `${(p / 1000).toFixed(0)}k` : p} {currentType.unit}
              </button>
            ))}
          </div>

          <span className="section-label">PRAZO (OPCIONAL)</span>
          <input
            className="neon-input"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <span className="section-label">OBSERVAÇÕES (OPCIONAL)</span>
          <textarea
            className="neon-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notas adicionais..."
          />

          <button
            className="neon-cta"
            style={{
              marginTop: 24,
              background: currentType.color,
              boxShadow: `0 0 14px ${currentType.color}`,
            }}
            disabled={!canSave}
            onClick={save}>
            CRIAR META
          </button>
        </div>

        <IonModal isOpen={pickerOpen} onDidDismiss={() => setPickerOpen(false)}>
          <ExercisePickerContent
            onSelect={(id, name) => {
              setExerciseId(id);
              setExerciseName(name);
              setPickerOpen(false);
            }}
            onCancel={() => setPickerOpen(false)}
          />
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

function ExercisePickerContent({
  onSelect,
  onCancel,
}: {
  onSelect: (id: string, name: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 150);
  const list = useMemo(
    () =>
      searchExercises(debouncedQ)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [debouncedQ]
  );

  return (
    <div className="td-modal">
      <h2 className="td-modal__title">Escolher exercício</h2>
      <div className="ex-search">
        <Icon path={mdiMagnify} size={0.8} color="var(--text-dim)" />
        <input
          className="ex-search__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar"
        />
      </div>
      <div className="td-modal__list">
        {list.map((item) => {
          const name = item.namePt ?? item.name;
          return (
            <button key={item.id} className="td-modal__item" onClick={() => onSelect(item.id, name)}>
              <span>{name}</span>
              <Icon path={mdiChevronRight} size={0.8} color="var(--text-mute)" />
            </button>
          );
        })}
      </div>
      <button
        className="neon-cta"
        onClick={onCancel}
        style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }}>
        CANCELAR
      </button>
    </div>
  );
}

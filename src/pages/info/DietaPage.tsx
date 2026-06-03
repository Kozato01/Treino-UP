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
  mdiSilverwareForkKnife,
  mdiBellRingOutline,
  mdiBellOffOutline,
  mdiClockOutline,
  mdiDeleteOutline,
  mdiPlus,
} from '@mdi/js';
import { useEffect, useState } from 'react';

import type { Meal, MealItem } from '../../data/mealPlan';
import { useData } from '../../stores/data';
import {
  scheduleMealReminders,
  cancelMealReminders,
  hasScheduledReminders,
} from '../../services/mealReminders';
import './DietaPage.css';

const EMOJI_PRESETS = ['🍽️', '☕', '🥗', '🥩', '🍳', '🥛', '🍌', '🌮', '🍎', '🥜'];

type FormItem = { food: string; measure: string; grams: string };

function AddMealModal({
  onSave,
  onCancel,
}: {
  onSave: (meal: Omit<Meal, 'id'>) => void;
  onCancel: () => void;
}) {
  const [icon, setIcon] = useState('🍽️');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<FormItem[]>([{ food: '', measure: '', grams: '' }]);

  const addItem = () => setItems((p) => [...p, { food: '', measure: '', grams: '' }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof FormItem, val: string) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));

  const canSave = title.trim().length > 0 && time.trim().length > 0;

  const handleSave = () => {
    const cleanItems: MealItem[] = items
      .filter((it) => it.food.trim())
      .map((it) => ({
        group: '',
        food: it.food.trim(),
        measure: it.measure.trim() || '-',
        grams: it.grams.trim() || undefined,
      }));
    onSave({
      icon,
      title: title.trim(),
      time: time.trim(),
      note: note.trim() || undefined,
      items: cleanItems.length > 0 ? cleanItems : undefined,
    });
  };

  return (
    <div className="al-form">
      <h2 className="al-form__title">Nova refeição</h2>

      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>ÍCONE</span>
        <div className="al-form__emojis">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              className={`al-form__emoji-btn${icon === e ? ' is-active' : ''}`}
              onClick={() => setIcon(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>NOME</span>
        <input
          className="neon-input"
          placeholder="Ex.: Lanche da Tarde"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>HORÁRIO</span>
        <input
          className="neon-input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>OBSERVAÇÃO (opcional)</span>
        <textarea
          className="neon-input"
          rows={2}
          placeholder="Ex.: Carnes sempre grelhadas"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="form-field">
        <span className="section-label" style={{ margin: 0 }}>ALIMENTOS</span>
        <div className="al-form__items">
          {items.map((it, i) => (
            <div key={i} className="al-form__item-row">
              <input
                className="neon-input"
                placeholder="Alimento"
                value={it.food}
                onChange={(e) => updateItem(i, 'food', e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                className="neon-input"
                placeholder="Medida"
                value={it.measure}
                onChange={(e) => updateItem(i, 'measure', e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                className="neon-input"
                placeholder="g"
                value={it.grams}
                onChange={(e) => updateItem(i, 'grams', e.target.value)}
                style={{ width: 52 }}
              />
              {items.length > 1 && (
                <button className="al-form__remove-item" onClick={() => removeItem(i)}>
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="al-form__add-item" onClick={addItem}>
            <Icon path={mdiPlus} size={0.6} color="var(--neon-green)" />
            Adicionar alimento
          </button>
        </div>
      </div>

      <div className="al-form__actions">
        <button
          className="neon-cta"
          onClick={onCancel}
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none', flex: 1 }}>
          CANCELAR
        </button>
        <button
          className="neon-cta"
          style={{ flex: 1, opacity: canSave ? 1 : 0.4 }}
          disabled={!canSave}
          onClick={handleSave}>
          SALVAR
        </button>
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete }: { meal: Meal; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`al-meal${open ? ' is-open' : ''}`}>
      <div className="al-meal__head-row">
        <button className="al-meal__head" onClick={() => setOpen((o) => !o)}>
          <span className="al-meal__emoji">{meal.icon}</span>
          <span className="al-meal__title">
            <span className="al-meal__name">{meal.title}</span>
            <span className="al-meal__time">
              <Icon path={mdiClockOutline} size={0.5} /> {meal.time}
            </span>
          </span>
          <span className="al-meal__chevron">{open ? '–' : '+'}</span>
        </button>
        <button className="al-meal__delete" onClick={onDelete}>
          <Icon path={mdiDeleteOutline} size={0.75} color="var(--text-mute)" />
        </button>
      </div>

      {open && (
        <div className="al-meal__body">
          {meal.note && <p className="al-meal__note">{meal.note}</p>}

          {meal.items && (
            <div className="al-items">
              {meal.items.map((it, i) => (
                <div key={i} className="al-item">
                  <div className="al-item__main">
                    <span className="al-item__food">{it.food}</span>
                    {it.group && <span className="al-item__group">{it.group}</span>}
                  </div>
                  <div className="al-item__qty">
                    <span className="al-item__measure">{it.measure}</span>
                    {it.grams && it.grams !== '-' && (
                      <span className="al-item__grams">{it.grams}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {meal.options &&
            meal.options.map((opt, oi) => (
              <div key={oi} className="al-option">
                <span className="al-option__label">{opt.label}</span>
                {opt.note && <p className="al-meal__note">{opt.note}</p>}
                <div className="al-items">
                  {opt.items.map((it, i) => (
                    <div key={i} className="al-item">
                      <div className="al-item__main">
                        <span className="al-item__food">{it.food}</span>
                        <span className="al-item__group">{it.group}</span>
                      </div>
                      <div className="al-item__qty">
                        <span className="al-item__measure">{it.measure}</span>
                        {it.grams && it.grams !== '-' && (
                          <span className="al-item__grams">{it.grams}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {oi < meal.options!.length - 1 && <div className="al-option__or">OU</div>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function DietaPage() {
  const meals = useData((s) => s.meals);
  const addMeal = useData((s) => s.addMeal);
  const deleteMeal = useData((s) => s.deleteMeal);

  const [remindersOn, setRemindersOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    hasScheduledReminders().then(setRemindersOn);
  }, []);

  const toggleReminders = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (remindersOn) {
        await cancelMealReminders();
        setRemindersOn(false);
        setMsg('Lembretes desativados.');
      } else {
        const ok = await scheduleMealReminders();
        if (ok) {
          setRemindersOn(true);
          setMsg('Lembretes ativados! Você será avisado nos horários das refeições.');
        } else {
          setMsg('Não foi possível ativar. Permita notificações nas configurações do app.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ajustes" />
          </IonButtons>
          <IonTitle>Dieta</IonTitle>
          <IonButtons slot="end">
            <button className="al-add-btn" onClick={() => setAddOpen(true)}>
              <Icon path={mdiPlus} size={0.9} color="var(--neon-green)" />
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="dt-wrap">
          <div className="al-hero">
            <div className="al-hero__icon">
              <Icon path={mdiSilverwareForkKnife} size={1.1} color="#0A0B0F" />
            </div>
            <div className="al-hero__body">
              <span className="al-hero__title">Plano Alimentar</span>
              <span className="al-hero__sub">
                Cardápio personalizado · {meals.length} refeições/dia
              </span>
            </div>
          </div>

          <button
            className={`al-remind${remindersOn ? ' is-on' : ''}`}
            disabled={busy}
            onClick={toggleReminders}>
            <Icon path={remindersOn ? mdiBellRingOutline : mdiBellOffOutline} size={0.9} />
            <div className="al-remind__body">
              <span className="al-remind__title">
                {remindersOn ? 'Lembretes ativados' : 'Ativar lembretes de refeição'}
              </span>
              <span className="al-remind__sub">
                {remindersOn
                  ? 'Alertas diários nos horários do cardápio'
                  : 'Receba um alerta no horário de cada refeição'}
              </span>
            </div>
          </button>
          {msg && <p className="al-msg">{msg}</p>}

          <span className="section-label">REFEIÇÕES DO DIA</span>

          {meals.length === 0 ? (
            <div className="al-empty">
              <span>Nenhuma refeição cadastrada.</span>
              <button className="neon-cta" style={{ marginTop: 12 }} onClick={() => setAddOpen(true)}>
                <Icon path={mdiPlus} size={0.8} color="#0A0B0F" />
                ADICIONAR REFEIÇÃO
              </button>
            </div>
          ) : (
            <div className="al-meals">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onDelete={() => deleteMeal(meal.id)} />
              ))}
            </div>
          )}

          <p className="al-foot">
            Substituições e quantidades conforme orientação nutricional. Toque em uma refeição
            para ver os detalhes.
          </p>
        </div>
      </IonContent>

      <IonModal isOpen={addOpen} onDidDismiss={() => setAddOpen(false)}>
        <AddMealModal
          onSave={(meal) => {
            addMeal(meal);
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </IonModal>
    </IonPage>
  );
}

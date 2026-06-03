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
  mdiAccount,
  mdiCamera,
  mdiHumanMaleHeight,
  mdiImageOff,
  mdiPlus,
  mdiTrashCanOutline,
} from '@mdi/js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { useData } from '../../stores/data';
import { useSettings } from '../../stores/settings';
import { hasPermissions, readLatestHeight } from '../../services/healthConnect';
import {
  fileToCompressedDataUrl,
  usePhotos,
  type PhotoLabel,
  type ProgressPhoto,
} from '../../stores/photos';
import { formatDate } from '../../utils/format';
import { confirmDestructive } from '../../utils/confirm';
import './PerfilPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type Tab = 'medidas' | 'fotos';

export function PerfilPage() {
  const [tab, setTab] = useState<Tab>('medidas');
  const name = useSettings((s) => s.name);
  const setName = useSettings((s) => s.setName);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ajustes" />
          </IonButtons>
          <IonTitle>Meu Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="pf-wrap">
          <div className="pf-hero">
            <div className="pf-avatar">
              <Icon path={mdiAccount} size={1.4} color="var(--neon-green)" />
            </div>
            <input
              className="pf-name"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder="ATLETA"
            />
          </div>

          <div className="pf-tabs">
            <button className={`pf-tab${tab === 'medidas' ? ' is-active' : ''}`} onClick={() => setTab('medidas')}>
              <Icon path={mdiHumanMaleHeight} size={0.7} />
              MEDIDAS
            </button>
            <button className={`pf-tab${tab === 'fotos' ? ' is-active' : ''}`} onClick={() => setTab('fotos')}>
              <Icon path={mdiCamera} size={0.7} />
              FOTOS
            </button>
          </div>

          {tab === 'medidas' && <MedidasTab />}
          {tab === 'fotos' && <FotosTab />}
        </div>
      </IonContent>
    </IonPage>
  );
}

/* ──────────── MEDIDAS ──────────── */
type MedicaoField = 'weight' | 'bodyFat' | 'chest' | 'waist' | 'hip' | 'arm' | 'thigh' | 'calf';
const MEDIDA_LABELS: Record<MedicaoField, string> = {
  weight: 'PESO (KG)',
  bodyFat: 'GORDURA (%)',
  chest: 'PEITO (CM)',
  waist: 'CINTURA (CM)',
  hip: 'QUADRIL (CM)',
  arm: 'BRAÇO (CM)',
  thigh: 'COXA (CM)',
  calf: 'PANTURRILHA (CM)',
};

function parseNum(s: string): number | null {
  const v = parseFloat(s.replace(',', '.'));
  return isFinite(v) && v > 0 ? v : null;
}

function MedidasTab() {
  const measurements = useData((s) => s.bodyMeasurements);
  const addBodyMeasurement = useData((s) => s.addBodyMeasurement);
  const deleteBodyMeasurement = useData((s) => s.deleteBodyMeasurement);
  const heightCm = useSettings((s) => s.heightCm);
  const setHeight = useSettings((s) => s.setHeight);

  // Auto-preenche altura a partir do Health Connect se ainda não tiver valor
  useEffect(() => {
    if (heightCm != null && heightCm > 0) return;
    (async () => {
      try {
        const ok = await hasPermissions();
        if (!ok) return;
        const meters = await readLatestHeight();
        if (meters != null && meters > 0) {
          setHeight(Math.round(meters * 100));
        }
      } catch {
        // silent
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [fields, setFields] = useState<Record<MedicaoField, string>>({
    weight: '', bodyFat: '', chest: '', waist: '', hip: '', arm: '', thigh: '', calf: '',
  });
  const [notes, setNotes] = useState('');

  const sorted = useMemo(
    () => measurements.slice().sort((a, b) => b.date - a.date),
    [measurements]
  );

  const lastWeight = sorted.find((m) => m.weightKg != null)?.weightKg ?? null;
  const imc = useMemo(() => {
    if (!heightCm || !lastWeight) return null;
    const h = heightCm / 100;
    return lastWeight / (h * h);
  }, [heightCm, lastWeight]);

  const imcLabel = (v: number): { text: string; color: string } => {
    if (v < 18.5) return { text: 'Abaixo do peso', color: 'var(--neon-cyan)' };
    if (v < 25) return { text: 'Saudável', color: 'var(--neon-green)' };
    if (v < 30) return { text: 'Sobrepeso', color: 'var(--neon-yellow)' };
    return { text: 'Obesidade', color: 'var(--neon-pink)' };
  };

  const chartData = useMemo(() => {
    const withWeight = measurements.filter((m) => m.weightKg != null).slice().sort((a, b) => a.date - b.date);
    return {
      labels: withWeight.map((m) => formatDate(m.date)),
      values: withWeight.map((m) => m.weightKg!),
    };
  }, [measurements]);

  const canSave = parseNum(fields.weight) != null;

  const save = () => {
    if (!canSave) return;
    addBodyMeasurement({
      date: Date.now(),
      weightKg: parseNum(fields.weight),
      bodyFatPct: parseNum(fields.bodyFat),
      chestCm: parseNum(fields.chest),
      waistCm: parseNum(fields.waist),
      hipCm: parseNum(fields.hip),
      armCm: parseNum(fields.arm),
      thighCm: parseNum(fields.thigh),
      calfCm: parseNum(fields.calf),
      notes: notes.trim() || null,
    });
    setFields({ weight: '', bodyFat: '', chest: '', waist: '', hip: '', arm: '', thigh: '', calf: '' });
    setNotes('');
    setShowForm(false);
  };

  const updateField = (k: MedicaoField, v: string) => setFields((s) => ({ ...s, [k]: v }));

  return (
    <div className="pf-section">
      {/* Dados pessoais */}
      <div className="card pf-personal">
        <span className="section-label" style={{ margin: 0 }}>DADOS PESSOAIS</span>
        <div className="pf-personal__row">
          <label className="pf-field" style={{ flex: 1 }}>
            <span>ALTURA (CM)</span>
            <input
              className="neon-input"
              inputMode="numeric"
              value={heightCm ?? ''}
              onChange={(e) => {
                const n = parseFloat(e.target.value.replace(',', '.'));
                setHeight(isFinite(n) && n > 0 ? n : null);
              }}
              placeholder="178"
            />
          </label>
          {imc != null && (
            <div className="pf-imc">
              <span className="pf-imc__label">IMC ATUAL</span>
              <span className="pf-imc__value" style={{ color: imcLabel(imc).color }}>
                {imc.toFixed(1).replace('.', ',')}
              </span>
              <span className="pf-imc__cat" style={{ color: imcLabel(imc).color }}>
                {imcLabel(imc).text}
              </span>
            </div>
          )}
        </div>
      </div>

      {chartData.values.length >= 2 && (
        <div className="card">
          <span className="section-label" style={{ margin: 0 }}>EVOLUÇÃO DO PESO</span>
          <div className="pf-canvas">
            <Line
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.values,
                  borderColor: '#C6FF4A',
                  backgroundColor: 'rgba(198, 255, 74, 0.15)',
                  pointBackgroundColor: '#C6FF4A',
                  borderWidth: 3,
                  tension: 0.35,
                  fill: true,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#9BA0B0', font: { size: 10 } }, grid: { color: '#1F222C' } },
                  y: { ticks: { color: '#9BA0B0', font: { size: 10 } }, grid: { color: '#1F222C' } },
                },
              }}
            />
          </div>
        </div>
      )}

      {showForm ? (
        <div className="card pf-form">
          <span className="section-label" style={{ margin: 0 }}>NOVA MEDIÇÃO</span>
          <div className="pf-grid-fields">
            {(['weight', 'bodyFat', 'chest', 'waist', 'hip', 'arm', 'thigh', 'calf'] as MedicaoField[]).map((f) => (
              <label key={f} className="pf-field">
                <span>{MEDIDA_LABELS[f]}</span>
                <input
                  className="neon-input"
                  inputMode="decimal"
                  value={fields[f]}
                  onChange={(e) => updateField(f, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="pf-field">
            <span>OBSERVAÇÕES (OPCIONAL)</span>
            <textarea className="neon-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </label>
          <div className="pf-actions">
            <button className="neon-cta" style={{ flex: 1, background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }} onClick={() => setShowForm(false)}>CANCELAR</button>
            <button className="neon-cta" style={{ flex: 1 }} disabled={!canSave} onClick={save}>SALVAR</button>
          </div>
        </div>
      ) : (
        <button className="neon-cta pf-add" onClick={() => setShowForm(true)}>
          <Icon path={mdiPlus} size={0.8} color="#0A0B0F" />
          REGISTRAR MEDIÇÃO
        </button>
      )}

      {sorted.length > 0 ? (
        <div className="pf-list">
          {sorted.map((m) => {
            const circ = [
              m.chestCm && ['Peito', m.chestCm],
              m.waistCm && ['Cintura', m.waistCm],
              m.hipCm && ['Quadril', m.hipCm],
              m.armCm && ['Braço', m.armCm],
              m.thighCm && ['Coxa', m.thighCm],
              m.calfCm && ['Panturrilha', m.calfCm],
            ].filter(Boolean) as [string, number][];
            return (
              <div key={m.id} className="pf-row">
                <div className="pf-row__date">{formatDate(m.date)}</div>
                <div className="pf-row__stats">
                  <span className="pf-row__weight">{m.weightKg != null ? `${m.weightKg.toFixed(1).replace('.', ',')} kg` : '—'}</span>
                  {m.bodyFatPct != null && <span className="pf-row__fat">{m.bodyFatPct.toFixed(1).replace('.', ',')}% gordura</span>}
                </div>
                {circ.length > 0 && (
                  <div className="pf-row__circ">
                    {circ.map(([label, val]) => (
                      <span key={label} className="pf-row__circ-chip">{label} {val.toFixed(1).replace('.', ',')}cm</span>
                    ))}
                  </div>
                )}
                {m.notes && <div className="pf-row__notes">{m.notes}</div>}
                <button
                  className="pf-row__del"
                  onClick={() => confirmDestructive('Excluir medição?', 'Esta ação não pode ser desfeita.', 'Excluir', () => deleteBodyMeasurement(m.id))}>
                  <Icon path={mdiTrashCanOutline} size={0.7} color="var(--neon-pink)" />
                </button>
              </div>
            );
          })}
        </div>
      ) : !showForm && (
        <div className="pf-empty">
          <Icon path={mdiHumanMaleHeight} size={1.6} color="var(--outline)" />
          <span>Nenhuma medição registrada</span>
        </div>
      )}
    </div>
  );
}

/* ──────────── FOTOS ──────────── */
const PHOTO_LABELS: { id: PhotoLabel; text: string }[] = [
  { id: 'frente', text: 'FRENTE' },
  { id: 'lado', text: 'LADO' },
  { id: 'costas', text: 'COSTAS' },
  { id: null, text: 'SEM RÓTULO' },
];

function FotosTab() {
  const photos = usePhotos((s) => s.photos);
  const addPhoto = usePhotos((s) => s.addPhoto);
  const deletePhoto = usePhotos((s) => s.deletePhoto);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [pendingLabel, setPendingLabel] = useState<PhotoLabel>(null);
  const [preview, setPreview] = useState<ProgressPhoto | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => photos.slice().sort((a, b) => b.date - a.date), [photos]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBusy(true);
      const dataUrl = await fileToCompressedDataUrl(file, 800, 0.8);
      addPhoto({ date: Date.now(), dataUrl, label: pendingLabel, note: null });
    } catch (err) {
      console.error('foto error', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pf-section">
      <span className="section-label">RÓTULO DA PRÓXIMA FOTO</span>
      <div className="pf-labels">
        {PHOTO_LABELS.map((l) => (
          <button key={l.text} className={`pf-label${pendingLabel === l.id ? ' is-active' : ''}`} onClick={() => setPendingLabel(l.id)}>
            {l.text}
          </button>
        ))}
      </div>

      <button className="neon-cta pf-add" disabled={busy} onClick={() => fileRef.current?.click()}>
        <Icon path={mdiCamera} size={0.8} color="#0A0B0F" />
        {busy ? 'PROCESSANDO...' : 'ADICIONAR FOTO'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

      {sorted.length === 0 ? (
        <div className="pf-empty">
          <Icon path={mdiImageOff} size={1.6} color="var(--outline)" />
          <span>Nenhuma foto registrada</span>
        </div>
      ) : (
        <div className="pf-grid">
          {sorted.map((p) => (
            <button key={p.id} className="pf-thumb" onClick={() => setPreview(p)}>
              <img src={p.dataUrl} alt={p.label ?? 'foto'} />
              <span className="pf-thumb__meta">
                {p.label && <span className="pf-thumb__label">{p.label.toUpperCase()}</span>}
                <span className="pf-thumb__date">{formatDate(p.date)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <IonModal isOpen={preview != null} onDidDismiss={() => setPreview(null)}>
        {preview && (
          <div className="pf-preview">
            <img src={preview.dataUrl} alt="" className="pf-preview__img" />
            <div className="pf-preview__info">
              <span>{formatDate(preview.date)}</span>
              {preview.label && <span className="pf-preview__label">{preview.label.toUpperCase()}</span>}
            </div>
            <div className="pf-actions">
              <button className="neon-cta" style={{ flex: 1, background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none' }} onClick={() => setPreview(null)}>FECHAR</button>
              <button
                className="neon-cta"
                style={{ flex: 1, background: 'var(--neon-pink)' }}
                onClick={() =>
                  confirmDestructive('Excluir foto?', 'Esta ação não pode ser desfeita.', 'Excluir', () => {
                    deletePhoto(preview.id);
                    setPreview(null);
                  })
                }>
                <Icon path={mdiTrashCanOutline} size={0.7} color="#0A0B0F" />
                EXCLUIR
              </button>
            </div>
          </div>
        )}
      </IonModal>
    </div>
  );
}


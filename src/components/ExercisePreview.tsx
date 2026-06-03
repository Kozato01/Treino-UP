import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';

import { getExerciseById } from '../data/exercises';
import { exerciseImageUrl } from '../data/imageUrl';
import { labelCategory, labelEquipment, labelForce, labelMechanic } from '../data/labels';

export function ExercisePreview({
  exerciseId,
  onClose,
}: {
  exerciseId: string;
  onClose: () => void;
}) {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return null;

  const displayName = exercise.name;

  return (
    <div className="td-modal" style={{ overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="td-modal__title">{displayName}</h2>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}>
          <Icon path={mdiClose} size={1} color="var(--text-dim)" />
        </button>
      </div>

      {exercise.images.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercise.images.map((img) => (
            <img
              key={img}
              loading="lazy"
              src={exerciseImageUrl(img)}
              alt={displayName}
              style={{ width: '100%', aspectRatio: '4/3', borderRadius: 8, objectFit: 'cover', background: 'var(--bg-surface-2)' }}
            />
          ))}
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'CATEGORIA', value: labelCategory(exercise.category) },
          { label: 'EQUIPAMENTO', value: labelEquipment(exercise.equipment) },
          { label: 'NÍVEL', value: exercise.level },
          { label: 'MECÂNICA', value: labelMechanic(exercise.mechanic) },
          { label: 'TIPO', value: labelForce(exercise.force) },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 10, fontWeight: 800, letterSpacing: '1.5px' }}>{label}</span>
            <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {exercise.primaryMuscles.length > 0 && (
        <>
          <span className="section-label" style={{ margin: 0 }}>MÚSCULOS PRIMÁRIOS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {exercise.primaryMuscles.map((m) => (
              <span key={m} className="tag">{m.toUpperCase()}</span>
            ))}
          </div>
        </>
      )}

      {exercise.secondaryMuscles.length > 0 && (
        <>
          <span className="section-label" style={{ margin: 0 }}>MÚSCULOS SECUNDÁRIOS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {exercise.secondaryMuscles.map((m) => (
              <span key={m} className="tag tag--outline">{m.toUpperCase()}</span>
            ))}
          </div>
        </>
      )}

      {exercise.instructions.length > 0 && (
        <>
          <span className="section-label" style={{ margin: 0 }}>COMO EXECUTAR</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exercise.instructions.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'var(--neon-green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0A0B0F', fontWeight: 900, fontSize: 13, flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                <p style={{ flex: 1, color: '#E3E6EE', fontSize: 14, lineHeight: '20px', margin: 0, paddingTop: 4 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        className="neon-cta"
        onClick={onClose}
        style={{ background: 'var(--bg-surface-2)', color: 'var(--text)', boxShadow: 'none', marginTop: 8 }}>
        FECHAR
      </button>
    </div>
  );
}

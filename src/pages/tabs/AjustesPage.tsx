import { IonContent, IonPage } from '@ionic/react';
import Icon from '@mdi/react';
import {
  mdiAccount,
  mdiAccountCircleOutline,
  mdiChevronRight,
  mdiDownload,
  mdiHeart,
  mdiInformationOutline,
  mdiTrophyOutline,
  mdiSilverwareForkKnife,
} from '@mdi/js';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { EXERCISES } from '../../data/exercises';
import { useData } from '../../stores/data';
import { useSettings } from '../../stores/settings';
import './AjustesPage.css';

export function AjustesPage() {
  const history = useHistory();
  const name = useSettings((s) => s.name);
  const unit = useSettings((s) => s.unit);
  const defaultRest = useSettings((s) => s.defaultRestSeconds);
  const setUnit = useSettings((s) => s.setUnit);
  const setDefaultRest = useSettings((s) => s.setDefaultRest);

  const workouts = useData((s) => s.workouts);
  const sessions = useData((s) => s.sessions);

  const [restInput, setRestInput] = useState(String(defaultRest));

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="aj-wrap">
          <button className="aj-hero aj-hero--btn" onClick={() => history.push('/perfil')}>
            <div className="aj-avatar">
              <Icon path={mdiAccount} size={1.5} color="var(--neon-green)" />
            </div>
            <h1 className="aj-hero__title">{name.trim() ? name.toUpperCase() : 'ATLETA'}</h1>
            <span className="aj-hero__sub">Toque para abrir o perfil</span>
          </button>

          <div className="stat-row">
            <div className="stat-cell">
              <span className="stat-cell__value" style={{ color: 'var(--neon-green)' }}>
                {EXERCISES.length}
              </span>
              <span className="stat-cell__label">EXERCÍCIOS</span>
            </div>
            <span className="stat-divider" />
            <div className="stat-cell">
              <span className="stat-cell__value" style={{ color: 'var(--neon-cyan)' }}>
                {workouts.length}
              </span>
              <span className="stat-cell__label">TREINOS</span>
            </div>
            <span className="stat-divider" />
            <div className="stat-cell">
              <span className="stat-cell__value" style={{ color: 'var(--neon-pink)' }}>
                {sessions.length}
              </span>
              <span className="stat-cell__label">SESSÕES</span>
            </div>
          </div>

          <span className="section-label">PREFERÊNCIAS</span>

          <div className="card">
            <span className="aj-card__label">UNIDADE DE PESO</span>
            <div className="aj-toggle-row">
              <button
                className={`aj-toggle${unit === 'kg' ? ' is-active' : ''}`}
                onClick={() => setUnit('kg')}>
                KG
              </button>
              <button
                className={`aj-toggle${unit === 'lb' ? ' is-active' : ''}`}
                onClick={() => setUnit('lb')}>
                LB
              </button>
            </div>
          </div>

          <div className="card">
            <span className="aj-card__label">DESCANSO PADRÃO (SEGUNDOS)</span>
            <input
              className="neon-input"
              style={{ marginTop: 10 }}
              inputMode="numeric"
              value={restInput}
              onChange={(e) => setRestInput(e.target.value)}
              onBlur={() => {
                const v = Math.max(0, parseInt(restInput, 10) || 0);
                setDefaultRest(v);
                setRestInput(String(v));
              }}
            />
          </div>

          <span className="section-label">CONQUISTAS & INFO</span>

          <ActionRow
            iconPath={mdiAccountCircleOutline}
            title="Meu Perfil"
            subtitle="Medidas corporais e fotos de progresso"
            tint="var(--neon-orange)"
            onClick={() => history.push('/perfil')}
          />
          <ActionRow
            iconPath={mdiSilverwareForkKnife}
            title="Dieta"
            subtitle="Plano alimentar e lembretes de refeição"
            tint="var(--neon-green)"
            onClick={() => history.push('/dieta')}
          />
          <ActionRow
            iconPath={mdiTrophyOutline}
            title="Conquistas"
            subtitle="Veja seus badges desbloqueados"
            tint="var(--neon-green)"
            onClick={() => history.push('/conquistas')}
          />
          <ActionRow
            iconPath={mdiHeart}
            title="Saúde & Wearable"
            subtitle="Passos, FC, calorias e sincronização"
            tint="var(--neon-pink)"
            onClick={() => history.push('/saude')}
          />
          <ActionRow
            iconPath={mdiDownload}
            title="Dados Locais"
            subtitle="Backup, restaurar e apagar dados"
            tint="var(--neon-cyan)"
            onClick={() => history.push('/dados-locais')}
          />
          <ActionRow
            iconPath={mdiInformationOutline}
            title="Sobre"
            subtitle="Versão, créditos e tecnologias"
            tint="var(--neon-cyan)"
            onClick={() => history.push('/sobre')}
          />


          <div className="aj-footer">
            <Icon path={mdiHeart} size={0.6} color="var(--neon-green)" />
            <span>Feito com dedicação · Treino-UP</span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function ActionRow({
  iconPath,
  title,
  subtitle,
  tint,
  disabled,
  danger,
  onClick,
}: {
  iconPath: string;
  title: string;
  subtitle: string;
  tint: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`aj-action${disabled ? ' is-disabled' : ''}`}
      disabled={disabled}
      onClick={onClick}>
      <span className="aj-action__icon" style={{ borderColor: tint }}>
        <Icon path={iconPath} size={0.9} color={tint} />
      </span>
      <span className="aj-action__body">
        <span className="aj-action__title" style={{ color: danger ? 'var(--neon-pink)' : 'var(--text)' }}>
          {title}
        </span>
        <span className="aj-action__sub">{subtitle}</span>
      </span>
      <Icon path={mdiChevronRight} size={0.9} color="var(--text-mute)" />
    </button>
  );
}

import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import Icon from '@mdi/react';
import { mdiDumbbell, mdiGithub, mdiHeart, mdiDiceMultiple } from '@mdi/js';
import { useSettings } from '../../stores/settings';
import { THEMES, THEME_LABELS, generateRandomTheme, type ThemeId } from '../../theme/themes';
import {
  APP_AUTHOR,
  APP_AUTHOR_URL,
  APP_EXERCISE_DB_URL,
  APP_NAME,
  APP_VERSION,
} from '../../config/app';
import './SobrePage.css';

const THEME_IDS: ThemeId[] = ['neon', 'academia', 'forge', 'oceano'];

export function SobrePage() {
  const theme = useSettings((s) => s.theme);
  const customTheme = useSettings((s) => s.customTheme);
  const setTheme = useSettings((s) => s.setTheme);
  const setCustomTheme = useSettings((s) => s.setCustomTheme);

  const handleRandom = () => {
    setCustomTheme(generateRandomTheme());
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ajustes" />
          </IonButtons>
          <IonTitle>Sobre</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sobre-wrap">
          <div className="sobre-hero">
            <div className="sobre-hero__icon">
              <Icon path={mdiDumbbell} size={2} color="var(--neon-green)" />
            </div>
            <h1 className="sobre-hero__title">{APP_NAME}</h1>
            <span className="sobre-hero__version">versão {APP_VERSION}</span>
          </div>

          <div className="card sobre-card">
            <span className="section-label" style={{ margin: 0 }}>TEMA</span>
            <p className="sobre-text">
              Escolha uma paleta de cores ou gere uma aleatória.
            </p>
            <div className="theme-grid">
              {THEME_IDS.map((id) => {
                const colors = THEMES[id];
                const selected = theme === id;
                return (
                  <button
                    key={id}
                    className={`theme-chip${selected ? ' is-selected' : ''}`}
                    onClick={() => setTheme(id)}>
                    <span className="theme-chip__swatches">
                      <span className="theme-chip__swatch" style={{ background: colors.green }} />
                      <span className="theme-chip__swatch" style={{ background: colors.cyan }} />
                      <span className="theme-chip__swatch" style={{ background: colors.pink }} />
                    </span>
                    <span className="theme-chip__label">{THEME_LABELS[id]}</span>
                  </button>
                );
              })}
              <button
                className={`theme-chip${theme === 'custom' ? ' is-selected' : ''}`}
                onClick={handleRandom}>
                <span className="theme-chip__swatches">
                  {theme === 'custom' && customTheme ? (
                    <>
                      <span className="theme-chip__swatch" style={{ background: customTheme.green }} />
                      <span className="theme-chip__swatch" style={{ background: customTheme.cyan }} />
                      <span className="theme-chip__swatch" style={{ background: customTheme.pink }} />
                    </>
                  ) : (
                    <Icon path={mdiDiceMultiple} size={1} color="var(--text)" />
                  )}
                </span>
                <span className="theme-chip__label">Aleatório</span>
              </button>
            </div>
          </div>

          <div className="card sobre-card">
            <span className="section-label" style={{ margin: 0 }}>DESCRIÇÃO</span>
            <p className="sobre-text">
              App de registro e planejamento de treinos, feito para quem leva a academia a sério.
              Crie treinos personalizados, registre suas sessões e acompanhe sua evolução.
            </p>
          </div>

          <div className="card sobre-card">
            <span className="section-label" style={{ margin: 0 }}>CRÉDITOS</span>
            <div className="sobre-row">
              <span className="sobre-row__label">Catálogo de exercícios</span>
              <span className="sobre-row__value">Free Exercise DB</span>
            </div>
            <a
              className="sobre-github"
              href={APP_EXERCISE_DB_URL}
              target="_blank"
              rel="noreferrer">
              <Icon path={mdiGithub} size={0.9} color="var(--text-dim)" />
              github.com/yuhonas/free-exercise-db
            </a>
            <div className="sobre-row" style={{ marginTop: 8 }}>
              <span className="sobre-row__label">Interface</span>
              <span className="sobre-row__value">Ionic React</span>
            </div>
            <div className="sobre-row">
              <span className="sobre-row__label">App nativo</span>
              <span className="sobre-row__value">Capacitor</span>
            </div>
            <div className="sobre-row">
              <span className="sobre-row__label">Estado global</span>
              <span className="sobre-row__value">Zustand</span>
            </div>
          </div>

          <div className="card sobre-card">
            <span className="section-label" style={{ margin: 0 }}>DESENVOLVIDO POR</span>
            <div className="sobre-row">
              <span className="sobre-row__label">Criador</span>
              <span className="sobre-row__value" style={{ color: 'var(--neon-cyan)' }}>{APP_AUTHOR}</span>
            </div>
            <a
              className="sobre-github"
              href={APP_AUTHOR_URL}
              target="_blank"
              rel="noreferrer">
              <Icon path={mdiGithub} size={0.9} color="var(--text-dim)" />
              github.com/{APP_AUTHOR}
            </a>
          </div>

          <div className="sobre-footer">
            <Icon path={mdiHeart} size={0.6} color="var(--neon-pink)" />
            <span>Feito com dedicação para a comunidade</span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

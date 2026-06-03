import { IonApp, IonRouterOutlet, useIonRouter } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Icon from '@mdi/react';
import {
  mdiAccountCircleOutline,
  mdiBookOpenVariant,
  mdiChartLineVariant,
  mdiDumbbell,
  mdiLightningBolt,
  mdiPlayCircle,
} from '@mdi/js';
import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';

import { useData } from './stores/data';
import { useSession } from './stores/session';
import { useBackOverride } from './stores/backOverride';
import { useSettings } from './stores/settings';
import { useCustomExercises } from './stores/customExercises';
import { registerCustomExercises } from './data/exercises';
import { THEMES, applyTheme } from './theme/themes';

import { HomePage } from './pages/tabs/HomePage';
import { TreinosPage } from './pages/tabs/TreinosPage';
import { ExerciciosPage } from './pages/tabs/ExerciciosPage';
import { ProgressoPage } from './pages/tabs/ProgressoPage';
import { AjustesPage } from './pages/tabs/AjustesPage';
import { TreinoDetailPage } from './pages/workouts/TreinoDetailPage';
import { NovoTreinoPage } from './pages/workouts/NovoTreinoPage';
import { ExercicioDetailPage } from './pages/exercises/ExercicioDetailPage';
import { SessaoAtivaPage } from './pages/sessions/SessaoAtivaPage';
import { SessaoDetailPage } from './pages/sessions/SessaoDetailPage';
import { NovaMetaPage } from './pages/goals/NovaMetaPage';
import { MetaDetailPage } from './pages/goals/MetaDetailPage';
import { ConquistasPage } from './pages/info/ConquistasPage';
import { PerfilPage } from './pages/info/PerfilPage';
import { SobrePage } from './pages/info/SobrePage';
import { DietaPage } from './pages/info/DietaPage';
import { NovaFichaPage } from './pages/workouts/NovaFichaPage';
import { FichaDetailPage } from './pages/workouts/FichaDetailPage';
import { TreinosCompartilhadosPage } from './pages/workouts/TreinosCompartilhadosPage';
import { TreinosLivresPage } from './pages/workouts/TreinosLivresPage';
import { WelcomeModal } from './components/WelcomeModal';
import { SaudePage } from './pages/health/SaudePage';
import { HealthDiagnostic } from './pages/health/HealthDiagnostic';
import { DadosLocaisPage } from './pages/health/DadosLocaisPage';
import { WorkoutDetailsPage } from './pages/health/WorkoutDetailsPage';
import { WorkoutsListPage } from './pages/health/WorkoutsListPage';
import { SleepPage } from './pages/health/SleepPage';
// import { TrackingPage } from './pages/health/TrackingPage'; // DESATIVADO: rastreamento manual
import { LocalRoutePage } from './pages/health/LocalRoutePage';
import { RoutesListPage } from './pages/health/RoutesListPage';

const TAB_PATHS = ['/home', '/treinos', '/exercicios', '/progresso', '/ajustes'];

const TABS = [
  { path: '/home', icon: mdiLightningBolt, label: 'INÍCIO' },
  { path: '/treinos', icon: mdiDumbbell, label: 'TREINOS' },
  { path: '/exercicios', icon: mdiBookOpenVariant, label: 'CATÁLOGO' },
  { path: '/progresso', icon: mdiChartLineVariant, label: 'PROGRESSO' },
  { path: '/ajustes', icon: mdiAccountCircleOutline, label: 'PERFIL' },
];

function BottomTabBar() {
  const location = useLocation();
  const history = useHistory();
  if (!TAB_PATHS.includes(location.pathname)) return null;

  return (
    <div className="app-tab-bar">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            className={`app-tab-btn${active ? ' is-active' : ''}`}
            onClick={() => history.replace(tab.path)}>
            <Icon path={tab.icon} size={0.9} color={active ? 'var(--neon-green)' : 'var(--text-mute)'} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActiveSessionBanner() {
  const location = useLocation();
  const history = useHistory();
  const sessionId = useSession((s) => s.sessionId);
  const workoutName = useSession((s) => s.workoutName);
  const visible = sessionId != null && location.pathname !== '/sessao-ativa';

  useEffect(() => {
    if (visible) {
      document.body.classList.add('has-active-banner');
    } else {
      document.body.classList.remove('has-active-banner');
    }
    return () => document.body.classList.remove('has-active-banner');
  }, [visible]);

  if (!visible) return null;
  return (
    <button className="active-session-banner" onClick={() => history.push('/sessao-ativa')}>
      <Icon path={mdiPlayCircle} size={0.9} color="var(--neon-green)" />
      <span className="active-session-banner__body">
        <span className="active-session-banner__label">SESSÃO EM ANDAMENTO</span>
        <span className="active-session-banner__name">{workoutName}</span>
      </span>
      <span className="active-session-banner__cta">RETOMAR</span>
    </button>
  );
}

function ThemeApplier() {
  const theme = useSettings((s) => s.theme);
  const customTheme = useSettings((s) => s.customTheme);

  useEffect(() => {
    if (theme === 'custom' && customTheme) {
      applyTheme(customTheme);
    } else if (theme !== 'custom') {
      applyTheme(THEMES[theme] ?? THEMES.neon);
    }
  }, [theme, customTheme]);

  return null;
}

function CustomExercisesSync() {
  const customs = useCustomExercises((s) => s.customs);
  useEffect(() => {
    registerCustomExercises(customs);
  }, [customs]);
  return null;
}

function AppRouter() {
  const ionRouter = useIonRouter();

  useEffect(() => {
    // Registra no evento `ionBackButton` com prioridade ALTA (999) para rodar
    // ANTES do handler interno do IonRouterOutlet (que tem prioridade ~0 e
    // pop'a a rota direto). Sem isso, nosso override era ignorado em qualquer
    // página dentro do IonRouterOutlet — wizards pulavam steps, modais não
    // fechavam, e o back parecia "voltar tudo de uma vez".
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        register: (priority: number, handler: (processNext: () => void) => void) => void;
      }>).detail;
      detail.register(999, (processNext) => {
        const override = useBackOverride.getState().handler;
        if (override && override()) return;

        const openModal = document.querySelector<HTMLIonModalElement>('ion-modal.show-modal');
        if (openModal) {
          openModal.dismiss();
          return;
        }

        const currentPath = window.location.pathname;
        if (TAB_PATHS.includes(currentPath)) {
          if (currentPath === '/home') {
            CapApp.minimizeApp();
          } else {
            ionRouter.push('/home', 'back');
          }
          return;
        }

        const BACK_OVERRIDES: Record<string, string> = {
          '/saude-diagnostico': '/saude',
          '/nova-ficha': '/treinos',
          '/novo-treino': '/treinos',
        };
        const forced = BACK_OVERRIDES[currentPath];
        if (forced) {
          ionRouter.push(forced, 'back');
          return;
        }

        // Nada para tratar aqui — deixa Ionic processar (router goBack normal).
        processNext();
      });
    };
    document.addEventListener('ionBackButton', handler);
    return () => document.removeEventListener('ionBackButton', handler);
  }, [ionRouter]);

  return (
    <>
      <ThemeApplier />
      <CustomExercisesSync />
      <IonRouterOutlet>
        <Route exact path="/home" component={HomePage} />
        <Route exact path="/treinos" component={TreinosPage} />
        <Route exact path="/exercicios" component={ExerciciosPage} />
        <Route exact path="/progresso" component={ProgressoPage} />
        <Route exact path="/ajustes" component={AjustesPage} />
        <Route exact path="/novo-treino" component={NovoTreinoPage} />
        <Route exact path="/treino/:id" component={TreinoDetailPage} />
        <Route exact path="/exercicio/:id" component={ExercicioDetailPage} />
        <Route exact path="/sessao-ativa" component={SessaoAtivaPage} />
        <Route exact path="/sessao/:id" component={SessaoDetailPage} />
        <Route exact path="/nova-meta" component={NovaMetaPage} />
        <Route exact path="/meta/:id" component={MetaDetailPage} />
        <Route exact path="/conquistas" component={ConquistasPage} />
        <Route exact path="/perfil" component={PerfilPage} />
        <Route exact path="/sobre" component={SobrePage} />
        <Route exact path="/dieta" component={DietaPage} />
  <Route exact path="/dieta" component={DietaPage} />
        <Route exact path="/nova-ficha" component={NovaFichaPage} />
        <Route exact path="/ficha/:id" component={FichaDetailPage} />
        <Route exact path="/compartilhados" component={TreinosCompartilhadosPage} />
        <Route exact path="/treinos/livres" component={TreinosLivresPage} />
        <Route exact path="/saude" component={SaudePage} />
        <Route exact path="/saude-diagnostico" component={HealthDiagnostic} />
        <Route exact path="/dados-locais" component={DadosLocaisPage} />
        <Route exact path="/atividades" component={WorkoutsListPage} />
        <Route exact path="/workout/:platformId" component={WorkoutDetailsPage} />
        <Route exact path="/sono" component={SleepPage} />
        {/* <Route exact path="/rastrear" component={TrackingPage} /> */}
        <Route exact path="/rota/:id" component={LocalRoutePage} />
        <Route exact path="/rotas" component={RoutesListPage} />
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
      <ActiveSessionBanner />
      <BottomTabBar />
      <WelcomeModal />
    </>
  );
}

function BootGate({ children }: { children: React.ReactNode }) {
  const hydrated = useData((s) => s.hydrated);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [hardTimeout, setHardTimeout] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setMinDelayDone(true), 500);
    const t2 = setTimeout(() => setHardTimeout(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const ready = hardTimeout || (hydrated && minDelayDone);
  if (!ready) {
    return (
      <div className="app-boot">
        <div className="app-boot__logo">
          <img src="/logolfi.png" alt="Ac-N-Version1" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div className="app-boot__ring" />
        <span className="app-boot__label">Carregando…</span>
      </div>
    );
  }
  return <>{children}</>;
}

export function App() {
  return (
    <IonApp>
      <BootGate>
        <IonReactRouter>
          <AppRouter />
        </IonReactRouter>
      </BootGate>
    </IonApp>
  );
}







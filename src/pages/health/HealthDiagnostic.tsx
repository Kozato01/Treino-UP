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
import {
  mdiCheckCircle,
  mdiCloseCircle,
  mdiInformationOutline,
  mdiRefresh,
  mdiAlertCircle,
} from '@mdi/js';
import { useEffect, useState } from 'react';

import {
  isAvailable,
  hasPermissions,
  openSettings,
  requestRoutePermissionNative,
  getGrantedHealthPermissions,
  readTodaySteps,
  readTodayActiveCalories,
  readTodayRestingHeartRate,
  readTodayDistance,
  readLastNDaysWorkouts,
  readExerciseRouteDetailed,
  readDataSources,
  type HealthAvailability,
  type ExternalWorkout,
} from '../../services/healthConnect';

type CheckStatus = 'checking' | 'ok' | 'fail' | 'warn';

const FRIENDLY_NAMES: Record<string, string> = {
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Health Connect',
  'com.strava': 'Strava',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'fi.polar.polarflow': 'Polar Flow',
  'com.huami.watch.hmwatchmanager': 'Mi Fit / Zepp',
  'com.huawei.health': 'Huawei Health',
  'com.myfitnesspal.android': 'MyFitnessPal',
  'com.withings.wiscale2': 'Withings',
  'com.ouraring.oura': 'Oura',
  'com.whoop.android': 'Whoop',
  'com.njj.mactivepro': 'MActivePro',
};

function friendlyAppName(pkg: string): string {
  if (FRIENDLY_NAMES[pkg]) return FRIENDLY_NAMES[pkg];
  const last = pkg.split('.').pop() ?? pkg;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function friendlyList(pkgs: string[]): string {
  return pkgs.map(friendlyAppName).join(', ');
}

interface CheckRow {
  label: string;
  status: CheckStatus;
  detail?: string;
}

function StatusRow({ label, status, detail }: CheckRow) {
  const colorMap: Record<CheckStatus, string> = {
    checking: 'var(--text-mute)',
    ok: 'var(--neon-green)',
    fail: 'var(--neon-pink)',
    warn: 'var(--neon-yellow)',
  };
  const iconMap: Record<CheckStatus, string> = {
    checking: mdiInformationOutline,
    ok: mdiCheckCircle,
    fail: mdiCloseCircle,
    warn: mdiAlertCircle,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'var(--bg-surface)',
        borderRadius: 6,
        borderLeft: `3px solid ${colorMap[status]}`,
        fontSize: 12,
      }}>
      <Icon path={iconMap[status]} size={0.7} color={colorMap[status]} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {detail && (
          <div
            style={{
              color: 'var(--text-mute)',
              fontSize: 11,
              marginTop: 2,
              wordBreak: 'break-word',
            }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}

export function HealthDiagnostic({ onClose }: { onClose?: () => void } = {}) {
  const [testing, setTesting] = useState(false);
  const [availability, setAvailability] = useState<HealthAvailability | 'checking'>('checking');
  const [hasPerms, setHasPerms] = useState<boolean | 'checking'>('checking');
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [todayCalories, setTodayCalories] = useState<number | null>(null);
  const [todayHR, setTodayHR] = useState<number | null>(null);
  const [todayDistance, setTodayDistance] = useState<number | null>(null);
  const [workouts, setWorkouts] = useState<ExternalWorkout[]>([]);
  const [routeStatus, setRouteStatus] = useState<CheckStatus>('checking');
  const [routeDetail, setRouteDetail] = useState<string>('');
  const [sources, setSources] = useState<Record<string, string[]>>({});

  const toRecord = (raw: unknown): Record<string, string[]> => {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v instanceof Set) out[k] = Array.from(v as Set<string>);
      else if (Array.isArray(v)) out[k] = v as string[];
    }
    return out;
  };

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runDiagnostics() {
    setTesting(true);
    setAvailability('checking');
    setHasPerms('checking');
    setRouteStatus('checking');
    setRouteDetail('');

    try {
      const avail = await isAvailable();
      setAvailability(avail);
      if (avail !== 'Available') {
        setTesting(false);
        return;
      }

      const perms = await hasPermissions();
      setHasPerms(perms);
      if (!perms) {
        setTesting(false);
        return;
      }

      const [steps, kcal, hr, dist, list, src] = await Promise.all([
        readTodaySteps().catch(() => 0),
        readTodayActiveCalories().catch(() => 0),
        readTodayRestingHeartRate().catch(() => null),
        readTodayDistance().catch(() => 0),
        readLastNDaysWorkouts(7).catch(() => [] as ExternalWorkout[]),
        readDataSources().catch(() => ({})),
      ]);
      setTodaySteps(steps);
      setTodayCalories(kcal);
      setTodayHR(hr);
      setTodayDistance(dist);
      setWorkouts(list);
      setSources(toRecord(src));

      // Valida rota GPS - tenta ler de qualquer workout com platformId
      const withId = list.find((w) => w.platformId);
      if (!withId) {
        setRouteStatus('warn');
        setRouteDetail('Nenhuma atividade encontrada para testar rotas.');
      } else {
        const result = await readExerciseRouteDetailed(withId.platformId!);
        switch (result.status) {
          case 'ok':
            setRouteStatus('ok');
            setRouteDetail(`Rota lida: ${result.route.length} pontos GPS (${withId.type})`);
            break;
          case 'empty':
            setRouteStatus('warn');
            setRouteDetail(
              `A atividade "${withId.type}" foi gravada sem rota GPS. Faça uma corrida/caminhada usando o GPS do Google Fit ou Samsung Health.`
            );
            break;
          case 'consent_required':
            setRouteStatus('fail');
            setRouteDetail(
              'Health Connect exige permissão "Rotas de exercício". Toque em CONCEDER ROTAS abaixo.'
            );
            break;
          case 'timeout':
            setRouteStatus('fail');
            setRouteDetail('Plugin não respondeu em 5s. Reinstale o APK e tente novamente.');
            break;
          case 'unsupported':
            setRouteStatus('fail');
            setRouteDetail('Plataforma sem suporte a rotas (iOS).');
            break;
          case 'error':
            setRouteStatus('fail');
            setRouteDetail(`Erro: ${result.message}`);
            break;
        }
      }
    } finally {
      setTesting(false);
    }
  }

  const availStatus: CheckStatus =
    availability === 'checking' ? 'checking' : availability === 'Available' ? 'ok' : 'fail';
  const availDetail =
    availability === 'NotSupported'
      ? 'Android 14+ é necessário'
      : availability === 'NotInstalled'
        ? 'Instale o Health Connect da Play Store'
        : availability === 'Available'
          ? 'SDK disponível'
          : '';

  const permsStatus: CheckStatus =
    hasPerms === 'checking' ? 'checking' : hasPerms ? 'ok' : 'fail';
  const permsDetail = hasPerms === true ? 'Leitura autorizada' : hasPerms === false ? 'Toque em CONECTAR' : '';

  const stepsStatus: CheckStatus = todaySteps == null ? 'checking' : todaySteps > 0 ? 'ok' : 'warn';
  const caloriesStatus: CheckStatus = todayCalories == null ? 'checking' : todayCalories > 0 ? 'ok' : 'warn';
  const hrStatus: CheckStatus = todayHR == null ? 'warn' : todayHR > 0 ? 'ok' : 'warn';
  const distanceStatus: CheckStatus = todayDistance == null ? 'checking' : todayDistance > 0 ? 'ok' : 'warn';
  const workoutsStatus: CheckStatus = workouts.length > 0 ? 'ok' : 'warn';

  const routeSources = sources['route'] || sources['exerciseRoute'] || [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {onClose ? (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  color: 'var(--neon-cyan)',
                  border: 'none',
                  padding: '8px 12px',
                  fontSize: 14,
                  cursor: 'pointer',
                }}>
                ← Fechar
              </button>
            ) : (
              <IonBackButton defaultHref="/saude" />
            )}
          </IonButtons>
          <IonTitle>Diagnóstico</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          <span className="section-label">SISTEMA</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <StatusRow label="Health Connect disponível" status={availStatus} detail={availDetail} />
            <StatusRow label="Permissões concedidas" status={permsStatus} detail={permsDetail} />
          </div>

          {hasPerms === true && (
            <>
              <span className="section-label">DADOS DE HOJE</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <StatusRow
                  label="Passos"
                  status={stepsStatus}
                  detail={todaySteps != null ? `${todaySteps.toLocaleString('pt-BR')} passos` : ''}
                />
                <StatusRow
                  label="Calorias ativas"
                  status={caloriesStatus}
                  detail={todayCalories != null ? `${todayCalories} kcal` : ''}
                />
                <StatusRow
                  label="FC de repouso"
                  status={hrStatus}
                  detail={todayHR != null ? `${todayHR} bpm` : 'Não detectada hoje'}
                />
                <StatusRow
                  label="Distância"
                  status={distanceStatus}
                  detail={todayDistance != null && todayDistance > 0 ? `${(todayDistance / 1000).toFixed(2)} km` : 'Sem dados'}
                />
              </div>

              <span className="section-label">ATIVIDADES E GPS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <StatusRow
                  label="Atividades (últimos 7 dias)"
                  status={workoutsStatus}
                  detail={
                    workouts.length > 0
                      ? `${workouts.length} atividade${workouts.length > 1 ? 's' : ''} encontrada${workouts.length > 1 ? 's' : ''}`
                      : 'Faça uma corrida/caminhada para testar'
                  }
                />
                <StatusRow
                  label="Rotas GPS (ExerciseRoute)"
                  status={routeStatus}
                  detail={routeDetail || 'Verificando...'}
                />
                <StatusRow
                  label="Fontes de rotas"
                  status={routeSources.length > 0 ? 'ok' : 'warn'}
                  detail={
                    routeSources.length > 0
                      ? friendlyList(routeSources)
                      : 'Nenhum app escrevendo rotas no Health Connect'
                  }
                />
              </div>

              {(routeStatus === 'fail' || routeStatus === 'warn') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <button
                    onClick={async () => {
                      const ok = await requestRoutePermissionNative();
                      if (!ok) await openSettings();
                      const granted = await getGrantedHealthPermissions();
                      console.log('Permissões após pedido:', granted);
                      void runDiagnostics();
                    }}
                    style={{
                      width: '100%',
                      background: 'var(--neon-yellow)',
                      color: '#0A0B0F',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                    SOLICITAR PERMISSÃO DE ROTAS →
                  </button>
                  <button
                    onClick={() => void openSettings()}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface-2)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '10px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}>
                    Abrir Health Connect manualmente
                  </button>
                </div>
              )}

              {Object.keys(sources).length > 0 && (
                <>
                  <span className="section-label">FONTES DETECTADAS</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {Object.entries(sources).map(([type, pkgs]) => (
                      <StatusRow
                        key={type}
                        label={type}
                        status={pkgs.length > 0 ? 'ok' : 'warn'}
                        detail={pkgs.length > 0 ? friendlyList(pkgs) : '—'}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <button
            className="neon-cta"
            onClick={() => runDiagnostics()}
            disabled={testing}
            style={{
              width: '100%',
              marginTop: 8,
              background: 'var(--neon-cyan)',
              color: '#0A0B0F',
              fontWeight: 'bold',
            }}>
            <Icon path={mdiRefresh} size={0.8} />
            {testing ? 'TESTANDO...' : 'TESTAR DE NOVO'}
          </button>

          <div className="sd-foot" style={{ marginTop: 12 }}>
            Diagnóstico verifica acesso, dados e GPS via Health Connect.
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

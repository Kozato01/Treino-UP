import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from '@ionic/react';
import Icon from '@mdi/react';
import { mdiSleep, mdiWeatherNight, mdiBrain } from '@mdi/js';
import { useEffect, useState } from 'react';
import { readLastNightSleep, type SleepData } from '../../services/healthConnect';
import './SaudePage.css';

function Kpi({
  icon,
  tint,
  value,
  label,
}: {
  icon: string;
  tint: string;
  value: string | number | undefined;
  label: string;
}) {
  const hasValue = value != null && value !== '' && value !== 0;
  return (
    <div className="sd-kpi">
      <Icon path={icon} size={0.9} color={tint} />
      <span className="sd-kpi__value">
        {hasValue ? value : <span className="sd-kpi__nd">N/D</span>}
      </span>
      <span className="sd-kpi__label">{label}</span>
    </div>
  );
}

export function SleepPage() {
  const [loading, setLoading] = useState(true);
  const [sleep, setSleep] = useState<SleepData | null>(null);

  useEffect(() => {
    const fetchSleep = async () => {
      setLoading(true);
      try {
        const data = await readLastNightSleep();
        setSleep(data);
      } catch (err) {
        console.error('Failed to fetch sleep data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSleep();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/saude" />
            </IonButtons>
            <IonTitle>Carregando sono...</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}>
            <IonSpinner name="dots" color="primary" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!sleep || sleep.totalMinutes === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/saude" />
            </IonButtons>
            <IonTitle>Sono</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="sd-wrap">
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-mute)', margin: 0 }}>
                Nenhum dado de sono disponível
              </p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/saude" />
          </IonButtons>
          <IonTitle>Sono da última noite</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="sd-wrap">
          <div className="card sd-how">
            <span className="section-label" style={{ margin: 0 }}>RESUMO</span>
            <p style={{ margin: '8px 0 0', color: 'var(--text)' }}>
              Noite anterior
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-mute)', fontSize: 13 }}>
              Total de {Math.floor(sleep.totalMinutes / 60)}h {sleep.totalMinutes % 60}min
            </p>
          </div>

          <span className="section-label">DETALHES DO SONO</span>
          <div className="sd-kpi-row">
            <Kpi
              icon={mdiSleep}
              tint="var(--neon-cyan)"
              value={`${Math.floor(sleep.totalMinutes / 60)}h ${sleep.totalMinutes % 60}min`}
              label="Total"
            />
            {sleep.deepMinutes > 0 && (
              <Kpi
                icon={mdiWeatherNight}
                tint="var(--neon-pink)"
                value={`${sleep.deepMinutes}min`}
                label="Profundo"
              />
            )}
            {sleep.remMinutes > 0 && (
              <Kpi
                icon={mdiBrain}
                tint="var(--neon-yellow)"
                value={`${sleep.remMinutes}min`}
                label="REM"
              />
            )}
          </div>

          {sleep.deepMinutes > 0 && (
            <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
              <span className="section-label" style={{ margin: '0 0 12px' }}>FASES DO SONO</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    background: 'var(--bg-surface)',
                    borderRadius: '6px',
                  }}>
                  <span style={{ color: 'var(--text-mute)', fontSize: 13 }}>Profundo</span>
                  <span
                    style={{
                      color: 'var(--neon-pink)',
                      fontWeight: 600,
                      fontSize: 14,
                    }}>
                    {Math.round((sleep.deepMinutes / sleep.totalMinutes) * 100)}%
                  </span>
                </div>
                {sleep.remMinutes > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      background: 'var(--bg-surface)',
                      borderRadius: '6px',
                    }}>
                    <span style={{ color: 'var(--text-mute)', fontSize: 13 }}>REM</span>
                    <span
                      style={{
                        color: 'var(--neon-yellow)',
                        fontWeight: 600,
                        fontSize: 14,
                      }}>
                      {Math.round((sleep.remMinutes / sleep.totalMinutes) * 100)}%
                    </span>
                  </div>
                )}
                {sleep.totalMinutes > 0 && (sleep.deepMinutes + sleep.remMinutes) < sleep.totalMinutes && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      background: 'var(--bg-surface)',
                      borderRadius: '6px',
                    }}>
                    <span style={{ color: 'var(--text-mute)', fontSize: 13 }}>Leve</span>
                    <span
                      style={{
                        color: 'var(--neon-cyan)',
                        fontWeight: 600,
                        fontSize: 14,
                      }}>
                      {Math.round(
                        ((sleep.totalMinutes - sleep.deepMinutes - sleep.remMinutes) /
                          sleep.totalMinutes) *
                          100
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="sd-foot">
            Dados lidos via Health Connect (somente leitura).
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

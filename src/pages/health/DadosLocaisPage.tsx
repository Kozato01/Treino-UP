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
  mdiCloudDownload,
  mdiCloudUpload,
  mdiDeleteForever,
  mdiShieldLockOutline,
  mdiDumbbell,
  mdiInformationOutline,
} from '@mdi/js';
import { useState } from 'react';

import { useData } from '../../stores/data';
import type {
  BodyMeasurement,
  Goal,
  Session,
  SessionSet,
  Workout,
  WorkoutExercise,
} from '../../types';
import './DadosLocaisPage.css';

type Backup = {
  version: 1;
  type?: never;
  exportedAt: string;
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sessions: Session[];
  sessionSets: SessionSet[];
  goals: Goal[];
  bodyMeasurements: BodyMeasurement[];
  workoutPacks: any[];
  dailyMetrics: any[];
};

export function DadosLocaisPage() {
  const workouts = useData((s) => s.workouts);
  const workoutExercises = useData((s) => s.workoutExercises);
  const sessions = useData((s) => s.sessions);
  const sessionSets = useData((s) => s.sessionSets);
  const goals = useData((s) => s.goals);
  const bodyMeasurements = useData((s) => s.bodyMeasurements);
  const workoutPacks = useData((s) => s.workoutPacks);
  const dailyMetrics = useData((s) => s.dailyMetrics);
  const replaceAll = useData((s) => s.replaceAll);
  const wipeUserData = useData((s) => s.wipeUserData);

  const [busy, setBusy] = useState(false);

  const buildBackup = (): Backup => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts,
    workoutExercises,
    sessions,
    sessionSets,
    goals,
    bodyMeasurements,
    workoutPacks,
    dailyMetrics,
  });

  const exportBackup = () => {
    try {
      setBusy(true);
      const json = JSON.stringify(buildBackup(), null, 2);
      const filename = `treino-up-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.alert('Backup exportado com sucesso!');
    } catch (e: unknown) {
      window.alert(`Erro ao exportar: ${String((e as Error)?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      confirmAndRestore(text);
    };
    input.click();
  };

  const confirmAndRestore = (content: string) => {
    try {
      setBusy(true);
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        window.alert('Arquivo inválido: não é um JSON válido.');
        return;
      }
      if (parsed == null || typeof parsed !== 'object') {
        window.alert('Arquivo inválido: estrutura inesperada.');
        return;
      }
      const obj = parsed as Record<string, unknown>;
      if (obj.version !== 1) {
        window.alert(`Versão inválida: arquivo tem versão ${String(obj.version)}, esperado 1.`);
        return;
      }
      const arrayFields = [
        'workouts', 'workoutExercises', 'sessions', 'sessionSets',
        'goals', 'bodyMeasurements', 'workoutPacks', 'dailyMetrics',
      ] as const;
      for (const f of arrayFields) {
        if (obj[f] != null && !Array.isArray(obj[f])) {
          window.alert(`Backup inválido: campo "${f}" deveria ser uma lista.`);
          return;
        }
      }
      const backup = obj as unknown as Backup;
      if (!window.confirm('Restaurar backup? Todos seus dados atuais serão substituídos.')) return;
      replaceAll({
        workouts: backup.workouts ?? [],
        workoutExercises: backup.workoutExercises ?? [],
        sessions: backup.sessions ?? [],
        sessionSets: backup.sessionSets ?? [],
        goals: backup.goals ?? [],
        bodyMeasurements: backup.bodyMeasurements ?? [],
        workoutPacks: backup.workoutPacks ?? [],
        dailyMetrics: backup.dailyMetrics ?? [],
      });
      window.alert('Backup restaurado com sucesso!');
    } catch (e: unknown) {
      window.alert(`Erro ao importar: ${String((e as Error)?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  };

  const wipeData = () => {
    if (!window.confirm(
      'CUIDADO: Apagar TODOS os dados?\n\nTreinos, sessões, metas e medidas serão removidos permanentemente. O catálogo de exercícios será mantido.'
    )) return;
    wipeUserData();
    window.alert('Todos os dados foram apagados. Catálogo de exercícios mantido.');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ajustes" />
          </IonButtons>
          <IonTitle>Dados Locais</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="dl-wrap">

          {/* Exportar */}
          <div className="dl-action">
            <div className="dl-action__head">
              <div className="dl-action__icon dl-action__icon--green">
                <Icon path={mdiCloudDownload} size={0.9} color="var(--neon-green)" />
              </div>
              <span className="dl-action__label">Exportar Backup</span>
            </div>
            <p className="dl-action__desc">
              Gera um arquivo JSON com todos os seus dados — treinos, sessões, metas, medidas e saúde.
            </p>
            <button className="neon-cta" onClick={exportBackup} disabled={busy}>
              <Icon path={mdiCloudDownload} size={0.8} color="var(--cta-text)" />
              {busy ? 'EXPORTANDO...' : 'BAIXAR JSON'}
            </button>
          </div>

          {/* Importar */}
          <div className="dl-action">
            <div className="dl-action__head">
              <div className="dl-action__icon dl-action__icon--cyan">
                <Icon path={mdiCloudUpload} size={0.9} color="var(--neon-cyan)" />
              </div>
              <span className="dl-action__label">Importar Backup</span>
            </div>
            <p className="dl-action__desc">
              Restaura seus dados de um arquivo JSON salvo anteriormente.{' '}
              <strong>O histórico atual será substituído.</strong>
            </p>
            <button className="neon-cta neon-cta--cyan" onClick={importBackup} disabled={busy}>
              <Icon path={mdiCloudUpload} size={0.8} color="var(--cta-text)" />
              {busy ? 'IMPORTANDO...' : 'CARREGAR JSON'}
            </button>
          </div>

          {/* Apagar dados */}
          <div className="dl-action dl-action--danger">
            <div className="dl-action__head">
              <div className="dl-action__icon dl-action__icon--danger">
                <Icon path={mdiDeleteForever} size={0.9} color="var(--neon-pink)" />
              </div>
              <span className="dl-action__label">Apagar Todos os Dados</span>
            </div>
            <p className="dl-action__desc">
              Remove permanentemente treinos, sessões, metas e medidas.{' '}
              <strong>Esta ação não pode ser desfeita.</strong>
            </p>
            <button className="neon-cta neon-cta--pink" onClick={wipeData} disabled={busy}>
              <Icon path={mdiDeleteForever} size={0.8} color="var(--cta-text)" />
              {busy ? 'APAGANDO...' : 'APAGAR TUDO'}
            </button>
          </div>

          {/* Info */}
          <div className="dl-info">
            <div className="dl-info__row">
              <Icon path={mdiShieldLockOutline} size={0.75} color="var(--text-mute)" />
              <span>Todos os dados ficam armazenados localmente no dispositivo. Nada é enviado a servidores.</span>
            </div>
            <div className="dl-info__row">
              <Icon path={mdiInformationOutline} size={0.75} color="var(--text-mute)" />
              <span>O arquivo de backup é um JSON simples, legível em qualquer editor de texto.</span>
            </div>
            <div className="dl-info__row">
              <Icon path={mdiDumbbell} size={0.75} color="var(--text-mute)" />
              <span>O catálogo de exercícios (873 movimentos) não é incluído no backup — ele é restaurado automaticamente.</span>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
}

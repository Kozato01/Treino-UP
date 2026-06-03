// Lembretes de refeição via notificações locais (Capacitor).
// Agenda um alerta diário recorrente por refeição, no horário do cardápio.
// Funciona com base na hora do dispositivo (hora "global"/local do usuário).

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MEAL_PLAN, type Meal } from '../data/mealPlan';

// IDs fixos por refeição (idempotente: reagendar substitui o anterior).
const BASE_ID = 4200;
const mealNotifId = (index: number) => BASE_ID + index;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

function bodyFor(meal: Meal): string {
  if (meal.note) return meal.note;
  const first = meal.items?.[0] ?? meal.options?.[0]?.items?.[0];
  return first ? `Hora do(a) ${meal.title.toLowerCase()} 🍽️` : 'Hora da sua refeição 🍽️';
}

/** Agenda (ou reagenda) todos os lembretes de refeição como alarmes diários. */
export async function scheduleMealReminders(): Promise<boolean> {
  if (!isNative()) return false;
  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await cancelMealReminders();

  const notifications = MEAL_PLAN.map((meal, i) => {
    const [h, m] = meal.time.split(':').map((x) => parseInt(x, 10));
    return {
      id: mealNotifId(i),
      title: `${meal.icon} ${meal.title} — ${meal.time}`,
      body: bodyFor(meal),
      schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
      smallIcon: 'ic_stat_icon_config_sample',
    };
  });

  try {
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch {
    return false;
  }
}

export async function cancelMealReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: MEAL_PLAN.map((_, i) => ({ id: mealNotifId(i) })),
    });
  } catch {
    /* ignore */
  }
}

/** Verifica se há lembretes pendentes agendados. */
export async function hasScheduledReminders(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.some((n) => n.id >= BASE_ID && n.id < BASE_ID + 100);
  } catch {
    return false;
  }
}

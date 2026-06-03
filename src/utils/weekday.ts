import type { Weekday } from '../types';

const JS_WEEKDAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function getTodayWeekday(): Weekday {
  return JS_WEEKDAY[new Date().getDay()];
}

import { getJstStartOfDay, toJst } from '@/lib/time';
import type { ServiceStatus } from '@/lib/types';
import { getServiceConfig } from './config';

/** 現在受付中かどうか（JST基準） */
export function getServiceStatus(now: Date = new Date()): ServiceStatus {
  const config = getServiceConfig();
  const base = { openHour: config.openHour, closeHour: config.closeHour };

  if (config.ignoreHours) {
    return { open: true, reason: null, ...base };
  }

  const jst = toJst(now);
  if (!config.businessDays.includes(jst.getUTCDay())) {
    return { open: false, reason: 'NON_BUSINESS_DAY', ...base };
  }

  const minutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();
  if (minutes < config.openHour * 60) {
    return { open: false, reason: 'BEFORE_OPEN', ...base };
  }
  if (minutes >= config.closeHour * 60) {
    return { open: false, reason: 'AFTER_CLOSE', ...base };
  }
  return { open: true, reason: null, ...base };
}

/** 当日の受付終了時刻（絶対時刻） */
export function getCloseAt(now: Date = new Date()): Date {
  const config = getServiceConfig();
  return new Date(getJstStartOfDay(now).getTime() + config.closeHour * 60 * 60 * 1000);
}

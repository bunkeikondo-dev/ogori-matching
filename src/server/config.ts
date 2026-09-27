export interface ServiceConfig {
  openHour: number;
  closeHour: number;
  /** 受付曜日（0=日 ... 6=土） */
  businessDays: number[];
  waitSeconds: number;
  ignoreHours: boolean;
}

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    console.warn(`[config] ${name} の値が不正なため既定値 ${fallback} を使用します。`);
    return fallback;
  }
  return value;
}

function businessDaysFromEnv(): number[] {
  const raw = process.env.BUSINESS_DAYS ?? '1,2,3,4,5';
  const days = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length > 0 ? Array.from(new Set(days)) : [1, 2, 3, 4, 5];
}

export function getServiceConfig(): ServiceConfig {
  let openHour = intFromEnv('OPEN_HOUR', 9, 0, 23);
  let closeHour = intFromEnv('CLOSE_HOUR', 15, 1, 24);
  if (closeHour <= openHour) {
    console.warn('[config] CLOSE_HOUR は OPEN_HOUR より大きい必要があります。既定値(9-15)を使用します。');
    openHour = 9;
    closeHour = 15;
  }
  return {
    openHour,
    closeHour,
    businessDays: businessDaysFromEnv(),
    waitSeconds: intFromEnv('WAIT_SECONDS', 300, 10, 3600),
    ignoreHours: process.env.IGNORE_BUSINESS_HOURS === 'true',
  };
}

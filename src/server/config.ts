export interface ServiceConfig {
  /** 受付開始（JSTの0:00からの分数） */
  openMinutes: number;
  /** 受付終了（JSTの0:00からの分数） */
  closeMinutes: number;
  /** 受付曜日（0=日 ... 6=土） */
  businessDays: number[];
  waitSeconds: number;
  ignoreHours: boolean;
}

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" 形式の時刻を0:00からの分数に変換する */
function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1] ?? '0', 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  return hour * 60 + minute;
}

/** 0:00からの分数を "HH:mm" 形式に戻す */
export function formatMinutesAsTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeFromEnv(name: string, fallback: string): number {
  const raw = process.env[name];
  const candidate = raw === undefined || raw.trim() === '' ? fallback : raw;
  const minutes = parseTimeToMinutes(candidate);
  if (minutes === null) {
    console.warn(`[config] ${name} の値（${candidate}）が不正なため既定値 ${fallback} を使用します。`);
    return parseTimeToMinutes(fallback) ?? 0;
  }
  return minutes;
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
  let openMinutes = timeFromEnv('OPEN_TIME', '09:30');
  let closeMinutes = timeFromEnv('CLOSE_TIME', '09:45');
  if (closeMinutes <= openMinutes) {
    console.warn('[config] CLOSE_TIME は OPEN_TIME より後の時刻である必要があります。既定値(09:30-09:45)を使用します。');
    openMinutes = 9 * 60 + 30;
    closeMinutes = 9 * 60 + 45;
  }
  return {
    openMinutes,
    closeMinutes,
    businessDays: businessDaysFromEnv(),
    // 既定値は15分（900秒）
    waitSeconds: intFromEnv('WAIT_SECONDS', 900, 10, 3600),
    ignoreHours: process.env.IGNORE_BUSINESS_HOURS === 'true',
  };
}

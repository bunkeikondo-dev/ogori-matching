/** 日本標準時(JST, UTC+9)ユーティリティ。サーバーのTZ設定に依存しない。 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 渡した時刻をJST壁時計として getUTC* で読める Date に変換する */
export function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** JSTの YYYY-MM-DD */
export function getJstDateString(date: Date = new Date()): string {
  const jst = toJst(date);
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`;
}

/** JSTの当日00:00:00に相当する絶対時刻 */
export function getJstStartOfDay(date: Date = new Date()): Date {
  const jst = toJst(date);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - JST_OFFSET_MS);
}

/** JSTの HH:mm:ss 表示 */
export function formatJstTime(value: string | number | Date): string {
  const jst = toJst(new Date(value));
  return `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`;
}

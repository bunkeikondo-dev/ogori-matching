import '@next/env';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** 初期トークテーマ（20件） */
const INITIAL_THEMES: string[] = [
  '最近、業務で便利だと感じたツールや機能はありますか？',
  '日々の業務で工夫している時間短縮の方法はありますか？',
  '他部署にもっと知ってほしい自部署の業務は何ですか？',
  '業務でよく利用するシステムやツールの改善アイデアはありますか？',
  '最近解決した業務上の課題を教えてください。',
  '人に伝えたい仕事のコツは何ですか？',
  '他部署との連携で助かった経験を教えてください。',
  '今の業務で自動化できそうだと思うことはありますか？',
  'よく利用するExcel機能や便利な関数はありますか？',
  '会議を効率化するために工夫していることはありますか？',
  '業務で活用しているAIツールや生成AIの活用例を教えてください。',
  '最近学んだ業務知識や社外情報で役立ったものはありますか？',
  '普段どのように情報収集をしていますか？',
  '業務の品質向上のために意識していることはありますか？',
  '他部署ともっと協力できそうなテーマはありますか？',
  '社内で共有したい成功事例や改善事例はありますか？',
  '業務マニュアルや標準化について改善したい点はありますか？',
  '今後チャレンジしてみたい業務改善テーマはありますか？',
  '部署間のコミュニケーションを良くするアイデアはありますか？',
  'お客様や販売店からいただいた意見で印象に残っているものはありますか？',
];

async function main(): Promise<void> {
  const force = process.env.SEED_FORCE === 'true';
  const existing = await prisma.talkTheme.count();

  if (existing > 0 && !force) {
    console.log(`[seed] トークテーマは既に ${existing} 件登録されているため、投入をスキップします。`);
    return;
  }

  let created = 0;
  for (const text of INITIAL_THEMES) {
    const found = await prisma.talkTheme.findUnique({ where: { text } });
    if (!found) {
      await prisma.talkTheme.create({ data: { text } });
      created += 1;
    }
  }

  const total = await prisma.talkTheme.count();
  console.log(`[seed] トークテーマを ${created} 件追加しました（合計 ${total} 件）。`);
}

main()
  .catch((error) => {
    console.error('[seed] 初期データ投入に失敗しました。', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

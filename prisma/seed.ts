import '@next/env';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** ライトトーク（21件） */
const LIGHT_THEMES: string[] = [
  '最近、仕事でちょっと嬉しかったことはありますか？',
  '仕事中の「ルーティン」ってありますか？',
  '最近、仕事で思わず笑ったことはありますか？',
  '入社した頃と今で、一番変わったことは何ですか？',
  '意外と好きな仕事や作業はありますか？',
  '最近、仕事で「へぇ〜！」と思ったことはありますか？',
  '普段、どのような業務をしていますか？',
  '自分の部署の雰囲気や、部署ならではの特徴を教えてください。',
  '1日だけ他部署で働けるなら、どこに行ってみたいですか？',
  '関わってみたい部署はありますか？',
  '自分の部署のちょっと自慢できるところは何ですか？',
  '最近、誰かに助けられて嬉しかったことはありますか？',
  '仕事で欠かせないアイテムは何ですか？',
  'もっと簡単になればいいなと思う業務はありますか？',
  '最近、やってよかったと思うことはありますか？',
  '自分だけかもしれないと思う、仕事のちょっとしたこだわりはありますか？',
  '昔と比べて、楽になった仕事はありますか？',
  '今とは違う社内の仕事をするなら、何をしてみたいですか？',
  '新入社員の頃の自分に、ひと言アドバイスするなら何と伝えますか？',
  '今だから笑える仕事の失敗談はありますか？',
  '他部署の人に知ってほしい面白い人はいますか？',
];

/** じっくりトーク（21件） */
const DEEP_THEMES: string[] = [
  'これまでの仕事でうまくいった経験と、その成功につながったポイントを教えてください。',
  '仕事中の「あるある」で、改善できたらよいと思うことはありますか？',
  '職場の雰囲気を良くするために、心掛けてることは何ですか？',
  '入社した頃と比べて、自分が一番成長したと思うことは何ですか？',
  '今の仕事で、面白さややりがいを感じるのはどんなときですか？',
  '最近、新しく学んだことや身に着けたことで、仕事に活かしたことがあれば教えてください。（もしくはこれから身に着けたいと）',
  '自分の仕事で、特に工夫していることやこだわりはありますか？',
  '自分の部署の業務や取り組みで、他部署にもっと知ってほしいことは何ですか？',
  '他部署の仕事を経験できるなら、何を学んでみたいですか？',
  '他部署ともっと連携するために、いいアイデアはありますか？',
  '自分の部署の強みや特徴は、どんなところですか？',
  '周囲と協力して仕事を進めるうえで、大切にしていることは何ですか？',
  '仕事をもっと効率的にするなら、どんなツールや仕組みが欲しいですか？',
  '普段の業務で改善したいこと、もしくは今後やってみようと思う業務改善案はありますか？',
  'これまでの業務の工夫や挑戦で、良い結果につながったことを教えてください。',
  '仕事の質を高めるために、普段から意識していることは何ですか？',
  'これまでの業務の変化で、特に良くなったと思うことは何ですか？',
  '今後、新しく挑戦してみたい仕事や業務はありますか？',
  'これまでの経験から、周りに伝えたい仕事のコツや考え方は何ですか？',
  'これまでの仕事で印象に残っている失敗談と、そこから学んだことを教えてください。',
  '自分の部署に、目標にしている人や「すごいな」と思う人がいれば理由と一緒に教えてください。',
];

async function seedCategory(category: 'LIGHT' | 'DEEP', texts: string[]): Promise<void> {
  const force = process.env.SEED_FORCE === 'true';
  const existing = await prisma.talkTheme.count({ where: { category } });
  if (existing > 0 && !force) {
    console.log(`[seed] ${category} は既に ${existing} 件登録されているため、投入をスキップします。`);
    return;
  }

  let created = 0;
  for (const text of texts) {
    const found = await prisma.talkTheme.findUnique({ where: { text } });
    if (!found) {
      await prisma.talkTheme.create({ data: { category, text } });
      created += 1;
    }
  }
  const total = await prisma.talkTheme.count({ where: { category } });
  console.log(`[seed] ${category} を ${created} 件追加しました（合計 ${total} 件）。`);
}

async function main(): Promise<void> {
  await seedCategory('LIGHT', LIGHT_THEMES);
  await seedCategory('DEEP', DEEP_THEMES);
}

main()
  .catch((error) => {
    console.error('[seed] 初期データ投入に失敗しました。', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

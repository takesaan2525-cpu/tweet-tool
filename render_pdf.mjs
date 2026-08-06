import { pdf } from 'pdf-to-img';
import fs from 'node:fs';

const document = await pdf('GrowUP_提案資料.pdf', { scale: 2 });
let i = 1;
for await (const image of document) {
  fs.writeFileSync(`proposal_page${i}.png`, image);
  console.log('wrote proposal_page' + i + '.png');
  i++;
}

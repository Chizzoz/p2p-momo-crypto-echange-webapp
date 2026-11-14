import { mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const results = 'e2e-results';
const outDir = 'e2e-videos';
mkdirSync(outDir, { recursive: true });

const names = [
  '01-list-usdt.webm',
  '02-buy-usdt.webm',
  '03-pay-redeem.webm',
];

function findVideos(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) findVideos(full, acc);
    else if (entry.endsWith('.webm')) acc.push(full);
  }
  return acc;
}

const videos = findVideos(results).sort();
videos.forEach((src, i) => {
  const dest = join(outDir, names[i] || `walkthrough-${i + 1}.webm`);
  copyFileSync(src, dest);
  console.log(`copied ${src} -> ${dest}`);
});

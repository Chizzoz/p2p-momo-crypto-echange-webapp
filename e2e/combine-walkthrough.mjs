#!/usr/bin/env node
/**
 * Concatenate the three walkthrough WebMs into one MP4 with chapter markers.
 */
import { execFileSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'e2e-videos');
const inputs = [
  {
    file: join(dir, '01-sell-usdt.webm'),
    title: '1. Sell USDT',
  },
  {
    file: join(dir, '02-sell-momo.webm'),
    title: '2. Sell MoMo',
  },
  {
    file: join(dir, '03-pay-with-usdt.webm'),
    title: '3. Pay with USDT',
  },
];

for (const input of inputs) {
  if (!existsSync(input.file)) {
    console.error(`Missing ${input.file}. Run npm run e2e:walkthrough first.`);
    process.exit(1);
  }
}

function durationMs(file) {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ],
    { encoding: 'utf8' },
  ).trim();
  return Math.round(Number(out) * 1000);
}

const durations = inputs.map(i => durationMs(i.file));
let cursor = 0;
const chapters = [];
inputs.forEach((input, idx) => {
  const start = cursor;
  const end = cursor + durations[idx];
  chapters.push({ title: input.title, start, end });
  cursor = end;
});

mkdirSync(dir, { recursive: true });
const listFile = join(dir, 'concat.txt');
writeFileSync(
  listFile,
  inputs.map(i => `file '${i.file.replace(/'/g, `'\\''`)}'`).join('\n') + '\n',
);

const metaFile = join(dir, 'chapters.ffmeta');
let meta = ';FFMETADATA1\ntitle=e-Mpiya walkthrough\n\n';
for (const ch of chapters) {
  meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${ch.start}\nEND=${ch.end}\ntitle=${ch.title}\n\n`;
}
writeFileSync(metaFile, meta);

const outFile = join(dir, 'empiya-walkthrough.mp4');
console.log('Chapters:');
chapters.forEach(ch => {
  console.log(
    `  ${ch.title}  ${ (ch.start / 1000).toFixed(1) }s → ${ (ch.end / 1000).toFixed(1) }s`,
  );
});

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listFile,
    '-i',
    metaFile,
    '-map',
    '0',
    '-map_metadata',
    '1',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outFile,
  ],
  { stdio: 'inherit' },
);

console.log(`\nWrote ${outFile}`);

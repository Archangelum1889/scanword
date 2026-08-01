// Оффлайн-сборка библиотеки пазлов: node scripts/build-puzzles.js
// Пишет www/puzzles.json — пронумерованный набор сканвордов для экрана «Загрузить».

const fs = require("fs");
const path = require("path");
const { WORD_BANK, generatePuzzle } = require("../www/generator.js");

const PUZZLE_COUNT = 30;
const MIN_WORDS = 40;
const MAX_WORDS = 60;

// Подобрано эмпирически: щедрый запас (×0.62) давал заполнение сетки ~30%
// (клетки терялись на пустоту) — этот множитель держит ~45% при том же
// целевом числе слов, для мобильного экрана это принципиально
function spanFor(target) { return Math.round(target * 0.42) + 4; }

const puzzles = [];
for (let i = 1; i <= PUZZLE_COUNT; i++) {
  const target = MIN_WORDS + Math.floor(Math.random() * (MAX_WORDS - MIN_WORDS + 1));
  const span = spanFor(target);
  let puzzle = generatePuzzle(WORD_BANK, target, span);
  if (puzzle.wordCount < target * 0.7) {
    // одна повторная попытка — генератор рандомизирован, может повезти больше
    const retry = generatePuzzle(WORD_BANK, target, span);
    if (retry.wordCount > puzzle.wordCount) puzzle = retry;
  }
  puzzles.push(Object.assign({ id: i, number: i }, puzzle));
  let letters = 0;
  for (const row of puzzle.grid) for (const c of row) if (c.type === "letter") letters++;
  const fill = ((letters / (puzzle.rows * puzzle.cols)) * 100).toFixed(0);
  process.stdout.write(`#${i}: цель ${target}, слов ${puzzle.wordCount}, сетка ${puzzle.rows}x${puzzle.cols}, заполнение ${fill}%\n`);
}

const counts = puzzles.map((p) => p.wordCount);
const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
console.log(`\nГотово: ${puzzles.length} пазлов, слов на пазл: мин ${Math.min(...counts)}, макс ${Math.max(...counts)}, среднее ${avg}`);

const outPath = path.join(__dirname, "..", "www", "puzzles.json");
fs.writeFileSync(outPath, JSON.stringify(puzzles));
console.log(`Записано в ${outPath}`);

// Оффлайн-сборка библиотеки пазлов: node scripts/build-puzzles.js
// Пишет www/puzzles.json — пронумерованный набор сканвордов для экрана «Загрузить».

const fs = require("fs");
const path = require("path");
const { WORD_BANK, generatePuzzleDenseBest } = require("../www/generator.js");

const PUZZLE_COUNT = 30;
// Плотный «шведский» укладчик: компактная сетка, подсказки заполняют зазоры.
// maxDim держит поле мобильным, best-of-N берёт самый плотный вариант.
const MAX_DIM = 14;
const ATTEMPTS = 40;
const MIN_WORDS = 30;

const puzzles = [];
for (let i = 1; i <= PUZZLE_COUNT; i++) {
  const puzzle = generatePuzzleDenseBest(WORD_BANK, ATTEMPTS, { maxDim: MAX_DIM, minWords: MIN_WORDS });
  puzzles.push(Object.assign({ id: i, number: i }, puzzle));
  let L = 0, C = 0, B = 0;
  for (const row of puzzle.grid) for (const c of row) {
    if (c.type === "letter") L++; else if (c.type === "clue") C++; else B++;
  }
  const tot = puzzle.rows * puzzle.cols;
  process.stdout.write(
    `#${i}: слов ${puzzle.wordCount}, сетка ${puzzle.rows}x${puzzle.cols}, ` +
    `буквы ${(100 * L / tot).toFixed(0)}%, подсказки ${(100 * C / tot).toFixed(0)}%, пусто ${(100 * B / tot).toFixed(0)}%\n`
  );
}

const counts = puzzles.map((p) => p.wordCount);
const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
console.log(`\nГотово: ${puzzles.length} пазлов, слов на пазл: мин ${Math.min(...counts)}, макс ${Math.max(...counts)}, среднее ${avg}`);

const outPath = path.join(__dirname, "..", "www", "puzzles.json");
fs.writeFileSync(outPath, JSON.stringify(puzzles));
console.log(`Записано в ${outPath}`);

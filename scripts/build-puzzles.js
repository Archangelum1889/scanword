// Оффлайн-сборка библиотеки пазлов: node scripts/build-puzzles.js
// Пишет www/puzzles.json — пронумерованный набор сканвордов для экрана «Загрузить».

const fs = require("fs");
const path = require("path");
const { WORD_BANK, generatePuzzle } = require("../www/generator.js");

const PUZZLE_COUNT = 30;
const TARGET_WORDS = 40;
const MAX_SPAN = 26;
const MIN_ACCEPTABLE_WORDS = 20;

const puzzles = [];
for (let i = 1; i <= PUZZLE_COUNT; i++) {
  let puzzle = generatePuzzle(WORD_BANK, TARGET_WORDS, MAX_SPAN);
  if (puzzle.wordCount < MIN_ACCEPTABLE_WORDS) {
    // одна повторная попытка — генератор рандомизирован, может повезти больше
    const retry = generatePuzzle(WORD_BANK, TARGET_WORDS, MAX_SPAN);
    if (retry.wordCount > puzzle.wordCount) puzzle = retry;
  }
  puzzles.push(Object.assign({ id: i, number: i }, puzzle));
  process.stdout.write(`#${i}: ${puzzle.wordCount} слов, сетка ${puzzle.rows}x${puzzle.cols}\n`);
}

const counts = puzzles.map((p) => p.wordCount);
const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
console.log(`\nГотово: ${puzzles.length} пазлов, слов на пазл: мин ${Math.min(...counts)}, макс ${Math.max(...counts)}, среднее ${avg}`);

const outPath = path.join(__dirname, "..", "www", "puzzles.json");
fs.writeFileSync(outPath, JSON.stringify(puzzles));
console.log(`Записано в ${outPath}`);

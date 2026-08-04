// Оффлайн-сборка библиотеки пазлов: node scripts/build-puzzles.js
// Пишет www/puzzles.json — пронумерованный набор сканвордов для экрана «Загрузить».
//
// ВАЖНО (требование пользователя): слова/вопросы НЕ ПОВТОРЯЮТСЯ между партиями.
// Поэтому пул слов сжимается: после каждого пазла его слова выкидываются из пула,
// следующий берёт только неиспользованные. Число пазлов ограничено размером банка.

const fs = require("fs");
const path = require("path");
const { WORD_BANK, generatePuzzleDenseBest } = require("../www/generator.js");

const MAX_PUZZLES = 40;      // потолок; реально упрёмся в размер банка
const MAX_DIM = 14;
const ATTEMPTS = 40;
const GEN_MIN_WORDS = 22;    // целевой минимум слов в пазле
const MAX_BLANK = 0.45;      // не берём разреженные пазлы (пул к концу выеден)
const POOL_STOP = 45;        // ниже этого остатка — качество падает, стоп

const remaining = WORD_BANK.slice();
const puzzles = [];
let fails = 0;   // подряд неудачных генераций (плохое качество)

while (puzzles.length < MAX_PUZZLES && remaining.length >= POOL_STOP && fails < 5) {
  const puzzle = generatePuzzleDenseBest(remaining, ATTEMPTS, { maxDim: MAX_DIM, minWords: GEN_MIN_WORDS });
  let bl = 0, cells = puzzle ? puzzle.rows * puzzle.cols : 1;
  if (puzzle) for (const row of puzzle.grid) for (const c of row) if (c.type === "blocked") bl++;
  // мелкий/разреженный вариант — это случайная неудача (или пул выеден): повторяем,
  // а не останавливаемся; стоп только после нескольких неудач подряд
  if (!puzzle || puzzle.wordCount < GEN_MIN_WORDS || (bl / cells) > MAX_BLANK) { fails++; continue; }
  fails = 0;
  const id = puzzles.length + 1;
  puzzles.push(Object.assign({ id: id, number: id }, puzzle));

  // выкинуть использованные слова из пула
  const used = new Set(puzzle.words.map((w) => w.word));
  for (let k = remaining.length - 1; k >= 0; k--) if (used.has(remaining[k].w)) remaining.splice(k, 1);

  let L = 0, C = 0, B = 0;
  for (const row of puzzle.grid) for (const c of row) {
    if (c.type === "letter") L++; else if (c.type === "clue") C++; else B++;
  }
  const tot = puzzle.rows * puzzle.cols;
  process.stdout.write(
    `#${id}: слов ${puzzle.wordCount}, сетка ${puzzle.rows}x${puzzle.cols}, ` +
    `пусто ${(100 * B / tot).toFixed(0)}%, остаток пула ${remaining.length}\n`
  );
}

// проверка: все слова во всей библиотеке уникальны
const all = [];
for (const p of puzzles) for (const w of p.words) all.push(w.word);
const uniq = new Set(all);
const counts = puzzles.map((p) => p.wordCount);
const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
console.log(`\nГотово: ${puzzles.length} пазлов, слов на пазл: мин ${Math.min(...counts)}, макс ${Math.max(...counts)}, среднее ${avg}`);
console.log(`Всего слов: ${all.length}, уникальных: ${uniq.size} ${all.length === uniq.size ? "✓ повторов НЕТ" : "✗ ЕСТЬ ПОВТОРЫ!"}`);

const outPath = path.join(__dirname, "..", "www", "puzzles.json");
fs.writeFileSync(outPath, JSON.stringify(puzzles));
console.log(`Записано в ${outPath}`);

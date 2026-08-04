// Оффлайн-сборка библиотеки пазлов: node scripts/build-puzzles.js
// Пишет www/puzzles.json — пронумерованный набор сканвордов для экрана «Загрузить».
//
// ВАЖНО (требование пользователя): слова/вопросы НЕ ПОВТОРЯЮТСЯ между партиями.
// Поэтому пул слов сжимается: после каждого пазла его слова выкидываются из пула,
// следующий берёт только неиспользованные. Число пазлов ограничено размером банка.

const fs = require("fs");
const path = require("path");
const { WORD_BANK, generatePuzzleTightBest, fullScanAssert } = require("../www/generator.js");

const MAX_PUZZLES = 40;      // потолок; реально упрёмся в размер банка
const MAX_DIM = 12;          // маленькая сетка → те же ~47 слов пакуются ВПЛОТНУЮ (25% пусто, не 42%)
const ATTEMPTS = 8;          // тесный медленный (~3–4с/партия) — меньше попыток best-of
const GEN_MIN_WORDS = 34;    // «нормально» ~45 слов (юзер: 100 — перебор, вернул как было)
const WORD_CAP = 50;         // ПОТОЛОК слов на партию — не раздувать
const MAX_BLANK = 0.32;      // тесный при maxDim12 ~25%; отсекаем хвост
const POOL_STOP = 45;

const remaining = WORD_BANK.slice();
const puzzles = [];
let fails = 0;   // подряд неудачных генераций (плохое качество)

while (puzzles.length < MAX_PUZZLES && remaining.length >= POOL_STOP && fails < 12) {
  const puzzle = generatePuzzleTightBest(remaining, ATTEMPTS, { maxDim: MAX_DIM, minWords: GEN_MIN_WORDS, wordCap: WORD_CAP });
  let bl = 0, cells = puzzle ? puzzle.rows * puzzle.cols : 1;
  if (puzzle) for (const row of puzzle.grid) for (const c of row) if (c.type === "blocked") bl++;
  // мелкий/разреженный вариант или «слово-призрак» — неудача: повторяем,
  // а не останавливаемся; стоп только после нескольких неудач подряд
  if (!puzzle || puzzle.wordCount < GEN_MIN_WORDS || (bl / cells) > MAX_BLANK || !fullScanAssert(puzzle)) { fails++; continue; }
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

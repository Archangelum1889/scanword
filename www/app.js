// Классический сканворд: слова пересекаются на сетке, подсказки — прямо в клетках рядом со словом.

const WORD_BANK = [
  { w: "СОЛНЦЕ", c: "Звезда в центре нашей системы" },
  { w: "ЛУНА", c: "Спутник Земли" },
  { w: "РЕКА", c: "Волга или Днепр" },
  { w: "ГОРА", c: "Эверест, например" },
  { w: "ЛЕС", c: "Много деревьев" },
  { w: "МОРЕ", c: "Чёрное или Азовское" },
  { w: "ОКНО", c: "Проём в стене со стеклом" },
  { w: "ДВЕРЬ", c: "Вход в квартиру" },
  { w: "СТОЛ", c: "За ним обедают" },
  { w: "СТУЛ", c: "На нём сидят" },
  { w: "КНИГА", c: "Источник знаний из бумаги" },
  { w: "РУЧКА", c: "Пишущий предмет" },
  { w: "ШКОЛА", c: "Учебное заведение" },
  { w: "УЧЕНИК", c: "Тот, кто учится" },
  { w: "ГОРОД", c: "Крупный населённый пункт" },
  { w: "УЛИЦА", c: "Часть города с домами" },
  { w: "МАШИНА", c: "Средство передвижения на колёсах" },
  { w: "ПОЕЗД", c: "Идёт по рельсам" },
  { w: "САМОЛЁТ", c: "Летает по небу" },
  { w: "КОРАБЛЬ", c: "Плывёт по морю" },
  { w: "ЯБЛОКО", c: "Фрукт, упавший на Ньютона" },
  { w: "ГРУША", c: "Сладкий фрукт каплевидной формы" },
  { w: "ХЛЕБ", c: "Всему голова" },
  { w: "МОЛОКО", c: "Напиток от коровы" },
  { w: "КОФЕ", c: "Бодрящий напиток" },
  { w: "ЧАЙ", c: "Напиток, который заваривают" },
  { w: "СОБАКА", c: "Друг человека" },
  { w: "КОШКА", c: "Мурлычет на коленях" },
  { w: "ПТИЦА", c: "Летает и поёт" },
  { w: "РЫБА", c: "Живёт в воде" },
  { w: "ЦВЕТОК", c: "Дарят на праздник" },
  { w: "ДЕРЕВО", c: "Растёт из семени, даёт тень" },
  { w: "ТЕАТР", c: "Там играют спектакли" },
  { w: "МУЗЫКА", c: "Искусство звуков" },
  { w: "ХУДОЖНИК", c: "Рисует картины" },
  { w: "АКТЁР", c: "Играет роли в кино" },
  { w: "ВРАЧ", c: "Лечит людей" },
  { w: "УЧИТЕЛЬ", c: "Ведёт уроки" },
  { w: "ДРУГ", c: "Близкий человек" },
  { w: "СЕМЬЯ", c: "Родители и дети" },
  { w: "ЗИМА", c: "Время года со снегом" },
  { w: "ЛЕТО", c: "Самое тёплое время года" },
  { w: "ДОЖДЬ", c: "Капли воды с неба" },
  { w: "СНЕГ", c: "Белый и холодный, падает зимой" },
  { w: "ВЕТЕР", c: "Движение воздуха" },
];

const TARGET_WORDS = 12;
const MAX_SPAN = 20; // ограничение размера сетки

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function key(r, c) { return r + "," + c; }

class ScanwordGenerator {
  constructor(bank) {
    this.bank = bank;
    this.letterGrid = new Map(); // key -> { char, words: Set(id) }
    this.clueGrid = new Map();   // key -> { H:{text,arrow,wordId}, V:{...} }
    this.placed = [];            // { id, word, clue, r, c, dir, len }
    this.nextId = 1;
  }

  isLetter(r, c) { return this.letterGrid.has(key(r, c)); }

  canPlace(word, r0, c0, dir) {
    const len = word.length;
    // клетка до начала и после конца слова должна быть свободна от букв
    const before = dir === "H" ? [r0, c0 - 1] : [r0 - 1, c0];
    const after = dir === "H" ? [r0, c0 + len] : [r0 + len, c0];
    if (this.isLetter(before[0], before[1])) return false;
    if (this.isLetter(after[0], after[1])) return false;

    let intersections = 0;
    for (let i = 0; i < len; i++) {
      const r = dir === "H" ? r0 : r0 + i;
      const c = dir === "H" ? c0 + i : c0;
      const existing = this.letterGrid.get(key(r, c));
      if (existing) {
        if (existing.char !== word[i]) return false;
        intersections++;
      } else {
        if (this.clueGrid.has(key(r, c))) return false; // клетка занята подсказкой
        const n1 = dir === "H" ? [r - 1, c] : [r, c - 1];
        const n2 = dir === "H" ? [r + 1, c] : [r, c + 1];
        if (this.isLetter(n1[0], n1[1])) return false;
        if (this.isLetter(n2[0], n2[1])) return false;
      }
    }
    if (intersections === 0 && this.placed.length > 0) return false;

    // клетка для подсказки должна помещаться (до или после слова)
    const cluePrimary = dir === "H" ? [r0, c0 - 1] : [r0 - 1, c0];
    const clueFallback = dir === "H" ? [r0, c0 + len] : [r0 + len, c0];
    const axis = dir === "H" ? "H" : "V";
    const primaryFree = !this.isLetter(cluePrimary[0], cluePrimary[1]) &&
      !(this.clueGrid.get(key(cluePrimary[0], cluePrimary[1])) || {})[axis];
    const fallbackFree = !this.isLetter(clueFallback[0], clueFallback[1]) &&
      !(this.clueGrid.get(key(clueFallback[0], clueFallback[1])) || {})[axis];
    if (!primaryFree && !fallbackFree) return false;

    return true;
  }

  place(entry, r0, c0, dir) {
    const { w: word, c: clue } = entry;
    const len = word.length;
    const id = this.nextId++;
    for (let i = 0; i < len; i++) {
      const r = dir === "H" ? r0 : r0 + i;
      const c = dir === "H" ? c0 + i : c0;
      const k = key(r, c);
      let cell = this.letterGrid.get(k);
      if (!cell) { cell = { char: word[i], words: new Set() }; this.letterGrid.set(k, cell); }
      cell.words.add(id);
    }
    const axis = dir === "H" ? "H" : "V";
    const cluePrimary = dir === "H" ? [r0, c0 - 1] : [r0 - 1, c0];
    const clueFallback = dir === "H" ? [r0, c0 + len] : [r0 + len, c0];
    const primaryFree = !this.isLetter(cluePrimary[0], cluePrimary[1]) &&
      !(this.clueGrid.get(key(cluePrimary[0], cluePrimary[1])) || {})[axis];
    const [cr, cc] = primaryFree ? cluePrimary : clueFallback;
    const arrow = dir === "H" ? (primaryFree ? "right" : "left") : (primaryFree ? "down" : "up");
    const ck = key(cr, cc);
    let cslot = this.clueGrid.get(ck);
    if (!cslot) { cslot = {}; this.clueGrid.set(ck, cslot); }
    cslot[axis] = { text: clue, arrow, wordId: id };

    this.placed.push({ id, word, clue, r: r0, c: c0, dir, len });
  }

  findCandidates(entry) {
    const word = entry.w;
    const candidates = [];
    if (this.placed.length === 0) {
      candidates.push({ r0: 0, c0: 0, dir: "H", score: 0 });
      return candidates;
    }
    for (const [k, cell] of this.letterGrid) {
      const [er, ec] = k.split(",").map(Number);
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== cell.char) continue;
        const hCand = { r0: er, c0: ec - i, dir: "H" };
        const vCand = { r0: er - i, c0: ec, dir: "V" };
        for (const cand of [hCand, vCand]) {
          if (this.canPlace(word, cand.r0, cand.c0, cand.dir)) {
            candidates.push({ ...cand, score: Math.random() });
          }
        }
      }
    }
    return candidates;
  }

  bounds() {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    const consider = (r, c) => {
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (c < minC) minC = c; if (c > maxC) maxC = c;
    };
    for (const k of this.letterGrid.keys()) { const [r, c] = k.split(",").map(Number); consider(r, c); }
    for (const k of this.clueGrid.keys()) { const [r, c] = k.split(",").map(Number); consider(r, c); }
    return { minR, maxR, minC, maxC };
  }

  generate(targetCount) {
    const pool = shuffle(this.bank).sort((a, b) => b.w.length - a.w.length);
    for (const entry of pool) {
      if (this.placed.length >= targetCount) break;
      if (this.placed.some(p => p.word === entry.w)) continue;
      const candidates = this.findCandidates(entry);
      if (!candidates.length) continue;
      candidates.sort((a, b) => b.score - a.score);
      const pick = candidates[0];
      this.place(entry, pick.r0, pick.c0, pick.dir);
      const b = this.bounds();
      if (b.maxR - b.minR >= MAX_SPAN || b.maxC - b.minC >= MAX_SPAN) {
        // сетка выросла слишком сильно — откатить последнее слово
        this.undoLast();
      }
    }
    return this.placed.length;
  }

  undoLast() {
    const last = this.placed.pop();
    if (!last) return;
    for (let i = 0; i < last.len; i++) {
      const r = last.dir === "H" ? last.r : last.r + i;
      const c = last.dir === "H" ? last.c + i : last.c;
      const k = key(r, c);
      const cell = this.letterGrid.get(k);
      if (cell) { cell.words.delete(last.id); if (cell.words.size === 0) this.letterGrid.delete(k); }
    }
    for (const [k, slot] of this.clueGrid) {
      for (const axis of ["H", "V"]) {
        if (slot[axis] && slot[axis].wordId === last.id) delete slot[axis];
      }
      if (!slot.H && !slot.V) this.clueGrid.delete(k);
    }
  }
}

const ARROW_GLYPH = { right: "→", left: "←", down: "↓", up: "↑" };

let state = {
  rows: 0, cols: 0,
  grid: [],       // grid[r][c] = { type:'letter', char, wordIds } | { type:'clue', H, V } | { type:'blocked' }
  words: [],      // placed words with normalized coords
  selectedWordId: null,
};

function buildPuzzle() {
  let gen, count = 0, attempts = 0;
  do {
    gen = new ScanwordGenerator(WORD_BANK);
    count = gen.generate(TARGET_WORDS);
    attempts++;
  } while (count < 8 && attempts < 15);

  const { minR, maxR, minC, maxC } = gen.bounds();
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ type: "blocked" })));

  for (const [k, cell] of gen.letterGrid) {
    const [r, c] = k.split(",").map(Number);
    grid[r - minR][c - minC] = { type: "letter", char: cell.char, wordIds: [...cell.words] };
  }
  for (const [k, slot] of gen.clueGrid) {
    const [r, c] = k.split(",").map(Number);
    grid[r - minR][c - minC] = { type: "clue", H: slot.H || null, V: slot.V || null };
  }

  const words = gen.placed.map(p => ({
    id: p.id, word: p.word, clue: p.clue, dir: p.dir, len: p.len,
    r: p.r - minR, c: p.c - minC,
  }));

  state = { rows, cols, grid, words, selectedWordId: null };
}

function wordCells(w) {
  const cells = [];
  for (let i = 0; i < w.len; i++) {
    cells.push(w.dir === "H" ? [w.r, w.c + i] : [w.r + i, w.c]);
  }
  return cells;
}

function selectWord(id, focusFirst) {
  state.selectedWordId = id;
  renderSelection();
  if (focusFirst) {
    const w = state.words.find(x => x.id === id);
    if (w) {
      const [r, c] = wordCells(w)[0];
      const input = boardEl.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
      if (input) input.focus();
    }
  }
  updateCluePreview();
}

function updateCluePreview() {
  const preview = document.getElementById("cluePreview");
  const w = state.words.find(x => x.id === state.selectedWordId);
  preview.textContent = w ? w.clue : "Выберите клетку с подсказкой";
}

function renderSelection() {
  boardEl.querySelectorAll(".cell.letter").forEach(el => el.classList.remove("in-word"));
  const w = state.words.find(x => x.id === state.selectedWordId);
  if (!w) return;
  for (const [r, c] of wordCells(w)) {
    const el = boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (el) el.classList.add("in-word");
  }
}

function cellWordForClick(r, c, preferAxis) {
  const cell = state.grid[r][c];
  if (cell.type !== "letter") return null;
  const ids = cell.wordIds;
  if (ids.length === 1) return ids[0];
  const words = ids.map(id => state.words.find(w => w.id === id));
  const byAxis = axis => words.find(w => w.dir === axis);
  if (preferAxis) {
    const w = byAxis(preferAxis);
    if (w) return w.id;
  }
  return ids[0];
}

const boardEl = document.getElementById("board");

function render() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size, 26px))`;
  boardEl.style.gridTemplateRows = `repeat(${state.rows}, var(--cell-size, 26px))`;

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cellData = state.grid[r][c];
      const el = document.createElement("div");
      el.dataset.r = r; el.dataset.c = c;

      if (cellData.type === "blocked") {
        el.className = "cell blocked";
      } else if (cellData.type === "letter") {
        el.className = "cell letter";
        const input = document.createElement("input");
        input.maxLength = 1;
        input.autocapitalize = "characters";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.dataset.r = r; input.dataset.c = c;
        input.addEventListener("focus", () => onCellFocus(r, c));
        input.addEventListener("input", () => onCellInput(r, c, cellData));
        input.addEventListener("keydown", (e) => onCellKeydown(e, r, c));
        el.appendChild(input);
      } else if (cellData.type === "clue") {
        el.className = "cell clue" + (cellData.H && cellData.V ? " split" : "");
        if (cellData.H) {
          const slot = document.createElement("div");
          slot.className = "slot";
          slot.dataset.wordId = cellData.H.wordId;
          slot.innerHTML = (cellData.H.arrow === "left" ? `<span class="arrow">${ARROW_GLYPH.left}</span>${cellData.H.text}` : `${cellData.H.text}<span class="arrow">${ARROW_GLYPH.right}</span>`);
          slot.addEventListener("click", () => selectWord(cellData.H.wordId, true));
          el.appendChild(slot);
        }
        if (cellData.V) {
          const slot = document.createElement("div");
          slot.className = "slot";
          slot.dataset.wordId = cellData.V.wordId;
          slot.innerHTML = (cellData.V.arrow === "up" ? `<span class="arrow">${ARROW_GLYPH.up}</span>${cellData.V.text}` : `${cellData.V.text}<span class="arrow">${ARROW_GLYPH.down}</span>`);
          slot.addEventListener("click", () => selectWord(cellData.V.wordId, true));
          el.appendChild(slot);
        }
      } else {
        el.className = "cell blocked";
      }
      boardEl.appendChild(el);
    }
  }
  renderSelection();
  updateCluePreview();
}

function onCellFocus(r, c) {
  const currentWord = state.words.find(x => x.id === state.selectedWordId);
  let preferAxis = currentWord ? currentWord.dir : null;
  const cell = state.grid[r][c];
  const stillInSelected = currentWord && wordCells(currentWord).some(([wr, wc]) => wr === r && wc === c);
  if (stillInSelected) { renderSelection(); updateCluePreview(); return; }
  const id = cellWordForClick(r, c, preferAxis) ?? cellWordForClick(r, c, null);
  selectWord(id, false);
}

function onCellInput(r, c, cellData) {
  const input = boardEl.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
  let val = input.value.toUpperCase().replace(/[^А-ЯЁ]/g, "");
  input.value = val.slice(-1);
  input.closest(".cell").classList.toggle("correct", input.value === cellData.char);
  if (!input.value) return;

  const w = state.words.find(x => x.id === state.selectedWordId);
  if (w) {
    const cells = wordCells(w);
    const idx = cells.findIndex(([wr, wc]) => wr === r && wc === c);
    const next = cells[idx + 1];
    if (next) {
      const nextInput = boardEl.querySelector(`input[data-r="${next[0]}"][data-c="${next[1]}"]`);
      if (nextInput) nextInput.focus();
    }
  }
  checkCompletion();
}

function onCellKeydown(e, r, c) {
  if (e.key === "Backspace") {
    const input = e.target;
    if (!input.value) {
      const w = state.words.find(x => x.id === state.selectedWordId);
      if (w) {
        const cells = wordCells(w);
        const idx = cells.findIndex(([wr, wc]) => wr === r && wc === c);
        const prev = cells[idx - 1];
        if (prev) {
          const prevInput = boardEl.querySelector(`input[data-r="${prev[0]}"][data-c="${prev[1]}"]`);
          if (prevInput) { prevInput.focus(); prevInput.value = ""; prevInput.closest(".cell").classList.remove("correct"); }
        }
      }
    }
  }
}

function checkCompletion() {
  let complete = true;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cellData = state.grid[r][c];
      if (cellData.type !== "letter") continue;
      const input = boardEl.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
      if (!input || input.value !== cellData.char) { complete = false; }
    }
  }
  if (complete) {
    document.getElementById("winOverlay").classList.remove("hidden");
  }
}

function revealAndCheck() {
  // подсветить неверные буквы кратко, без раскрытия ответа
  let hasEmpty = false;
  boardEl.querySelectorAll(".cell.letter input").forEach(input => {
    if (!input.value) hasEmpty = true;
  });
  checkCompletion();
  if (hasEmpty) {
    const preview = document.getElementById("cluePreview");
    const original = preview.textContent;
    preview.textContent = "Заполните все клетки";
    setTimeout(() => { preview.textContent = original; }, 1500);
  }
}

function newPuzzle() {
  document.getElementById("winOverlay").classList.add("hidden");
  buildPuzzle();
  fitCellSize();
  render();
}

function fitCellSize() {
  const available = Math.min(window.innerWidth - 16, 520);
  const maxDim = Math.max(state.cols, state.rows) || 1;
  let size = Math.floor(available / maxDim);
  size = Math.max(20, Math.min(34, size));
  document.documentElement.style.setProperty("--cell-size", size + "px");
}

document.getElementById("newPuzzleBtn").addEventListener("click", newPuzzle);
document.getElementById("winNewBtn").addEventListener("click", newPuzzle);
document.getElementById("checkBtn").addEventListener("click", revealAndCheck);
window.addEventListener("resize", () => { fitCellSize(); });

newPuzzle();

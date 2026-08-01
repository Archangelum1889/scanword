// Экраны, библиотека пазлов и игровой процесс. Генератор — в generator.js.

const PROGRESS_KEY = "scanword_progress";
const SETTINGS_KEY = "scanword_settings";
const PAGE_SIZE = 20;

const DEFAULT_SETTINGS = {
  mode: "phone", // 'phone' | 'newspaper'
  jumpOnIntersection: true,
  autoAdvanceOnSolve: true,
  closeKeyboardOnSolve: false,
  highlightSolvedClues: true,
  hints: 10,
};

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return Object.assign({}, DEFAULT_SETTINGS, raw || {});
  } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveProgress() { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }

let settings = loadSettings();
let progress = loadProgress(); // { [puzzleId]: { filled: {"r,c":"Ч"}, completed:bool } }
let PUZZLES = [];
let libraryFilter = "all";
let libraryPage = 0;
let game = null; // { puzzle, selectedWordId, cursor:[r,c] }

const ARROW_GLYPH = { right: "→", left: "←", down: "↓", up: "↑" };
const boardEl = document.getElementById("board");

// ---------- Экраны ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

// ---------- Главное меню ----------
document.getElementById("playBtn").addEventListener("click", () => {
  if (!PUZZLES.length) return;
  const next = PUZZLES.find((p) => {
    const prog = progress[p.id];
    return !prog || !prog.completed;
  }) || PUZZLES[0];
  openPuzzle(next.id);
});

document.getElementById("libraryBtn").addEventListener("click", () => {
  libraryPage = 0;
  renderLibrary();
  showScreen("screen-library");
});

document.getElementById("settingsBtn").addEventListener("click", () => showScreen("screen-settings"));

document.getElementById("exitBtn").addEventListener("click", () => {
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp && CapApp.exitApp) CapApp.exitApp();
});

document.getElementById("openControlsBtn").addEventListener("click", () => {
  renderSettingsControls();
  showScreen("screen-settings-controls");
});

// ---------- Библиотека ----------
function countSolvedWords(puzzle, prog) {
  if (!prog) return 0;
  let count = 0;
  for (const w of puzzle.words) {
    if (isWordSolvedIn(puzzle, prog, w)) count++;
  }
  return count;
}

function isWordSolvedIn(puzzle, prog, w) {
  for (let i = 0; i < w.len; i++) {
    const r = w.dir === "H" ? w.r : w.r + i;
    const c = w.dir === "H" ? w.c + i : w.c;
    if (prog.filled[r + "," + c] !== puzzle.grid[r][c].char) return false;
  }
  return true;
}

function filteredPuzzles() {
  return PUZZLES.filter((p) => {
    const solved = countSolvedWords(p, progress[p.id]);
    if (libraryFilter === "new") return solved === 0;
    if (libraryFilter === "started") return solved > 0 && solved < p.wordCount;
    if (libraryFilter === "finished") return solved === p.wordCount;
    return true;
  });
}

document.querySelectorAll("#libraryTabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#libraryTabs .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    libraryFilter = tab.dataset.filter;
    libraryPage = 0;
    renderLibrary();
  });
});

document.getElementById("pagePrev").addEventListener("click", () => {
  if (libraryPage > 0) { libraryPage--; renderLibrary(); }
});
document.getElementById("pageNext").addEventListener("click", () => {
  libraryPage++; renderLibrary();
});

function renderLibrary() {
  const list = filteredPuzzles();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (libraryPage >= totalPages) libraryPage = totalPages - 1;
  if (libraryPage < 0) libraryPage = 0;
  const pageItems = list.slice(libraryPage * PAGE_SIZE, libraryPage * PAGE_SIZE + PAGE_SIZE);

  const listEl = document.getElementById("puzzleList");
  listEl.innerHTML = "";
  pageItems.forEach((p) => {
    const solved = countSolvedWords(p, progress[p.id]);
    const done = solved === p.wordCount;
    const card = document.createElement("button");
    card.className = "puzzle-card" + (done ? " completed" : "");
    card.innerHTML =
      '<div class="num">Сканворд №' + p.number + '</div>' +
      '<div class="prog">' + solved + '/' + p.wordCount + '</div>' +
      '<div class="bar"><div class="bar-fill" style="width:' + Math.round((solved / p.wordCount) * 100) + '%"></div></div>';
    card.addEventListener("click", () => openPuzzle(p.id));
    listEl.appendChild(card);
  });

  document.getElementById("pageIndicator").textContent = (libraryPage + 1) + "/" + totalPages;
  document.getElementById("pagePrev").disabled = libraryPage === 0;
  document.getElementById("pageNext").disabled = libraryPage >= totalPages - 1;
}

// ---------- Настройки: Управление ----------
function renderSettingsControls() {
  document.getElementById("setJumpOnIntersection").checked = settings.jumpOnIntersection;
  document.getElementById("setModePhone").checked = settings.mode === "phone";
  document.getElementById("setModeNewspaper").checked = settings.mode === "newspaper";
  document.getElementById("setAutoAdvance").checked = settings.autoAdvanceOnSolve;
  document.getElementById("setCloseKeyboard").checked = settings.closeKeyboardOnSolve;
  document.getElementById("setHighlightSolved").checked = settings.highlightSolvedClues;
}

document.getElementById("setJumpOnIntersection").addEventListener("change", (e) => {
  settings.jumpOnIntersection = e.target.checked; saveSettings();
});
document.getElementById("setModePhone").addEventListener("change", () => { settings.mode = "phone"; saveSettings(); if (game) renderBoard(); });
document.getElementById("setModeNewspaper").addEventListener("change", () => { settings.mode = "newspaper"; saveSettings(); if (game) renderBoard(); });
document.getElementById("setAutoAdvance").addEventListener("change", (e) => { settings.autoAdvanceOnSolve = e.target.checked; saveSettings(); });
document.getElementById("setCloseKeyboard").addEventListener("change", (e) => { settings.closeKeyboardOnSolve = e.target.checked; saveSettings(); });
document.getElementById("setHighlightSolved").addEventListener("change", (e) => {
  settings.highlightSolvedClues = e.target.checked; saveSettings();
  if (game) updateClueSolvedStyles();
});

// ---------- Игра: открытие пазла ----------
function openPuzzle(id) {
  const puzzle = PUZZLES.find((p) => p.id === id);
  if (!puzzle) return;
  if (!progress[id]) progress[id] = { filled: {}, completed: false };

  game = { puzzle, selectedWordId: null, cursor: null };
  fitCellSize();
  renderBoard();
  updateHintButton();
  updateProgressLabel();
  showScreen("screen-game");
  document.getElementById("keyboard").classList.remove("hidden");

  const firstUnsolved = puzzle.words.find((w) => !isWordSolved(w));
  selectWord(firstUnsolved ? firstUnsolved.id : puzzle.words[0].id);
}

function currentWord() {
  if (!game || game.selectedWordId == null) return null;
  return game.puzzle.words.find((w) => w.id === game.selectedWordId) || null;
}

function wordCells(w) {
  const cells = [];
  for (let i = 0; i < w.len; i++) {
    cells.push(w.dir === "H" ? [w.r, w.c + i] : [w.r + i, w.c]);
  }
  return cells;
}

function isWordSolved(w) {
  return isWordSolvedIn(game.puzzle, progress[game.puzzle.id], w);
}

function firstUnfilledCell(w) {
  const prog = progress[game.puzzle.id];
  const cells = wordCells(w);
  for (const [r, c] of cells) {
    if (!prog.filled[r + "," + c] || prog.filled[r + "," + c] !== game.puzzle.grid[r][c].char) return [r, c];
  }
  return cells[0];
}

function cellIndexAt(cells, rc) {
  if (!rc) return -1;
  return cells.findIndex(([r, c]) => r === rc[0] && c === rc[1]);
}

function otherWordAt(r, c, excludeId) {
  const cellData = game.puzzle.grid[r][c];
  if (!cellData || cellData.type !== "letter") return null;
  const other = cellData.wordIds.find((id) => id !== excludeId);
  return other == null ? null : other;
}

function cellWordForClick(r, c, preferAxis) {
  const cellData = game.puzzle.grid[r][c];
  if (cellData.type !== "letter") return null;
  const ids = cellData.wordIds;
  if (ids.length === 1) return ids[0];
  const words = ids.map((id) => game.puzzle.words.find((w) => w.id === id));
  if (preferAxis) {
    const w = words.find((x) => x.dir === preferAxis);
    if (w) return w.id;
  }
  return ids[0];
}

// ---------- Выбор слова ----------
function selectWord(id) {
  game.selectedWordId = id;
  const w = currentWord();
  game.cursor = w ? firstUnfilledCell(w) : null;
  renderSelection();
  updateClueBar();
  document.getElementById("keyboard").classList.remove("hidden");
}

function selectWordAt(id, rc) {
  game.selectedWordId = id;
  game.cursor = rc;
  renderSelection();
  updateClueBar();
  document.getElementById("keyboard").classList.remove("hidden");
}

function updateClueBar() {
  const w = currentWord();
  document.getElementById("clueText").textContent = w ? (w.clue + " (" + w.len + ")") : "Выберите клетку с подсказкой";
}

document.getElementById("clueCloseBtn").addEventListener("click", () => {
  game.selectedWordId = null;
  game.cursor = null;
  renderSelection();
  updateClueBar();
  document.getElementById("keyboard").classList.add("hidden");
});

document.getElementById("cluePrevBtn").addEventListener("click", () => stepWord(-1));
document.getElementById("clueNextBtn").addEventListener("click", () => stepWord(1));

function stepWord(delta) {
  if (!game) return;
  const ids = game.puzzle.words.map((w) => w.id);
  let idx = game.selectedWordId == null ? -1 : ids.indexOf(game.selectedWordId);
  idx = (idx + delta + ids.length) % ids.length;
  selectWord(ids[idx]);
}

// ---------- Рендер сетки ----------
function fitCellSize() {
  const size = window.innerWidth < 380 ? 26 : 30;
  document.documentElement.style.setProperty("--cell-size", size + "px");
}

function renderBoard() {
  const puzzle = game.puzzle;
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = "repeat(" + puzzle.cols + ", var(--cell-size, 26px))";
  boardEl.style.gridTemplateRows = "repeat(" + puzzle.rows + ", var(--cell-size, 26px))";

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cellData = puzzle.grid[r][c];
      const el = document.createElement("div");
      el.dataset.r = r; el.dataset.c = c;

      if (cellData.type === "letter") {
        el.className = "cell letter";
        el.textContent = progress[puzzle.id].filled[r + "," + c] || "";
        el.addEventListener("click", () => onCellClick(r, c));
      } else if (cellData.type === "clue") {
        el.className = "cell clue" + (cellData.H && cellData.V ? " split" : "");
        if (cellData.H) el.appendChild(makeClueSlot(cellData.H, "H"));
        if (cellData.V) el.appendChild(makeClueSlot(cellData.V, "V"));
      } else {
        el.className = "cell blocked";
      }
      boardEl.appendChild(el);
    }
  }
  renderSelection();
  updateClueSolvedStyles();
}

function makeClueSlot(info, axis) {
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.wordId = info.wordId;
  const arrowSpan = '<span class="arrow">' + ARROW_GLYPH[info.arrow] + '</span>';
  const leading = info.arrow === "left" || info.arrow === "up";
  slot.innerHTML = leading ? (arrowSpan + info.text) : (info.text + arrowSpan);
  slot.addEventListener("click", () => selectWord(info.wordId));
  return slot;
}

function onCellClick(r, c) {
  const current = currentWord();
  let preferAxis = current ? current.dir : null;
  const stillInCurrent = current && wordCells(current).some(([wr, wc]) => wr === r && wc === c);
  const id = stillInCurrent ? current.id : (cellWordForClick(r, c, preferAxis) ?? cellWordForClick(r, c, null));
  selectWordAt(id, [r, c]);
}

function renderSelection() {
  boardEl.querySelectorAll(".cell.letter").forEach((el) => el.classList.remove("in-word", "selected"));
  const w = currentWord();
  if (!w) return;
  for (const [r, c] of wordCells(w)) {
    const el = boardEl.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
    if (el) el.classList.add("in-word");
  }
  if (game.cursor) {
    const el = boardEl.querySelector('.cell[data-r="' + game.cursor[0] + '"][data-c="' + game.cursor[1] + '"]');
    if (el) el.classList.add("selected");
  }
}

function renderCellContent(r, c) {
  const el = boardEl.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
  if (!el) return;
  const cellData = game.puzzle.grid[r][c];
  const val = progress[game.puzzle.id].filled[r + "," + c] || "";
  el.textContent = val;
  const isCorrect = settings.mode === "phone" && val === cellData.char;
  el.classList.toggle("correct", isCorrect);
}

function updateClueSolvedStyles() {
  boardEl.querySelectorAll(".cell.clue .slot").forEach((slotEl) => {
    const wordId = Number(slotEl.dataset.wordId);
    const w = game.puzzle.words.find((x) => x.id === wordId);
    const solved = settings.mode === "phone" && settings.highlightSolvedClues && w && isWordSolved(w);
    slotEl.classList.toggle("solved", !!solved);
  });
}

// ---------- Ввод ----------
function setLetter(r, c, ch) {
  progress[game.puzzle.id].filled[r + "," + c] = ch;
  saveProgress();
  renderCellContent(r, c);
}

function clearLetter(r, c) {
  delete progress[game.puzzle.id].filled[r + "," + c];
  saveProgress();
  renderCellContent(r, c);
}

function typeLetter(ch) {
  const w = currentWord();
  if (!w) return;
  const cells = wordCells(w);
  let idx = cellIndexAt(cells, game.cursor);
  if (idx === -1) idx = 0;
  const [r, c] = cells[idx];
  setLetter(r, c, ch);

  let jumped = false;
  if (idx < cells.length - 1) {
    game.cursor = cells[idx + 1];
    renderSelection();
  } else if (settings.jumpOnIntersection) {
    // «переходить к следующему слову на пересечении»: слово дописано до конца
    // на клетке, которая делится с другим словом — продолжаем без лишнего клика
    const crossId = otherWordAt(r, c, w.id);
    if (crossId != null) { selectWordAt(crossId, [r, c]); jumped = true; }
  }
  afterInput(w, jumped);
}

function backspace() {
  const w = currentWord();
  if (!w) return;
  const cells = wordCells(w);
  let idx = cellIndexAt(cells, game.cursor);
  if (idx === -1) idx = cells.length - 1;
  const [r, c] = cells[idx];
  const key = r + "," + c;
  if (progress[game.puzzle.id].filled[key]) {
    clearLetter(r, c);
  } else if (idx > 0) {
    idx--;
    game.cursor = cells[idx];
    const [pr, pc] = cells[idx];
    clearLetter(pr, pc);
  }
  renderSelection();
  updateClueSolvedStyles();
  updateProgressLabel();
}

function afterInput(w, skipAutoAdvance) {
  updateClueSolvedStyles();
  checkPuzzleCompletion();
  if (settings.mode === "phone" && isWordSolved(w)) {
    if (settings.closeKeyboardOnSolve) document.getElementById("keyboard").classList.add("hidden");
    if (settings.autoAdvanceOnSolve && !skipAutoAdvance) advanceToNextUnsolved();
  }
}

function advanceToNextUnsolved() {
  const ids = game.puzzle.words.map((x) => x.id);
  const startIdx = ids.indexOf(game.selectedWordId);
  for (let step = 1; step <= ids.length; step++) {
    const w = game.puzzle.words.find((x) => x.id === ids[(startIdx + step) % ids.length]);
    if (!isWordSolved(w)) { selectWord(w.id); return; }
  }
}

function checkPuzzleCompletion() {
  const puzzle = game.puzzle;
  const prog = progress[puzzle.id];
  const solved = countSolvedWords(puzzle, prog);
  updateProgressLabel();
  if (solved === puzzle.wordCount && !prog.completed) {
    prog.completed = true;
    saveProgress();
    showWin();
  }
}

function updateProgressLabel() {
  const puzzle = game.puzzle;
  const solved = countSolvedWords(puzzle, progress[puzzle.id]);
  document.getElementById("puzzleProgress").textContent = "№" + puzzle.number + ": " + solved + "/" + puzzle.wordCount;
}

// ---------- Подсказки ----------
function updateHintButton() {
  document.getElementById("hintCount").textContent = settings.hints;
  document.getElementById("hintBtn").disabled = settings.hints <= 0;
}

document.getElementById("hintBtn").addEventListener("click", () => {
  const w = currentWord();
  if (!w || settings.hints <= 0) return;
  const [r, c] = firstUnfilledCell(w);
  setLetter(r, c, game.puzzle.grid[r][c].char);
  settings.hints--;
  saveSettings();
  updateHintButton();
  const cells = wordCells(w);
  const idx = cellIndexAt(cells, [r, c]);
  game.cursor = cells[Math.min(idx + 1, cells.length - 1)];
  renderSelection();
  afterInput(w);
});

// ---------- Экранная клавиатура ----------
const KB_ROWS = [
  ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
  ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
  ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "⌫"],
];

function renderKeyboard() {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  KB_ROWS.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    row.forEach((ch) => {
      const btn = document.createElement("button");
      btn.className = "key" + (ch === "⌫" ? " wide" : "");
      btn.textContent = ch;
      btn.addEventListener("click", () => { if (ch === "⌫") backspace(); else typeLetter(ch); });
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });
}

// ---------- Победа ----------
function showWin() {
  document.getElementById("winOverlay").classList.remove("hidden");
}

document.getElementById("winLibraryBtn").addEventListener("click", () => {
  document.getElementById("winOverlay").classList.add("hidden");
  libraryPage = 0;
  renderLibrary();
  showScreen("screen-library");
});

window.addEventListener("resize", () => { if (game) fitCellSize(); });

// ---------- Инициализация ----------
async function init() {
  renderKeyboard();
  try {
    const res = await fetch("puzzles.json");
    PUZZLES = await res.json();
  } catch (e) {
    PUZZLES = [];
  }
  showScreen("screen-menu");
}

init();

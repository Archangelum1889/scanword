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
// Telegram CloudStorage только если реально поддерживается (Bot API ≥ 6.9),
// иначе SDK сыплет ошибками «not supported in version …»
function tgCloud() {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) return tg.CloudStorage;
  return null;
}

function saveProgress() {
  const json = JSON.stringify(progress);
  try { localStorage.setItem(PROGRESS_KEY, json); } catch (e) {}
  // Бэкап в Telegram CloudStorage — переживает переустановку/смену устройства
  const cs = tgCloud();
  if (cs) { try { cs.setItem(PROGRESS_KEY, json, function () {}); } catch (e) {} }
}

// Подтянуть прогресс из облака Telegram при старте (асинхронно) и перерисовать
function cloudLoadProgress() {
  const cs = tgCloud();
  if (!cs) return;
  try {
    cs.getItem(PROGRESS_KEY, function (err, val) {
      if (err || !val) return;
      try {
        const cloud = JSON.parse(val);
        if (cloud && typeof cloud === "object") {
          progress = cloud;
          pruneProgressToSolved();
          if (game) renderBoard();
        }
      } catch (e) {}
    });
  } catch (e) {}
}

// Запоминаем ТОЛЬКО собранные слова: выкидываем из прогресса все буквы, не
// входящие ни в одно полностью решённое слово (иначе при перезаходе висят
// разрозненные буквы «где попало»). Прогон по всем пазлам, затем сохранение.
function pruneProgressToSolved() {
  if (!PUZZLES || !PUZZLES.length) return;
  for (const p of PUZZLES) {
    const prog = progress[p.id];
    if (!prog || !prog.filled) continue;
    const keep = {};
    for (const w of p.words) {
      if (!isWordSolvedIn(p, prog, w)) continue;
      for (const cell of wordCells(w)) {
        const k = cell[0] + "," + cell[1];
        keep[k] = prog.filled[k];
      }
    }
    prog.filled = keep;
  }
  saveProgress();
}

let settings = loadSettings();
let progress = loadProgress(); // { [puzzleId]: { filled: {"r,c":"Ч"}, completed:bool } }
let PUZZLES = [];
let libraryFilter = "all";
let libraryPage = 0;
let game = null; // { puzzle, selectedWordId, cursor:[r,c] }

// Стрелка-указатель — одна SVG-форма, для каждого направления просто
// поворачивается: база рисуется указывающей вверх.
const ARROW_ROTATION = { up: 0, right: 90, down: 180, left: 270 };
// Чистая прямая стрелка (база смотрит вверх, поворачивается по направлению ответа):
// короткий стержень + жирная треугольная голова, хорошо читается на мелком размере.
const ARROW_SVG =
  '<svg viewBox="0 0 24 24" class="arrow-svg" style="transform:rotate(ROTdeg)">' +
  '<path d="M12,22 L12,11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M12,3 L5,13 L19,13 Z" fill="currentColor"/>' +
  '</svg>';
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
  // Экран показываем ДО renderBoard: скрытый (display:none) экран даёт нулевые
  // замеры, из-за чего авто-подгонка кегля (fitClueFonts) уходит в максимум.
  showScreen("screen-game");
  document.getElementById("keyboard").classList.remove("hidden");
  fitCellSize();
  renderBoard();
  updateHintButton();
  updateProgressLabel();

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

// Клетка «заблокирована» = в режиме phone входит в ПОЛНОСТЬЮ собранное слово.
// Такую нельзя стирать/перезаписывать. Одиночные верные буквы в недособранном
// слове НЕ блокируем — их можно свободно менять.
function isCellLocked(r, c) {
  if (settings.mode !== "phone") return false;
  const cd = game.puzzle.grid[r][c];
  if (!cd || cd.type !== "letter") return false;
  return (cd.wordIds || []).some(function (id) {
    const w = game.puzzle.words.find(function (x) { return x.id === id; });
    return w && isWordSolved(w);
  });
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
  scrollToSelection();
  updateClueBar();
  document.getElementById("keyboard").classList.remove("hidden");
}

// Прокрутить поле так, чтобы выбранное слово было видно (важно на зуме, когда
// клетка-подсказка за пределами экрана — иначе выбор «ничего не делает»).
function scrollToSelection() {
  const w = currentWord();
  if (!w) return;
  const slot = boardEl.querySelector('.slot[data-word-id="' + w.id + '"]');
  const target = slot ? slot.closest(".cell")
    : boardEl.querySelector('.cell[data-r="' + w.r + '"][data-c="' + w.c + '"]');
  if (target && target.scrollIntoView) {
    target.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }
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
const CELL_MIN = 20, CELL_MAX = 100;
let currentCellSize = 30;

function applyCellSize() {
  document.documentElement.style.setProperty("--cell-size", currentCellSize + "px");
}

// Единая точка изменения масштаба: клампим в пределы и пересчитываем кегль
function setCellSize(px) {
  currentCellSize = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.round(px)));
  applyCellSize();
  if (game) fitClueFonts();
}
function zoomBy(step) { setCellSize(currentCellSize + step); }

document.getElementById("zoomInBtn").addEventListener("click", function () { zoomBy(6); });
document.getElementById("zoomOutBtn").addEventListener("click", function () { zoomBy(-6); });

function fitCellSize() {
  currentCellSize = window.innerWidth < 380 ? 38 : 42;
  applyCellSize();
}

// Пинч именно по игровому полю — кнопки/клавиатура масштаб страницы не трогает
// (viewport зафиксирован user-scalable=no, чтобы не зумилась вся вёрстка).
function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

let pinchStartDist = null, pinchStartSize = null;

function wirePinchZoom() {
  const wrap = document.getElementById("boardWrap");
  wrap.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      pinchStartDist = touchDistance(e.touches);
      pinchStartSize = currentCellSize;
    }
  }, { passive: true });

  wrap.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      const ratio = touchDistance(e.touches) / pinchStartDist;
      currentCellSize = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.round(pinchStartSize * ratio)));
      applyCellSize();
    }
  }, { passive: false });

  wrap.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) { pinchStartDist = null; if (game) fitClueFonts(); }
  }, { passive: true });

  // Десктоп: Ctrl/⌘ + колесо = зум поля (без модификатора — обычная прокрутка)
  wrap.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 4 : -4);
    }
  }, { passive: false });

  // Десктоп: перетаскивание поля мышью (grab-to-pan). Только для настоящей мыши
  // (pointerType==='mouse') — тач панорамирует нативно, без конфликтов.
  // Клик без сдвига (< порога) остаётся кликом по клетке — различаем по panMoved.
  let panning = false, panMoved = false, panX = 0, panY = 0, panL = 0, panT = 0;
  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    panning = true; panMoved = false;
    panX = e.clientX; panY = e.clientY;
    panL = wrap.scrollLeft; panT = wrap.scrollTop;
  });
  window.addEventListener("pointermove", (e) => {
    if (!panning) return;
    const dx = e.clientX - panX, dy = e.clientY - panY;
    if (!panMoved && Math.hypot(dx, dy) > 5) { panMoved = true; wrap.classList.add("panning"); }
    if (panMoved) { wrap.scrollLeft = panL - dx; wrap.scrollTop = panT - dy; }
  });
  window.addEventListener("pointerup", () => { panning = false; wrap.classList.remove("panning"); });
  // после реального перетаскивания гасим клик, чтобы не выбралось слово
  wrap.addEventListener("click", (e) => {
    if (panMoved) { e.stopPropagation(); e.preventDefault(); panMoved = false; }
  }, true);
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
  fitClueFonts();
}

// Кегль подсказки подгоняется под клетку: короткие — крупно, длинные — мельче.
// Перенос идёт по словам (см. .ctext в CSS), здесь ищем самый большой размер,
// при котором текст ещё влезает и по ширине, и по высоте (бинарный поиск).
function fitClueFonts() {
  const cell = currentCellSize;
  const maxF = cell * 0.30;
  const minF = Math.max(5, cell * 0.13);
  boardEl.querySelectorAll(".cell.clue .slot").forEach((slot) => {
    const t = slot.querySelector(".ctext");
    if (!t || !slot.clientHeight) return;
    let lo = minF, hi = maxF, best = minF;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      t.style.fontSize = mid.toFixed(2) + "px";
      const fits = t.scrollWidth <= t.clientWidth + 0.5 &&
                   t.scrollHeight <= slot.clientHeight + 0.5;
      if (fits) { best = mid; lo = mid; } else { hi = mid; }
    }
    t.style.fontSize = best.toFixed(2) + "px";
  });
}

function makeClueSlot(info, axis) {
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.wordId = info.wordId;
  const textEl = document.createElement("span");
  textEl.className = "ctext";
  textEl.textContent = info.text;
  const arrowEl = document.createElement("span");
  arrowEl.className = "arrow arrow-" + info.arrow;
  arrowEl.innerHTML = ARROW_SVG.replace("ROT", ARROW_ROTATION[info.arrow]);
  slot.appendChild(textEl);
  slot.appendChild(arrowEl);
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
  boardEl.querySelectorAll(".cell.clue .slot.active").forEach((el) => el.classList.remove("active"));
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
  const slotEl = boardEl.querySelector('.slot[data-word-id="' + w.id + '"]');
  if (slotEl) slotEl.classList.add("active");
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
  if (isCellLocked(r, c)) return;   // не перезаписываем отгаданное
  progress[game.puzzle.id].filled[r + "," + c] = ch;
  saveProgress();
  renderCellContent(r, c);
}

function clearLetter(r, c) {
  if (isCellLocked(r, c)) return;   // не стираем отгаданное
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
  // пропускаем уже отгаданные (заблокированные) клетки
  while (idx < cells.length && isCellLocked(cells[idx][0], cells[idx][1])) idx++;
  if (idx >= cells.length) return;  // всё слово уже отгадано
  const [r, c] = cells[idx];
  setLetter(r, c, ch);

  // курсор → следующая НЕзаблокированная клетка
  let next = idx + 1;
  while (next < cells.length && isCellLocked(cells[next][0], cells[next][1])) next++;
  let jumped = false;
  if (next < cells.length) {
    game.cursor = cells[next];
    renderSelection();
  } else if (settings.jumpOnIntersection) {
    // слово дописано до конца на общей клетке — продолжаем на пересекающем слове
    const crossId = otherWordAt(r, c, w.id);
    if (crossId != null) { selectWordAt(crossId, [r, c]); jumped = true; }
  }
  afterInput(w, jumped);
}

function backspace() {
  const w = currentWord();
  if (!w) return;
  const cells = wordCells(w);
  const filled = progress[game.puzzle.id].filled;
  const editable = (i) => !isCellLocked(cells[i][0], cells[i][1]);
  const hasLetter = (i) => !!filled[cells[i][0] + "," + cells[i][1]];
  let idx = cellIndexAt(cells, game.cursor);
  if (idx === -1) idx = cells.length - 1;
  if (hasLetter(idx) && editable(idx)) {
    clearLetter(cells[idx][0], cells[idx][1]);
  } else {
    // шаг назад к ближайшей РЕДАКТИРУЕМОЙ клетке (пропуская отгаданные) и стираем
    let j = idx - 1;
    while (j >= 0 && !editable(j)) j--;
    if (j >= 0) {
      game.cursor = cells[j];
      if (hasLetter(j)) clearLetter(cells[j][0], cells[j][1]);
    }
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

window.addEventListener("resize", () => { if (game) { fitCellSize(); fitClueFonts(); } });

// ---------- Инициализация ----------
// Telegram Mini App: развернуть на весь экран и не закрывать свайпом вниз
// (иначе прокрутка/пан поля будет случайно сворачивать приложение).
function initTelegram() {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) {
    // SDK грузится async — подождём его, но игру этим НЕ блокируем
    initTelegram._n = (initTelegram._n || 0) + 1;
    if (initTelegram._n <= 50) setTimeout(initTelegram, 100);   // до ~5с
    return;
  }
  try {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    if (tg.setHeaderColor) tg.setHeaderColor("#c7b6a2");   // под фон доски
    cloudLoadProgress();   // подтянуть сохранённый прогресс из облака
  } catch (e) {}
}

async function init() {
  initTelegram();
  renderKeyboard();
  wirePinchZoom();
  try {
    const res = await fetch("puzzles.json", { cache: "no-store" });
    PUZZLES = await res.json();
  } catch (e) {
    PUZZLES = [];
  }
  pruneProgressToSolved();   // при заходе оставить только собранные слова
  showScreen("screen-menu");
}

init();

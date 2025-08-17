// Word Search - App
// PWA-friendly, works offline, saves progress

(function(){
  'use strict';

  const DEFAULTS = {
    gridSize: 10,
    bankSize: 6,
    allowDiagonals: true,
    allowBackwards: false
  };

  // Kid-friendly word pool (3-7 letters)
  const WORD_POOL = [
    'CAT','DOG','BIRD','FROG','LION','BEAR','TIGER','HORSE','SHEEP','GOAT',
    'FISH','WHALE','SHARK','SNAKE','MOUSE','PANDA','KOALA','OTTER','ZEBRA','EAGLE',
    'PIZZA','APPLE','BREAD','CHEESE','GRAPE','BERRY','MANGO','PEACH','BANANA','HONEY',
    'TRAIN','PLANE','TRUCK','ROBOT','SHELL','STONE','CLOUD','RAIN','SUNNY','WIND',
    'SMILE','HAPPY','LAUGH','HEART','MUSIC','DRUM','PIANO','VIOLA','GUITAR','DANCE'
  ];

  // DOM
  const elGrid = document.getElementById('grid');
  const elWordBank = document.getElementById('wordBank');
  const elScore = document.getElementById('score');
  const elFoundCount = document.getElementById('foundCount');
  const elTotalCount = document.getElementById('totalCount');
  const elNewGame = document.getElementById('newGameBtn');
  const elClear = document.getElementById('clearBtn');
  const elWin = document.getElementById('winBanner');

  const elGridSize = document.getElementById('gridSize');
  const elBankSize = document.getElementById('bankSize');
  const elDiagonals = document.getElementById('allowDiagonals');
  const elBackwards = document.getElementById('allowBackwards');
  const elGridSizeLabel = document.getElementById('gridSizeLabel');
  const elBankSizeLabel = document.getElementById('bankSizeLabel');

  // State
  let state = null;

  // Utilities
  const randInt = (n) => Math.floor(Math.random() * n);
  const choice = (arr) => arr[randInt(arr.length)];
  const alphabet = () => String.fromCharCode(65 + randInt(26)); // A-Z
  const key = (r,c) => `${r},${c}`;

  const DIRECTIONS_ALL = [
    [ 1, 0], // down
    [-1, 0], // up
    [ 0, 1], // right
    [ 0,-1], // left
    [ 1, 1], // down-right
    [ 1,-1], // down-left
    [-1, 1], // up-right
    [-1,-1]  // up-left
  ];

  function allowedDirections(diag, backwards){
    let dirs = [];
    if (diag){
      dirs.push([1,1],[1,-1]);
      if (backwards) dirs.push([-1,1],[-1,-1]);
    }
    // vertical
    dirs.push([1,0]);
    if (backwards) dirs.push([-1,0]);
    // horizontal
    dirs.push([0,1]);
    if (backwards) dirs.push([0,-1]);
    return dirs;
  }

  function init(){
    // load from storage or create new
    const saved = load();
    if (saved){
      // Drop any persisted letter selections so hidden leftovers don't block matches
      saved.selected = [];
      state = saved;
      applySettingsToUI();
      renderAll();
      return;
    }
    newGame();
  }

  function newGame(){
    const opts = {
      gridSize: Number(elGridSize?.value || DEFAULTS.gridSize),
      bankSize: Number(elBankSize?.value || DEFAULTS.bankSize),
      allowDiagonals: !!elDiagonals?.checked || DEFAULTS.allowDiagonals,
      allowBackwards: !!elBackwards?.checked || DEFAULTS.allowBackwards
    };
    state = createGame(opts);
    save();
    renderAll();
  }

  function createGame(opts){
    const size = opts.gridSize;
    const grid = Array.from({length:size}, () => Array.from({length:size}, () => ''));
    const dirs = allowedDirections(opts.allowDiagonals, opts.allowBackwards);
    // Make sure we have enough words that fit
    const pool = WORD_POOL.filter(w => w.length <= size);
    // Shuffle pool for variety
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    const placed = []; // {word, cells:[{r,c}], found:false}
    for (const word of shuffled){
      if (tryPlaceWord(word, grid, dirs)) {
        const cells = locateWordCells(word, grid);
        if (cells){
          placed.push({word, cells, found:false});
        }
      }
    }
    // Safety: require at least some words
    if (placed.length < 10){
      // If too few placed, relax and retry with diagonals=true/backwards=true for density
      return createGame({gridSize: size, bankSize: opts.bankSize, allowDiagonals: true, allowBackwards: true});
    }

    // Fill empty with letters
    for (let r=0;r<size;r++){
      for (let c=0;c<size;c++){
        if (!grid[r][c]) grid[r][c] = alphabet();
      }
    }

    // Active word bank (not yet found)
    const active = placed.slice(0, opts.bankSize).map(p => p.word);
    const remaining = placed.slice(opts.bankSize).map(p => p.word);

    return {
      opts,
      grid,
      placed,         // array of objects with cells
      active,         // array of words currently shown
      remaining,      // array of words existing in grid not yet in bank
      foundWords: [], // words found
      selected: [],   // [{r,c}]
      score: 0
    };
  }

  function tryPlaceWord(word, grid, dirs) {
    const size = grid.length;
    const attempts = 200;
    for (let a=0;a<attempts;a++){
      const dir = choice(dirs);
      const len = word.length;
      // compute start ranges so word fits
      const dr = dir[0], dc = dir[1];
      let rmin = 0, rmax = size-1, cmin = 0, cmax = size-1;
      if (dr === 1) rmax = size - len;
      if (dr === -1) rmin = len - 1;
      if (dc === 1) cmax = size - len;
      if (dc === -1) cmin = len - 1;

      const r0 = rmin + randInt(rmax - rmin + 1);
      const c0 = cmin + randInt(cmax - cmin + 1);

      // Check fit
      let ok = true;
      for (let i=0;i<len;i++){
        const r = r0 + i*dr;
        const c = c0 + i*dc;
        const ch = grid[r][c];
        if (ch && ch !== word[i]) { ok = false; break; }
      }
      if (!ok) continue;

      // Place
      for (let i=0;i<len;i++){
        const r = r0 + i*dr;
        const c = c0 + i*dc;
        grid[r][c] = word[i];
      }
      return true;
    }
    return false;
  }

  function locateWordCells(word, grid){
    const size = grid.length;
    // brute force find a line of word in grid (forward only)
    const dirs = DIRECTIONS_ALL; // search all directions for locating
    for (let r0=0;r0<size;r0++){
      for (let c0=0;c0<size;c0++){
        for (const [dr,dc] of dirs){
          const cells = [];
          for (let i=0;i<word.length;i++){
            const r = r0 + i*dr;
            const c = c0 + i*dc;
            if (r<0||c<0||r>=size||c>=size) { cells.length=0; break; }
            cells.push({r,c, ch:grid[r][c]});
          }
          if (cells.length===word.length && cells.every((cell, i)=>cell.ch===word[i])){
            return cells.map(({r,c})=>({r,c}));
          }
        }
      }
    }
    return null;
  }

  // ---------- Rendering ----------
  function renderAll(){
    renderGrid();
    renderBank();
    updateStats();
  }

  function renderGrid(){
    const size = state.grid.length;
    elGrid.style.setProperty('--grid-size', size);
    elGrid.innerHTML = '';
    for (let r=0;r<size;r++){
      for (let c=0;c<size;c++){
        const btn = document.createElement('button');
        btn.className = 'cell';
        btn.type = 'button';
        btn.setAttribute('aria-label', `Row ${r+1}, Column ${c+1}, Letter ${state.grid[r][c]}`);
        btn.dataset.r = r;
        btn.dataset.c = c;
        btn.textContent = state.grid[r][c];
        elGrid.appendChild(btn);
      }
    }
    // apply found styling
    for (const p of state.placed){
      if (p.found){
        for (const {r,c} of p.cells){
          const cell = cellAt(r,c);
          cell.classList.add('found');
        }
      }
    }
  }

  function renderBank(){
    elWordBank.innerHTML='';
    const activeSet = new Set(state.active);
    for (const w of state.active){
      const li = document.createElement('li');
      li.textContent = w;
      if (state.foundWords.includes(w)) li.classList.add('found');
      elWordBank.appendChild(li);
    }
    // totals
    elTotalCount.textContent = state.placed.length.toString();
    elFoundCount.textContent = state.foundWords.length.toString();
    elWin.hidden = !(state.foundWords.length === state.placed.length);
  }

  function updateStats(){
    elScore.textContent = state.score.toString();
  }

  function cellAt(r,c){
    return elGrid.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  // ---------- Selection & Match ----------
  elGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.cell');
    if (!btn) return;
    const r = Number(btn.dataset.r), c = Number(btn.dataset.c);
    const idx = state.selected.findIndex(p => p.r===r && p.c===c);
    if (idx>=0){
      state.selected.splice(idx,1);
      btn.classList.remove('selected');
    } else {
      state.selected.push({r,c});
      btn.classList.add('selected');
    }
    checkForMatch();
    save();
  });

  elClear.addEventListener('click', () => {
    clearSelection();
  });

  function clearSelection(){
    for (const {r,c} of state.selected){
      cellAt(r,c).classList.remove('selected');
    }
    state.selected.length = 0;
  }

  function checkForMatch(){
    if (state.selected.length < 2) return;
    const selSet = new Set(state.selected.map(p => key(p.r,p.c)));

    // Only accept matches that are in the current active bank
    const activeNotYetFound = state.active.filter(w => !state.foundWords.includes(w));

    for (const w of activeNotYetFound){
      const placed = state.placed.find(p => p.word === w);
      if (!placed || placed.found) continue;
      const wordSet = new Set(placed.cells.map(p => key(p.r,p.c)));
      if (setsEqual(selSet, wordSet)){
        // Found!
        handleFound(placed);
        return;
      }
    }
  }

  function setsEqual(a,b){
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  function handleFound(placed){
    placed.found = true;
    state.foundWords.push(placed.word);
    state.score += placed.word.length; // simple scoring
    // style
    for (const {r,c} of placed.cells){
      const cell = cellAt(r,c);
      cell.classList.add('found');
      cell.classList.remove('selected');
    }
    clearSelection();
    // Remove from active bank
    const i = state.active.indexOf(placed.word);
    if (i>=0) state.active.splice(i,1);
    // Replace with a new word present in grid and not found & not already active
    const next = state.remaining.find(w => !state.foundWords.includes(w) && !state.active.includes(w));
    if (next){
      state.active.push(next);
      // Remove from remaining list so it doesn't get duplicated later
      const idx = state.remaining.indexOf(next);
      if (idx>=0) state.remaining.splice(idx,1);
    }

    renderBank();
    updateStats();
    save();
  }

  // ---------- Settings ----------
  function applySettingsToUI(){
    elGridSize.value = state.opts.gridSize;
    elBankSize.value = state.opts.bankSize;
    elDiagonals.checked = state.opts.allowDiagonals;
    elBackwards.checked = state.opts.allowBackwards;
    elGridSizeLabel.textContent = `${state.opts.gridSize} × ${state.opts.gridSize}`;
    elBankSizeLabel.textContent = `${state.opts.bankSize} words`;
  }

  elGridSize.addEventListener('input', () => {
    elGridSizeLabel.textContent = `${elGridSize.value} × ${elGridSize.value}`;
  });
  elBankSize.addEventListener('input', () => {
    elBankSizeLabel.textContent = `${elBankSize.value} words`;
  });
  elDiagonals.addEventListener('change', () => {});
  elBackwards.addEventListener('change', () => {});

  elNewGame.addEventListener('click', () => {
    // Also save settings as defaults for next time
    newGame();
  });

  // ---------- Persistence ----------
  const STORAGE_KEY = 'caleb_word_search_v1';
  function save(){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e){ /* ignore */ }
  }
  function load(){
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (!s) return null;
      const data = JSON.parse(s);
      // Basic validation
      if (!data || !data.grid || !data.placed) return null;
      return data;
    } catch (e){ return null; }
  }

  // Start
  init();
})();

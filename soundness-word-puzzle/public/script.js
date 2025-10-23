// robust script.js — fixes Play Again button reliably
(() => {
  const SAFE_DELAY = 400;

  const safeInit = () => {
    setTimeout(() => {
      try {
        // ---------- element helpers ----------
        const byId = id => document.getElementById(id);
        const findButtonByText = txt => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(b => (b.textContent || '').trim().toLowerCase() === txt.toLowerCase()) || null;
        };

        // ---------- grab elements (robust) ----------
        const grid = byId('crossword-grid');
        const timerDisplay = byId('timer-display');
        const scoreDisplay = byId('score-display');
        const wordsSolvedDisplay = byId('words-solved-display');

        // Try multiple possible start button IDs (some HTML used inline onclick)
        const startBtn = byId('start-challenge-btn') || byId('start-game-btn') || findButtonByText('Start Challenge') || findButtonByText('Start New Game');
        const newGameBtn = byId('start-game-btn') || startBtn; // keep backwards compatibility
        let playAgainBtn = byId('play-again-btn') || findButtonByText('Play Again');

        if (!grid || !timerDisplay) {
          console.error('Required DOM elements (grid or timer) not found.');
          return;
        }

        // ---------- config ----------
        const GRID_SIZE = 17;
        const TIME_LIMIT_SECONDS = 210; // 3:30
        const WORDS = [
          "SUCCESSFUL","PROOF","SUI","WALRUS","LINERA","LIGERO",
          "BLOCKCHAIN","ZERO","KNOWLEDGE","ZIPPY","BLU","BLOOP",
          "WAVA","ECHO","GENERATE","SUBMITTED","PHAXY","WENDY",
          "OXY","KARAOKE","MOJA","LUTO","CRYPTOGRAPHY","VERIFICATION",
          "LAYER","DECENTRALIZED","SCALABLE","DATA","ROCKY","MAHDI","QUANTUM"
        ];

        // ---------- state ----------
        let interval = null;
        let timeLeft = TIME_LIMIT_SECONDS;
        let score = 0;
        let found = 0;
        let selecting = false;
        let selectionPath = [];
        let gridData = null;

        // ---------- directions & utils ----------
        const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
        const randLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random()*26)];
        const cellAt = (r,c) => document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

        // ---------- modal helpers (IDs from your HTML) ----------
        const openStartModal = () => byId('start-modal')?.classList.remove('hidden');
        const closeStartModal = () => byId('start-modal')?.classList.add('hidden');
        const showScoreModal = () => byId('score-modal')?.classList.remove('hidden');
        const hideScoreModal = () => byId('score-modal')?.classList.add('hidden');

        // ---------- timer ----------
        function startTimer() {
          clearInterval(interval);
          timeLeft = TIME_LIMIT_SECONDS;
          timerDisplay.textContent = fmt(timeLeft);
          interval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = fmt(timeLeft);
            if (timeLeft <= 0) {
              endGame(false);
            } else if (timeLeft <= 10) {
              // keep style class changes in CSS; we only toggle classes if needed
              timerDisplay.classList.add('animate-pulse', 'text-red-700');
            }
          }, 1000);
        }
        function stopTimer() {
          clearInterval(interval);
          interval = null;
        }

        // ---------- build wordsearch ----------
        function canFit(word, r, c, d, g) {
          for (let i=0;i<word.length;i++){
            const nr = r + i*d[0], nc = c + i*d[1];
            if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
            if (g[nr][nc] !== null && g[nr][nc] !== word[i]) return false;
          }
          return true;
        }
        function placeWord(word, r, c, d, g) {
          for (let i=0;i<word.length;i++) g[r + i*d[0]][c + i*d[1]] = word[i];
        }
        function buildGrid() {
          const g = Array.from({length: GRID_SIZE}, ()=>Array(GRID_SIZE).fill(null));
          // place each word (simple random placement, retries)
          WORDS.forEach(w => {
            let placed = false, tries = 0;
            while(!placed && tries < 2000) {
              const r = Math.floor(Math.random()*GRID_SIZE);
              const c = Math.floor(Math.random()*GRID_SIZE);
              const d = DIRS[Math.floor(Math.random()*DIRS.length)];
              if (canFit(w, r, c, d, g)) { placeWord(w, r, c, d, g); placed = true; }
              tries++;
            }
            // if placement failed we continue (grid may still fill with others)
          });
          for (let r=0;r<GRID_SIZE;r++) for (let c=0;c<GRID_SIZE;c++) if (!g[r][c]) g[r][c] = randLetter();
          return g;
        }

        // ---------- render ----------
        function renderGrid(g) {
          grid.innerHTML = '';
          for (let r=0;r<GRID_SIZE;r++){
            for (let c=0;c<GRID_SIZE;c++){
              const el = document.createElement('div');
              el.className = 'grid-cell';
              el.textContent = g[r][c];
              el.dataset.row = r;
              el.dataset.col = c;
              grid.appendChild(el);
            }
          }
          attachSelectionEvents();
        }

        // ---------- selection logic ----------
        function attachSelectionEvents() {
          // ensure previous handlers removed
          grid.onmousedown = grid.ontouchstart = startSelect;
          document.onmouseup = document.ontouchend = endSelect;
          document.onmousemove = document.ontouchmove = moveSelect;
        }

        function startSelect(e) {
          e.preventDefault();
          selecting = true;
          clearHighlights();
          const p = coordsFromEvent(e);
          if (p) {
            selectionPath = [p];
            const el = cellAt(p.r, p.c);
            if (el) el.classList.add('cell-highlight');
          }
        }
        function moveSelect(e) {
          if (!selecting) return;
          e.preventDefault();
          const p = coordsFromEvent(e);
          if (!p) return;
          const newPath = getStraightPath(selectionPath[0].r, selectionPath[0].c, p.r, p.c);
          if (!arraysEqualPositions(newPath, selectionPath)) {
            clearHighlights();
            selectionPath = newPath;
            selectionPath.forEach(pt => cellAt(pt.r, pt.c)?.classList.add('cell-highlight'));
          }
        }
        function endSelect() {
          if (selecting && selectionPath.length >= 2) checkSelection(selectionPath);
          clearHighlights();
          selecting = false;
          selectionPath = [];
        }
        function coordsFromEvent(e) {
          const target = e.touches ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : e.target;
          if (!target || !target.classList.contains('grid-cell')) return null;
          return { r: +target.dataset.row, c: +target.dataset.col };
        }
        function getStraightPath(r1,c1,r2,c2) {
          const dr = Math.sign(r2-r1), dc = Math.sign(c2-c1);
          const ar = Math.abs(r2-r1), ac = Math.abs(c2-c1);
          // invalid diagonal (not straight) or no movement => single cell
          if ((dr && dc && ar !== ac) || (!dr && !dc)) return [{r:r1,c:c1}];
          const p = [];
          let r = r1, c = c1;
          while(true) {
            p.push({r,c});
            if (r === r2 && c === c2) break;
            r += dr; c += dc;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
          }
          return p;
        }
        function clearHighlights() { document.querySelectorAll('.cell-highlight').forEach(el => el.classList.remove('cell-highlight')); }
        function arraysEqualPositions(a,b) {
          if (a.length !== b.length) return false;
          for (let i=0;i<a.length;i++) if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false;
          return true;
        }

        // ---------- check selection ----------
        function checkSelection(path) {
          const w = path.map(pt => cellAt(pt.r, pt.c)?.textContent || '').join('');
          const rev = w.split('').reverse().join('');
          if (WORDS.includes(w) || WORDS.includes(rev)) {
            const foundWord = WORDS.find(x => x === w || x === rev);
            // mark solved on the WORDS array by adding property as needed
            if (foundWord && !foundWord.solved) {
              foundWord.solved = true;
              found++; score++;
              path.forEach(pt => {
                const el = cellAt(pt.r, pt.c);
                if (el) { el.classList.remove('cell-highlight'); el.classList.add('cell-solved'); }
              });
              updateDisplays();
              if (found === WORDS.length) endGame(true);
            }
          }
        }

        // ---------- updates & end ----------
        function updateDisplays() {
          scoreDisplay.textContent = score;
          wordsSolvedDisplay.textContent = `${found} / ${WORDS.length}`;
        }

        function endGame(won) {
          stopTimer();
          // remove interaction handlers
          grid.onmousedown = grid.ontouchstart = null;
          document.onmouseup = document.ontouchend = document.onmousemove = document.ontouchmove = null;
          // show modal w/ champ message if applicable
          const champHtml = score > Math.floor(WORDS.length/2) ? '<div class="mt-2 text-2xl font-bold text-yellow-400">🏆 YOU ARE A PUZZLE CHAMP! 🏆</div>' : '';
          byId('modal-heading').innerHTML = (won ? 'PUZZLE SOLVED!' : "TIME'S UP!") + champHtml;
          byId('modal-message').textContent = won ? 'All words found!' : `Found ${found}/${WORDS.length}`;
          byId('modal-score').textContent = score;
          byId('modal-solved-words').textContent = found;
          showScoreModal();
          // show/hide correct buttons (keep UI consistent)
          if (newGameBtn) newGameBtn.classList.remove('hidden');
          if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        }

        // ---------- start & reset (Play Again) ----------
        // core start routine used by both start and play again
        function coreStart() {
          // reset internal state
          stopTimer();
          timeLeft = TIME_LIMIT_SECONDS;
          score = 0; found = 0;
          // reset solved flags on WORDS (if any)
          WORDS.forEach((w, idx) => { if (typeof WORDS[idx] === 'string') { /* leave strings */ } });
          // build and render new grid
          gridData = buildGrid();
          renderGrid(gridData);
          updateDisplays();
          // toggle UI
          if (newGameBtn) newGameBtn.classList.add('hidden');
          if (playAgainBtn) playAgainBtn.classList.remove('hidden');
          // start timer and interactions
          startTimer();
        }

        // exported functions for inline HTML compatibility
        window.startGame = () => {
          closeStartModal();
          hideScoreModal();
          coreStart();
        };

        window.resetGame = () => {
          // Play Again behavior: start a fresh game immediately
          hideScoreModal();
          closeStartModal();
          coreStart();
        };

        // ---------- attach button handlers robustly ----------
        // re-locate playAgainBtn in case it was not found earlier but exists now
        playAgainBtn = playAgainBtn || byId('play-again-btn') || findButtonByText('Play Again');
        // ensure start/new game button exists as well
        const startButtonElement = startBtn || newGameBtn || byId('start-game-btn') || findButtonByText('Start New Game');

        if (startButtonElement) {
          // prefer setting onclick to window.startGame (keeps compatibility with inline HTML)
          startButtonElement.onclick = window.startGame;
        }
        if (newGameBtn) newGameBtn.onclick = window.startGame;
        if (playAgainBtn) playAgainBtn.onclick = window.resetGame;

        // ---------- initialize UI ----------
        wordsSolvedDisplay.textContent = `0 / ${WORDS.length}`;
        timerDisplay.textContent = fmt(TIME_LIMIT_SECONDS);
        // open start modal at load
        openStartModal();

      } catch (err) {
        console.error('Initialization error:', err);
      }
    }, SAFE_DELAY);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeInit);
  else safeInit();
})();

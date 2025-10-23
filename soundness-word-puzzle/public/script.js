// === IMMEDIATE SAFE EXECUTION — AVOIDS METAMASK CRASH ===
(() => {
    // Wait for DOM + delay to bypass wallet injection
    const safeInit = () => {
        setTimeout(() => {
            try {
                // === ELEMENTS ===
                const grid = document.getElementById('crossword-grid');
                const timer = document.getElementById('timer-display');
                const scoreEl = document.getElementById('score-display');
                const wordsEl = document.getElementById('words-solved-display');
                const startBtn = document.getElementById('start-challenge-btn');
                const newGameBtn = document.getElementById('start-game-btn');
                
                // --- CORRECTED BUTTON ACCESS ---
                // Original: const playAgainBtn = document.getElementById('play-again-btn'); // This was the hidden top button
                const topPlayAgainBtn = document.getElementById('top-play-again-btn'); // The top button
                const modalPlayAgainBtn = document.getElementById('play-again-modal-btn'); // The modal button (the one that wasn't working)

                if (!grid || !timer) {
                    console.error("DOM elements missing");
                    return;
                }

                // === CONFIG ===
                const SIZE = 17;
                const TIME = 210; // 3:30
                const WORDS = [
                    "SUCCESSFUL","PROOF","SUI","WALRUS","LINERA","LIGERO",
                    "BLOCKCHAIN","ZERO","KNOWLEDGE","ZIPPY","BLU","BLOOP",
                    "WAVA","ECHO","GENERATE","SUBMITTED","PHAXY","WENDY",
                    "OXY","KARAOKE","MOJA","LUTO","CRYPTOGRAPHY","VERIFICATION",
                    "LAYER","DECENTRALIZED","SCALABLE","DATA","ROCKY","MAHDI","QUANTUM"
                ];

                // === STATE ===
                let interval = null;
                let timeLeft = TIME;
                let score = 0;
                let found = 0;
                let selecting = false;
                let path = [];
                let gridData = null;

                // === DIRECTIONS ===
                const DIRS = [
                    [0,1],[0,-1],[1,0],[-1,0],
                    [1,1],[1,-1],[-1,1],[-1,-1]
                ];

                // === UTILS ===
                const randLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random()*26)];
                const cell = (r,c) => document.querySelector([data-row="${r}"][data-col="${c}"]);

                // === MODALS ===
                const openModal = () => document.getElementById('start-modal')?.classList.remove('hidden');
                const closeModal = () => document.getElementById('start-modal')?.classList.add('hidden');
                const hideResult = () => document.getElementById('score-modal')?.classList.add('hidden');
                
                // Expose hideResult as hideModal for HTML compatibility
                window.hideModal = hideResult;

                // === TIMER ===
                const fmt = s => ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')};
                const startTimer = () => {
                    clearInterval(interval);
                    timeLeft = TIME;
                    timer.textContent = fmt(timeLeft);
                    interval = setInterval(() => {
                        timeLeft--;
                        timer.textContent = fmt(timeLeft);
                        if (timeLeft <= 0) end(false);
                    }, 1000);
                };

                // === GRID BUILDER (FIXED) ===
                const build = () => {
                    const g = Array(SIZE).fill().map(() => Array(SIZE).fill(null));
                    WORDS.forEach(w => {
                        let placed = false, tries = 0;
                        while (!placed && tries < 1000) {
                            const r = Math.floor(Math.random()*SIZE);
                            const c = Math.floor(Math.random()*SIZE);
                            const d = DIRS[Math.floor(Math.random()*DIRS.length)];
                            if (canFit(w, r, c, d, g)) {
                                place(w, r, c, d, g);
                                placed = true;
                            }
                            tries++;
                        }
                    });
                    for (let r=0; r<SIZE; r++)
                        for (let c=0; c<SIZE; c++)
                            if (g[r][c] === null) g[r][c] = randLetter();
                    return g;
                };

                const canFit = (w, r, c, d, g) => {
                    for (let i=0; i<w.length; i++) {
                        const nr = r + i*d[0], nc = c + i*d[1];
                        if (nr<0 || nr>=SIZE || nc<0 || nc>=SIZE) return false;
                        if (g[nr][nc] !== null && g[nr][nc] !== w[i]) return false;
                    }
                    return true;
                };

                const place = (w, r, c, d, g) => {
                    for (let i=0; i<w.length; i++) {
                        g[r + i*d[0]][c + i*d[1]] = w[i];
                    }
                };

                // === RENDER ===
                const render = (g) => {
                    grid.innerHTML = '';
                    for (let r=0; r<SIZE; r++) {
                        for (let c=0; c<SIZE; c++) {
                            const el = document.createElement('div');
                            el.className = 'grid-cell';
                            el.textContent = g[r][c];
                            el.dataset.row = r;
                            el.dataset.col = c;
                            grid.appendChild(el);
                        }
                    }
                    attachEvents();
                };

                // === SELECTION ===
                const attachEvents = () => {
                    grid.onmousedown = grid.ontouchstart = startSelect;
                    document.onmouseup = document.ontouchend = endSelect;
                    document.onmousemove = document.ontouchmove = moveSelect;
                };

                const startSelect = e => {
                    e.preventDefault();
                    selecting = true;
                    clearHighlight();
                    const p = coord(e);
                    if (p) {
                        path = [p];
                        cell(p.r, p.c)?.classList.add('cell-highlight');
                    }
                };

                const moveSelect = e => {
                    if (!selecting) return;
                    e.preventDefault();
                    const p = coord(e);
                    if (!p) return;
                    const newPath = getPath(path[0].r, path[0].c, p.r, p.c);
                    if (newPath.length !== path.length) {
                        clearHighlight();
                        path = newPath;
                        path.forEach(pt => cell(pt.r, pt.c)?.classList.add('cell-highlight'));
                    }
                };

                const endSelect = () => {
                    if (selecting && path.length >= 2) check(path);
                    clearHighlight();
                    selecting = false;
                    path = [];
                };

                const coord = e => {
                    const t = e.touches ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : e.target;
                    if (!t?.classList.contains('grid-cell')) return null;
                    return { r: +t.dataset.row, c: +t.dataset.col };
                };

                const getPath = (r1,c1,r2,c2) => {
                    const dr = Math.sign(r2-r1), dc = Math.sign(c2-c1);
                    const ar = Math.abs(r2-r1), ac = Math.abs(c2-c1);
                    if ((dr && dc && ar !== ac) || (!dr && !dc)) return [{r:r1,c:c1}];
                    const p = [];
                    let r = r1, c = c1;
                    while (true) {
                        p.push({r,c});
                        if (r===r2 && c===c2) break;
                        r += dr; c += dc;
                        if (r<0 || r>=SIZE || c<0 || c>=SIZE) break;
                    }
                    return p;
                };

                const clearHighlight = () => document.querySelectorAll('.cell-highlight').forEach(el => el.classList.remove('cell-highlight'));

                const check = (p) => {
                    const w = p.map(pt => cell(pt.r, pt.c).textContent).join('');
                    const rev = w.split('').reverse().join('');
                    if ( WORDS.includes(w) || WORDS.includes(rev) ) {
                        const word = WORDS.find(x => x===w || x===rev);
                        if (word && !word.solved) {
                            word.solved = true;
                            found++;
                            score++;
                            p.forEach(pt => {
                                const el = cell(pt.r, pt.c);
                                el.classList.remove('cell-highlight');
                                el.classList.add('cell-solved');
                            });
                            update();
                            if (found === WORDS.length) end(true);
                        }
                    }
                };

                const update = () => {
                    scoreEl.textContent = score;
                    wordsEl.textContent = ${found} / ${WORDS.length};
                };

                // === END ===
                const end = (won) => {
                    clearInterval(interval);
                    grid.onmousedown = grid.ontouchstart = null;
                    document.onmouseup = document.ontouchend = document.onmousemove = document.ontouchmove = null;
                    showResult(
                        won ? "PUZZLE SOLVED!" : "TIME'S UP!",
                        won ? "All words found!" : Found ${found}/${WORDS.length}
                    );
                };

                // === RESULT MODAL ===
                const showResult = (title, msg) => {
                    const champ =
                        score > Math.floor(WORDS.length / 2)
                        ? '<div class="mt-2 text-2xl font-bold text-yellow-400">🏆 YOU ARE A PUZZLE CHAMP! 🏆</div>'
                        : "";
                    document.getElementById("modal-heading").innerHTML = title + champ;
                    document.getElementById("modal-message").textContent = msg;
                    document.getElementById("modal-score").textContent = score;
                    document.getElementById("modal-solved-words").textContent = found;
                    document.getElementById("score-modal").classList.remove("hidden");

                    // Keep Share on X
                    const share = document.getElementById("share-container");
                    share.innerHTML = `
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        I just scored ${score} points in the Soundness Puzzle! Can you beat me? ${location.href} #WordPuzzle
                        )}" target="_blank"
                        class="inline-flex items-center gap-2 bg-[#1DA1F2] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1a8cd8]">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Share on X
                        </a>
                    `;
                };

                // === START GAME ===
                window.startGame = () => {
                    document.getElementById("start-modal")?.classList.add("hidden");
                    document.getElementById("score-modal")?.classList.add("hidden");
                    score = found = 0;
                    WORDS.forEach((w) => (w.solved = false));
                    gridData = build();
                    render(gridData);
                    update();
                    newGameBtn.classList.add("hidden");
                    // Using the top-bar button for reference
                    topPlayAgainBtn.classList.remove("hidden"); 
                    startTimer();
                };

                // === FIXED PLAY AGAIN BUTTON ===
                window.resetGame = () => {
                    clearInterval(interval);
                    timeLeft = TIME;
                    timer.textContent = fmt(timeLeft);
                    score = found = 0;
                    WORDS.forEach((w) => (w.solved = false));

                    // Hide modal first (using the helper function)
                    hideResult();

                    // Rebuild grid and start new game instantly
                    gridData = build();
                    render(gridData);
                    update();
                    startTimer();
                };

                // === BUTTON EVENTS ===
                if (startBtn) startBtn.onclick = window.startGame;
                if (newGameBtn) newGameBtn.onclick = window.startGame;
                
                // --- CORRECTED BUTTON BINDING ---
                if (topPlayAgainBtn) topPlayAgainBtn.onclick = window.startGame; // The top button can just start a new game
                if (modalPlayAgainBtn) modalPlayAgainBtn.onclick = window.resetGame; // The end-of-game modal button

                // === INIT ===
                wordsEl.textContent = 0 / ${WORDS.length};
                document.getElementById("start-modal")?.classList.remove("hidden");

            } catch(e) {
                console.error("Initialization error:", e);
            }
        }, 100);
    };

    safeInit();

})();

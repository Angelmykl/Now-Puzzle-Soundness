// === SAFE WRAPPER TO AVOID WALLET CRASHES ===
(function () {
    const initGame = () => {
        try {
            // === ELEMENTS ===
            const gridElement = document.getElementById('crossword-grid');
            const timerDisplay = document.getElementById('timer-display');
            const scoreDisplay = document.getElementById('score-display');
            const wordsSolvedDisplay = document.getElementById('words-solved-display');
            const startGameBtn = document.getElementById('start-game-btn');
            const playAgainBtn = document.getElementById('play-again-btn');
            const startChallengeBtn = document.getElementById('start-challenge-btn');

            if (!gridElement || !timerDisplay) {
                console.error("Missing DOM elements!");
                return;
            }

            // === CONFIG ===
            const GRID_SIZE = 17;
            const TIME_LIMIT_SECONDS = 210;

            // === STATE ===
            let timerInterval = null;
            let timeRemaining = TIME_LIMIT_SECONDS;
            let score = 0;
            let wordsSolved = 0;
            let isSelecting = false;
            let selectionCells = [];
            let solvedCells = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
            let startCoords = null;

            // === WORDS (31) ===
            const allWords = [
                "SUCCESSFUL", "PROOF", "SUI", "WALRUS", "LINERA", "LIGERO",
                "BLOCKCHAIN", "ZERO", "KNOWLEDGE", "ZIPPY", "BLU", "BLOOP",
                "WAVA", "ECHO", "GENERATE", "SUBMITTED", "PHAXY", "WENDY",
                "OXY", "KARAOKE", "MOJA", "LUTO",
                "CRYPTOGRAPHY", "VERIFICATION", "LAYER", "DECENTRALIZED",
                "SCALABLE", "DATA", "ROCKY", "MAHDI", "QUANTUM"
            ];

            const DIRECTIONS = [
                { dr: 0, dc: 1 }, { dr: 0, dc: -1 },
                { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
                { dr: 1, dc: 1 }, { dr: 1, dc: -1 },
                { dr: -1, dc: 1 }, { dr: -1, dc: -1 }
            ];

            // === UTILS ===
            const getRandomLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
            const getCell = (r, c) => document.querySelector(`[data-row="${r}"][data-col="${c}"]`);

            // === MODALS ===
            const openStartModal = () => document.getElementById('start-modal')?.classList.remove('hidden');
            const closeStartModal = () => document.getElementById('start-modal')?.classList.add('hidden');
            const hideModal = () => document.getElementById('score-modal')?.classList.add('hidden');

            // === TIMER ===
            const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
            const startTimer = () => {
                clearInterval(timerInterval);
                timeRemaining = TIME_LIMIT_SECONDS;
                timerDisplay.textContent = formatTime(timeRemaining);
                timerInterval = setInterval(() => {
                    timeRemaining--;
                    timerDisplay.textContent = formatTime(timeRemaining);
                    if (timeRemaining <= 0) endGame(false);
                    else if (timeRemaining <= 10) timerDisplay.classList.add('animate-pulse', 'text-red-700');
                }, 1000);
            };

            // === GRID GENERATION (FIXED) ===
            const generateWordSearch = () => {
                const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));

                // Place each word
                allWords.forEach(word => {
                    let placed = false;
                    let attempts = 0;
                    while (!placed && attempts < 1000) {
                        const r = Math.floor(Math.random() * GRID_SIZE);
                        const c = Math.floor(Math.random() * GRID_SIZE);
                        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                        if (canPlace(word, r, c, dir, grid)) {
                            placeWord(word, r, c, dir, grid);
                            placed = true;
                        }
                        attempts++;
                    }
                });

                // Fill empty cells
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (grid[r][c] === null) {
                            grid[r][c] = getRandomLetter();
                        }
                    }
                }

                return grid;
            };

            const canPlace = (word, r, c, dir, grid) => {
                for (let i = 0; i < word.length; i++) {
                    const nr = r + i * dir.dr;
                    const nc = c + i * dir.dc;
                    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
                    if (grid[nr][nc] !== null && grid[nr][nc] !== word[i]) return false;
                }
                return true;
            };

            const placeWord = (word, r, c, dir, grid) => {
                for (let i = 0; i < word.length; i++) {
                    const nr = r + i * dir.dr;
                    const nc = c + i * dir.dc;
                    grid[nr][nc] = word[i];
                }
            };

            // === RENDER GRID ===
            const renderGrid = (grid) => {
                gridElement.innerHTML = '';
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'grid-cell';
                        cell.textContent = grid[r][c];
                        cell.dataset.row = r;
                        cell.dataset.col = c;
                        gridElement.appendChild(cell);
                    }
                }
                attachSelectionEvents();
            };

            // === SELECTION ===
            const attachSelectionEvents = () => {
                gridElement.onmousedown = onSelectStart;
                gridElement.ontouchstart = onSelectStart;
                document.onmouseup = onSelectEnd;
                document.ontouchend = onSelectEnd;
                document.onmousemove = onSelectMove;
                document.ontouchmove = onSelectMove;
            };

            const onSelectStart = (e) => {
                e.preventDefault();
                isSelecting = true;
                clearHighlight();
                const coord = getCoord(e);
                if (coord) {
                    startCoords = coord;
                    selectionCells = [coord];
                    getCell(coord.r, coord.c)?.classList.add('cell-highlight');
                }
            };

            const onSelectMove = (e) => {
                if (!isSelecting || !startCoords) return;
                e.preventDefault();
                const coord = getCoord(e);
                if (!coord) return;
                const path = getPath(startCoords.r, startCoords.c, coord.r, coord.c);
                if (path.length !== selectionCells.length) {
                    clearHighlight();
                    selectionCells = path;
                    path.forEach(p => getCell(p.r, p.c)?.classList.add('cell-highlight'));
                }
            };

            const onSelectEnd = () => {
                if (isSelecting && selectionCells.length >= 2) {
                    checkWord(selectionCells);
                }
                clearHighlight();
                isSelecting = false;
                selectionCells = [];
                startCoords = null;
            };

            const getCoord = (e) => {
                const target = e.touches ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : e.target;
                if (!target?.classList.contains('grid-cell')) return null;
                return { r: +target.dataset.row, c: +target.dataset.col };
            };

            const getPath = (r1, c1, r2, c2) => {
                const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
                const distR = Math.abs(r2 - r1), distC = Math.abs(c2 - c1);
                if ((dr !== 0 && dc !== 0 && distR !== distC) || (dr === 0 && dc === 0)) {
                    return [{ r: r1, c: c1 }];
                }
                const path = [];
                let r = r1, c = c1;
                while (true) {
                    path.push({ r, c });
                    if (r === r2 && c === c2) break;
                    r += dr; c += dc;
                    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
                }
                return path;
            };

            const clearHighlight = () => document.querySelectorAll('.cell-highlight').forEach(el => el.classList.remove('cell-highlight'));

            const checkWord = (path) => {
                const word = path.map(p => getCell(p.r, p.c).textContent).join('');
                const rev = word.split('').reverse().join('');
                if (allWords.includes(word) || allWords.includes(rev)) {
                    const foundWord = allWords.find(w => w === word || w === rev);
                    if (foundWord && !foundWord.solved) {
                        foundWord.solved = true;
                        wordsSolved++;
                        score++;
                        path.forEach(p => {
                            const cell = getCell(p.r, p.c);
                            cell.classList.remove('cell-highlight');
                            cell.classList.add('cell-solved');
                        });
                        updateScore();
                        if (wordsSolved === allWords.length) endGame(true);
                    }
                }
            };

            const updateScore = () => {
                scoreDisplay.textContent = score;
                wordsSolvedDisplay.textContent = `${wordsSolved} / ${allWords.length}`;
            };

            // === END GAME ===
            const endGame = (won) => {
                clearInterval(timerInterval);
                detachEvents();
                const msg = won ? `All ${allWords.length} words found!` : `Time's up! Found ${wordsSolved}/${allWords.length}`;
                showResult(won ? "PUZZLE SOLVED!" : "TIME'S UP!", msg);
            };

            const detachEvents = () => {
                gridElement.onmousedown = gridElement.ontouchstart = null;
                document.onmouseup = document.ontouchend = document.onmousemove = document.ontouchmove = null;
            };

            // === SHARE MODAL ===
            const showResult = (title, msg) => {
                const champ = score > 15 ? '<div class="mt-2 text-2xl font-bold text-yellow-400">YOU ARE A PUZZLE CHAMP!</div>' : '';
                document.getElementById('modal-heading').innerHTML = title + champ;
                document.getElementById('modal-message').textContent = msg;
                document.getElementById('modal-score').textContent = score;
                document.getElementById('modal-solved-words').textContent = wordsSolved;
                document.getElementById('score-modal').classList.remove('hidden');

                const container = document.getElementById('share-container');
                container.innerHTML = '<button disabled class="bg-gray-500 text-white py-2 px-4 rounded">Preparing...</button>';

                setTimeout(() => {
                    const text = `I just CRUSHED ${score} in Soundness Word Puzzle! Built by Angelmykl. Brain on fire. Can YOU beat my score? ${location.href} #WordPuzzle`;
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                    container.innerHTML = `
                        <a href="${url}" target="_blank" class="inline-flex items-center gap-2 bg-[#1DA1F2] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1a8cd8]">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            Share on X
                        </a>`;
                }, 500);
            };

            // === START GAME ===
            window.startGame = () => {
                closeStartModal();
                score = 0; wordsSolved = 0;
                allWords.forEach(w => w.solved = false);
                const grid = generateWordSearch();
                renderGrid(grid);
                updateScore();
                startGameBtn.classList.add('hidden');
                playAgainBtn.classList.remove('hidden');
                startTimer();
            };

            window.resetGame = () => {
                clearInterval(timerInterval);
                hideModal();
                openStartModal();
                startGameBtn.classList.remove('hidden');
                playAgainBtn.classList.add('hidden');
            };

            // === BUTTONS ===
            if (startChallengeBtn) startChallengeBtn.onclick = window.startGame;
            if (startGameBtn) startGameBtn.onclick = window.startGame;
            if (playAgainBtn) playAgainBtn.onclick = window.resetGame;

            // === INIT ===
            wordsSolvedDisplay.textContent = `0 / ${allWords.length}`;
            openStartModal();

        } catch (err) {
            console.error("Game init failed:", err);
        }
    };

    // Wait for DOM + avoid wallet scripts
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initGame, 500));
    } else {
        setTimeout(initGame, 500);
    }
})();

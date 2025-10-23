// Grid configuration
const GRID_SIZE = 17;
const TIME_LIMIT_SECONDS = 210;

// Game State
let timerInterval = null;
let timeRemaining = TIME_LIMIT_SECONDS;
let score = 0;
let wordsSolved = 0;
let isSelecting = false;
let selectionCells = [];
let wordLocations = [];
let solvedCells = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false));
let startCoords = null;

// Elements
const gridElement = document.getElementById('crossword-grid');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const wordsSolvedDisplay = document.getElementById('words-solved-display');
const startGameBtn = document.getElementById('start-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Word List (31 words)
const allWordsBase = [
    "SUCCESSFUL", "PROOF", "SUI", "WALRUS", "LINERA", "LIGERO",
    "BLOCKCHAIN", "ZERO", "KNOWLEDGE", "ZIPPY", "BLU", "BLOOP",
    "WAVA", "ECHO", "GENERATE", "SUBMITTED", "PHAXY", "WENDY",
    "OXY", "KARAOKE", "MOJA", "LUTO",
    "CRYPTOGRAPHY", "VERIFICATION", "LAYER", "DECENTRALIZED",
    "SCALABLE", "DATA", "ROCKY", "MAHDI", "QUANTUM"
].map((w, id) => ({ word: w.toUpperCase(), id: id + 1, solved: false }));

const DIRECTIONS = [
    { dr: 0, dc: 1, name: 'ACROSS' },
    { dr: 0, dc: -1, name: 'ACROSS_REV' },
    { dr: 1, dc: 0, name: 'DOWN' },
    { dr: -1, dc: 0, name: 'DOWN_REV' },
    { dr: 1, dc: 1, name: 'DIAG_DR' },
    { dr: 1, dc: -1, name: 'DIAG_DL' },
    { dr: -1, dc: 1, name: 'DIAG_UR' },
    { dr: -1, dc: -1, name: 'DIAG_UL' }
];

// Utility Functions
function getRandomLetter() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
}

function getCellElement(r, c) {
    return document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
}

function getCoordinates(event) {
    let target;
    if (event.touches) {
        if (event.touches.length === 0) return null;
        const touch = event.touches[0];
        target = document.elementFromPoint(touch.clientX, touch.clientY);
    } else {
        target = event.target.closest('.grid-cell');
    }
    if (!target || !target.classList.contains('grid-cell')) return null;
    const r = parseInt(target.dataset.row);
    const c = parseInt(target.dataset.col);
    if (isNaN(r) || isNaN(c)) return null;
    return { r, c, cell: target };
}

// Modal Functions
function openStartModal() {
    document.getElementById('start-modal').classList.remove('hidden');
}

function closeStartModal() {
    document.getElementById('start-modal').classList.add('hidden');
}

function showModal(heading, message) {
    const averageScore = 15;
    const gameUrl = window.location.href;

    // Add "PUZZLE CHAMP!" only if score > 15
    let champMessage = '';
    if (score > averageScore) {
        champMessage = '<div class="mt-4 text-3xl font-bold text-yellow-500 flex items-center justify-center gap-2">YOU ARE A PUZZLE CHAMP!</div>';
    }

    // Update modal content
    document.getElementById('modal-heading').innerHTML = heading + champMessage;
    document.getElementById('modal-message').innerHTML = message;
    document.getElementById('modal-score').textContent = score;
    document.getElementById('modal-solved-words').textContent = wordsSolved;
    document.getElementById('modal-total-words').textContent = allWordsBase.length;
    document.getElementById('score-modal').classList.remove('hidden');

    const shareContainer = document.getElementById('share-container');
    shareContainer.innerHTML = '<button class="mt-5 bg-[#1DA1F2] text-white font-bold py-3 px-6 rounded-lg opacity-70" disabled>Preparing photo...</button>';

    // TAKE SCREENSHOT
    html2canvas(document.body, { scale: 2, useCORS: true }).then(canvas => {
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'soundness-score.png');

            try {
                // Upload to img1 (free, no key needed)
                const response = await fetch('https://api.imgbb.com/1/upload?key=5e3f7c7d5a6b4c9d8e1f2a3b4c5d6e7f', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    const imageUrl = data.data.url;
                    const tweetText = `I just CRUSHED ${score} in Soundness Word Puzzle! Built by Angelmykl. Brain on fire. Can YOU beat my score? ${gameUrl} #WordPuzzle`;

                    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${imageUrl}`;

                    shareContainer.innerHTML = `
                        <a href="${tweetUrl}" target="_blank" rel="noopener"
                           class="mt-5 inline-flex items-center gap-2 bg-[#1DA1F2] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1a8cd8] transition shadow-md">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            Share on X with Photo!
                        </a>`;
                } else {
                    fallbackShare();
                }
            } catch (err) {
                fallbackShare();
            }
        });
    }).catch(() => {
        fallbackShare();
    });

    function fallbackShare() {
        const tweetText = `I just CRUSHED ${score} in Soundness Word Puzzle! Built by Angelmykl. Brain on fire. Can YOU beat my score? ${gameUrl} #WordPuzzle`;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        shareContainer.innerHTML = `
            <a href="${tweetUrl}" target="_blank" rel="noopener"
               class="mt-5 inline-flex items-center gap-2 bg-[#1DA1F2] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1a8cd8] transition shadow-md">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Share on X (No Photo)
            </a>`;
    }
}

    function openTwitter(text) {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'width=600,height=400');
    }

    shareContainer.appendChild(shareBtn);
}

function hideModal() {
    document.getElementById('score-modal').classList.add('hidden');
}

// Core Game Logic
function startGame() {
    closeStartModal();
    score = 0;
    wordsSolved = 0;
    wordLocations = [];
    allWordsBase.forEach(w => w.solved = false);
    solvedCells = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false));
    const generatedGrid = generateWordSearch(allWordsBase);
    renderGrid(generatedGrid);
    updateScoreDisplay();
    startGameBtn.classList.add('hidden');
    playAgainBtn.classList.remove('hidden');
    startTimer();
}

function resetGame() {
    clearInterval(timerInterval);
    timeRemaining = TIME_LIMIT_SECONDS;
    timerDisplay.textContent = formatTime(TIME_LIMIT_SECONDS);
    score = 0;
    wordsSolved = 0;
    gridElement.innerHTML = '';
    const emptyGridHtml = Array(GRID_SIZE * GRID_SIZE).fill('<div class="grid-cell"></div>').join('');
    gridElement.innerHTML = emptyGridHtml;
    hideModal();
    openStartModal();
    updateScoreDisplay();
}

function updateScoreDisplay() {
    scoreDisplay.textContent = score;
    wordsSolvedDisplay.textContent = `${wordsSolved} / ${allWordsBase.length}`;
}

function endGame(isSolved) {
    clearInterval(timerInterval);
    gridElement.onmousedown = null;
    gridElement.ontouchstart = null;
    document.onmouseup = null;
    document.ontouchend = null;
    document.onmousemove = null;
    document.ontouchmove = null;
    const message = isSolved 
        ? `You found all ${allWordsBase.length} words with ${formatTime(TIME_LIMIT_SECONDS - timeRemaining)} remaining!`
        : `Time ran out! You found ${wordsSolved} of ${allWordsBase.length} words.`;
    const heading = isSolved ? "PUZZLE SOLVED!" : "TIME'S UP!";
    showModal(heading, message);
    startGameBtn.classList.remove('hidden');
    playAgainBtn.classList.add('hidden');
}

// Selection & Checking Logic
function getPath(startR, startC, endR, endC) {
    const dr = Math.sign(endR - startR);
    const dc = Math.sign(endC - startC);
    const dR_abs = Math.abs(endR - startR);
    const dC_abs = Math.abs(endC - startC);
    const isStraight = (dr === 0 && dC_abs >= 0) || 
                       (dc === 0 && dR_abs >= 0) || 
                       (dR_abs === dC_abs);
    let path = [];
    if (isStraight) {
        let r = startR;
        let c = startC;
        while (true) {
            path.push({ r, c });
            if (r === endR && c === endC) break;
            r += dr;
            c += dc;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
        }
    } else {
        path.push({ r: startR, c: startC });
    }
    return path;
}

function onSelectStart(event) {
    if (timerInterval === null) return;
    event.preventDefault();
    isSelecting = true;
    clearHighlight();
    let coords = getCoordinates(event);
    if (coords) {
        startCoords = coords;
        selectionCells = [{ r: coords.r, c: coords.c }];
        getCellElement(coords.r, coords.c)?.classList.add('cell-highlight');
    }
}

function onSelectMove(event) {
    if (!isSelecting || !startCoords) return;
    event.preventDefault();
    let coords = getCoordinates(event);
    if (!coords) return;
    const newPath = getPath(startCoords.r, startCoords.c, coords.r, coords.c);
    if (newPath.length > 0) {
        const lastNew = newPath[newPath.length - 1];
        const lastOld = selectionCells[selectionCells.length - 1] || {};
        if (lastNew.r !== lastOld.r || lastNew.c !== lastOld.c || newPath.length !== selectionCells.length) {
            clearHighlight();
            selectionCells = newPath;
            selectionCells.forEach(coord => {
                if (!getCellElement(coord.r, coord.c).classList.contains('cell-solved')) {
                    getCellElement(coord.r, coord.c)?.classList.add('cell-highlight');
                }
            });
        }
    }
}

function onSelectEnd() {
    if (!isSelecting) return;
    isSelecting = false;
    if (selectionCells.length >= 2) {
        checkSelection(selectionCells);
    }
    clearHighlight();
    selectionCells = [];
    startCoords = null;
}

function clearHighlight() {
    document.querySelectorAll('.grid-cell.cell-highlight').forEach(cell => {
        cell.classList.remove('cell-highlight');
    });
}

function checkSelection(path) {
    const selectedWord = path.map(coord => getCellElement(coord.r, coord.c).textContent).join('');
    const reversedWord = [...selectedWord].reverse().join('');
    let wordFound = allWordsBase.find(w => !w.solved && (w.word === selectedWord || w.word === reversedWord));
    if (wordFound) {
        wordFound.solved = true;
        wordsSolved++;
        score++;
        const correctPath = (wordFound.word === selectedWord) ? path : [...path].reverse();
        correctPath.forEach(coord => {
            const cell = getCellElement(coord.r, coord.c);
            cell.classList.remove('cell-highlight');
            cell.classList.add('cell-solved');
            solvedCells[coord.r][coord.c] = true;
        });
        updateScoreDisplay();
        if (wordsSolved === allWordsBase.length) {
            endGame(true);
        }
    }
}

// Word Search Generation
function attemptPlacement(word, r, c, direction, grid) {
    const len = word.length;
    const { dr, dc } = direction;
    for (let i = 0; i < len; i++) {
        const curR = r + i * dr;
        const curC = c + i * dc;
        if (curR < 0 || curR >= GRID_SIZE || curC < 0 || curC >= GRID_SIZE) return false;
        if (grid[curR][curC] !== null && grid[curR][curC] !== word[i]) return false;
    }
    for (let i = 0; i < len; i++) {
        grid[r + i * dr][c + i * dc] = word[i];
    }
    return true;
}

function generateWordSearch(words) {
    let grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(null));
    wordLocations = [];
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    shuffledWords.forEach(wordData => {
        const word = wordData.word;
        let placed = false;
        let attempts = 0;
        const maxAttempts = GRID_SIZE * GRID_SIZE * DIRECTIONS.length * 3;
        while (!placed && attempts < maxAttempts) {
            attempts++;
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);
            const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            if (attemptPlacement(word, r, c, dir, grid)) {
                placed = true;
                wordLocations.push({
                    ...wordData,
                    startR: r, startC: c,
                    endR: r + (word.length - 1) * dir.dr,
                    endC: c + (word.length - 1) * dir.dc,
                    direction: dir.name
                });
            }
        }
    });
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === null) {
                grid[r][c] = getRandomLetter();
            }
        }
    }
    return grid;
}

// UI Rendering
function renderGrid(grid) {
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
    gridElement.onmousedown = onSelectStart;
    gridElement.ontouchstart = onSelectStart;
    document.onmouseup = onSelectEnd;
    document.ontouchend = onSelectEnd;
    document.onmousemove = onSelectMove;
    document.ontouchmove = onSelectMove;
}

// Timer Logic
function formatTime(seconds) {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

function timerTick() {
    timeRemaining--;
    timerDisplay.textContent = formatTime(timeRemaining);
    if (timeRemaining <= 0) {
        endGame(false);
    } else if (timeRemaining <= 10) {
        timerDisplay.classList.add('animate-pulse', 'text-red-700');
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timeRemaining = TIME_LIMIT_SECONDS;
    timerDisplay.classList.remove('animate-pulse', 'text-red-700');
    timerDisplay.textContent = formatTime(timeRemaining);
    timerInterval = setInterval(timerTick, 1000);
}

// Initialization
window.onload = () => {
    // 1. Set initial display
    wordsSolvedDisplay.textContent = `0 / ${allWordsBase.length}`;
    const emptyGridHtml = Array(GRID_SIZE * GRID_SIZE).fill('<div class="grid-cell"></div>').join('');
    gridElement.innerHTML = emptyGridHtml;

    // 2. Wait for DOM to be fully ready
    setTimeout(() => {
        // 3. Now attach button click
        const startChallengeBtn = document.getElementById('start-challenge-btn');
        if (startChallengeBtn) {
            startChallengeBtn.onclick = () => {
                closeStartModal();
                startGame();
            };
            console.log("Start Challenge button attached!");
        } else {
            console.error("ERROR: #start-challenge-btn NOT FOUND!");
        }

        // 4. Now show modal
        openStartModal();

        // 5. Other buttons
        startGameBtn.onclick = () => {
            closeStartModal();
            startGame();
        };
        playAgainBtn.onclick = resetGame;
    }, 100); // Small delay ensures DOM is ready
};

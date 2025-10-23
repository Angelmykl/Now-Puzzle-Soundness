(() => {
  const SAFE_DELAY = 400;

  const safeInit = () => {
    setTimeout(() => {
      try {
        const byId = id => document.getElementById(id);

        const grid = byId("crossword-grid");
        const timerEl = byId("timer-display");
        const scoreEl = byId("score-display");
        const wordsEl = byId("words-solved-display");
        const startBtn = byId("start-game-btn") || byId("start-challenge-btn");
        const playAgainBtn = byId("play-again-btn");
        const startModal = byId("start-modal");
        const scoreModal = byId("score-modal");
        const shareContainer = byId("share-container");

        if (!grid || !timerEl) return console.error("Missing game elements.");

        // --- CONFIG ---
        const SIZE = 17;
        const TIME = 210; // 3:30
        const WORDS = [
          "SUCCESSFUL","PROOF","SUI","WALRUS","LINERA","LIGERO",
          "BLOCKCHAIN","ZERO","KNOWLEDGE","ZIPPY","BLU","BLOOP",
          "WAVA","ECHO","GENERATE","SUBMITTED","PHAXY","WENDY",
          "OXY","KARAOKE","MOJA","LUTO","CRYPTOGRAPHY","VERIFICATION",
          "LAYER","DECENTRALIZED","SCALABLE","DATA","ROCKY","MAHDI","QUANTUM"
        ];
        const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

        let interval, timeLeft, score, found, selecting, path, gridData;

        // --- HELPERS ---
        const randLetter = () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random()*26)];
        const cell = (r,c) => document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
        const open = el => el?.classList.remove("hidden");
        const close = el => el?.classList.add("hidden");

        // --- TIMER ---
        const startTimer = () => {
          clearInterval(interval);
          timeLeft = TIME;
          timerEl.textContent = fmt(timeLeft);
          interval = setInterval(() => {
            timeLeft--;
            timerEl.textContent = fmt(timeLeft);
            if (timeLeft <= 0) end(false);
          }, 1000);
        };

        // --- BUILD GRID ---
        const canFit = (w,r,c,d,g)=>{
          for(let i=0;i<w.length;i++){
            const nr=r+i*d[0],nc=c+i*d[1];
            if(nr<0||nr>=SIZE||nc<0||nc>=SIZE)return false;
            if(g[nr][nc]&&g[nr][nc]!==w[i])return false;
          } return true;
        };
        const place = (w,r,c,d,g)=>{
          for(let i=0;i<w.length;i++)g[r+i*d[0]][c+i*d[1]]=w[i];
        };
        const build = ()=>{
          const g=Array(SIZE).fill().map(()=>Array(SIZE).fill(null));
          WORDS.forEach(w=>{
            let ok=false,tries=0;
            while(!ok&&tries<1000){
              const r=Math.floor(Math.random()*SIZE);
              const c=Math.floor(Math.random()*SIZE);
              const d=DIRS[Math.floor(Math.random()*DIRS.length)];
              if(canFit(w,r,c,d,g)){place(w,r,c,d,g);ok=true;}
              tries++;
            }
          });
          for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!g[r][c])g[r][c]=randLetter();
          return g;
        };

        // --- RENDER GRID ---
        const render = g=>{
          grid.innerHTML="";
          for(let r=0;r<SIZE;r++){
            for(let c=0;c<SIZE;c++){
              const el=document.createElement("div");
              el.className="grid-cell";
              el.textContent=g[r][c];
              el.dataset.row=r; el.dataset.col=c;
              grid.appendChild(el);
            }
          }
          attachEvents();
        };

        // --- GAME EVENTS ---
        const attachEvents = ()=>{
          grid.onmousedown=grid.ontouchstart=startSel;
          document.onmouseup=document.ontouchend=endSel;
          document.onmousemove=document.ontouchmove=moveSel;
        };
        const startSel=e=>{
          e.preventDefault();
          selecting=true;
          clearHL();
          const p=coord(e);
          if(p){path=[p];cell(p.r,p.c)?.classList.add("cell-highlight");}
        };
        const moveSel=e=>{
          if(!selecting)return;
          e.preventDefault();
          const p=coord(e); if(!p)return;
          const np=getPath(path[0].r,path[0].c,p.r,p.c);
          if(np.length!==path.length){clearHL();path=np;path.forEach(pt=>cell(pt.r,pt.c)?.classList.add("cell-highlight"));}
        };
        const endSel=()=>{
          if(selecting&&path.length>=2)check(path);
          clearHL(); selecting=false; path=[];
        };
        const coord=e=>{
          const t=e.touches?document.elementFromPoint(e.touches[0].clientX,e.touches[0].clientY):e.target;
          if(!t?.classList.contains("grid-cell"))return null;
          return{r:+t.dataset.row,c:+t.dataset.col};
        };
        const getPath=(r1,c1,r2,c2)=>{
          const dr=Math.sign(r2-r1),dc=Math.sign(c2-c1);
          const ar=Math.abs(r2-r1),ac=Math.abs(c2-c1);
          if((dr&&dc&&ar!==ac)||(!dr&&!dc))return[{r:r1,c:c1}];
          const p=[];let r=r1,c=c1;
          while(true){p.push({r,c});if(r===r2&&c===c2)break;r+=dr;c+=dc;
            if(r<0||r>=SIZE||c<0||c>=SIZE)break;}
          return p;
        };
        const clearHL=()=>document.querySelectorAll(".cell-highlight").forEach(el=>el.classList.remove("cell-highlight"));

        // --- CHECK WORD ---
        const check=p=>{
          const w=p.map(pt=>cell(pt.r,pt.c).textContent).join("");
          const rev=w.split("").reverse().join("");
          if(WORDS.includes(w)||WORDS.includes(rev)){
            const word=WORDS.find(x=>x===w||x===rev);
            if(word&&!word.solved){
              word.solved=true; found++; score++;
              p.forEach(pt=>{
                const el=cell(pt.r,pt.c);
                el.classList.remove("cell-highlight");
                el.classList.add("cell-solved");
              });
              update();
              if(found===WORDS.length)end(true);
            }
          }
        };

        const update=()=>{
          scoreEl.textContent=score;
          wordsEl.textContent=`${found} / ${WORDS.length}`;
        };

        // --- END ---
        const end = won=>{
          clearInterval(interval);
          const champ = score > Math.floor(WORDS.length/2)
            ? '<div class="mt-2 text-2xl font-bold text-yellow-400">🏆 YOU ARE A PUZZLE CHAMP! 🏆</div>'
            : "";
          byId("modal-heading").innerHTML=(won?"PUZZLE SOLVED!":"TIME'S UP!") + champ;
          byId("modal-message").textContent = won ? "All words found!" : `Found ${found}/${WORDS.length}`;
          byId("modal-score").textContent = score;
          byId("modal-solved-words").textContent = found;

          // Restore Share on X
          shareContainer.innerHTML = `
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `I just scored ${score} points in the Soundness Puzzle! Think you can beat me? ${location.href} #WordPuzzle`
            )}" target="_blank"
            class="inline-flex items-center gap-2 bg-[#1DA1F2] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1a8cd8]">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </a>
          `;

          open(scoreModal);
        };

        // --- START / RESET ---
        const coreStart = ()=>{
          clearInterval(interval);
          score=found=0;
          WORDS.forEach(w=>w.solved=false);
          gridData=build();
          render(gridData);
          update();
          startTimer();
        };

        const startGame = ()=>{
          close(startModal);
          close(scoreModal);
          coreStart();
        };

        const resetGame = ()=>{
          close(scoreModal);
          coreStart();
        };

        // --- BUTTONS ---
        if (startBtn) startBtn.onclick = startGame;
        if (playAgainBtn) {
          playAgainBtn.onclick = e => {
            e.preventDefault();
            resetGame();
          };
        }

        // --- INIT ---
        wordsEl.textContent = `0 / ${WORDS.length}`;
        timerEl.textContent = fmt(TIME);
        open(startModal);

      } catch (err) {
        console.error("Init error:", err);
      }
    }, SAFE_DELAY);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", safeInit);
  else safeInit();
})();

const socket = io();

// --- STATE ---
let lobbyCode = null;
let isCreator = false;
let myName = sessionStorage.getItem("multi_name") || "";
let currentRound = 0;
let totalRounds = 0;
let currentMedia = null;
let answered = false;
let countdown = null;

// --- DOM ELEMENTS ---
// Views
const viewMenu = document.getElementById("view-menu");
const viewLobby = document.getElementById("view-lobby");
const viewGame = document.getElementById("view-game");
const viewResults = document.getElementById("view-results");

// Menu
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const pseudoPopup = document.getElementById("pseudoPopup");
const pseudoInput = document.getElementById("pseudoInput");
const popupConfirm = document.getElementById("popupConfirm");
const popupCancel = document.getElementById("popupCancel");

// Lobby
const lobbyCodeSpan = document.getElementById("lobbyCode");
const lobbyPlayerList = document.getElementById("lobbyPlayerList");
const roundsInput = document.getElementById("roundsInput");
const timeInput = document.getElementById("timeInput");
const startGameBtn = document.getElementById("startGameBtn");
const leaveLobbyBtn = document.getElementById("leaveLobbyBtn");
const codePopup = document.getElementById("codePopup");
const codeInput = document.getElementById("codeInput");
const codePopupConfirm = document.getElementById("codePopupConfirm");
const codePopupCancel = document.getElementById("codePopupCancel");

// Game
const gamePlayerList = document.getElementById("gamePlayerList");
const mediaContainer = document.getElementById("mediaContainer");
const roundInfo = document.getElementById("roundInfo");
const timerEl = document.getElementById("timer");
const gamePopup = document.getElementById("gamePopup");
const gamePopupText = document.getElementById("gamePopupText");
const gameContinueBtn = document.getElementById("gameContinueBtn");
const btnIA = document.getElementById("btnIA");
const btnHuman = document.getElementById("btnHuman");
const myScoreDisplay = document.getElementById("myScoreDisplay");

// Results
const rankingList = document.getElementById("rankingList");
const backLobbyBtn = document.getElementById("backLobbyBtn");
const homeBtn = document.getElementById("homeBtn");

// --- NAVIGATION ---
function showView(viewId) {
    [viewMenu, viewLobby, viewGame, viewResults].forEach(el => el.style.display = "none");
    document.getElementById(viewId).style.display = "block";

    // Specific view setups
    if (viewId === "view-game") {
        document.querySelector(".main").classList.add("multi");
    } else {
        document.querySelector(".main").classList.remove("multi");
    }
}

// --- MENU LOGIC ---
let currentAction = "";

function showPseudoPopup(action) {
    currentAction = action;
    pseudoInput.value = myName;
    pseudoPopup.classList.add("show");
    pseudoInput.focus();
}

createBtn.addEventListener("click", () => showPseudoPopup("create"));
joinBtn.addEventListener("click", () => showPseudoPopup("join"));

popupCancel.addEventListener("click", () => pseudoPopup.classList.remove("show"));

popupConfirm.addEventListener("click", () => {
    const name = pseudoInput.value.trim();
    if (!name) {
        pseudoInput.style.borderColor = "var(--color-error)";
        return;
    }
    myName = name;
    sessionStorage.setItem("multi_name", myName);
    pseudoPopup.classList.remove("show");

    if (currentAction === "create") {
        createLobby();
    } else {
        codePopup.classList.add("show");
        codeInput.focus();
    }
});

pseudoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") popupConfirm.click();
    pseudoInput.style.borderColor = "";
});

// --- LOBBY LOGIC ---
codePopupCancel.addEventListener("click", () => codePopup.classList.remove("show"));
codePopupConfirm.addEventListener("click", () => {
    const code = codeInput.value.trim().toUpperCase();
    if (code) {
        codePopup.classList.remove("show");
        joinLobby(code);
    } else {
        codeInput.style.borderColor = "var(--color-error)";
    }
});

codeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") codePopupConfirm.click();
    codeInput.style.borderColor = "";
});

function createLobby() {
    socket.emit("createLobby", { name: myName }, (res) => {
        if (res && res.ok) {
            lobbyCode = res.code;
            isCreator = true;
            setupLobbyUI(res);
            showView("view-lobby");
        } else {
            alert(res.error || "Erreur création lobby");
        }
    });
}

function joinLobby(code) {
    socket.emit("joinLobby", { code, name: myName }, (res) => {
        if (res && res.ok) {
            lobbyCode = code;
            isCreator = false;
            setupLobbyUI(res);
            showView("view-lobby");
        } else {
            alert(res.error || "Erreur join lobby");
        }
    });
}

function setupLobbyUI(res) {
    lobbyCodeSpan.textContent = lobbyCode;
    renderPlayers(res.lobby.players);

    if (res.lobby.settings) {
        roundsInput.value = res.lobby.settings.rounds || 10;
        timeInput.value = res.lobby.settings.time || 30;
        document.querySelectorAll("input[name='cat']").forEach(cb => {
            cb.checked = (res.lobby.settings.categories || []).includes(cb.value);
        });
    }
    toggleSettingsControls(isCreator);
}

function toggleSettingsControls(enabled) {
    roundsInput.disabled = !enabled;
    timeInput.disabled = !enabled;
    startGameBtn.disabled = !enabled;
    document.querySelectorAll("input[name='cat']").forEach(cb => cb.disabled = !enabled);
}

function renderPlayers(players) {
    // Render in Lobby
    lobbyPlayerList.innerHTML = "";
    players.forEach(p => {
        const li = document.createElement("li");
        li.className = "player-list-item";
        li.textContent = p.name;
        lobbyPlayerList.appendChild(li);
    });

    // Render in Game (Leaderboard)
    // Sort by score desc
    const sorted = [...players].sort((a, b) => b.score - a.score);
    gamePlayerList.innerHTML = "";
    sorted.forEach(p => {
        const li = document.createElement("li");
        li.className = "player-card";
        if (p.id === socket.id) li.classList.add("is-me");

        const infoDiv = document.createElement("div");
        infoDiv.className = "player-info";

        const nameSpan = document.createElement("span");
        nameSpan.className = "player-name";
        nameSpan.textContent = p.name + (p.id === socket.id ? " (Moi)" : "");

        const scoreSpan = document.createElement("span");
        scoreSpan.className = "player-score";
        scoreSpan.textContent = `${p.score} pts`;

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(scoreSpan);

        const statusSpan = document.createElement("span");
        statusSpan.className = `player-status ${p.answered ? "answered" : ""}`;
        statusSpan.textContent = p.answered ? "A répondu" : "Réfléchit...";

        li.appendChild(infoDiv);
        li.appendChild(statusSpan);
        gamePlayerList.appendChild(li);
    });

    // Update my score display
    const me = players.find(p => p.id === socket.id);
    if (me) {
        myScoreDisplay.textContent = `Mon score : ${me.score} pts`;
    }
}

leaveLobbyBtn.addEventListener("click", () => {
    if (lobbyCode) {
        socket.emit("leaveLobby", { code: lobbyCode }, () => {
            lobbyCode = null;
            showView("view-menu");
        });
    } else {
        showView("view-menu");
    }
});

startGameBtn.addEventListener("click", () => {
    const settings = {
        rounds: parseInt(roundsInput.value) || 10,
        time: parseInt(timeInput.value) || 30,
        categories: Array.from(document.querySelectorAll("input[name='cat']:checked")).map(c => c.value)
    };
    socket.emit("updateSettings", { code: lobbyCode, settings }, (res) => {
        if (res && res.ok) {
            socket.emit("startGame", { code: lobbyCode });
        } else {
            alert(res.error);
        }
    });
});

// --- GAME LOGIC ---
socket.on("gameStarted", (data) => {
    totalRounds = data.totalRounds;
    showView("view-game");
});

socket.on("roundStarted", (data) => {
    currentRound = data.round;
    totalRounds = data.totalRounds;
    currentMedia = data.media;
    answered = false;

    roundInfo.textContent = `Round ${currentRound}/${totalRounds}`;
    mediaContainer.innerHTML = "";

    // Display Media
    if (currentMedia) {
        const ext = currentMedia.src.split(".").pop().toLowerCase();
        if (["jpg", "png", "jpeg", "webp", "avif"].includes(ext)) {
            const img = document.createElement("img");
            img.src = currentMedia.src;
            img.className = "media-display";
            mediaContainer.appendChild(img);
        } else if (ext === "mp4" || ext === "webm") {
            const vid = document.createElement("video");
            vid.src = currentMedia.src;
            vid.controls = true;
            vid.autoplay = true;
            vid.loop = true;
            vid.className = "media-display";
            mediaContainer.appendChild(vid);
        } else if (ext === "mp3") {
            const aud = document.createElement("audio");
            aud.src = currentMedia.src;
            aud.controls = true;
            mediaContainer.appendChild(aud);
        }
    }

    // Timer
    let t = data.time;
    timerEl.textContent = `Temps restant : ${t}s`;
    if (countdown) clearInterval(countdown);
    countdown = setInterval(() => {
        t--;
        timerEl.textContent = `Temps restant : ${t}s`;
        if (t <= 0) clearInterval(countdown);
    }, 1000);

    gamePopup.classList.remove("show");
});

socket.on("roundEnded", (data) => {
    if (!answered) {
        gamePopupText.textContent = "Temps écoulé !";
        gamePopup.classList.add("show");
    }
});

gameContinueBtn.addEventListener("click", () => {
    gamePopup.classList.remove("show");
});

function sendAnswer(isAI) {
    if (answered) return;
    const correct = (isAI === currentMedia.isAI);
    gamePopupText.textContent = correct ? "Bonne réponse !" : "Mauvaise réponse...";
    gamePopup.classList.add("show");

    socket.emit("playerAnswer", { code: lobbyCode, answer: isAI }, (res) => {
        if (res && res.error) alert(res.error);
        else answered = true;
    });
}

btnIA.addEventListener("click", () => sendAnswer(true));
btnHuman.addEventListener("click", () => sendAnswer(false));

// --- RESULTS LOGIC ---
socket.on("gameEnded", (data) => {
    renderRanking(data.ranking);
    showView("view-results");
});

function renderRanking(ranking) {
    rankingList.innerHTML = "";
    ranking.forEach(p => {
        const li = document.createElement("li");
        li.textContent = `${p.name} — ${p.score} pts`;
        rankingList.appendChild(li);
    });
}

backLobbyBtn.addEventListener("click", () => {
    // Return to lobby view
    // Server resets state to 'lobby' automatically
    showView("view-lobby");
});

homeBtn.addEventListener("click", () => {
    if (lobbyCode) {
        socket.emit("leaveLobby", { code: lobbyCode });
    }
    window.location.href = "home.html";
});

// --- GLOBAL SOCKET EVENTS ---
socket.on("playerListUpdate", (players) => {
    renderPlayers(players);
});

socket.on("settingsUpdated", (settings) => {
    roundsInput.value = settings.rounds;
    timeInput.value = settings.time;
    document.querySelectorAll("input[name='cat']").forEach(cb => {
        cb.checked = (settings.categories || []).includes(cb.value);
    });
});

socket.on("creatorChanged", ({ newCreator }) => {
    if (socket.id === newCreator) {
        isCreator = true;
        toggleSettingsControls(true);
    }
});

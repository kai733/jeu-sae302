const socket = io();
const name = sessionStorage.getItem("multi_name") || "Joueur" + Math.floor(Math.random() * 99);
const isCreator = sessionStorage.getItem("multi_isCreator") === "1";
const params = new URLSearchParams(location.search);
const action = params.get("action"); // pas de valeur par défaut pour l'instant

let lobbyCode = sessionStorage.getItem("multi_lobbyCode"); // on récupère le code sauvegardé

const lobbyCodeSpan = document.getElementById("lobbyCode");
const playerListEl = document.getElementById("playerList");
const roundsInput = document.getElementById("roundsInput");
const timeInput = document.getElementById("timeInput");
const startGameBtn = document.getElementById("startGameBtn");

// Popups
const codePopup = document.getElementById("codePopup");
const codeInput = document.getElementById("codeInput");
const codePopupConfirm = document.getElementById("codePopupConfirm");
const codePopupCancel = document.getElementById("codePopupCancel");

const messagePopup = document.getElementById("messagePopup");
const messagePopupTitle = document.getElementById("messagePopupTitle");
const messagePopupText = document.getElementById("messagePopupText");
const messagePopupOk = document.getElementById("messagePopupOk");

let messageCallback = null;

function showMessage(msg, title = "Information", callback = null) {
  messagePopupTitle.textContent = title;
  messagePopupText.textContent = msg;
  messageCallback = callback;
  messagePopup.classList.add("show");
}

function hideMessage() {
  messagePopup.classList.remove("show");
  if (messageCallback) {
    messageCallback();
    messageCallback = null;
  }
}

messagePopupOk.addEventListener("click", hideMessage);

function showCodePopup() {
  codeInput.value = "";
  codePopup.classList.add("show");
  codeInput.focus();
}

function hideCodePopup() {
  codePopup.classList.remove("show");
}

codePopupCancel.addEventListener("click", () => {
  hideCodePopup();
  window.location.href = "multi.html";
});

codePopupConfirm.addEventListener("click", () => {
  const code = codeInput.value.trim().toUpperCase();
  if (!code) {
    codeInput.style.borderColor = "var(--color-error)";
    return;
  }

  hideCodePopup();
  joinLobby(code);
});

// Validation avec Entrée
codeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") codePopupConfirm.click();
  codeInput.style.borderColor = "";
});


function toggleSettingsControls(enabled) {
  roundsInput.disabled = !enabled;
  timeInput.disabled = !enabled;
  document.querySelectorAll("input[name='cat']").forEach(cb => cb.disabled = !enabled);
  startGameBtn.disabled = !enabled;
}

function renderPlayers(players) {
  playerListEl.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name + " — " + p.score + " pts";
    playerListEl.appendChild(li);
  });
}

function initLobby(res) {
  lobbyCodeSpan.textContent = lobbyCode;
  renderPlayers(res.lobby.players);

  if (res.lobby.settings) {
    roundsInput.value = res.lobby.settings.rounds || 10;
    timeInput.value = res.lobby.settings.time || 30;
    document.querySelectorAll("input[name='cat']").forEach(cb => {
      cb.checked = (res.lobby.settings.categories || []).includes(cb.value);
    });
  }

  // si on est créateur, on active les contrôles
  toggleSettingsControls(isCreator);
}

function joinLobby(code) {
  lobbyCode = code;
  socket.emit("joinLobby", { code: lobbyCode, name }, (res) => {
    if (res && res.ok) {
      sessionStorage.setItem("multi_lobbyCode", lobbyCode);
      initLobby(res);
      toggleSettingsControls(false);
    } else {
      showMessage(res.error || "Erreur join lobby", "Erreur", () => {
        location.href = "multi.html";
      });
    }
  });
}

if (action === "create") {
  socket.emit("createLobby", { name }, (res) => {
    if (res && res.ok) {
      lobbyCode = res.code;
      sessionStorage.setItem("multi_lobbyCode", lobbyCode);
      initLobby(res);
      toggleSettingsControls(true);
    } else {
      showMessage(res.error || "Erreur création lobby", "Erreur", () => {
        location.href = "multi.html";
      });
    }
  });
} else if (action === "join") {
  // Affiche le popup pour demander le code
  showCodePopup();
} else if (lobbyCode) {
  // reconnexion implicite (retour au lobby)
  socket.emit("rejoinLobby", { code: lobbyCode, name }, (res) => {
    if (res && res.ok) {
      initLobby(res);
      toggleSettingsControls(isCreator);
    } else {
      showMessage("Impossible de rejoindre le lobby (peut-être expiré).", "Erreur", () => {
        sessionStorage.removeItem("multi_lobbyCode");
        location.href = "multi.html";
      });
    }
  });
} else {
  // pas d'action et pas de code -> retour au début
  location.href = "multi.html";
}

startGameBtn.addEventListener("click", () => {
  if (!lobbyCode) return;

  const categories = Array.from(document.querySelectorAll("input[name='cat']:checked"))
    .map(c => c.value);
  const settings = {
    rounds: parseInt(roundsInput.value) || 10,
    time: parseInt(timeInput.value) || 30,
    categories
  };

  socket.emit("updateSettings", { code: lobbyCode, settings }, (res) => {
    if (!res || !res.ok) { showMessage(res.error || "Erreur mise à jour", "Erreur"); return; }

    socket.emit("startGame", { code: lobbyCode }, (res2) => {
      if (!res2 || !res2.ok) { showMessage(res2.error || "Erreur start", "Erreur"); return; }
      // la partie a commencé, le listener va rediriger
    });
  });
});

document.getElementById("leaveBtn").addEventListener("click", () => {
  if (lobbyCode) {
    // on attend que le serveur confirme le départ avant de rediriger
    socket.emit("leaveLobby", { code: lobbyCode }, () => {
      sessionStorage.removeItem("multi_isCreator");
      sessionStorage.removeItem("multi_lobbyCode");
      window.location.href = "multi.html";
    });
  } else {
    sessionStorage.removeItem("multi_isCreator");
    sessionStorage.removeItem("multi_lobbyCode");
    window.location.href = "multi.html";
  }
});

// les écouteurs socket
socket.on("playerListUpdate", renderPlayers);

socket.on("settingsUpdated", (settings) => {
  roundsInput.value = settings.rounds;
  timeInput.value = settings.time;
  document.querySelectorAll("input[name='cat']").forEach(cb => {
    cb.checked = (settings.categories || []).includes(cb.value);
  });
});

socket.on("creatorChanged", ({ newCreator }) => {
  if (socket.id === newCreator) {
    sessionStorage.setItem("multi_isCreator", "1");
    toggleSettingsControls(true);
  }
});

socket.on("gameStarted", () => {
  window.location.href = "multi-game.html";
});
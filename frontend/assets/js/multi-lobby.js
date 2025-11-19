const socket = io();
const name = sessionStorage.getItem("multi_name") || "Joueur" + Math.floor(Math.random() * 99);
const isCreator = sessionStorage.getItem("multi_isCreator") === "1";
const params = new URLSearchParams(location.search);
const action = params.get("action"); // Don't default here yet

let lobbyCode = sessionStorage.getItem("multi_lobbyCode"); // Get saved code

const lobbyCodeSpan = document.getElementById("lobbyCode");
const playerListEl = document.getElementById("playerList");
const roundsInput = document.getElementById("roundsInput");
const timeInput = document.getElementById("timeInput");
const startGameBtn = document.getElementById("startGameBtn");

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
    roundsInput.value = res.lobby.settings.rounds || 5;
    timeInput.value = res.lobby.settings.time || 15;
    document.querySelectorAll("input[name='cat']").forEach(cb => {
      cb.checked = (res.lobby.settings.categories || []).includes(cb.value);
    });
  }

  // If we are creator, enable controls
  toggleSettingsControls(isCreator);
}

if (action === "create") {
  socket.emit("createLobby", { name }, (res) => {
    if (res && res.ok) {
      lobbyCode = res.code;
      sessionStorage.setItem("multi_lobbyCode", lobbyCode);
      initLobby(res);
      toggleSettingsControls(true);
    } else {
      alert(res.error || "Erreur création lobby");
      location.href = "multi.html";
    }
  });
} else if (action === "join") {
  // join flow
  const code = prompt("Entrez le code du lobby :");
  if (!code) {
    alert("Code requis");
    location.href = "multi.html";
  } else {
    lobbyCode = code.toUpperCase();
    socket.emit("joinLobby", { code: lobbyCode, name }, (res) => {
      if (res && res.ok) {
        sessionStorage.setItem("multi_lobbyCode", lobbyCode);
        initLobby(res);
        toggleSettingsControls(false);
      } else {
        alert(res.error || "Erreur join lobby");
        location.href = "multi.html";
      }
    });
  }
} else if (lobbyCode) {
  // Implicit rejoin (Back to Lobby)
  socket.emit("rejoinLobby", { code: lobbyCode, name }, (res) => {
    if (res && res.ok) {
      initLobby(res);
      toggleSettingsControls(isCreator);
    } else {
      alert("Impossible de rejoindre le lobby (peut-être expiré).");
      sessionStorage.removeItem("multi_lobbyCode");
      location.href = "multi.html";
    }
  });
} else {
  // No action and no code -> go back to start
  location.href = "multi.html";
}

startGameBtn.addEventListener("click", () => {
  if (!lobbyCode) return;

  const categories = Array.from(document.querySelectorAll("input[name='cat']:checked"))
    .map(c => c.value);
  const settings = {
    rounds: parseInt(roundsInput.value) || 5,
    time: parseInt(timeInput.value) || 15,
    categories
  };

  socket.emit("updateSettings", { code: lobbyCode, settings }, (res) => {
    if (!res || !res.ok) { alert(res.error || "Erreur mise à jour"); return; }

    socket.emit("startGame", { code: lobbyCode }, (res2) => {
      if (!res2 || !res2.ok) { alert(res2.error || "Erreur start"); return; }
      // Game started, listener will redirect
    });
  });
});

document.getElementById("leaveBtn").addEventListener("click", () => {
  if (lobbyCode) {
    // Wait for server to acknowledge leave before redirecting
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

// socket listeners
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
const socket = io();
const lobbyCode = sessionStorage.getItem("multi_lobbyCode");
const name =
  sessionStorage.getItem("multi_name") ||
  "J" + Math.floor(Math.random() * 99);
if (!lobbyCode) {
  alert("Pas de lobby défini");
  location.href = "multi.html";
}

// Rejoin sans doublon
socket.emit("rejoinLobby", { code: lobbyCode, name, oldId: socket.id });

const playerListEl = document.getElementById("playerList");
const mediaContainer = document.getElementById("mediaContainer");
const roundInfo = document.getElementById("roundInfo");
const timerEl = document.getElementById("timer");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const continueBtn = document.getElementById("continueBtn");
const btnIA = document.getElementById("btnIA");
const btnHuman = document.getElementById("btnHuman");

let currentRound = 0;
let totalRounds = 0;
let currentMedia = null;
let answered = false;
let countdown = null;

const myScoreDisplay = document.getElementById("myScoreDisplay");

function renderPlayers(players) {
  // Find me using socket.id which is unique and current
  const me = players.find(p => p.id === socket.id);
  if (me) {
    myScoreDisplay.textContent = `${me.name} : ${me.score} pts`;
  }
}

function onRoundStarted(data) {
  currentRound = data.round;
  totalRounds = data.totalRounds;
  currentMedia = data.media;
  answered = false;
  roundInfo.textContent = `Round ${currentRound}/${totalRounds}`;

  mediaContainer.innerHTML = "";
  timerEl.textContent = `Temps restant : ${data.time}s`;

  // Hide popup if open
  popup.classList.remove("show");

  if (!currentMedia) return;

  // Insert media
  const ext = currentMedia.src.split(".").pop().toLowerCase();
  if (["jpg", "png", "jpeg"].includes(ext)) {
    const img = document.createElement("img");
    img.src = currentMedia.src;
    img.className = "media-display";
    mediaContainer.appendChild(img);
  } else if (ext === "mp4") {
    const vid = document.createElement("video");
    vid.src = currentMedia.src;
    vid.controls = true;
    vid.className = "media-display";
    mediaContainer.appendChild(vid);
  } else if (ext === "mp3") {
    const aud = document.createElement("audio");
    aud.src = currentMedia.src;
    aud.controls = true;
    mediaContainer.appendChild(aud);
  }

  // Local countdown
  let t = data.time;
  clearInterval(countdown);
  countdown = setInterval(() => {
    t--;
    timerEl.textContent = `Temps restant : ${t}s`;
    if (t <= 0) clearInterval(countdown);
  }, 1000);
}

socket.on("playerListUpdate", renderPlayers);

socket.on("roundStarted", onRoundStarted);

socket.on("roundEnded", (data) => {
  // If we haven't answered, show "Temps écoulé"
  if (!answered) {
    popupText.textContent = "Temps écoulé !";
    popup.classList.add("show");
  }
});

socket.on("gameEnded", (data) => {
  sessionStorage.setItem("multi_results", JSON.stringify(data.ranking));
  window.location.href = "multi-results.html";
});

continueBtn.addEventListener("click", () =>
  popup.classList.remove("show")
);

function sendAnswer(ans) {
  if (answered) return;

  // Immediate feedback
  const isCorrect = (ans === currentMedia.isAI);
  popupText.textContent = isCorrect ? "Bonne réponse !" : "Mauvaise réponse...";
  popup.classList.add("show");

  socket.emit("playerAnswer", { code: lobbyCode, answer: ans }, (res) => {
    if (res && res.error) alert(res.error);
    else answered = true;
  });
}

btnIA.addEventListener("click", () => sendAnswer(true));
btnHuman.addEventListener("click", () => sendAnswer(false));

// Initial fetch in case we missed the event
socket.emit("getCurrentRound", { code: lobbyCode }, (res) => {
  if (res && res.roundData && res.roundData.media) {
    onRoundStarted(res.roundData);
  }
});

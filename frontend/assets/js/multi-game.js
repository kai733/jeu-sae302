const socket = io(); // Connexion Socket.io

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Récupération des infos du lobby
  const username = localStorage.getItem("multi_username") || "Joueur";
  const lobbyCode = localStorage.getItem("multi_lobbyCode") || "XXXXXX";
  const timePerRound = parseInt(localStorage.getItem("multi_timePerRound")) || 30;
  const scoresList = document.getElementById("scoresList");
  const roundInfo = document.getElementById("roundInfo");
  const mediaImage = document.getElementById("mediaImage");
  const popup = document.getElementById("popup");
  const popupText = document.getElementById("popupText");
  const nextBtn = document.getElementById("nextBtn");
  const timerEl = document.getElementById("timer");

  let currentMedia = null;
  let timerInterval = null;
  let answered = false;

  // Rejoindre le lobby
  socket.emit("joinLobby", { code: lobbyCode, username }, (res) => {
    if (res.error) {
      alert(res.error);
      window.location.href = "multi.html";
    }
  });

  // Recevoir le début de la partie
  socket.on("gameStarted", (params) => {
    console.log("La partie commence !", params);
    nextRound();
  });

  // Mettre à jour les scores
  socket.on("updateScores", (players) => {
    scoresList.innerHTML = "";
    players.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.username} : ${p.score}`;
      scoresList.appendChild(li);
    });
  });

  // TEMPORAIRE : médias simulés
  const testMedia = [
    { src: "assets/img/test1.jpg", isAI: true },
    { src: "assets/img/test2.jpg", isAI: false },
    { src: "assets/img/test3.jpg", isAI: true },
    { src: "assets/img/test4.jpg", isAI: false }
  ];

  function nextRound() {
    answered = false;
    currentMedia = testMedia[Math.floor(Math.random() * testMedia.length)];
    mediaImage.src = currentMedia.src;
    roundInfo.textContent = "Round en cours";

    let timeLeft = timePerRound;
    timerEl.textContent = timeLeft;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (!answered) submitAnswer(false);
      }
    }, 1000);
  }

  function submitAnswer(playerChoice) {
    answered = true;
    clearInterval(timerInterval);
    const correct = playerChoice === currentMedia.isAI;
    popupText.textContent = correct ? "Bonne réponse !" : "Mauvaise réponse...";
    popup.classList.remove("hidden");

    socket.emit("submitAnswer", { code: lobbyCode, playerId: socket.id, correct });
  }

  document.getElementById("btnIA").addEventListener("click", () => submitAnswer(true));
  document.getElementById("btnHuman").addEventListener("click", () => submitAnswer(false));

  nextBtn.addEventListener("click", () => {
    popup.classList.add("hidden");
    nextRound();
  });
});

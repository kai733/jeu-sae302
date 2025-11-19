document.addEventListener("DOMContentLoaded", () => {
  const roundInfo = document.getElementById("roundInfo");
  const mediaContainer = document.getElementById("mediaContainer");
  const popup = document.getElementById("popup");
  const popupText = document.getElementById("popupText");
  const nextBtn = document.getElementById("nextBtn");
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Paramètres
  const mediaTypes = JSON.parse(localStorage.getItem("solo_mediaTypes")) || ["photos"];
  const totalRounds = parseInt(localStorage.getItem("solo_roundCount") || 2);

  let allMedia = [];
  let currentRound = 1;
  let score = 0;
  let currentMedia = null;

  // ► Charger les médias depuis le serveur
  async function loadMedia() {
    allMedia = [];
    for (const type of mediaTypes) {
      try {
        const res = await fetch(`/api/solo-media?type=${type}&limit=${totalRounds}`);
        const data = await res.json();
        allMedia = allMedia.concat(data);
      } catch (err) {
        console.error("Erreur fetch média :", err);
      }
    }

    if (allMedia.length === 0) {
      mediaContainer.innerHTML = "<p>Aucun média disponible pour ces types.</p>";
      return;
    }

    shuffleArray(allMedia);
    loadRound();
  }

  // ► Mélanger un tableau
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ► Charger un round
  function loadRound() {
    roundInfo.textContent = `Round ${currentRound}/${totalRounds}`;

    // Choisir un média aléatoire
    currentMedia = allMedia[Math.floor(Math.random() * allMedia.length)];

    // Vider l'ancien média
    mediaContainer.innerHTML = "";

    // Créer l'élément selon le type
    const ext = currentMedia.src.split(".").pop().toLowerCase();
    if (ext === "jpg" || ext === "png") {
      const img = document.createElement("img");
      img.src = currentMedia.src;
      img.alt = "Média";
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
    } else {
      mediaContainer.innerHTML = "<p>Type de média non supporté</p>";
    }
  }

  // ► Vérifier la réponse
  function checkAnswer(playerChoice) {
    const good = playerChoice === currentMedia.isAI;
    popupText.textContent = good ? "Bonne réponse !" : "Mauvaise réponse...";
    if (good) score++;
    popup.classList.add("show");
  }

  document.getElementById("btnIA").addEventListener("click", () => checkAnswer(true));
  document.getElementById("btnHuman").addEventListener("click", () => checkAnswer(false));

  // ► Passer au round suivant
  nextBtn.addEventListener("click", () => {
    popup.classList.remove("show");
    currentRound++;
    if (currentRound > totalRounds) {
      // Fin de partie
      localStorage.setItem("solo_finalScore", score);
      localStorage.setItem("solo_totalRounds", totalRounds);
      window.location.href = "solo-results.html";
      return;
    }
    loadRound();
  });

  loadMedia();
});
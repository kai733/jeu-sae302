document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const form = document.getElementById("createLobbyForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    if (!username) {
      alert("Veuillez entrer un nom d'utilisateur.");
      return;
    }

    // génère un code de lobby 
    const lobbyCode = Math.random().toString(36).substr(2, 6).toUpperCase();

    // stockage temporaire
    localStorage.setItem("multi_username", username);
    localStorage.setItem("multi_lobbyCode", lobbyCode);
    localStorage.setItem("multi_isCreator", "true");

    // 
    window.location.href = "multi-lobby.html";
  });
});

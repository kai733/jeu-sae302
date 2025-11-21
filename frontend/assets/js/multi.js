const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const popup = document.getElementById("pseudoPopup");
const popupTitle = document.getElementById("popupTitle");
const pseudoInput = document.getElementById("pseudoInput");
const popupConfirm = document.getElementById("popupConfirm");
const popupCancel = document.getElementById("popupCancel");

let currentAction = ""; // "create" ou "join"

function showPopup(action) {
    currentAction = action;
    pseudoInput.value = "";
    popup.classList.add("show");
    pseudoInput.focus();
}

function hidePopup() {
    popup.classList.remove("show");
    currentAction = "";
}

createBtn.addEventListener("click", () => {
    showPopup("create");
});

joinBtn.addEventListener("click", () => {
    showPopup("join");
});

popupCancel.addEventListener("click", hidePopup);

popupConfirm.addEventListener("click", () => {
    const name = pseudoInput.value.trim();
    if (!name) {
        // On peut ajouter une petite animation ou bordure rouge ici
        pseudoInput.style.borderColor = "var(--color-error)";
        return;
    }

    sessionStorage.setItem("multi_name", name);

    if (currentAction === "create") {
        sessionStorage.setItem("multi_isCreator", "1");
        window.location.href = "multi-lobby.html?action=create";
    } else {
        sessionStorage.setItem("multi_isCreator", "0");
        window.location.href = "multi-lobby.html?action=join";
    }
});

// Permettre de valider avec Entrée
pseudoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        popupConfirm.click();
    }
    // Reset border color on input
    pseudoInput.style.borderColor = "";
});


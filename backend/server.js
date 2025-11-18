// backend/server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());

// === Static files ===
// frontend folder (one level up from backend)
app.use(express.static(path.join(__dirname, "..", "frontend")));
// media folder (one level up)
app.use("/media", express.static(path.join(__dirname, "..", "media")));

// === Open SQLite DB (db.sqlite located in backend/) ===
const db = await open({
  filename: path.join(__dirname, "db.sqlite"),
  driver: sqlite3.Database
});

// Ensure media table exists (safe to call every start)
await db.exec(`
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  isAI INTEGER NOT NULL
);
`);

// --- Solo API (existing) ---
app.get("/api/solo-media", async (req, res) => {
  const { type, limit } = req.query;
  if (!type) return res.status(400).json({ error: "Missing type" });

  try {
    const rows = await db.all(
      "SELECT * FROM media WHERE type = ? ORDER BY RANDOM() LIMIT ?",
      [type, limit || 10]
    );

    const result = rows.map(m => ({
      id: m.id,
      isAI: Boolean(m.isAI),
      src: "/" + m.path.replace(/\\/g, "/")
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur BDD:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Default route -> serve home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "home.html"));
});

/* ===========================
   SOCKET.IO MULTIPLAYER LOGIC
   ===========================
   - In-memory lobbies
   - Events:
     createLobby, joinLobby, updateSettings, startGame,
     playerAnswer, disconnect
*/
const lobbies = {}; // { code: { creator, players:[], settings, mediaList, currentRound, roundTimer } }

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function getMediaByType(type, limit = 10) {
  const rows = await db.all(
    "SELECT * FROM media WHERE type = ? ORDER BY RANDOM() LIMIT ?",
    [type, limit]
  );
  return rows.map(r => ({ id: r.id, src: "/" + r.path.replace(/\\/g, "/"), isAI: r.isAI === 1 }));
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Create lobby
  socket.on("createLobby", ({ name }, cb) => {
    if (!name) return cb && cb({ error: "Name required" });
    let code = makeCode();
    while (lobbies[code]) code = makeCode();

    const settings = { rounds: 5, time: 15, categories: ["photos"] };
    lobbies[code] = {
      creator: socket.id,
      players: [{ id: socket.id, name, score: 0, answered: false }],
      settings,
      mediaList: [],
      currentRound: 0,
      roundTimer: null
    };

    socket.join(code);
    cb && cb({ ok: true, code, lobby: { players: lobbies[code].players, settings }});
    io.to(code).emit("playerListUpdate", lobbies[code].players);
    console.log(`Lobby ${code} created by ${name}`);
  });

  // Join lobby
  socket.on("joinLobby", ({ code, name }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby inexistant" });
    if (lobby.players.length >= 10) return cb && cb({ error: "Lobby plein" });

    // prevent duplicate names in the same lobby (optional)
    if (lobby.players.some(p => p.name === name)) {
      // append small suffix
      let suffix = 2;
      let newName = name + "#" + suffix;
      while (lobby.players.some(p => p.name === newName)) {
        suffix++;
        newName = name + "#" + suffix;
      }
      name = newName;
    }

    lobby.players.push({ id: socket.id, name, score: 0, answered: false });
    socket.join(code);
    io.to(code).emit("playerListUpdate", lobby.players);
    cb && cb({ ok: true, lobby: { players: lobby.players, settings: lobby.settings }});
    console.log(`${name} joined lobby ${code}`);
  });

  // Update settings (only creator)
  socket.on("updateSettings", ({ code, settings }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby inexistant" });
    if (socket.id !== lobby.creator) return cb && cb({ error: "Pas autorisé" });

    const rounds = Math.max(1, parseInt(settings.rounds) || 5);
    const time = Math.max(5, parseInt(settings.time) || 15);
    const categories = Array.isArray(settings.categories) ? settings.categories : [settings.categories];
    lobby.settings = { rounds, time, categories };
    io.to(code).emit("settingsUpdated", lobby.settings);
    cb && cb({ ok: true });
    console.log(`Lobby ${code} settings updated by creator`);
  });

  // Start game (only creator)
  socket.on("startGame", async ({ code }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby inexistant" });
    if (socket.id !== lobby.creator) return cb && cb({ error: "Pas autorisé" });

    // Build media list from categories
    let pool = [];
    for (const cat of lobby.settings.categories) {
      const arr = await getMediaByType(cat, lobby.settings.rounds);
      pool = pool.concat(arr);
    }
    if (pool.length < lobby.settings.rounds) {
      return cb && cb({ error: "Pas assez de médias pour ces catégories" });
    }
    shuffle(pool);
    lobby.mediaList = pool.slice(0, lobby.settings.rounds);
    lobby.currentRound = 0;
    lobby.players.forEach(p => { p.score = 0; p.answered = false; });

    io.to(code).emit("gameStarted", { totalRounds: lobby.settings.rounds });
    startNextRound(code);
    cb && cb({ ok: true });
    console.log(`Game started in lobby ${code}`);
  });

  // Player answer
  socket.on("playerAnswer", ({ code, answer }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby inexistant" });
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return cb && cb({ error: "Joueur non trouvé" });
    if (player.answered) return cb && cb({ error: "Déjà répondu" });

    const current = lobby.mediaList[lobby.currentRound - 1];
    if (!current) return cb && cb({ error: "Round non démarré" });

    const correct = (answer === current.isAI);
    if (correct) player.score++;
    player.answered = true;

    // private confirmation
    socket.emit("answerResult", { correct, score: player.score });
    // broadcast scores
    io.to(code).emit("playerListUpdate", lobby.players);

    // if all answered -> end round early
    if (lobby.players.every(p => p.answered)) endRound(code);

    cb && cb({ ok: true });
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    for (const code of Object.keys(lobbies)) {
      const lobby = lobbies[code];
      const idx = lobby.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const left = lobby.players.splice(idx, 1)[0];
        io.to(code).emit("playerListUpdate", lobby.players);
        // clear timers and cleanup if needed
        if (lobby.players.length === 0) {
          if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
          delete lobbies[code];
          console.log(`Lobby ${code} removed (empty)`);
        } else if (lobby.creator === socket.id) {
          // assign new creator
          lobby.creator = lobby.players[0].id;
          io.to(code).emit("creatorChanged", { newCreator: lobby.creator });
          console.log(`Creator left in ${code}, new creator assigned`);
        }
        console.log(`${left.name} disconnected from ${code}`);
      }
    }
  });

  // helper functions inside connection scope
  function clearLobbyTimer(lobby) {
    if (lobby.roundTimer) {
      clearTimeout(lobby.roundTimer);
      lobby.roundTimer = null;
    }
  }

  function startNextRound(code) {
    const lobby = lobbies[code];
    if (!lobby) return;
    lobby.currentRound++;
    if (lobby.currentRound > lobby.settings.rounds) {
      // game ended
      const ranking = lobby.players
        .slice()
        .sort((a,b) => b.score - a.score)
        .map(p => ({ name: p.name, score: p.score }));
      io.to(code).emit("gameEnded", { ranking });
      return;
    }

    lobby.players.forEach(p => p.answered = false);
    const media = lobby.mediaList[lobby.currentRound - 1];
    io.to(code).emit("roundStarted", {
      round: lobby.currentRound,
      totalRounds: lobby.settings.rounds,
      media: { id: media.id, src: media.src },
      time: lobby.settings.time
    });

    clearLobbyTimer(lobby);
    lobby.roundTimer = setTimeout(() => {
      endRound(code);
    }, lobby.settings.time * 1000);
  }

  function endRound(code) {
    const lobby = lobbies[code];
    if (!lobby) return;
    clearLobbyTimer(lobby);

    const current = lobby.mediaList[lobby.currentRound - 1];
    const perPlayer = lobby.players.map(p => ({ id: p.id, name: p.name, score: p.score, answered: p.answered }));
    io.to(code).emit("roundEnded", { round: lobby.currentRound, perPlayer });

    setTimeout(() => {
      startNextRound(code);
    }, 1500);
  }

}); // end io.on connection

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

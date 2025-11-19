// backend/server.js
import express from "express";
import http from "http";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// --- DIR ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Serve frontend ---
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/media", express.static(path.join(__dirname, "..", "media")));
app.use(express.json());

// --- SQLite ---
const db = await open({
  filename: path.join(__dirname, "db.sqlite"),
  driver: sqlite3.Database,
});

// --- API solo ---
app.get("/api/solo-media", async (req, res) => {
  const { type, limit } = req.query;
  if (!type) return res.status(400).json({ error: "Missing type" });

  try {
    const rows = await db.all(
      "SELECT * FROM media WHERE type = ? ORDER BY RANDOM() LIMIT ?",
      [type, limit || 10]
    );

    res.json(
      rows.map((m) => ({
        id: m.id,
        isAI: Boolean(m.isAI),
        src: "/" + m.path.replace(/\\/g, "/"),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "DB error" });
  }
});

// --- Home ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "home.html"));
});

// =========================
// === MULTI LOGIC ========
// =========================

const lobbies = {};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++)
    c += chars[Math.floor(Math.random() * chars.length)];
  return c;
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
  return rows.map((r) => ({
    id: r.id,
    src: "/" + r.path.replace(/\\/g, "/"),
    isAI: r.isAI === 1,
  }));
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // --- Create lobby ---
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
      state: "lobby", // Initialize state
      roundTimer: null,
      _purgeTimer: null,
    };

    const lobby = lobbies[code];
    socket.join(code);

    cb && cb({ ok: true, code, lobby: { players: lobby.players, settings } });
    io.to(code).emit("playerListUpdate", lobby.players);

    console.log(`Lobby ${code} created by ${name}`);
  });

  // --- Join lobby ---
  socket.on("joinLobby", ({ code, name }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby not found" });

    // prevent duplicate names
    let finalName = name;
    if (lobby.players.some((p) => p.name === name)) {
      let suffix = 2;
      while (lobby.players.some((p) => p.name === `${name}#${suffix}`))
        suffix++;
      finalName = `${name}#${suffix}`;
    }

    lobby.players.push({
      id: socket.id,
      name: finalName,
      score: 0,
      answered: false,
    });
    socket.join(code);

    if (lobby._purgeTimer) {
      clearTimeout(lobby._purgeTimer);
      lobby._purgeTimer = null;
    }

    io.to(code).emit("playerListUpdate", lobby.players);
    cb &&
      cb({
        ok: true,
        lobby: { players: lobby.players, settings: lobby.settings },
      });
    console.log(`${finalName} joined lobby ${code}`);
  });

  // --- Update settings ---
  socket.on("updateSettings", ({ code, settings }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby inexistant" });
    if (socket.id !== lobby.creator) return cb && cb({ error: "Pas autorisé" });

    const rounds = Math.max(1, parseInt(settings.rounds) || 5);
    const time = Math.max(5, parseInt(settings.time) || 15);
    const categories = Array.isArray(settings.categories)
      ? settings.categories
      : [settings.categories];
    lobby.settings = { rounds, time, categories };

    io.to(code).emit("settingsUpdated", lobby.settings);
    cb && cb({ ok: true });
    console.log(`Lobby ${code} settings updated`);
  });

  // --- Start game ---
  socket.on("startGame", async ({ code }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby inexistant" });
    if (socket.id !== lobby.creator) return cb && cb({ error: "Pas autorisé" });

    // Build media list from selected categories
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
    lobby.players.forEach((p) => {
      p.score = 0;
      p.answered = false;
    });

    lobby.state = "playing";

    io.to(code).emit("gameStarted", { totalRounds: lobby.settings.rounds });
    startNextRound(code); // commence le round
    cb && cb({ ok: true });
  });

  // --- Player answer ---
  socket.on("playerAnswer", ({ code, answer }) => {
    const lobby = lobbies[code];
    if (!lobby) return;

    const player = lobby.players.find((p) => p.id === socket.id);
    if (!player || player.answered) return;

    const media = lobby.mediaList[lobby.currentRound - 1];
    if (!media) return;

    player.answered = true;
    if (answer === media.isAI) player.score++;

    io.to(code).emit("playerListUpdate", lobby.players);

    // If all answered, go to next round
    if (lobby.players.every((p) => p.answered)) {
      clearTimeout(lobby.roundTimer);
      setTimeout(() => startNextRound(code), 1000);
    }
  });

  // --- Leave lobby
  socket.on("leaveLobby", ({ code }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ ok: true });

    // Remove player
    lobby.players = lobby.players.filter((p) => p.id !== socket.id);
    socket.leave(code);

    // Notify others
    io.to(code).emit("playerListUpdate", lobby.players);

    // If empty, remove lobby
    if (lobby.players.length === 0) {
      delete lobbies[code];
      console.log(`Lobby ${code} removed (empty)`);
    } else {
      // If creator left, assign new creator
      if (lobby.creator === socket.id) {
        lobby.creator = lobby.players[0].id;
        io.to(code).emit("creatorChanged", { newCreator: lobby.creator });
      }
    }

    cb && cb({ ok: true });
  });

  // --- Rejoin lobby
  socket.on("rejoinLobby", ({ code, name, oldId }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb && cb({ error: "Lobby not found" });

    const existing = lobby.players.find((p) => p.name === name);
    if (existing) {
      // Update creator if needed (if the rejoining player was the creator)
      // We can check if the lobby creator ID matches the OLD socket ID (if we had it stored reliably)
      // Or simpler: if the name matches the name of the player who created it?
      // We don't store creator name. But we can check if existing.id was the creator.
      if (lobby.creator === existing.id) {
        lobby.creator = socket.id;
      }

      existing.id = socket.id;
      existing.disconnected = false;
      existing.score = 0; // Reset score on rejoin
      existing.answered = false;

      socket.join(code);
      io.to(code).emit("playerListUpdate", lobby.players);

      // Notify if creator changed (so frontend updates controls)
      if (lobby.creator === socket.id) {
        io.to(code).emit("creatorChanged", { newCreator: socket.id });
      }

      if (lobby._purgeTimer) {
        clearTimeout(lobby._purgeTimer);
        lobby._purgeTimer = null;
      }

      return cb && cb({
        ok: true,
        message: "Rejoined existing player",
        lobby: { players: lobby.players, settings: lobby.settings }
      });
    }

    lobby.players.push({ id: socket.id, name, score: 0, answered: false });
    socket.join(code);

    if (lobby._purgeTimer) {
      clearTimeout(lobby._purgeTimer);
      lobby._purgeTimer = null;
    }

    io.to(code).emit("playerListUpdate", lobby.players);
    cb && cb({
      ok: true,
      message: "Joined new player",
      lobby: { players: lobby.players, settings: lobby.settings }
    });
  });

  socket.on("getCurrentRound", ({ code }, cb) => {
    const lobby = lobbies[code];
    if (!lobby || !lobby.mediaList) return cb({});
    const media = lobby.mediaList[lobby.currentRound - 1];
    cb({
      roundData: {
        round: lobby.currentRound,
        media,
        totalRounds: lobby.settings.rounds,
        time: lobby.settings.time,
      },
    });
  });

  // Disconnect
  // --- ROUND MANAGEMENT ---
  function startNextRound(code) {
    const lobby = lobbies[code];
    if (!lobby) return;

    lobby.currentRound++;

    if (lobby.currentRound > lobby.settings.rounds) {
      const ranking = lobby.players
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((p) => ({ name: p.name, score: p.score }));
      io.to(code).emit("gameEnded", { ranking });
      lobby.state = "lobby"; // Reset state so it can be purged if everyone leaves
      return;
    }

    const media = lobby.mediaList[lobby.currentRound - 1];
    lobby.players.forEach((p) => (p.answered = false));

    // Émettre roundStarted AVANT le timer
    io.to(code).emit("roundStarted", {
      round: lobby.currentRound,
      totalRounds: lobby.settings.rounds,
      media,
      time: lobby.settings.time,
    });

    if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
    lobby.roundTimer = setTimeout(
      () => endRound(code),
      lobby.settings.time * 1000
    );
  }

  function endRound(code) {
    const lobby = lobbies[code];
    if (!lobby) return;

    const perPlayer = lobby.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answered: p.answered,
    }));

    io.to(code).emit("roundEnded", { round: lobby.currentRound, perPlayer });
    setTimeout(() => startNextRound(code), 1500);
  }
});

server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);

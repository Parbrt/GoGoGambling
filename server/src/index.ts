import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { initSchema } from "./db/schema.js";
import { setupWebSocket } from "./ws/index.js";
import { startShareEngine } from "./engine/shareEngine.js";
import playerRoutes from "./routes/player.js";
import sharesRoutes from "./routes/shares.js";
import gamesRoutes from "./routes/games.js";
import babyFightRoutes from "./routes/babyFight.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import shopRoutes from "./routes/shop.js";
import lotoRoutes from "./routes/loto.js";
import { scheduleFights } from "./engine/babyFightEngine.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/player", playerRoutes);
app.use("/api/shares", sharesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/games/baby-fight", babyFightRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/loto", lotoRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Init DB
initSchema();

// Start share engine
startShareEngine();

// Start baby fight scheduler
scheduleFights();

// HTTP server
const httpServer = createServer(app);

// WebSocket
setupWebSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] GoGoGambling backend running on port ${PORT}`);
});

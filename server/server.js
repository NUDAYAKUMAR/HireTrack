import http from "http";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "https://hiretrack-8iy2.onrender.com";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: clientUrl}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HireTrack API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/admin", adminRoutes);

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, user }) => {
    socket.join(roomId);
    socket.to(roomId).emit("room:user-joined", user);
  });

  socket.on("editor:change", ({ roomId, code }) => {
    socket.to(roomId).emit("editor:change", code);
  });

  socket.on("whiteboard:draw", ({ roomId, payload }) => {
    socket.to(roomId).emit("whiteboard:draw", payload);
  });

  socket.on("candidate:activity", ({ roomId, activity }) => {
    socket.to(roomId).emit("candidate:activity", activity);
  });

  socket.on("questions:update", ({ roomId, questions }) => {
    socket.to(roomId).emit("questions:update", questions);
  });

  socket.on("chat:message", ({ roomId, text, sender }) => {
    socket.to(roomId).emit("chat:message", { text, sender, at: new Date().toISOString() });
  });

  socket.on("reaction:send", ({ roomId, emoji, sender }) => {
    socket.to(roomId).emit("reaction:send", { emoji, sender });
  });

  socket.on("whiteboard:clear", ({ roomId }) => {
    socket.to(roomId).emit("whiteboard:clear");
  });

  socket.on("lang:change", ({ roomId, language }) => {
    socket.to(roomId).emit("lang:change", language);
  });

  socket.on("code:output", ({ roomId, output, isError }) => {
    socket.to(roomId).emit("code:output", { output, isError });
  });

  // WebRTC signaling
  socket.on("webrtc:ready",  ({ roomId })            => socket.to(roomId).emit("webrtc:ready"));
  socket.on("webrtc:offer",  ({ roomId, offer })     => socket.to(roomId).emit("webrtc:offer",  offer));
  socket.on("webrtc:answer", ({ roomId, answer })    => socket.to(roomId).emit("webrtc:answer", answer));
  socket.on("webrtc:ice",    ({ roomId, candidate }) => socket.to(roomId).emit("webrtc:ice",    candidate));
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed", error.message);
    process.exit(1);
  }
};

startServer();

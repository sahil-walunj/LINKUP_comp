import https from "https";
import fs from "fs";
import express from "express";
import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManger";

const app = express();

// Load SSL certificates (generated via mkcert)
const options = {
  key: fs.readFileSync("./10.196.41.17-key.pem"), // path to your private key
  cert: fs.readFileSync("./10.196.41.17.pem"),     // path to your certificate
};

// Create an HTTPS server
const httpsServer = https.createServer(options, app);

// Attach socket.io to the HTTPS server
const io = new Server(httpsServer, {
  cors: {
    origin: "*",
  },
});

const userManager = new UserManager();

io.on("connection", (socket: Socket) => {
  console.log("a user connected");
  userManager.addUser("randomName", socket);

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
  });
});

// Start the HTTPS server
const PORT = 3000;
const HOST = "0.0.0.0";

httpsServer.listen(PORT, HOST, () => {
  console.log(`✅ HTTPS Socket.IO server running at https://10.196.41.17:${PORT}`);
});

import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
  socket: Socket;
  name: string;
}

export class UserManager {
  private users: User[] = [];
  private queue: string[] = [];
  private roomManager: RoomManager = new RoomManager();

  addUser(name: string, socket: Socket) {
    console.log(`[UserManager] Adding user ${name} (${socket.id})`);
    this.users.push({ name, socket });
    this.queue.push(socket.id);

    socket.emit("lobby");

    this.clearQueue();
    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    console.log(`[UserManager] Removing user ${socketId}`);
    this.users = this.users.filter(user => user.socket.id !== socketId);
    this.queue = this.queue.filter(id => id !== socketId);
  }

  clearQueue() {
    console.log(`[UserManager] Clearing queue (length = ${this.queue.length})`);

    if (this.queue.length < 2) return;

    const id1 = this.queue.pop()!;
    const id2 = this.queue.pop()!;
    console.log(`[UserManager] Pairing users ${id1} and ${id2}`);

    const user1 = this.users.find(user => user.socket.id === id1);
    const user2 = this.users.find(user => user.socket.id === id2);

    if (!user1 || !user2) {
      console.warn(`[UserManager] One or both users not found in user list.`);
      return;
    }

    this.roomManager.createRoom(user1, user2);
    this.clearQueue(); // Check if more users can be paired
  }

  initHandlers(socket: Socket) {
    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      console.log(`[Socket] Offer received from ${socket.id} for room ${roomId}`);
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      console.log(`[Socket] Answer received from ${socket.id} for room ${roomId}`);
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
      console.log(`[Socket] ICE candidate received from ${socket.id} for room ${roomId}`);
      this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
    });

    socket.on("chat-message", ({ roomId, message }: { roomId: string; message: string }) => {
      console.log(`[Socket] Chat message from ${socket.id} in room ${roomId}: ${message}`);
      this.roomManager.onChatMessage(roomId, message, socket.id);
    });
  }
}

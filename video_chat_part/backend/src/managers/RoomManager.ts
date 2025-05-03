import { User } from "./UserManger";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(user1: User, user2: User): string {
    const roomId = this.generate().toString();
    this.rooms.set(roomId, { user1, user2 });

    console.log(`[RoomManager] Room created: ${roomId} (${user1.name} & ${user2.name})`);

    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });

    // Optional: welcome chat test
    user1.socket.emit("chat-message", {
      message: `You are connected with ${user2.name}`,
      senderId: "System",
      roomId,
    });
    user2.socket.emit("chat-message", {
      message: `You are connected with ${user1.name}`,
      senderId: "System",
      roomId,
    });

    return roomId;
  }

  onOffer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receiver = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    receiver.socket.emit("offer", { sdp, roomId });
  }

  onAnswer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receiver = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    receiver.socket.emit("answer", { sdp, roomId });
  }

  onIceCandidates(
    roomId: string,
    senderSocketId: string,
    candidate: any,
    type: "sender" | "receiver"
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receiver = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    receiver.socket.emit("add-ice-candidate", { candidate, type });
  }

  onChatMessage(roomId: string, message: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const sender = room.user1.socket.id === senderSocketId ? room.user1 : room.user2;
    const receiver = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;

    console.log(`[RoomManager] Delivering message from ${sender.name} to ${receiver.name} in room ${roomId}`);

    receiver.socket.emit("chat-message", {
      message,
      senderId: sender.socket.id,
      senderName: sender.name,
      roomId,
    });
  }

  generate(): number {
    return GLOBAL_ROOM_ID++;
  }
}

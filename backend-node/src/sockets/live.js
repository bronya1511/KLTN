import { Server } from "socket.io";

let _io;

export function initSocket(server) {
  _io = new Server(server, {
    cors: { origin: "*" }
  });
  _io.on("connection", (socket) => {
    console.log("Client da ket noi socket:", socket.id);
  });
}

export function io() {
  return _io;
}

import { io } from "socket.io-client";

export function useLiveSocket() {
  const socket = io(import.meta.env.VITE_SOCKET_URL, { transports: ["websocket"] });
  return socket;
}

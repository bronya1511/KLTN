import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export function useLiveSocket() {
  const socket = useMemo(
    () => io(import.meta.env.VITE_SOCKET_URL, { transports: ["websocket"] }),
    []
  );

  useEffect(() => {
    return () => { socket.disconnect(); };
  }, [socket]);

  return socket;
}

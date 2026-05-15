import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8080";

let socket: Socket | null = null;

/**
 * Get or create the singleton Socket.IO connection to the roomws namespace.
 * The cookie (JWT) is sent automatically since we use withCredentials.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/roomws`, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

// Re-export Socket type for convenience
export type { Socket };

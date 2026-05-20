import { io, type Socket } from "socket.io-client";
import { normalizeViolationType, type ViolationTypeCode } from "@/lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8080";

/** Matches backend RoomIdentificationDto — `code` is always required (8 chars). */
export type RoomIdentificationPayload = {
  code: string;
  id?: number;
};

/** Matches backend StudentAnswerDto */
export type StudentAnswerPayload = {
  roomId: number;
  examId: number;
  questionId: number;
  optionId?: number;
};

/** Matches backend StudentViolationDto */
export type StudentViolationPayload = {
  roomId: number;
  attemptId: number;
  type: ViolationTypeCode;
  evidenceUrl?: string;
};

export function roomIdentification(code: string, id?: number): RoomIdentificationPayload {
  return id != null ? { code, id } : { code };
}

export function toBackendViolationType(type: string): ViolationTypeCode {
  return normalizeViolationType(type);
}

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
  // B8 FIX: reset singleton so next getSocket() creates a fresh connection
  // (prevents stale socket reuse after logout + re-login)
  socket = null;
}

/** Rời phòng WS nhưng giữ kết nối — dùng khi chuyển trang giáo viên trong cùng phiên. */
export function leaveQuizSocketRoom(code: string, roomId?: number) {
  const s = getSocket();
  if (s.connected) {
    s.emit("leave", roomIdentification(code, roomId));
  }
}

// Re-export Socket type for convenience
export type { Socket };

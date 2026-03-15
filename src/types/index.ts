// =============================================
// Domain Types — sesuai JSON response Go backend
// Go pakai json tag camelCase untuk sebagian field
// dan snake_case untuk yang lain — cek dari swagger
// =============================================

export type MessageType = 'text' | 'image' | 'file';
export type RoomType = 'private' | 'group';
export type MemberRole = 'admin' | 'member';

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatar: string;
  isonline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMember {
  id: number;
  room_id: number;
  user_id: number;
  user: User;
  role: MemberRole;
  joinedAt: string;
}

export interface Room {
  id: number;
  name: string;
  type: RoomType;
  created_by: number;
  members: RoomMember[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message {
  id: number;
  room_id: number;
  sender_id: number;
  sender: User;
  content: string;
  type: MessageType;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ReadStatus {
  id: number;
  room_id: number;
  user_id: number;
  lastReadAt: string;
}

// =============================================
// API Request/Response Types — sesuai swagger
// =============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateRoomRequest {
  name: string;
  type: RoomType;
  members: number[];
}

export interface UpdateRoomRequest {
  name: string;
}

export interface SendMessageRequest {
  content: string;
  type: MessageType;
}

export interface EditMessageRequest {
  content: string;
}

export interface AddMemberRequest {
  user_id: number;
}

export interface UpdateProfileRequest {
  username: string;
  avatar: string;
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  total_page: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
  meta?: ApiMeta;
}

// =============================================
// WebSocket Event Types — sesuai hub.go
// =============================================

export type WsEventType = 'new_message' | 'user_online' | 'user_offline' | 'typing';

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
}

export interface WsNewMessagePayload extends Message {}

export interface WsUserStatusPayload {
  user_id: number;
  username: string;
}

export interface WsTypingPayload {
  room_id: number;
  user_id: number;
  username: string;
  is_typing: boolean;
}

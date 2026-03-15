import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Room,
  Message,
  CreateRoomRequest,
  UpdateRoomRequest,
  SendMessageRequest,
  EditMessageRequest,
  AddMemberRequest,
  UpdateProfileRequest,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.message || data.error || 'Terjadi kesalahan');
  }

  return data;
}

// =============================================
// Auth API
// =============================================
export const authApi = {
  login: (body: LoginRequest) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  register: (body: RegisterRequest) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<null>('/auth/logout', { method: 'POST' }),
};

// =============================================
// User API
// =============================================
export const userApi = {
  getMe: () => request<User>('/users/me'),

  updateMe: (body: UpdateProfileRequest) =>
    request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getById: (id: number) => request<User>(`/users/${id}`),

  search: (query: string) =>
    request<User[]>(`/users/search?q=${encodeURIComponent(query)}`),
};

// =============================================
// Room API
// =============================================
export const roomApi = {
  getAll: () => request<Room[]>('/rooms/'),

  getById: (id: number) => request<Room>(`/rooms/${id}`),

  create: (body: CreateRoomRequest) =>
    request<Room>('/rooms/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: number, body: UpdateRoomRequest) =>
    request<Room>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    request<null>(`/rooms/${id}`, { method: 'DELETE' }),

  addMember: (roomId: number, body: AddMemberRequest) =>
    request<Room>(`/rooms/${roomId}/members`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  removeMember: (roomId: number, userId: number) =>
    request<null>(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' }),

  getMessages: async (roomId: number, page = 1, limit = 50) => {
  const res = await request<Message[]>(`/rooms/${roomId}/messages?page=${page}&limit=${limit}`);
  if (res.data) {
    res.data = [...res.data].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  return res;
},

  sendMessage: (roomId: number, body: SendMessageRequest) =>
    request<Message>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  markRead: (roomId: number) =>
    request<null>(`/rooms/${roomId}/read`, { method: 'POST' }),
};

// =============================================
// Message API
// =============================================
export const messageApi = {
  edit: (id: number, body: EditMessageRequest) =>
    request<Message>(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    request<null>(`/messages/${id}`, { method: 'DELETE' }),
};

export { ApiError };

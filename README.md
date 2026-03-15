# DearTalk Frontend

PWA real-time chat app — tampilan mirip WhatsApp, dibangun dengan React 18 + TypeScript + Vite.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — build tool
- **Zustand** — state management
- **React Router v6** — routing
- **date-fns** — formatting tanggal
- **WebSocket** native browser API
- **PWA** — service worker + manifest

## Struktur Folder

```
src/
├── api/         # API client (sesuai swagger.json)
├── components/  # Avatar, Sidebar, ChatWindow, ProfilePanel, RoomInfoPanel
├── hooks/       # useWebSocket
├── pages/       # AuthPage, ChatPage
├── types/       # TypeScript types (sesuai Go domain models)
├── utils/       # Helper functions
├── store.ts     # Zustand stores (auth + chat)
├── styles.css   # WhatsApp dark theme CSS
├── App.tsx      # Router + Protected routes
└── main.tsx     # Entry point + PWA SW registration
```

## Setup & Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env

# 3. Edit .env — sesuaikan dengan URL backend DearTalk
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws

# 4. Run dev server
npm run dev

# 5. Build production
npm run build
```

## Fitur

- ✅ **Auth** — Login, Register, Logout (JWT)
- ✅ **Rooms** — List, Create (private/group), Update, Delete
- ✅ **Messages** — Send, Edit, Delete (soft delete), History dengan pagination
- ✅ **Members** — Add, Remove anggota grup
- ✅ **Real-time** — WebSocket events: new_message, user_online, user_offline, typing
- ✅ **Typing indicator** — animasi dots saat user mengetik
- ✅ **Online status** — indikator online/offline user
- ✅ **Profil** — View & update username/avatar
- ✅ **PWA** — installable, offline support via service worker
- ✅ **Responsive** — mobile-friendly layout
- ✅ **Context menu** — klik kanan pesan untuk edit/hapus

## WebSocket Events (sesuai hub.go)

| Event           | Payload                                      |
|-----------------|----------------------------------------------|
| `new_message`   | `Message` object                             |
| `user_online`   | `{ user_id, username }`                      |
| `user_offline`  | `{ user_id, username }`                      |
| `typing`        | `{ room_id, user_id, username, is_typing }`  |

## API Endpoints (sesuai swagger.json)

| Method | Path                          | Keterangan             |
|--------|-------------------------------|------------------------|
| POST   | /auth/login                   | Login                  |
| POST   | /auth/register                | Register               |
| POST   | /auth/logout                  | Logout                 |
| GET    | /users/me                     | Profil sendiri         |
| PUT    | /users/me                     | Update profil          |
| GET    | /users/search?q=              | Cari user              |
| GET    | /rooms                        | Semua room             |
| POST   | /rooms                        | Buat room              |
| GET    | /rooms/:id                    | Detail room            |
| PUT    | /rooms/:id                    | Update room            |
| DELETE | /rooms/:id                    | Hapus room             |
| POST   | /rooms/:id/members            | Tambah member          |
| DELETE | /rooms/:id/members/:userId    | Hapus member           |
| GET    | /rooms/:id/messages           | Riwayat pesan          |
| POST   | /rooms/:id/messages           | Kirim pesan            |
| POST   | /rooms/:id/read               | Tandai sudah dibaca    |
| PUT    | /messages/:id                 | Edit pesan             |
| DELETE | /messages/:id                 | Hapus pesan            |

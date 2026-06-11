# CollabDocs

A real-time collaborative document editor — built with Next.js, Node.js, PostgreSQL, Socket.io, and Yjs. Multiple users can edit the same document simultaneously with live cursor presence, role-based access control, and auto-save.

![CollabDocs Demo](https://via.placeholder.com/800x400?text=Add+Demo+GIF+Here)

## Live Demo

**Frontend:** [collabdocs-client.vercel.app](https://collabdocs-client.vercel.app)  
**Backend:** [51.21.219.3.nip.io](https://51.21.219.3.nip.io/health)

> Open the same document in two different browsers to see real-time collaboration in action.

---

## Features

- **Real-time collaborative editing** — multiple users edit simultaneously with Yjs CRDT conflict resolution
- **Live cursor presence** — see where other users are editing with colored cursors and name labels
- **Role-based access control** — owner, editor, and viewer permissions per document
- **Share documents** — invite collaborators by email with editor or viewer role
- **Auto-save** — content persists automatically with debounced saves to PostgreSQL
- **JWT authentication** — secure login with access tokens and refresh token rotation
- **Read-only viewer mode** — viewers can read but cannot edit or change the title
- **Rich text formatting** — bold, italic, strikethrough, headings, bullet lists via Tiptap

---

## Tech Stack

### Frontend

| Technology       | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| Next.js 14       | React framework with App Router                 |
| TypeScript       | Type safety                                     |
| Tailwind CSS     | Styling                                         |
| Tiptap           | Rich text editor                                |
| Yjs              | CRDT-based real-time sync                       |
| y-protocols      | Awareness protocol for cursor presence          |
| Socket.io Client | WebSocket communication                         |
| Zustand          | Auth state management with cookie persistence   |
| Axios            | HTTP client with interceptors for token refresh |

### Backend

| Technology        | Purpose                                    |
| ----------------- | ------------------------------------------ |
| Node.js + Express | REST API server                            |
| TypeScript        | Type safety                                |
| TypeORM           | Database ORM with migrations               |
| PostgreSQL        | Persistent storage                         |
| Socket.io         | WebSocket server for real-time events      |
| Yjs               | Server-side CRDT state management          |
| JWT               | Authentication with refresh token rotation |
| bcryptjs          | Password hashing                           |

### Infrastructure

| Service       | Purpose             |
| ------------- | ------------------- |
| Vercel        | Frontend deployment |
| AWS EC2       | Backend deployment  |
| PM2           | Process management  |
| Nginx         | Reverse proxy       |
| Let's Encrypt | SSL certificate     |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Client (Vercel)                   │
│                                                      │
│  Next.js App                                         │
│  ├── Zustand (auth state → cookie)                   │
│  ├── Axios (REST API calls + token refresh)          │
│  ├── Tiptap Editor                                   │
│  │   ├── Collaboration (Yjs document)                │
│  │   └── CollaborationCursor (awareness)             │
│  └── Socket.io Client                                │
│      ├── Yjs sync (document updates)                 │
│      ├── Awareness (cursor presence)                 │
│      └── Title sync                                  │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS / WSS
┌────────────────────▼─────────────────────────────────┐
│              Backend (AWS EC2 + Nginx)               │
│                                                      │
│  Express REST API                                    │
│  ├── Auth routes (register, login, refresh)          │
│  ├── Document routes (CRUD + collaborators)          │
│  └── TypeORM → PostgreSQL                            │
│                                                      │
│  Socket.io Server                                    │
│  ├── JWT auth middleware                             │
│  ├── Yjs doc store (in-memory per room)              │
│  ├── Awareness broadcast                             │
│  └── User presence tracking                          │
└──────────────────────────────────────────────────────┘
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/saffan-ahmed-shaikh/collabdocs-server.git
git clone https://github.com/saffan-ahmed-shaikh/collabdocs-client.git
```

### 2. Backend setup

```bash
cd collabdocs-server
npm install
```

Create `.env`:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=collabdocs
DB_SSL=false
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

Run migrations and start server:

```bash
npm run migration:run
npm run dev
```

Server runs on `http://localhost:5000`

### 3. Frontend setup

```bash
cd collabdocs-client
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

App runs on `http://localhost:3000`

---

## API Endpoints

### Auth

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Register new user    |
| POST   | `/api/auth/login`    | Login                |
| POST   | `/api/auth/refresh`  | Refresh access token |

### Documents

| Method | Endpoint                           | Description            |
| ------ | ---------------------------------- | ---------------------- |
| GET    | `/api/documents`                   | Get all user documents |
| GET    | `/api/documents/:id`               | Get single document    |
| POST   | `/api/documents`                   | Create document        |
| PATCH  | `/api/documents/:id`               | Update title           |
| PATCH  | `/api/documents/:id/content`       | Save content           |
| DELETE | `/api/documents/:id`               | Delete document        |
| POST   | `/api/documents/:id/collaborators` | Add collaborator       |

---

## Database Schema

```sql
users
├── id (UUID)
├── name
├── email (unique)
├── password (hashed)
└── created_at

documents
├── id (UUID)
├── title
├── content (TEXT)
├── owner_id → users.id
├── created_at
└── updated_at

document_collaborators
├── id (UUID)
├── document_id → documents.id
├── user_id → users.id
└── role (editor | viewer)
```

---

## Real-time Architecture

CollabDocs uses **Yjs** (a CRDT library) for conflict-free collaborative editing:

1. Each document has a `Y.Doc` instance on the server
2. When a user joins, the server sends the current Yjs state vector
3. Local edits generate Yjs updates which are broadcast to all room participants
4. Cursor positions are synced via the **y-protocols awareness** protocol
5. All changes are persisted to PostgreSQL via debounced auto-save (1s delay)

---

## Deployment

### Backend (EC2 + Nginx + SSL)

```bash
npm run build
npm run migration:run
pm2 start dist/index.js --name collabdocs-be
pm2 save
```

### Frontend (Vercel)

```bash
# Connect GitHub repo to Vercel
# Set environment variables in Vercel dashboard
# Auto-deploys on push to main
```

---

## Project Structure

```
collabdocs-server/
├── src/
│   ├── config/         # Database config
│   ├── controllers/    # Request handlers
│   ├── entities/       # TypeORM entities
│   ├── middlewares/    # Auth middleware
│   ├── migrations/     # Database migrations
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── utils/          # JWT helpers
│   ├── app.ts
│   └── index.ts
└── ...

collabdocs-client/
├── app/
│   ├── components/     # Shared components
│   ├── dashboard/      # Dashboard page
│   ├── document/[id]/  # Editor page
│   ├── login/          # Login page
│   └── register/       # Register page
├── lib/
│   ├── hooks/          # Custom React hooks
│   ├── store/          # Zustand store
│   ├── axios.ts        # Axios instance
│   └── useErrorHandler.ts
└── ...
```

---

## Author

**Safwan Ahmed**  
Full Stack Developer  
[LinkedIn](https://linkedin.com/in/safwan-ahmed-shaikh) · [GitHub](https://github.com/saffan-ahmed-shaikh) · [Portfolio](#)

---

## License

MIT

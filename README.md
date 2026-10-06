# 🎮 Bingo Arena

**Bingo Arena** is a real-time turn-based multiplayer number-grid arcade game built for high-concurrency competitive matches (5 to 30 players per room) on dynamic $N \times N$ matrices (from 5×5 up to 10×10 and larger).

---

## 🚀 Production Deployment Architecture

```
             ┌──────────────┐
             │    USER      │
             └──────┬───────┘
                    │
                    ▼
           ┌────────────────┐
           │     VERCEL     │
           │  React + Vite  │
           └───────┬────────┘
                   │
          HTTPS / Socket.IO
                   │
                   ▼
           ┌────────────────┐
           │     RENDER     │
           │ Node + Express │
           │   Socket.IO    │
           └───────┬────────┘
                   │
                   ▼
           ┌────────────────┐
           │ MONGODB ATLAS  │
           │ Persistent DB  │
           └────────────────┘
```

| Component | Platform | Live Production URL | Configuration |
|---|---|---|---|
| **Frontend** | **Vercel** | [https://bingo-arena-one.vercel.app](https://bingo-arena-one.vercel.app) | React 19 + Vite (`client/`), SPA rewrites via `client/vercel.json` |
| **Backend** | **Render** | [https://bingo-arena-92ne.onrender.com](https://bingo-arena-92ne.onrender.com) | Node.js + Express + Socket.IO (`server/`) |
| **Health Check** | **Render** | [https://bingo-arena-92ne.onrender.com/api/health](https://bingo-arena-92ne.onrender.com/api/health) | Authoritative database and server status check |
| **Database** | **MongoDB Atlas** | *(Cloud Cluster)* | Cloud cluster with persistent game state & round history |
| **Real-time** | **Socket.IO** | `https://bingo-arena-92ne.onrender.com` | WebSocket & polling transports with CORS validation |

---

## 🛠️ Technology Stack

### Frontend (`/client`)
- **React 19** with **TypeScript**
- **Vite** (bundler and build system)
- **Socket.IO Client** (`socket.io-client` v4)
- **Tailwind CSS** (dark arcade theme: deep charcoal, royal purple, magenta, gold, and warm orange)
- **Framer Motion** (smooth screen transitions, winner celebrations, letter reveals)
- **React Router** (`react-router-dom` v7)
- **Lucide React** (modern arcade iconography)
- **Three.js** + **@react-three/fiber** + **@react-three/drei** (3D hero ball & winner celebration ball)

### Backend (`/server`)
- **Node.js** + **TypeScript**
- **Express** (REST API with CORS, error handling, health checks)
- **Socket.IO** (modular real-time WebSocket server sharing Express HTTP server)
- **MongoDB Atlas** + **Mongoose** (cloud-backed game room, player, and round persistence)
- **tsx** (development runner with hot reload)

---

## ⚙️ Environment Variables

### Frontend Variables (Vercel)

| Variable | Description | Example (Production) | Local Dev Fallback |
|---|---|---|---|
| `VITE_API_BASE_URL` | Base URL of deployed backend REST API | `https://bingo-arena-backend.onrender.com` | `http://localhost:5001` |
| `VITE_SOCKET_URL` | Base URL of deployed backend Socket.IO server | `https://bingo-arena-backend.onrender.com` | `http://localhost:5001` |

> ⚠️ **CRITICAL SECURITY NOTE**: Never store MongoDB connection strings, database credentials, or secret keys in `VITE_*` environment variables. They are bundled directly into the public client application.

### Backend Variables (Render)

| Variable | Description | Example (Production) | Local Dev Fallback |
|---|---|---|---|
| `NODE_ENV` | Application environment | `production` | `development` |
| `PORT` | HTTP port assigned dynamically by host | `10000` (Render default) | `5000` |
| `CLIENT_URL` | Allowed frontend origin for CORS and Socket.IO | `https://your-frontend.vercel.app` | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<pwd>@<cluster>.mongodb.net/bingo_arena?retryWrites=true&w=majority` | *(empty)* |

---

## 🌐 Step-by-Step Production Deployment Guide

### Step 1: MongoDB Atlas Configuration
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Security** > **Database Access**:
   - Create a database user with `readWriteAnyDatabase` or scoped read/write access to `bingo_arena`.
   - Keep the password safe for Step 2.
3. Under **Security** > **Network Access**:
   - Click **Add IP Address** and select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Render web services operate on dynamic outbound IP addresses unless on dedicated static IP plans.*
4. Under **Deployment** > **Database**:
   - Click **Connect** > **Drivers** (Node.js).
   - Copy the connection string (format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bingo_arena?retryWrites=true&w=majority`).

---

### Step 2: Deploy Backend to Render
1. Log in to [Render](https://render.com) and click **New** > **Web Service**.
2. Connect your GitHub repository `yakshit0511/BINGO_ARENA`.
3. Configure the Web Service settings:
   - **Name**: `bingo-arena-backend`
   - **Region**: Select closest to your users (e.g., Oregon, Frankfurt, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (or higher)
4. Under **Advanced** > **Health Check Path**:
   - Set to `/api/health`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = *(your MongoDB Atlas connection string from Step 1)*
   - `CLIENT_URL` = *(temporary placeholder or your planned Vercel URL, e.g. `https://bingo-arena.vercel.app`)*
6. Click **Create Web Service**.
7. Once deployed, note down your Render service URL (e.g., `https://bingo-arena-backend.onrender.com`).
8. Verify health check:
   - Open `https://bingo-arena-backend.onrender.com/api/health`
   - Expected response:
     ```json
     {
       "success": true,
       "message": "Bingo Arena server is running",
       "database": "connected"
     }
     ```

---

### Step 3: Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New...** > **Project**.
2. Import the repository `yakshit0511/BINGO_ARENA`.
3. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://bingo-arena-backend.onrender.com` *(from Step 2)*
   - `VITE_SOCKET_URL` = `https://bingo-arena-backend.onrender.com` *(from Step 2)*
5. Click **Deploy**.
6. Note down your production Vercel URL (e.g., `https://bingo-arena.vercel.app`).

---

### Step 4: Finalize Backend CORS Origin
1. Return to your [Render Dashboard](https://dashboard.render.com).
2. Open `bingo-arena-backend` > **Environment**.
3. Update `CLIENT_URL` with your actual Vercel domain:
   - Example: `CLIENT_URL=https://bingo-arena.vercel.app`
   - If using multiple origins (e.g. custom domain + Vercel preview): comma-separate them:
     `https://bingo-arena.vercel.app,https://bingoarena.com`
4. Save and allow Render to redeploy.

---

## 🧊 Cold-Start & Resilience Handling

On Render's Free tier, services spin down after 15 minutes of inactivity:
- **Navbar Status Badge**: When the backend is spinning up, the client displays `WAKING SERVER...` with an amber pulse rather than treating the app as broken.
- **Graceful Retries**: Room creation and joining flows provide user-friendly prompts explaining the ~30s spin-up window.
- **Real-time Reconnection**: If the WebSocket drops, the client automatically initiates reconnect attempts and displays an in-game `RECONNECTING...` banner without losing player identity or board states.

---

## 🧪 Production Acceptance Test Checklist

- [ ] **Frontend HTTPS**: Vercel app loads securely with HTTPS.
- [ ] **Backend HTTPS & Health**: `GET /api/health` returns `success: true` and `database: "connected"`.
- [ ] **Lobby Creation**: Host creates room; request hits Render backend, not localhost.
- [ ] **Multi-Player Join**: Players join from separate browsers/devices; real-time socket updates player roster.
- [ ] **Board Setup**: Dynamic $N \times N$ matrix fills, validates, and locks upon submission.
- [ ] **Turn Order & Game Start**: Host configures turn order; game starts with synchronized active turn indicator.
- [ ] **Number Calling**: Active player calls numbers; all contenders' boards auto-highlight matching numbers.
- [ ] **Bingo Detection**: Completed lines detect correctly; winning word letters unlock sequentially.
- [ ] **Winner Lock**: Winning condition freezes turn progression and triggers celebratory overlay.
- [ ] **Lifecycle Navigation**:
  - `END GAME` transitions all players to `/results/:roomCode`.
  - `CONTINUE GAME` starts Round 2 with historical round preserved.
  - `END ROOM` closes the session permanently and notifies all connected clients.
- [ ] **Direct URL & Refresh Recovery**: Refreshing `/game/:roomCode` or `/results/:roomCode` restores authoritative room state from MongoDB.

---

## 💻 Local Development

```bash
# 1. Install all workspace dependencies
npm run install:all

# 2. Configure environment files
cp client/.env.example client/.env
cp server/.env.example server/.env

# 3. Start local development server (Client on :5173, Server on :5001)
npm run dev
```

---

## 🔧 Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `CORS Error: Origin not allowed` | `CLIENT_URL` on Render doesn't match Vercel origin | Update `CLIENT_URL` in Render environment to match your Vercel URL (remove any trailing slashes). |
| `Cannot connect to MongoDB` | IP whitelist or credential issue | Verify MongoDB Atlas Network Access has `0.0.0.0/0` enabled and the user/password in `MONGODB_URI` are correct. |
| `404 on refresh on Vercel` | SPA route rewrite missing | `client/vercel.json` contains rewrites to `index.html`. Verify Root Directory is set to `client`. |
| `Socket disconnects on Render` | WebSocket upgrade blocked | Ensure your Render service is configured as a Web Service. The client automatically falls back to long-polling if needed. |

# 🎮 Bingo Arena

**Bingo Arena** is a real-time turn-based multiplayer number-grid arcade game built for high-concurrency competitive matches (5 to 30 players per room) on dynamic $N \times N$ matrices (from 5×5 up to 10×10 and larger).

> 🟢 **Project Status**: **Prompt 7 (Turn Order Configuration + Game Start Engine)** completed.  
> Host-configurable turn order with live [↑] / [↓] buttons, real-time participant freezing (`gamePlayers`), server-authoritative game start validation, active match state management, initial turn assignment to the first player without auto-calling, late-join rejection protection, circular `advanceTurn` rotation foundation, and the 3D Active Game View foundation are fully active.  
> *Number calling mechanisms, called number uniqueness checking, board auto-highlighting, and line/Bingo win detection are staged for subsequent prompts (Prompt 8).*

---

## 🛠️ Technology Stack

### Frontend (`/client`)
- **React 19** with **TypeScript**
- **Vite** (ultra-fast build and HMR tool)
- **Socket.IO Client** (`socket.io-client` v4)
- **Tailwind CSS** (dark arcade theme: deep charcoal, royal purple, magenta, gold, and warm orange — strictly no blue primary)
- **Framer Motion** (subtle player join transitions and modal animations)
- **React Router** (`react-router-dom` v7)
- **Lucide React** (modern arcade iconography)
- **Three.js** + **@react-three/fiber** + **@react-three/drei** (3D arcade visual elements)

### Backend (`/server`)
- **Node.js** + **TypeScript**
- **Express** (RESTful API foundation with CORS & health checking)
- **Socket.IO** (modular real-time WebSocket server sharing Express HTTP server)
- **MongoDB Atlas** + **Mongoose** (cloud-backed game room and player persistence)
- **tsx** (zero-build development execution and hot reloading)

---

## 📁 Project Structure

```
BINGO/
│
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/              # Static game visual assets
│   │   ├── components/          # Reusable UI components (Navbar, Footer, Button, etc.)
│   │   │   └── room/            # PlayerList, RoomConfigCard, DynamicGridPreview, RoomLobbyView
│   │   ├── constants/           # Global game constants (Grid sizes, default words)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Page layouts (RootLayout)
│   │   ├── lib/                 # Centralized API & Socket services
│   │   │   ├── roomService.ts   # REST API room service
│   │   │   ├── socket.ts        # Singleton Socket.IO client manager
│   │   │   └── session.ts       # Browser-session persistence manager
│   │   ├── pages/               # Route pages (Home, Create, Join, Game, Results)
│   │   ├── three/               # 3D R3F components (ArcadeCanvas, FloatingGem)
│   │   ├── types/               # TypeScript interfaces
│   │   ├── utils/               # Helper utilities & validation helpers
│   │   ├── App.tsx              # React Router setup
│   │   ├── index.css            # Tailwind directives and design system tokens
│   │   ├── main.tsx             # Application DOM entry point
│   │   └── vite-env.d.ts        # Vite client type definitions
│   ├── .env.example             # Frontend environment template
│   ├── index.html               # HTML entry with Outfit Google font
│   ├── package.json             # Frontend dependencies
│   ├── postcss.config.js        # PostCSS configuration
│   ├── tailwind.config.js       # Custom arcade theme tokens & animations
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite bundler & reverse proxy setup
│
├── server/
│   ├── src/
│   │   ├── config/              # Database connection manager (database.ts)
│   │   ├── controllers/         # Request handlers (room.controller.ts, health.controller.ts)
│   │   ├── middleware/          # Express middlewares
│   │   ├── models/              # Mongoose schemas (room.model.ts, player.model.ts)
│   │   ├── routes/              # Express API route endpoints (room.routes.ts)
│   │   ├── services/            # Room business logic service (room.service.ts)
│   │   ├── sockets/             # Modular Socket.IO handlers
│   │   │   ├── index.ts         # Socket.IO server initialization
│   │   │   └── room.socket.ts   # Room & lobby events (room:join, room:leave, room:state)
│   │   ├── types/               # Backend TypeScript interfaces
│   │   ├── utils/               # Room code & player ID generators, validators
│   │   └── server.ts            # Express + HTTP + Socket.IO server entry point
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies
│   ├── tsconfig.json            # Server TypeScript configuration
│   ├── test-prompt4-suite.js    # Prompt 4 persistence validation suite
│   └── test-prompt5-suite.js    # Prompt 5 real-time multiplayer test suite
│
├── .gitignore                   # Multi-tier gitignore for root, client, and server
├── package.json                 # Root script runner (concurrently)
└── README.md                    # Project documentation
```

---

## ⚡ Socket.IO Architecture & Real-Time Synchronization

### Shared HTTP Server Architecture
The Socket.IO server shares the exact same underlying Node.js HTTP server instance as Express:
```
Express App ──▶ HTTP Server ──▶ Socket.IO Server (io)
```

### Server Authoritative Design
- **API First**: A player creates a room via `POST /api/rooms` or joins via `POST /api/rooms/join`. The server generates authoritative identifiers (`roomCode`, `playerId`).
- **Socket Attachment**: Upon receiving the API response, the client saves session identifiers to `sessionStorage` and connects to Socket.IO, emitting `room:join`.
- **Database Validation**: The server validates that the `roomCode` and `playerId` exist in MongoDB before admitting the socket into the Socket.IO room `room:${roomCode}`.
- **State Broadcast**: Whenever a player joins, leaves, or disconnects, the server queries the latest database state and emits `room:state` to all sockets in that room.

---

## 📡 Socket Event Overview

### Client ➔ Server
| Event | Payload | Acknowledgement | Description |
|---|---|---|---|
| `room:join` | `{ roomCode: string, playerId: string }` | `{ success: boolean, room?: PublicRoom }` | Validates player session against MongoDB, joins socket room, marks player `isConnected: true`, and broadcasts `room:state`. |
| `room:leave` | `{ roomCode: string, playerId: string }` | `{ success: boolean }` | Intentional player departure. If the host leaves, marks room `finished` and broadcasts `room:closed`. If a contender leaves, removes player and broadcasts updated `room:state`. |
| `room:request-state` | `{ roomCode: string }` | None | On-demand state refresh. Server responds directly to the requesting socket with `room:state`. |

### Server ➔ Client
| Event | Payload | Description |
|---|---|---|
| `room:state` | `PublicRoom` object | Authoritative snapshot of room configuration, derived `maxNumber` ($N^2$), player limit, and full player roster with online/offline connectivity indicators. |
| `room:closed` | `{ roomCode: string, message: string }` | Broadcast when the host leaves or closes the room. Triggers the "ROOM CLOSED" modal on all connected clients. |

---

## 🔄 Reconnection & Session Persistence

1. **Browser Session Storage** (`sessionStorage`):
   - Stores `roomCode`, `playerId`, `playerName`, and initial `isHost` UI hint.
   - Cleared on intentional `LEAVE GAME` or when room is closed.
2. **Accidental Disconnect**:
   - If a player's socket disconnects (e.g., mobile network transition, tab refresh):
     - The server does **not** delete the player from the database.
     - The server updates `player.isConnected = false` and broadcasts `room:state`.
     - Other connected clients see the player marked `○ Offline (Reconnecting)`.
3. **Reconnecting**:
   - When the client's socket reconnects, it retrieves stored credentials from `sessionStorage` and re-emits `room:join`.
   - The server marks `player.isConnected = true` and broadcasts `room:state`.
   - The player count and roster remain consistent with **zero duplicate player records**.

---

## 🎮 How to Test Multiple Players Locally

### Method 1: Using Multiple Browser Windows / Incognito
1. Start the development server:
   ```bash
   npm run dev
   ```
2. **Window 1 (Host - Regular Browser)**:
   - Navigate to `http://localhost:5173/create`.
   - Configure a 6×6 grid, winning word `YAKSHI`, 10 players, turn-based mode, host name `Yakshit`.
   - Click **CREATE GAME ROOM**. Note the 6-character room code (e.g., `B7K4P2`).
   - Observe **1 / 10 PLAYERS** and `● LIVE` connection indicator.
3. **Window 2 (Player 2 - Incognito Window 1)**:
   - Navigate to `http://localhost:5173/join?code=B7K4P2`.
   - Enter display name `Prashant` and click **ENTER ARENA ROOM**.
   - **Observe**: Without refreshing, Window 1 (Host) instantly updates to **2 / 10 PLAYERS** with Prashant listed!
4. **Window 3 (Player 3 - Incognito Window 2)**:
   - Join with name `Ayush`.
   - **Observe**: Windows 1, 2, and 3 instantly update to **3 / 10 PLAYERS** in real-time.
5. **Test Disconnect**:
   - Close Window 3 (Ayush).
   - Windows 1 and 2 show Ayush with `○ Offline (Reconnecting)`.
6. **Test Intentional Leave**:
   - In Window 2 (Prashant), click **Exit Arena Lobby** ➔ **Leave Lobby**.
   - Window 1 instantly drops to **2 / 10 PLAYERS** (Yakshit + Ayush offline).
7. **Test Host Room Closure**:
   - In Window 1 (Host), click **Exit Arena Lobby** ➔ **Close & Exit**.
   - Any remaining players receive `room:closed` and see the **ROOM CLOSED** modal.

### Method 2: Automated End-to-End Test Suite
Run the automated Socket.IO multiplayer verification suite:
```bash
cd server
node test-prompt5-suite.js
```
Runs 10 automated test cases verifying multi-socket joins, simultaneous broadcasts, disconnects, reconnects, leaves, closures, and invalid identities.

---

## 🎯 Player Board Creation System (Prompt 6)

### Core Game Mechanic
In Bingo Arena, player cards are **not** auto-generated by the server. Instead, each player manually chooses where to place each sequential number from $1$ to $N^2$ on an $N \times N$ matrix:
- **5×5 Matrix**: $1 \to 2 \to 3 \dots \to 25$ ($25$ numbers total)
- **6×6 Matrix**: $1 \to 2 \to 3 \dots \to 36$ ($36$ numbers total)
- **7×7 Matrix**: $1 \to 2 \to 3 \dots \to 49$ ($49$ numbers total)
- **10×10 Matrix**: $1 \to 2 \to 3 \dots \to 100$ ($100$ numbers total)
- **20×20 Matrix**: $1 \to 2 \to 3 \dots \to 400$ ($400$ numbers total)

### Click / Tap Placement Workflow
- **Zero Manual Input**: Players never type numbers or pick from dropdowns.
- **Sequential Advancement**: The system determines the next sequential number ($1 \to 2 \to 3 \dots$). Clicking an empty cell assigns that number immediately.
- **Desktop Hover & Mobile Touch**: Desktop hover provides a ghost preview of the next number; mobile touch uses responsive scale targets (`touch-manipulation`).
- **Undo Feature**: Players can click **UNDO LAST** repeatedly to undo previous placements in reverse chronological order.
- **Reset Board**: A confirmation modal allows clearing all cells and restarting from $1$ prior to submission.
- **Board Submission**: The **SUBMIT BOARD** button is locked until all $N^2$ numbers have been placed.
- **Board Locking**: Once submitted, the board is locked on both client and MongoDB (`isSubmitted = true`, `submittedAt: Date`). All cell clicks, undo, and reset are permanently disabled.

### Server Authoritative Validation & Anti-Cheating
The server never trusts client-supplied grid sizes or validation flags. Upon receiving `POST /api/rooms/:roomCode/players/:playerId/board`, the backend strictly validates:
1. Room exists and match has not already started or closed.
2. Player is an active member of the room.
3. Board has not already been submitted (`hasSubmitted: true` locks board permanently; duplicate submissions return `409 Conflict`).
4. Array length equals exactly $N^2$ matching the room's stored `gridSize`.
5. Numbers contain integers in range $[1, N^2]$ with **no duplicates**, **no negative numbers**, and **no missing numbers**.
6. Broadcasts `room:state` via Socket.IO with real-time `allSubmitted` status. When all players submit, host unlocks the **START GAME** foundation.

---

## 🗄️ MongoDB Atlas Setup

1. **Create a MongoDB Atlas Cluster**:
   - Create a free M0 cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Create Database User & Network Access**:
   - Add a user with read/write permissions.
   - Whitelist your IP (or `0.0.0.0/0` for development).
3. **Set Environment Variable**:
   - Add connection string as `MONGODB_URI` in `server/.env`.
   - Never commit your connection string to git.

---

## ⚙️ Environment Variables

### Client (`client/.env.example`)
```env
VITE_API_URL=http://localhost:5000
```

### Server (`server/.env.example`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=
```

---

## 📋 Prerequisites & Installation

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

```bash
# Install root, client, and server dependencies
npm run install:all
```

---

## 🎮 How to Run the Application

### Option A: Run Both Services Concurrently (Recommended)
```bash
npm run dev
```
Starts:
- **Server**: `http://localhost:5000` (watches via `tsx watch`)
- **Client**: `http://localhost:5173` (Vite dev server)

### Option B: Run Services Individually
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

---

## 🧪 Automated Test Verification

| Test Suite | Command | Coverage |
|---|---|---|
| **Prompt 4 (Database & API)** | `node test-prompt4-suite.js` | 24 tests: grid validation, word length checks, capacity bounds, name collisions, Mongoose persistence. |
| **Prompt 5 (Socket.IO Multiplayer)** | `node test-prompt5-suite.js` | 10 tests: real-time multi-socket joins, 4-client live sync, disconnect state, reconnect idempotency, intentional leave, host closure, invalid socket identity rejection. |
| **Prompt 6 (Player Board System)** | `node test-prompt6-suite.js` | 24 tests: 5×5 and 6×6 submissions, incomplete board rejection (400), duplicate number rejection (400), out-of-range rejection (400), anti-cheating lock rejection (409), GET board verification, multi-player `allSubmitted: true` sync, and dynamic large grids (7×7, 10×10, 20×20). |
| **Prompt 7 (Turn Order & Game Start)** | `node test-prompt7-suite.js` | 12 tests: 4-player setup, premature start rejection before boards submitted (400), non-host turn order configuration rejection (403), duplicate/missing/unknown player order rejection (400), valid turn order update (200), non-host start rejection (403), authoritative game start (200, status="playing", game.status="active", first player receives turn, calledNumbers=[]), double start rejection (409), late-join rejection (409), circular `advanceTurn` helper rotation (C -> A -> Host -> B -> C). |

---

## ⏸️ Features Intentionally Postponed to Prompt 8 (Number Calling & Detection)

- **Bingo Board Matrix Generation**: Number placing, sequential number assignment (1 to $N^2$), and anti-tamper locking.
- **Board Submission Flow**: Ready state tracking and board validation before match start.
- **Turn Rotation & Number Calling**: Calling queue, called number history, and host/random call timers.
- **Automatic Win Detection**: Server verification of row, column, and diagonal line completions.
- **Podium & Match Scorecards**: Real-time end-of-game victory flows and match outcomes.
#

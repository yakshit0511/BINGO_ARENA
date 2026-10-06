import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Gamepad2, Info, PlusCircle, Users, DoorClosed } from 'lucide-react';
import { roomService } from '../lib/roomService';
import { getPlayerSession, clearPlayerSession } from '../lib/session';
import { Room, Player } from '../types';
import { GameMockBoard } from '../components/landing/GameMockBoard';
import { Button } from '../components/ui/Button';
import { PageTransition } from '../components/layout/PageTransition';
import { RoomConfigCard } from '../components/room/RoomConfigCard';
import { DynamicGridPreview } from '../components/room/DynamicGridPreview';
import { RoomLobbyView } from '../components/room/RoomLobbyView';
import { ActiveGameView } from '../components/game/ActiveGameView';

export function GameRoomPage() {
  const { roomCode: paramCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoom() {
      setLoading(true);
      const session = getPlayerSession();
      const targetCode = paramCode || session?.roomCode;

      if (!targetCode) {
        const cached = roomService.getCurrentRoom();
        if (cached) {
          setCurrentRoom(cached);
          if (cached.players.length > 0) {
            setCurrentPlayer(cached.players[0]);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const res = await roomService.getRoom(targetCode);
        if (res.success && res.data) {
          setCurrentRoom(res.data);
          const matchedPlayer = session?.playerId
            ? res.data.players.find((p) => p.id === session.playerId)
            : res.data.players[0];
          if (matchedPlayer) {
            setCurrentPlayer(matchedPlayer);
          } else if (res.data.players.length > 0) {
            setCurrentPlayer(res.data.players[0]);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [paramCode]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-arcade-purple border-t-arcade-gold rounded-full animate-spin" />
      </div>
    );
  }

  // Room closed state
  if (currentRoom?.status === 'closed') {
    return (
      <PageTransition className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/40 border border-red-800 text-red-400 flex items-center justify-center">
          <DoorClosed className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">ROOM CLOSED</h2>
        <p className="text-xs text-arcade-muted">The host has closed this multiplayer room session.</p>
        <Link
          to="/"
          onClick={() => clearPlayerSession()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase"
        >
          Return to Home
        </Link>
      </PageTransition>
    );
  }

  // Ended match state -> Redirect to Results screen
  if (currentRoom && (currentRoom.status === 'finished' || currentRoom.game?.status === 'ended')) {
    return <Navigate to={`/results/${currentRoom.roomCode}`} replace />;
  }

  // If in an active game, won state, or no_winner state
  if (currentRoom && currentPlayer) {
    if (
      currentRoom.status === 'playing' ||
      currentRoom.game?.status === 'active' ||
      currentRoom.game?.status === 'won' ||
      currentRoom.game?.status === 'no_winner'
    ) {
      return (
        <ActiveGameView
          room={currentRoom}
          currentPlayer={currentPlayer}
          onExit={() => {
            clearPlayerSession();
            navigate('/');
          }}
        />
      );
    }

    return (
      <RoomLobbyView
        room={currentRoom}
        currentPlayer={currentPlayer}
        onLeave={() => {
          clearPlayerSession();
          navigate('/');
        }}
      />
    );
  }

  return (
    <PageTransition className="max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-arcade-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lobby</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/create">
            <Button variant="secondary" size="sm" leftIcon={<PlusCircle className="w-4 h-4 text-arcade-magenta" />}>
              Create Room
            </Button>
          </Link>
          <Link to="/join">
            <Button variant="secondary" size="sm" leftIcon={<Users className="w-4 h-4 text-arcade-gold" />}>
              Join Room
            </Button>
          </Link>
          <Link to="/results">
            <Button variant="ghost" size="sm">
              Podium
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-arcade-purple to-arcade-magenta flex items-center justify-center text-white mb-4 shadow-neon-purple">
          <Gamepad2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wide uppercase">
          Multiplayer Arena Floor
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-arcade-muted max-w-lg mx-auto">
          The dynamic N×N turn-based number grid game board renders here with real-time countdown timers, rotating turns, and 3D visual FX.
        </p>
      </div>

      {currentRoom ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <RoomConfigCard config={currentRoom.config} />
            </div>
            <div className="lg:col-span-7">
              <DynamicGridPreview config={currentRoom.config} hostName={currentRoom.hostName} />
            </div>
          </div>
        </div>
      ) : (
        /* Render Mock Board for Visual Staging when no active room */
        <GameMockBoard />
      )}

      <div className="mt-8 max-w-xl mx-auto p-4 rounded-2xl bg-arcade-surface/90 border border-arcade-purple/40 text-xs text-left text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-arcade-gold shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Stage 3 Game Setup Complete: </span>
          Dynamic board generation, custom winning words, and waiting lobbies are fully operational. Socket.IO player broadcasting and turn mechanics will be hooked in Prompt 4.
        </div>
      </div>
    </PageTransition>
  );
}

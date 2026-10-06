import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, Info, PlusCircle, Users } from 'lucide-react';
import { roomService } from '../lib/roomService';
import { Room } from '../types';
import { GameMockBoard } from '../components/landing/GameMockBoard';
import { Button } from '../components/ui/Button';
import { PageTransition } from '../components/layout/PageTransition';
import { RoomConfigCard } from '../components/room/RoomConfigCard';
import { DynamicGridPreview } from '../components/room/DynamicGridPreview';

export function GameRoomPage() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  useEffect(() => {
    const room = roomService.getCurrentRoom();
    if (room) {
      setCurrentRoom(room);
    }
  }, []);

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

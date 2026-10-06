import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, AlertCircle, PlusCircle, Users } from 'lucide-react';
import { Room, Player } from '../types';
import { roomService } from '../lib/roomService';
import { getPlayerSession } from '../lib/session';
import { BoardSetupView } from '../components/board/BoardSetupView';
import { PageTransition } from '../components/layout/PageTransition';
import { Button } from '../components/ui/Button';

export function SetupGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoomAndPlayer() {
      setLoading(true);
      setErrorMessage(null);

      // Check session storage first
      const session = getPlayerSession();
      const codeFromUrl = searchParams.get('code') || session?.roomCode;

      if (!codeFromUrl) {
        // Fallback: check if roomService has cached room
        const cached = roomService.getCurrentRoom();
        if (cached && cached.players.length > 0) {
          setRoom(cached);
          setCurrentPlayer(cached.players[0]);
          setLoading(false);
          return;
        }

        setLoading(false);
        return;
      }

      try {
        const response = await roomService.getRoom(codeFromUrl);
        if (response.success && response.data) {
          const loadedRoom = response.data;
          setRoom(loadedRoom);

          // Find current player by id or fallback to first player
          const matchedPlayer = session?.playerId
            ? loadedRoom.players.find((p) => p.id === session.playerId)
            : loadedRoom.players[0];

          if (matchedPlayer) {
            setCurrentPlayer(matchedPlayer);
          } else if (loadedRoom.players.length > 0) {
            setCurrentPlayer(loadedRoom.players[0]);
          } else {
            setErrorMessage('No active player found for this room.');
          }
        } else {
          setErrorMessage(response.message || 'Room could not be loaded.');
        }
      } catch {
        setErrorMessage('Failed to connect to game room.');
      } finally {
        setLoading(false);
      }
    }

    loadRoomAndPlayer();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-arcade-purple/20 border border-arcade-purple/40 flex items-center justify-center animate-pulse">
          <Gamepad2 className="w-6 h-6 text-fuchsia-400" />
        </div>
        <p className="text-sm font-mono text-arcade-muted">Loading your board arena...</p>
      </div>
    );
  }

  // If active room and player are present, render the full Board Setup View
  if (room && currentPlayer) {
    return (
      <PageTransition className="w-full">
        <BoardSetupView
          room={room}
          currentPlayer={currentPlayer}
          onBackToLobby={() => navigate(-1)}
        />
      </PageTransition>
    );
  }

  // If no room is joined yet, show friendly guidance
  return (
    <PageTransition className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-arcade-card border border-arcade-border flex items-center justify-center text-arcade-gold shadow-neon-purple">
        <Gamepad2 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-white uppercase tracking-wide">
          Board Preparation
        </h1>
        <p className="text-xs sm:text-sm text-arcade-muted">
          To prepare a custom Bingo board, you need an active game room session.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <Link to="/create" className="block">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            leftIcon={<PlusCircle className="w-5 h-5 text-arcade-gold" />}
          >
            CREATE NEW ROOM
          </Button>
        </Link>

        <Link to="/join" className="block">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            leftIcon={<Users className="w-5 h-5 text-arcade-magenta" />}
          >
            JOIN EXISTING ROOM
          </Button>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-arcade-muted hover:text-white pt-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
      </div>
    </PageTransition>
  );
}

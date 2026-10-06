import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  KeyRound,
  UserCheck,
  AlertCircle,
  Check,
} from 'lucide-react';
import { validatePlayerName, validateRoomCode } from '../utils/validation';
import { roomService } from '../lib/roomService';
import { Room, Player } from '../types';
import { Button } from '../components/ui/Button';
import { TiltCard } from '../components/ui/TiltCard';
import { PageTransition } from '../components/layout/PageTransition';
import { RoomLobbyView } from '../components/room/RoomLobbyView';

export function JoinGamePage() {
  const [searchParams] = useSearchParams();

  // Form State
  const [playerName, setPlayerName] = useState('Yakshit');
  const [roomCode, setRoomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Joined Session
  const [joinedRoom, setJoinedRoom] = useState<Room | null>(null);
  const [joinedPlayer, setJoinedPlayer] = useState<Player | null>(null);

  // Pre-fill room code from URL query param if present (e.g. /join?code=B7K4P2)
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setRoomCode(codeParam.trim().toUpperCase());
    }
  }, [searchParams]);

  // Validations
  const nameValidation = useMemo(
    () => validatePlayerName(playerName),
    [playerName]
  );

  const codeValidation = useMemo(
    () => validateRoomCode(roomCode),
    [roomCode]
  );

  const isFormValid = nameValidation.isValid && codeValidation.isValid;

  // Handle Room Code Change (auto-uppercase and alphanumeric only)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    setRoomCode(raw);
    setErrorMessage(null);
  };

  // Handle Join Submit
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await roomService.joinRoom(roomCode, playerName);
      if (response.success && response.data) {
        setJoinedRoom(response.data.room);
        setJoinedPlayer(response.data.player);
      } else {
        setErrorMessage(response.message || 'Unable to join arena room.');
      }
    } catch {
      setErrorMessage('Network or validation error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully joined, render Waiting Lobby View
  if (joinedRoom && joinedPlayer) {
    return (
      <PageTransition>
        <RoomLobbyView
          room={joinedRoom}
          currentPlayer={joinedPlayer}
          onLeave={() => {
            roomService.clearSession();
            setJoinedRoom(null);
            setJoinedPlayer(null);
          }}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="max-w-md mx-auto px-4 py-8 sm:py-16 w-full">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-arcade-muted hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Lobby</span>
      </Link>

      <TiltCard elevated glowColor="magenta" className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-arcade-magenta/20 border border-arcade-magenta/40 flex items-center justify-center text-arcade-gold shadow-neon-magenta">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">
              JOIN GAME ROOM
            </h1>
            <p className="text-xs text-arcade-muted">
              Enter your room code and display name to enter the arena
            </p>
          </div>
        </div>

        {/* Global error banner if room join failed */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          {/* Room Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="roomCode" className="text-xs font-bold uppercase tracking-wider text-arcade-muted">
                6-Character Room Code <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] font-mono text-arcade-muted">
                {roomCode.length}/6
              </span>
            </div>

            <div className="relative">
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="e.g. B7K4P2"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-arcade-bg border border-arcade-border text-white text-xl font-mono tracking-widest text-center uppercase focus:outline-none focus:border-arcade-magenta focus:ring-1 focus:ring-arcade-magenta transition"
              />
            </div>

            <div className="mt-1.5 text-xs">
              {roomCode.length > 0 && (
                codeValidation.isValid ? (
                  <p className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{codeValidation.message}</span>
                  </p>
                ) : (
                  <p className="text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{codeValidation.message}</span>
                  </p>
                )
              )}
            </div>
          </div>

          {/* Player Nickname Input */}
          <div>
            <label htmlFor="playerName" className="block text-xs font-bold uppercase tracking-wider text-arcade-muted mb-1.5">
              Player Nickname <span className="text-rose-400">*</span>
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Yakshit"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-arcade-bg border border-arcade-border text-white text-sm focus:outline-none focus:border-arcade-purple focus:ring-1 focus:ring-arcade-purple transition"
            />

            <div className="mt-1.5 text-xs">
              {playerName.length > 0 && !nameValidation.isValid && (
                <p className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{nameValidation.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Join Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!isFormValid || isSubmitting}
            isLoading={isSubmitting}
            className="w-full mt-4 font-black text-base shadow-neon-purple"
            leftIcon={<UserCheck className="w-5 h-5 text-arcade-gold" />}
          >
            ENTER ARENA ROOM
          </Button>
        </form>

        {/* Quick Join Demonstration Help */}
        <div className="mt-6 pt-4 border-t border-arcade-border/60 text-center">
          <p className="text-[11px] text-arcade-muted">
            Don't have a code?{' '}
            <Link to="/create" className="text-fuchsia-300 font-bold hover:underline">
              Create a new room
            </Link>{' '}
            or enter <code className="text-arcade-gold bg-arcade-bg px-1 py-0.5 rounded font-mono">B7K4P2</code> for instant demo.
          </p>
        </div>
      </TiltCard>
    </PageTransition>
  );
}

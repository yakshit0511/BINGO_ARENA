import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  KeyRound,
  User,
  AlertCircle,
  Check,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { validatePlayerName, validateRoomCode } from '../utils/validation';
import { roomService } from '../lib/roomService';
import { soundManager } from '../lib/sound';
import { Room, Player } from '../types';
import { PageTransition } from '../components/layout/PageTransition';
import { RoomLobbyView } from '../components/room/RoomLobbyView';
import { FuturisticStadium3D } from '../components/three/FuturisticStadium3D';

export function JoinGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form State
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Joined Session
  const [joinedRoom, setJoinedRoom] = useState<Room | null>(null);
  const [joinedPlayer, setJoinedPlayer] = useState<Player | null>(null);

  // Pre-fill room code from URL query param if present (e.g. /join?code=B7K4P2)
  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('room');
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

    soundManager.playGameStart();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await roomService.joinRoom(roomCode, playerName);
      if (response.success && response.data) {
        setJoinedRoom(response.data.room);
        setJoinedPlayer(response.data.player);
        navigate(`/game/${response.data.room.roomCode}`);
      } else {
        setErrorMessage(response.message || 'Unable to join arena room.');
      }
    } catch {
      setErrorMessage(
        'Unable to connect to server. If Render backend is waking up, please wait a moment and retry.'
      );
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
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      {/* 3D Stadium Atmosphere */}
      <FuturisticStadium3D intensity="compact" />

      {/* Main Glassmorphism Card */}
      <PageTransition className="relative z-10 w-full max-w-lg mx-auto">
        <div className="rounded-3xl bg-[#0e0c1c]/90 border border-purple-500/30 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_25px_rgba(168,85,247,0.25)] backdrop-blur-2xl">
          {/* Card Header */}
          <div className="flex items-center gap-3.5 pb-5 border-b border-purple-900/40 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]">
              <Gamepad2 className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-purple-300">
                JOIN BINGO ARENA
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Enter your 6-character room code & nickname
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 mb-5 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            {/* Room Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="roomCode"
                  className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ROOM CODE</span>
                </label>
                <span className="text-[11px] font-mono text-cyan-300 font-bold">
                  {roomCode.length} / 6
                </span>
              </div>

              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="e.g. B7K4P2"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl bg-[#090714]/90 border border-purple-900/60 text-white text-2xl font-mono font-black tracking-[0.3em] text-center uppercase focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />

              {roomCode.length > 0 && (
                <div className="text-xs pt-1">
                  {codeValidation.isValid ? (
                    <p className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>{codeValidation.message}</span>
                    </p>
                  ) : (
                    <p className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{codeValidation.message}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Player Nickname */}
            <div className="space-y-1.5">
              <label
                htmlFor="playerName"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>PLAYER NICKNAME</span>
              </label>

              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player nickname (e.g. ArcadeHero)"
                maxLength={20}
                className="w-full px-4 py-3 rounded-2xl bg-[#090714]/90 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
              />

              {playerName.length > 0 && !nameValidation.isValid && (
                <p className="text-xs text-rose-400 flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{nameValidation.message}</span>
                </p>
              )}
            </div>

            {/* Futuristic 3D Beveled Join Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`btn-3d-capsule w-full py-4 rounded-full text-base font-black text-white uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer select-none ${
                  !isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Connecting To Arena...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Enter Arena</span>
                    <ArrowRight className="w-5 h-5 text-purple-200" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Nav to Create Room */}
          <div className="mt-6 pt-4 border-t border-purple-900/40 text-center">
            <p className="text-xs text-slate-400">
              Want to host your own arena?{' '}
              <Link
                to="/create"
                className="text-cyan-400 font-bold hover:text-cyan-300 underline underline-offset-2 ml-1"
              >
                Create Room ➔
              </Link>
            </p>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Radio,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Users,
  Home,
  AlertCircle,
  X,
} from 'lucide-react';
import { Room, Player, GameState } from '../../types';
import { BingoBoard } from '../board/BingoBoard';
import { soundManager } from '../../lib/sound';
import { TiltCard } from '../ui/TiltCard';
import { NumberCallerGrid } from './NumberCallerGrid';
import { CurrentNumberBall } from './CurrentNumberBall';
import { RecentCallsList } from './RecentCallsList';
import {
  getSocket,
  onSocketStatusChange,
  callNumberSocket,
  requestGameStateSocket,
  joinRoomSocket,
} from '../../lib/socket';
import { mapBackendRoomToClient, BackendPublicRoom } from '../../lib/roomService';

interface ActiveGameViewProps {
  room: Room;
  currentPlayer: Player;
  onExit?: () => void;
}

export function ActiveGameView({ room: initialRoom, currentPlayer, onExit }: ActiveGameViewProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isSoundOn, setIsSoundOn] = useState(() => soundManager.isSoundEnabled());
  const [isCallingNumber, setIsCallingNumber] = useState(false);
  const [callingNumberVal, setCallingNumberVal] = useState<number | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const game: GameState | undefined = room.game;
  const gridSize = room.config.gridSize;
  const playerBoard = currentPlayer.board || [];

  // Determine current player
  const currentTurnPlayerId = game?.currentPlayerId;
  const currentTurnPlayer = room.players.find((p) => p.id === currentTurnPlayerId);
  const isMyTurn = currentTurnPlayerId === currentPlayer.id;

  // Track previous turn to trigger audio chimes on turn transition
  const prevIsMyTurnRef = useRef<boolean>(isMyTurn);

  // Determine next player in rotation
  const playerOrder =
    game?.playerOrder && game.playerOrder.length > 0
      ? game.playerOrder
      : room.players.map((p) => p.id);

  const currentIndex = game?.currentTurnIndex ?? 0;
  const nextIndex = playerOrder.length > 0 ? (currentIndex + 1) % playerOrder.length : 0;
  const nextPlayerId = playerOrder[nextIndex];
  const nextPlayer = room.players.find((p) => p.id === nextPlayerId);

  // Play turn chime when your turn activates
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      soundManager.playTurnStart();
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // Real-time Socket.IO subscriptions for authoritative game engine events
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(rawRoom));
      }
    };

    const handleGameState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(rawRoom));
      }
    };

    const handleNumberCalled = (data: { room?: BackendPublicRoom; number?: number }) => {
      soundManager.playNumberCall();
      if (data?.room && data.room.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(data.room));
      }
      setIsCallingNumber(false);
      setCallingNumberVal(null);
    };

    const handleGameError = (data: { message?: string }) => {
      if (data?.message) {
        setCallError(data.message);
      }
      setIsCallingNumber(false);
      setCallingNumberVal(null);
    };

    const unsubStatus = onSocketStatusChange((status) => {
      if (status === 'CONNECTED') {
        // Re-sync authoritative room and game state on reconnect
        joinRoomSocket(room.roomCode, currentPlayer.id).then((res) => {
          if (res.success && res.room) {
            setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
          }
        });
        requestGameStateSocket(room.roomCode).then((res) => {
          if (res.success && res.room) {
            setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
          }
        });
      }
    });

    socket.on('room:state', handleRoomState);
    socket.on('game:state', handleGameState);
    socket.on('game:number:called', handleNumberCalled);
    socket.on('game:error', handleGameError);

    return () => {
      unsubStatus();
      socket.off('room:state', handleRoomState);
      socket.off('game:state', handleGameState);
      socket.off('game:number:called', handleNumberCalled);
      socket.off('game:error', handleGameError);
    };
  }, [room.roomCode, currentPlayer.id]);

  // Handler for caller selecting a number from the grid
  const handleCallNumber = async (num: number) => {
    if (!isMyTurn || isCallingNumber) return;

    setIsCallingNumber(true);
    setCallingNumberVal(num);
    setCallError(null);

    try {
      const res = await callNumberSocket(room.roomCode, currentPlayer.id, num);
      if (!res.success) {
        setCallError(res.message || 'Failed to call number.');
        setIsCallingNumber(false);
        setCallingNumberVal(null);
      } else {
        soundManager.playNumberCall();
        if (res.room) {
          setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
        }
        setIsCallingNumber(false);
        setCallingNumberVal(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error calling number';
      setCallError(msg);
      setIsCallingNumber(false);
      setCallingNumberVal(null);
    }
  };

  const toggleSound = () => {
    const next = soundManager.toggleSound();
    setIsSoundOn(next);
  };

  const winningWord = room.config.winningWord;
  const completedLetters = game?.completedLetters ?? 0;
  const calledNumbers = game?.calledNumbers || [];
  const currentNumber =
    game?.currentNumber ?? (calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null);
  const currentCallerName =
    game?.currentCallerName ||
    (game?.lastCalledNumbers && game.lastCalledNumbers.length > 0
      ? game.lastCalledNumbers[0].playerName
      : null);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 select-none">
      {/* TOP ARENA BAR */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-arcade-border/80">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-xs text-arcade-muted hover:text-white transition px-2.5 py-1.5 rounded-lg border border-arcade-border/50 hover:bg-arcade-surface"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Exit Match</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-arcade-muted">ARENA:</span>
            <span className="font-mono text-base font-black text-white tracking-widest px-2.5 py-0.5 rounded-lg bg-arcade-bg border border-arcade-purple/50">
              {room.roomCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active Status Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-black text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>MATCH ACTIVE</span>
          </span>

          {/* Players in Match */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-arcade-surface border border-arcade-border text-xs font-bold text-arcade-gold">
            <Users className="w-3.5 h-3.5" />
            <span>{room.players.length} Players</span>
          </span>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isSoundOn ? 'Mute Sound' : 'Enable Sound'}
            className="p-1.5 rounded-lg bg-arcade-surface hover:bg-arcade-card border border-arcade-border text-slate-300 hover:text-white transition"
          >
            {isSoundOn ? (
              <Volume2 className="w-4 h-4 text-arcade-gold" />
            ) : (
              <VolumeX className="w-4 h-4 text-arcade-muted" />
            )}
          </button>
        </div>
      </div>

      {/* ERROR BANNER IF NUMBER CALL FAILED */}
      <AnimatePresence>
        {callError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{callError}</span>
            </div>
            <button
              onClick={() => setCallError(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2-COLUMN MAIN ARENA GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (7 Cols): Turn Banner + Locked Board + Number Caller Grid */}
        <div className="lg:col-span-7 space-y-6">
          {/* CURRENT TURN CARD */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative rounded-3xl p-6 sm:p-7 border-2 transition-all overflow-hidden ${
              isMyTurn
                ? 'bg-gradient-to-br from-arcade-card via-arcade-purple/20 to-arcade-surface border-arcade-magenta shadow-[0_0_35px_rgba(217,70,239,0.35)]'
                : 'bg-gradient-to-br from-arcade-card to-arcade-surface border-arcade-purple/40 shadow-arcade-card'
            }`}
          >
            {/* Ambient Aura */}
            <div
              className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                isMyTurn ? 'bg-arcade-magenta/25' : 'bg-arcade-purple/10'
              }`}
            />

            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-arcade-gold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CURRENT TURN #{game?.turnNumber ?? 1}</span>
                </div>

                <div className="flex items-center gap-3">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wide uppercase">
                    {isMyTurn ? (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-arcade-magenta via-fuchsia-300 to-amber-300">
                        YOUR TURN
                      </span>
                    ) : (
                      <span>WAITING FOR {currentTurnPlayer?.name || 'PLAYER'}</span>
                    )}
                  </h2>
                </div>

                <p className="mt-1 text-xs sm:text-sm text-arcade-muted">
                  {isMyTurn
                    ? 'Select an uncalled number from the grid below to broadcast to all contenders!'
                    : `Currently ${currentTurnPlayer?.name || 'contender'}'s turn. Next in rotation: ${nextPlayer?.name || 'Next'}.`}
                </p>
              </div>

              {/* Turn Status Pill */}
              <div className="shrink-0">
                {isMyTurn ? (
                  <div className="py-2.5 px-5 rounded-2xl bg-arcade-magenta/25 border border-arcade-magenta shadow-neon-magenta text-center">
                    <span className="text-xs font-black text-fuchsia-200 tracking-wider block">
                      YOU CALL
                    </span>
                    <span className="font-mono text-sm font-bold text-white">ACTIVE</span>
                  </div>
                ) : (
                  <div className="py-2.5 px-4 rounded-2xl bg-arcade-bg/80 border border-arcade-border text-center">
                    <Clock className="w-5 h-5 text-amber-400 mx-auto mb-0.5 animate-spin" />
                    <span className="text-[10px] font-bold text-arcade-muted block">WAITING</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* BOARD AREA (LOCKED & AUTO-HIGHLIGHTED) */}
          <div className="rounded-3xl bg-arcade-card/90 border border-arcade-border p-5 sm:p-6 shadow-arcade-card space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-arcade-border/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-white uppercase tracking-wider">
                  YOUR LOCKED BOARD ({gridSize}×{gridSize})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                AUTO-HIGHLIGHTING ACTIVE
              </span>
            </div>

            {/* Render Bingo Board with Auto-Highlighting */}
            <BingoBoard
              gridSize={gridSize}
              cells={playerBoard}
              onCellClick={() => {}}
              nextNumber={null}
              isLocked={true}
              calledNumbers={calledNumbers}
            />

            <p className="text-[11px] text-center text-arcade-muted">
              Called numbers illuminate automatically in gold with glowing rings as calls occur globally.
            </p>
          </div>

          {/* NUMBER CALLER GRID (DYNAMIC 1..N^2 NUMBERS) */}
          <NumberCallerGrid
            gridSize={gridSize}
            calledNumbers={calledNumbers}
            isMyTurn={isMyTurn}
            currentCallerName={currentTurnPlayer?.name || 'Active Player'}
            isProcessing={isCallingNumber}
            processingNumber={callingNumberVal}
            onCallNumber={handleCallNumber}
          />
        </div>

        {/* RIGHT COLUMN (5 Cols): 3D Ball + Recent Calls + Winning Word & Turn Order */}
        <div className="lg:col-span-5 space-y-6">
          {/* CURRENT NUMBER HERO 3D BALL */}
          <CurrentNumberBall
            currentNumber={currentNumber}
            callerName={currentCallerName}
            turnNumber={game?.turnNumber ?? 1}
          />

          {/* LAST 5 CALLED NUMBERS */}
          <RecentCallsList lastCalledNumbers={game?.lastCalledNumbers || []} />

          {/* WINNING PROGRESS CARD */}
          <TiltCard className="p-5 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-arcade-border/80">
              <span className="font-extrabold text-white uppercase flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-arcade-gold" />
                <span>Winning Target</span>
              </span>
              <span className="font-mono text-arcade-gold font-bold">
                {completedLetters} / {winningWord.length} Letters
              </span>
            </div>

            {/* Letters Grid */}
            <div className="flex items-center justify-center gap-2 py-1 flex-wrap">
              {winningWord.split('').map((letter, idx) => {
                const isUnlocked = idx < completedLetters;
                return (
                  <div
                    key={idx}
                    className={`w-9 h-10 rounded-xl border flex items-center justify-center font-mono font-black text-base transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 text-black shadow-neon-gold scale-105'
                        : 'bg-arcade-bg/90 border-arcade-border text-slate-400'
                    }`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-center text-arcade-muted">
              Complete lines across {gridSize} cells to unlock letters and win {winningWord}.
            </p>
          </TiltCard>

          {/* ACTIVE TURN ORDER ROSTER */}
          <div className="rounded-2xl bg-arcade-card border border-arcade-border p-5 space-y-3 shadow-arcade-card">
            <div className="flex items-center justify-between pb-2 border-b border-arcade-border/80 text-xs">
              <span className="font-extrabold text-white uppercase tracking-wider">
                TURN ROTATION
              </span>
              <span className="text-arcade-muted text-[11px]">Continuous Loop</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {playerOrder.map((pid, idx) => {
                const player = room.players.find((p) => p.id === pid);
                if (!player) return null;

                const isCurrent = pid === currentTurnPlayerId;
                const isYou = pid === currentPlayer.id;

                return (
                  <motion.div
                    key={pid}
                    layout
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-arcade-purple/30 via-arcade-card to-arcade-surface border-arcade-magenta shadow-neon-magenta'
                        : 'bg-arcade-surface/60 border-arcade-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                          isCurrent
                            ? 'bg-arcade-magenta text-white shadow-neon-magenta'
                            : 'bg-arcade-bg text-arcade-muted border border-arcade-border'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <span className="font-bold text-white truncate max-w-[120px]">
                        {player.name}
                      </span>

                      {player.isHost && (
                        <span className="text-[10px] font-black text-amber-300" title="Host">
                          👑
                        </span>
                      )}

                      {isYou && (
                        <span className="px-1.5 py-0.2 rounded bg-arcade-purple/30 text-fuchsia-300 text-[9px] font-black">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 font-mono text-[11px] font-bold">
                      {isCurrent ? (
                        <span className="text-arcade-magenta flex items-center gap-1 animate-pulse">
                          <span>CALLING</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-arcade-muted">Waiting</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

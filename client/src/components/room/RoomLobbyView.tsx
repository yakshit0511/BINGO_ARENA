import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Share2,
  Crown,
  Play,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  Home,
  LayoutGrid,
} from 'lucide-react';
import { Room, Player } from '../../types';
import { copyToClipboard } from '../../utils/roomCode';
import { roomService, mapBackendRoomToClient, BackendPublicRoom } from '../../lib/roomService';
import {
  getSocket,
  joinRoomSocket,
  leaveRoomSocket,
  onSocketStatusChange,
  SocketConnectionStatus,
  updateTurnOrderSocket,
  startGameSocket,
} from '../../lib/socket';
import { clearPlayerSession } from '../../lib/session';
import { soundManager } from '../../lib/sound';
import { Button } from '../ui/Button';
import { PlayerList } from './PlayerList';
import { RoomConfigCard } from './RoomConfigCard';
import { DynamicGridPreview } from './DynamicGridPreview';
import { BoardSetupView } from '../board/BoardSetupView';
import { TurnOrderConfig } from './TurnOrderConfig';
import { ActiveGameView } from '../game/ActiveGameView';

interface RoomLobbyViewProps {
  room: Room;
  currentPlayer: Player;
  onLeave: () => void;
}

export function RoomLobbyView({
  room: initialRoom,
  currentPlayer,
  onLeave,
}: RoomLobbyViewProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [viewMode, setViewMode] = useState<'LOBBY' | 'BOARD_SETUP'>('LOBBY');
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>('CONNECTING');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [roomClosedMessage, setRoomClosedMessage] = useState('The host has closed this game.');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [configuredTurnOrder, setConfiguredTurnOrder] = useState<string[]>(
    initialRoom.turnOrder || []
  );

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const isHost = currentPlayer.isHost;
  const myPlayer = room.players.find((p) => p.id === currentPlayer.id) || currentPlayer;
  const waitingPlayers = room.players.filter((p) => !p.hasSubmitted);
  const allPlayersSubmitted = room.allSubmitted || (room.players.length > 0 && waitingPlayers.length === 0);

  // Synchronize configured turn order when room updates
  useEffect(() => {
    if (room.turnOrder && room.turnOrder.length > 0) {
      setConfiguredTurnOrder(room.turnOrder);
    }
  }, [room.turnOrder]);

  // Real-time Socket.IO Connection & Events
  useEffect(() => {
    const socket = getSocket();

    // 1. Listen to socket connection state changes
    const unsubStatus = onSocketStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'CONNECTED') {
        // Re-join socket room upon reconnect or initial connection
        joinRoomSocket(room.roomCode, currentPlayer.id).then((res) => {
          if (res.success && res.room) {
            setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
          }
        });
      }
    });

    // 2. Authoritative room state listener
    const handleRoomState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(rawRoom));
      }
    };

    // 3. Room closed listener (e.g. host leaves)
    const handleRoomClosed = (data: { message?: string }) => {
      setIsRoomClosed(true);
      if (data?.message) {
        setRoomClosedMessage(data.message);
      }
      clearPlayerSession();
    };

    // 4. Turn order updated listener
    const handleTurnOrderUpdated = (data: { turnOrder?: string[] }) => {
      if (data?.turnOrder) {
        setConfiguredTurnOrder(data.turnOrder);
      }
    };

    // 5. Game started listener
    const handleGameStarted = (data: { room?: BackendPublicRoom; game?: any }) => {
      soundManager.playGameStart();
      if (data?.room) {
        setRoom(mapBackendRoomToClient(data.room));
      } else {
        roomService.getRoom(room.roomCode).then((res) => {
          if (res.success && res.data) {
            setRoom(res.data);
          }
        });
      }
    };

    // 6. Game authoritative state listener
    const handleGameState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(rawRoom));
      }
    };

    // 7. Number called listener
    const handleNumberCalled = (data: { room?: BackendPublicRoom }) => {
      soundManager.playNumberCall();
      if (data?.room && data.room.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(data.room));
      }
    };

    // 8. Game error listener
    const handleGameError = (data: { message?: string }) => {
      if (data?.message) {
        setStartError(data.message);
      }
    };

    socket.on('room:state', handleRoomState);
    socket.on('room:closed', handleRoomClosed);
    socket.on('room:turn-order:updated', handleTurnOrderUpdated);
    socket.on('game:started', handleGameStarted);
    socket.on('game:state', handleGameState);
    socket.on('game:number:called', handleNumberCalled);
    socket.on('game:error', handleGameError);

    // Initial socket join attempt
    joinRoomSocket(room.roomCode, currentPlayer.id).then((res) => {
      if (res.success && res.room) {
        setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
      }
    });

    return () => {
      unsubStatus();
      socket.off('room:state', handleRoomState);
      socket.off('room:closed', handleRoomClosed);
      socket.off('room:turn-order:updated', handleTurnOrderUpdated);
      socket.off('game:started', handleGameStarted);
      socket.off('game:state', handleGameState);
      socket.off('game:number:called', handleNumberCalled);
      socket.off('game:error', handleGameError);
    };
  }, [room.roomCode, currentPlayer.id]);

  // Guaranteed polling fallback: refreshes room state every 2.5s so board submissions and new joins sync automatically
  useEffect(() => {
    const interval = setInterval(() => {
      roomService.getRoom(room.roomCode).then((res) => {
        if (res.success && res.data) {
          setRoom(res.data);
        }
      }).catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [room.roomCode]);

  const handleTurnOrderChange = async (newOrder: string[]) => {
    setConfiguredTurnOrder(newOrder);
    setStartError(null);
    try {
      await updateTurnOrderSocket(room.roomCode, currentPlayer.id, newOrder);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update turn order';
      setStartError(msg);
    }
  };

  const handleStartGame = async () => {
    if (!isHost || isStarting) return;
    setIsStarting(true);
    setStartError(null);
    try {
      // 1. Attempt via Socket.IO
      const res = await startGameSocket(room.roomCode, currentPlayer.id, configuredTurnOrder);

      // 2. If socket was not acknowledged or failed, fallback to REST API
      if (!res.success) {
        console.warn('Socket startGame not acknowledged, trying REST API...', res.message);
        const restRes = await roomService.startGame(
          room.roomCode,
          currentPlayer.id,
          configuredTurnOrder
        );
        if (restRes.success && restRes.data) {
          setRoom(restRes.data.room);
          return;
        } else {
          setStartError(restRes.message || res.message || 'Failed to start game.');
          return;
        }
      }

      if (res.success && res.room) {
        setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
      } else if (res.success) {
        const fresh = await roomService.getRoom(room.roomCode);
        if (fresh.success && fresh.data) {
          setRoom(fresh.data);
        }
      }
    } catch (err: unknown) {
      // Fallback on error
      try {
        const restRes = await roomService.startGame(
          room.roomCode,
          currentPlayer.id,
          configuredTurnOrder
        );
        if (restRes.success && restRes.data) {
          setRoom(restRes.data.room);
          return;
        }
        setStartError(restRes.message || 'Failed to start game.');
      } catch {
        const msg = err instanceof Error ? err.message : 'Error starting game';
        setStartError(msg);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(room.roomCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Join my Bingo Arena Match!',
      text: `Join my Bingo Arena room: ${room.roomCode} (Matrix: ${room.config.gridSize}×${room.config.gridSize}, Word: ${room.config.winningWord})`,
      url: window.location.origin + `/join?code=${room.roomCode}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Dismissed
      }
    }

    await copyToClipboard(shareData.url);
    setShareFeedback('Invite link copied!');
    setTimeout(() => setShareFeedback(null), 2500);
  };

  const handleConfirmLeave = async () => {
    setShowLeaveConfirm(false);
    try {
      await leaveRoomSocket(room.roomCode, currentPlayer.id);
      await roomService.leaveRoom(room.roomCode, currentPlayer.id);
    } finally {
      clearPlayerSession();
      onLeave();
    }
  };

  // Status Badge Component
  const renderConnectionBadge = useCallback(() => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return (
          <span
            title="Real-time Socket.IO connected"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-black text-emerald-300"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>LIVE</span>
          </span>
        );
      case 'RECONNECTING':
        return (
          <span
            title="Reconnecting to Socket.IO server..."
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <Wifi className="w-3 h-3 text-amber-400" />
            <span>RECONNECTING…</span>
          </span>
        );
      case 'CONNECTING':
        return (
          <span
            title="Connecting to real-time server..."
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-arcade-purple/20 border border-arcade-purple/40 text-[11px] font-bold text-fuchsia-300"
          >
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
            <span>CONNECTING…</span>
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span
            title="Disconnected from real-time server"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] font-bold text-rose-300"
          >
            <WifiOff className="w-3 h-3 text-rose-400" />
            <span>OFFLINE</span>
          </span>
        );
    }
  }, [connectionStatus]);

  // If host closed room, show Room Closed modal
  if (isRoomClosed) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-arcade-card border-2 border-rose-500/50 p-8 shadow-arcade-card space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-wide uppercase">
              Room Closed
            </h2>
            <p className="text-sm text-arcade-muted">{roomClosedMessage}</p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onLeave}
              className="w-full"
              leftIcon={<Home className="w-5 h-5 text-arcade-gold" />}
            >
              RETURN HOME
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // If game is active / playing, render ActiveGameView
  if (room.status === 'playing' || room.game?.status === 'active') {
    return (
      <ActiveGameView
        room={room}
        currentPlayer={myPlayer}
        onExit={() => setShowLeaveConfirm(true)}
      />
    );
  }

  // If viewing board preparation screen
  if (viewMode === 'BOARD_SETUP') {
    return (
      <BoardSetupView
        room={room}
        currentPlayer={myPlayer}
        onBackToLobby={() => setViewMode('LOBBY')}
        onRoomUpdate={(updatedRoom) => setRoom(updatedRoom)}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar with Leave Button & Title */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-arcade-border/80">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-arcade-muted hover:text-white transition group focus:outline-none focus:ring-2 focus:ring-arcade-purple/50 rounded-lg px-1.5 py-0.5"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Exit Arena Lobby</span>
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Quick Board Setup Mode CTA in Header */}
          <Button
            variant={myPlayer.hasSubmitted ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setViewMode('BOARD_SETUP')}
            leftIcon={<LayoutGrid className="w-4 h-4 text-arcade-gold" />}
            className="text-xs font-black shadow-sm"
          >
            {myPlayer.hasSubmitted ? 'MY BOARD (LOCKED ✓)' : 'PREPARE BOARD →'}
          </Button>

          {/* Real-time Socket Connection Badge */}
          {renderConnectionBadge()}

          {/* Role Badge */}
          {isHost ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-xs font-black text-amber-300">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>HOST</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcade-purple/20 border border-arcade-purple/50 text-xs font-bold text-fuchsia-300">
              <span>CONTENDER</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Room Code Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-3xl bg-gradient-to-br from-arcade-card via-arcade-surface to-arcade-card border-2 border-arcade-purple/50 p-6 sm:p-10 shadow-arcade-card text-center overflow-hidden"
      >
        {/* Ambient Glow Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-arcade-purple/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arcade-bg/80 border border-arcade-border text-xs font-bold text-arcade-magenta mb-3">
            <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
            <span>REAL-TIME MULTIPLAYER LOBBY</span>
          </div>

          <h1 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-2">
            Share Room Code with Players
          </h1>

          {/* Large Visual Room Code Display */}
          <div className="my-4 py-4 px-6 rounded-2xl bg-arcade-bg/90 border border-arcade-purple/60 inline-flex items-center gap-4 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]">
            <span className="font-mono text-3xl sm:text-5xl font-black tracking-widest text-white selection:bg-arcade-magenta selection:text-white">
              {room.roomCode}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              title="Copy code to clipboard"
              className="h-10 px-3"
            >
              {copied ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4" />
                  <span>Copied</span>
                </span>
              ) : (
                <Copy className="w-4 h-4 text-arcade-gold" />
              )}
            </Button>
          </div>

          {/* Action Buttons: Copy, Share, Prepare Board */}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewMode('BOARD_SETUP')}
              leftIcon={<LayoutGrid className="w-4 h-4 text-arcade-gold" />}
              className="font-black shadow-neon-magenta"
            >
              {myPlayer.hasSubmitted ? 'VIEW MY BOARD (LOCKED ✓)' : 'PREPARE YOUR BOARD →'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-arcade-gold" />}
            >
              {copied ? 'Code Copied!' : 'Copy Code'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              leftIcon={<Share2 className="w-4 h-4 text-arcade-magenta" />}
            >
              {shareFeedback || 'Share Invite'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Two-Column Grid: Left (Player List & Start Actions) | Right (Room Config & Dynamic Grid Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <PlayerList
            players={room.players}
            maxPlayers={room.config.playerLimit}
            currentUserId={currentPlayer.id}
          />

          {/* Match Launch & Host Controls Card */}
          <div className="rounded-2xl bg-arcade-card border border-arcade-border p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-arcade-muted font-bold uppercase tracking-wider">
                Preparation Status
              </span>
              <span className="text-arcade-gold font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {room.players.filter((p) => p.hasSubmitted).length} / {room.players.length} Submitted
              </span>
            </div>

            {/* If player has not prepared their board yet, display banner */}
            {!myPlayer.hasSubmitted && (
              <div className="p-3.5 rounded-xl bg-arcade-purple/20 border border-arcade-purple/50 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-black text-white">Action Required:</div>
                  <div className="text-[11px] text-fuchsia-300">Place your {room.config.gridSize * room.config.gridSize} numbers</div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setViewMode('BOARD_SETUP')}
                  className="text-xs shrink-0"
                >
                  Setup Now
                </Button>
              </div>
            )}

            {/* Stage Notice */}
            <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border text-[11px] text-arcade-muted flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-arcade-gold shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Live Socket.IO Synchronized: </strong>
                All connected players receive instant updates.
              </div>
            </div>

            {/* Turn Order Configuration UI */}
            {room.players.length > 0 && (
              <TurnOrderConfig
                players={room.players}
                hostPlayerId={room.hostId}
                currentUserId={currentPlayer.id}
                isHost={isHost}
                configuredOrder={configuredTurnOrder}
                onOrderChange={handleTurnOrderChange}
                disabled={isStarting}
              />
            )}

            {/* Error Message Toast / Alert */}
            {startError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{startError}</span>
              </div>
            )}

            {/* All Players Submitted Celebration / Host Start Action */}
            {allPlayersSubmitted ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/50 space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-black text-emerald-300">
                  <Sparkles className="w-4 h-4 text-arcade-gold" />
                  <span>🎉 ALL BOARDS READY</span>
                </div>
                <p className="text-xs text-slate-300">
                  All participating players have locked in their boards. {isHost ? 'Configure turn order above and launch the game.' : 'Waiting for host to launch.'}
                </p>

                {isHost ? (
                  <div className="space-y-1.5 pt-1">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full text-base font-extrabold shadow-neon-gold"
                      leftIcon={<Play className="w-5 h-5 text-arcade-gold" />}
                      onClick={handleStartGame}
                      disabled={isStarting}
                    >
                      {isStarting ? 'STARTING ARENA...' : 'START GAME'}
                    </Button>
                    <p className="text-[10px] text-center text-arcade-muted">
                      Locks player roster & begins turn rotation.
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-2 rounded-lg bg-arcade-bg/60 border border-arcade-border text-xs text-arcade-muted">
                    Waiting for host <strong className="text-white">({room.hostName})</strong> to start match...
                  </div>
                )}
              </div>
            ) : (
              /* Waiting for some players to finish submitting */
              <div className="space-y-2">
                {isHost ? (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      disabled
                      className="w-full text-base font-extrabold opacity-60 cursor-not-allowed"
                      leftIcon={<Play className="w-5 h-5 text-arcade-gold" />}
                    >
                      START GAME (Waiting for Boards)
                    </Button>
                    <p className="text-[11px] text-center text-arcade-muted">
                      Waiting for:{' '}
                      <strong className="text-amber-300">
                        {waitingPlayers.map((p) => p.name).join(', ')}
                      </strong>
                    </p>
                  </>
                ) : (
                  <div className="text-center p-3 rounded-xl bg-arcade-bg/80 border border-arcade-border text-xs text-arcade-muted">
                    Waiting for players to prepare boards:{' '}
                    <strong className="text-amber-300">
                      {waitingPlayers.map((p) => p.name).join(', ')}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Rulebook & Dynamic Grid Preview */}
        <div className="lg:col-span-7 space-y-6">
          <RoomConfigCard config={room.config} />

          <DynamicGridPreview config={room.config} hostName={room.hostName} />
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-arcade-card border border-arcade-border p-6 shadow-arcade-card space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {isHost ? 'Close Room & Exit?' : 'Leave Game Lobby?'}
                  </h3>
                  <p className="text-xs text-arcade-muted">
                    {isHost
                      ? 'As the host, leaving now will close this lobby for all participants.'
                      : 'You can rejoin anytime using the room code if slots remain.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowLeaveConfirm(false)}
                >
                  Stay in Lobby
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmLeave}
                  className="bg-rose-600 hover:bg-rose-500 border-rose-500 text-white"
                >
                  {isHost ? 'Close & Exit' : 'Leave Lobby'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

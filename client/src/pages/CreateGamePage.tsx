import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Crown,
  User,
  Sliders,
  Trophy,
  Users,
  Radio,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import {
  PLAYER_LIMIT_OPTIONS,
  CALLING_MODES,
  WORD_SUGGESTIONS_BY_SIZE,
} from '../constants';
import { GameConfig, CallingMode, MarkingMode, Room, Player } from '../types';
import { validateWinningWord, validatePlayerName } from '../utils/validation';
import { roomService } from '../lib/roomService';
import { soundManager } from '../lib/sound';
import { PageTransition } from '../components/layout/PageTransition';
import { GridSizeSelector } from '../components/room/GridSizeSelector';
import { DynamicGridPreview } from '../components/room/DynamicGridPreview';
import { RoomLobbyView } from '../components/room/RoomLobbyView';
import { FuturisticStadium3D } from '../components/three/FuturisticStadium3D';
import { TiltCard } from '../components/ui/TiltCard';

export function CreateGamePage() {
  const navigate = useNavigate();

  // Form State - Empty by default as requested
  const [hostName, setHostName] = useState('');
  const [gridSize, setGridSize] = useState<number>(5);
  const [playerLimit, setPlayerLimit] = useState<number>(10);
  const [winningWord, setWinningWord] = useState<string>('BINGO');
  const [callingMode, setCallingMode] = useState<CallingMode>('turn-based');
  const [markingMode, setMarkingMode] = useState<MarkingMode>('auto');
  const [hostParticipates, setHostParticipates] = useState<boolean>(true);

  // Loading, Error & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [hostPlayer, setHostPlayer] = useState<Player | null>(null);

  // Real-time Validations
  const wordValidation = useMemo(
    () => validateWinningWord(winningWord, gridSize),
    [winningWord, gridSize]
  );

  const nameValidation = useMemo(
    () => validatePlayerName(hostName),
    [hostName]
  );

  const isFormValid = wordValidation.isValid && nameValidation.isValid;

  // Configuration object ready for state & backend API
  const currentConfig: GameConfig = useMemo(
    () => ({
      gridSize,
      playerLimit,
      winningWord: wordValidation.cleanWord || winningWord.toUpperCase(),
      callingMode,
      hostParticipates,
      markingMode,
    }),
    [gridSize, playerLimit, wordValidation.cleanWord, winningWord, callingMode, hostParticipates, markingMode]
  );

  // Handle Grid Size Change
  const handleGridSizeChange = (newSize: number) => {
    soundManager.playButtonClick();
    setGridSize(newSize);
    setErrorMessage(null);

    // Auto-suggest word for new grid length
    const suggestions = WORD_SUGGESTIONS_BY_SIZE[newSize];
    if (suggestions && suggestions.length > 0) {
      setWinningWord(suggestions[0]);
    } else {
      if (winningWord.length !== newSize) {
        setWinningWord(winningWord.slice(0, newSize));
      }
    }
  };

  // Handle Winning Word Input Change
  const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    setWinningWord(raw);
    setErrorMessage(null);
  };

  // Quick word suggestion click
  const handleSelectWordSuggestion = (suggested: string) => {
    soundManager.playButtonClick();
    setWinningWord(suggested.toUpperCase());
    setErrorMessage(null);
  };

  // Create Room Submission
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    soundManager.playGameStart();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await roomService.createRoom(hostName.trim(), currentConfig);
      if (response.success && response.data) {
        setCreatedRoom(response.data);
        setHostPlayer(response.data.players[0]);
        navigate(`/game/${response.data.roomCode}`);
      } else {
        setErrorMessage(response.message || 'Failed to create room on server.');
      }
    } catch {
      setErrorMessage(
        'Unable to connect to server. If Render backend is waking up, please wait ~30 seconds and retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If room is created, show Room Lobby
  if (createdRoom && hostPlayer) {
    return (
      <PageTransition>
        <RoomLobbyView
          room={createdRoom}
          currentPlayer={hostPlayer}
          onLeave={() => {
            roomService.clearSession();
            setCreatedRoom(null);
            setHostPlayer(null);
          }}
        />
      </PageTransition>
    );
  }

  const wordSuggestions = WORD_SUGGESTIONS_BY_SIZE[gridSize] || [];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* 3D Stadium Scene in Background */}
      <FuturisticStadium3D intensity="full" />

      {/* Main Glassmorphic Container */}
      <PageTransition className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arena Floor</span>
        </Link>

        {/* Page Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-purple-900/40">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-400">
              CREATE YOUR GAME
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Build your room. Choose your rules. Start your arena.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#17132e] border border-purple-800/40 text-xs">
            <Crown className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-bold text-amber-300 text-[11px] leading-tight">
                Room Architect
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                Create. Invite. Play. Together.
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ------------------------------------------------------------- */}
            {/* LEFT COLUMN: GAME CUSTOMIZATION CONTROLS (7 Cols)             */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-5">
              {/* Section 1: Host Identity */}
              <TiltCard className="p-5 sm:p-6 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                  <label
                    htmlFor="hostName"
                    className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-purple-400" />
                    <span>Host Nickname</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Max 20 chars</span>
                </div>

                <div className="relative">
                  <input
                    id="hostName"
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Enter host nickname (e.g. HostPlayer)"
                    maxLength={20}
                    className="w-full px-4 py-3 rounded-xl bg-[#090714]/90 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/80 transition"
                  />
                </div>

                {hostName.trim().length > 0 && !nameValidation.isValid && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{nameValidation.message}</span>
                  </p>
                )}
                {hostName.trim().length > 0 && nameValidation.isValid && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Display name is ready</span>
                  </p>
                )}
              </TiltCard>

              {/* Section 2: Matrix Dimensions (5x5 to 12x12) */}
              <TiltCard className="p-5 sm:p-6 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <GridSizeSelector value={gridSize} onChange={handleGridSizeChange} />
              </TiltCard>

              {/* Section 3: Winning Word Target */}
              <TiltCard className="p-5 sm:p-6 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                  <label
                    htmlFor="winningWord"
                    className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Target Winning Word</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Length must equal {gridSize} letters
                  </span>
                </div>

                <div>
                  <div className="relative">
                    <input
                      id="winningWord"
                      type="text"
                      value={winningWord}
                      onChange={handleWordChange}
                      maxLength={gridSize}
                      placeholder={`e.g. ${wordSuggestions[0] || 'WORD'}`}
                      className="w-full px-4 py-3 rounded-xl bg-[#090714]/90 border border-purple-900/60 text-white font-mono tracking-widest uppercase text-base focus:outline-none focus:border-purple-400 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                      {winningWord.length}/{gridSize}
                    </span>
                  </div>

                  {/* Word Validation message */}
                  <div className="mt-2 text-xs">
                    {wordValidation.isValid ? (
                      <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>{wordValidation.message}</span>
                      </p>
                    ) : (
                      <p className="text-rose-400 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{wordValidation.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Word Suggestions */}
                  {wordSuggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Suggested {gridSize}-Letter Words:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {wordSuggestions.map((word) => (
                          <button
                            key={word}
                            type="button"
                            onClick={() => handleSelectWordSuggestion(word)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                              winningWord === word
                                ? 'bg-purple-600/30 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                : 'bg-[#141228] border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500/50'
                            }`}
                          >
                            {word}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TiltCard>

              {/* Section 4: Calling Mode & Player Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Player Limit */}
                <TiltCard className="p-5 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>Player Limit</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Maximum players in room (Host included)
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {PLAYER_LIMIT_OPTIONS.map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => {
                          soundManager.playButtonClick();
                          setPlayerLimit(limit);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          playerLimit === limit
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                            : 'bg-[#141228] border-purple-900/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {limit}
                      </button>
                    ))}
                  </div>
                </TiltCard>

                {/* Calling Mode */}
                <TiltCard className="p-5 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>Calling Mode</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {CALLING_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => {
                          soundManager.playButtonClick();
                          setCallingMode(mode.value);
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                          callingMode === mode.value
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                            : 'bg-[#141228] border-purple-900/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-2 rounded-lg bg-[#090714]/80 border border-purple-900/40 text-[11px] text-slate-400">
                    {callingMode === 'turn-based'
                      ? 'Players take turns calling an unused number in rotation.'
                      : 'Server automatically calls random numbers at intervals.'}
                  </div>
                </TiltCard>
              </div>

              {/* Section 5: Marking Mode */}
              <TiltCard className="p-5 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Marking Mode</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-cyan-400">
                    {markingMode === 'auto' ? 'Online Auto-Daub' : 'Manual Party Room'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playButtonClick();
                      setMarkingMode('auto');
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      markingMode === 'auto'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-[#141228] border-purple-900/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Auto-Daub
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playButtonClick();
                      setMarkingMode('manual');
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      markingMode === 'manual'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'bg-[#141228] border-purple-900/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    👆 Manual Mode
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {markingMode === 'auto'
                    ? 'Called numbers automatically highlight on all player boards with real-time sync.'
                    : 'Players physically tap called numbers on their board (Ideal for in-person party rooms).'}
                </p>
              </TiltCard>

              {/* Section 6: Host Participation */}
              <TiltCard className="p-5 rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hostParticipates}
                    onChange={(e) => setHostParticipates(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-purple-800 text-purple-600 focus:ring-purple-500 bg-[#141228] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">
                      HOST PARTICIPATES
                    </span>
                    <span className="text-xs text-slate-400">
                      ✓ Host will also receive a Bingo board. The host counts as 1 of the {playerLimit} total player slots.
                    </span>
                  </div>
                </label>
              </TiltCard>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT COLUMN: STICKY LIVE ARENA PREVIEW & BLUEPRINT (5 Cols)  */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
              <DynamicGridPreview config={currentConfig} hostName={hostName} />

              {/* Quick Match Blueprint Card */}
              <div className="rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 p-4 space-y-3 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Arena Blueprint</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300">
                    {isFormValid ? 'Ready to Launch' : 'Drafting Rules'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#090714]/80 border border-purple-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Matrix Grid</span>
                    <span className="text-white font-mono font-bold">{gridSize}×{gridSize} ({gridSize * gridSize} Nos)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090714]/80 border border-purple-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Winning Word</span>
                    <span className="text-amber-400 font-mono font-bold tracking-widest">{currentConfig.winningWord || '—'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090714]/80 border border-purple-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Player Cap</span>
                    <span className="text-slate-200 font-bold">{playerLimit} Players Max</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090714]/80 border border-purple-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Marking Mode</span>
                    <span className={markingMode === 'auto' ? 'text-cyan-300 font-bold' : 'text-purple-300 font-bold'}>
                      {markingMode === 'auto' ? '⚡ Auto-Daub' : '👆 Manual'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Host: <strong className="text-white">{hostParticipates ? 'Player & Host' : 'Spectator'}</strong></span>
                  <span>Calling: <strong className="text-amber-400 capitalize">{callingMode}</strong></span>
                </div>
              </div>

              {/* Rule Verification Explanation */}
              <div className="p-3.5 rounded-xl bg-[#0e0c1c]/80 border border-purple-900/40 text-xs text-slate-300 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong className="text-white">Rule Verification: </strong>
                  Each completed row, column, or diagonal line in the matrix will light up one letter of your winning word (<strong>{currentConfig.winningWord}</strong>) until a player completes all {gridSize} letters.
                </div>
              </div>

              {/* Form Validation Indicator */}
              {isFormValid ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Ready to deploy arena room with {gridSize}×{gridSize} matrix.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Please provide a valid {gridSize}-letter word and nickname to proceed.</span>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CENTERED 3D BEVELED CAPSULE BUTTON                            */}
          {/* ------------------------------------------------------------- */}
          <div className="flex justify-center items-center pt-4 pb-6">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`btn-3d-capsule px-10 py-3.5 sm:px-14 sm:py-4 rounded-full text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center justify-center gap-3 cursor-pointer select-none ${
                !isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Creating Arena...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🎲</span>
                  <span>Create Room</span>
                  <ArrowRight className="w-5 h-5 text-purple-200" />
                </>
              )}
            </button>
          </div>
        </form>
      </PageTransition>
    </div>
  );
}

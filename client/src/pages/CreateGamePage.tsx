import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Sliders,
  Users,
  Trophy,
  Radio,
  UserCheck,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  PLAYER_LIMIT_OPTIONS,
  CALLING_MODES,
  WORD_SUGGESTIONS_BY_SIZE,
} from '../constants';
import { GameConfig, CallingMode, Room, Player } from '../types';
import { validateWinningWord, validatePlayerName } from '../utils/validation';
import { roomService } from '../lib/roomService';
import { Button } from '../components/ui/Button';
import { TiltCard } from '../components/ui/TiltCard';
import { PageTransition } from '../components/layout/PageTransition';
import { GridSizeSelector } from '../components/room/GridSizeSelector';
import { DynamicGridPreview } from '../components/room/DynamicGridPreview';
import { RoomLobbyView } from '../components/room/RoomLobbyView';

export function CreateGamePage() {
  // Form State
  const [hostName, setHostName] = useState('MasterCaller');
  const [gridSize, setGridSize] = useState<number>(5);
  const [playerLimit, setPlayerLimit] = useState<number>(10);
  const [winningWord, setWinningWord] = useState<string>('BINGO');
  const [callingMode, setCallingMode] = useState<CallingMode>('turn-based');
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

  // Configuration object ready for state & future backend API
  const currentConfig: GameConfig = useMemo(
    () => ({
      gridSize,
      playerLimit,
      winningWord: wordValidation.cleanWord || winningWord.toUpperCase(),
      callingMode,
      hostParticipates,
    }),
    [gridSize, playerLimit, wordValidation.cleanWord, winningWord, callingMode, hostParticipates]
  );

  // Handle Grid Size Change
  const handleGridSizeChange = (newSize: number) => {
    setGridSize(newSize);
    setErrorMessage(null);
    // If current word length doesn't match new size, auto-suggest or keep user typing
    const suggestions = WORD_SUGGESTIONS_BY_SIZE[newSize];
    if (suggestions && suggestions.length > 0) {
      setWinningWord(suggestions[0]);
    } else {
      // Pad or trim if no preset
      if (winningWord.length !== newSize) {
        setWinningWord(winningWord.slice(0, newSize));
      }
    }
  };

  // Handle Winning Word Input Change (auto-uppercase)
  const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    setWinningWord(raw);
    setErrorMessage(null);
  };

  // Quick word suggestion click
  const handleSelectWordSuggestion = (suggested: string) => {
    setWinningWord(suggested.toUpperCase());
    setErrorMessage(null);
  };

  // Create Room Submission
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await roomService.createRoom(hostName, currentConfig);
      if (response.success && response.data) {
        setCreatedRoom(response.data);
        setHostPlayer(response.data.players[0]);
      } else {
        setErrorMessage(response.message || 'Failed to create room on server.');
      }
    } catch {
      setErrorMessage('Unable to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If room is created in local state, render the Room Lobby
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
    <PageTransition className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Navigation breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-arcade-muted hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Lobby</span>
      </Link>

      {/* Page Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arcade-surface border border-arcade-border text-xs font-semibold text-arcade-magenta mb-2">
          <Sliders className="w-3.5 h-3.5 text-arcade-gold" />
          <span>Room Architect</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
          CREATE YOUR GAME
        </h1>
        <p className="mt-1 text-sm sm:text-base text-arcade-muted">
          Build your room. Choose your rules. Start your arena.
        </p>
      </div>

      {/* Main Two-Column Layout (Form on Left | Live Preview on Right) */}
      <form onSubmit={handleCreateRoom} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Host Profile */}
          <TiltCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-arcade-border/80 text-sm font-black text-white uppercase">
              <UserCheck className="w-4 h-4 text-arcade-purple" />
              <span>Host Identity</span>
            </div>

            <div>
              <label htmlFor="hostName" className="block text-xs font-bold uppercase tracking-wider text-arcade-muted mb-1.5">
                Host Nickname <span className="text-rose-400">*</span>
              </label>
              <input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. MasterCaller"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-arcade-bg border border-arcade-border text-white text-sm focus:outline-none focus:border-arcade-purple focus:ring-1 focus:ring-arcade-purple transition"
              />
              {!nameValidation.isValid ? (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{nameValidation.message}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Display name is ready</span>
                </p>
              )}
            </div>
          </TiltCard>

          {/* Section 2: Grid Size Selector */}
          <TiltCard className="p-5 sm:p-6">
            <GridSizeSelector value={gridSize} onChange={handleGridSizeChange} />
          </TiltCard>

          {/* Section 3: Winning Word */}
          <TiltCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-arcade-border/80">
              <label htmlFor="winningWord" className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-arcade-gold" />
                <span>Winning Word Target</span>
              </label>
              <span className="text-xs font-mono font-bold text-arcade-gold">
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
                  className="w-full px-4 py-3.5 rounded-xl bg-arcade-bg border border-arcade-border text-white text-base font-mono tracking-widest uppercase focus:outline-none focus:border-arcade-magenta focus:ring-1 focus:ring-arcade-magenta transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-arcade-muted">
                  {winningWord.length}/{gridSize}
                </span>
              </div>

              {/* Live Word Validation Message */}
              <div className="mt-2 text-xs">
                {wordValidation.isValid ? (
                  <p className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{wordValidation.message}</span>
                  </p>
                ) : (
                  <p className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{wordValidation.message}</span>
                  </p>
                )}
              </div>

              {/* Word Inspiration Suggestions */}
              {wordSuggestions.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-arcade-muted mb-1.5">
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
                            ? 'bg-arcade-magenta/20 border-arcade-magenta text-fuchsia-300 shadow-neon-magenta'
                            : 'bg-arcade-bg/60 border-arcade-border text-slate-400 hover:text-white hover:border-arcade-purple/50'
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

          {/* Section 4: Player Limit & Calling Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player Limit */}
            <TiltCard className="p-5 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-arcade-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-arcade-magenta" />
                <span>Player Limit</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Maximum players in this room (Host included)
              </p>

              <div className="grid grid-cols-3 gap-2">
                {PLAYER_LIMIT_OPTIONS.map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setPlayerLimit(limit)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      playerLimit === limit
                        ? 'bg-arcade-magenta/25 border-arcade-magenta text-white shadow-neon-magenta'
                        : 'bg-arcade-bg/80 border-arcade-border text-slate-400 hover:text-white hover:border-arcade-border-accent'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </TiltCard>

            {/* Calling Mode */}
            <TiltCard className="p-5 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-arcade-muted flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Calling Mode</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {CALLING_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setCallingMode(mode.value)}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                      callingMode === mode.value
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-neon-gold'
                        : 'bg-arcade-bg/80 border-arcade-border text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-lg bg-arcade-bg/60 border border-arcade-border text-[11px] text-arcade-muted">
                {callingMode === 'turn-based'
                  ? 'Players take turns calling an unused number. The turn rotates through the room’s player order.'
                  : 'The server automatically chooses and broadcasts an unused number randomly at timed intervals.'}
              </div>
            </TiltCard>
          </div>

          {/* Section 5: Host Participation */}
          <TiltCard className="p-5">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hostParticipates}
                onChange={(e) => setHostParticipates(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-arcade-border text-arcade-purple focus:ring-arcade-purple bg-arcade-bg cursor-pointer"
              />
              <div>
                <span className="text-sm font-bold text-white block">
                  HOST PARTICIPATES
                </span>
                <span className="text-xs text-arcade-muted">
                  ✓ Host will also receive a Bingo board. The host counts as 1 of the {playerLimit} total player slots.
                </span>
              </div>
            </label>
          </TiltCard>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Create Button */}
          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isFormValid || isSubmitting}
              isLoading={isSubmitting}
              className="w-full text-base font-extrabold shadow-neon-magenta"
              leftIcon={<Sparkles className="w-5 h-5 text-arcade-gold" />}
            >
              CREATE GAME ROOM
            </Button>

            {!isFormValid && (
              <p className="mt-2 text-center text-xs text-arcade-muted">
                Please provide a valid {gridSize}-letter winning word and nickname to proceed.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Preview (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <DynamicGridPreview config={currentConfig} hostName={hostName} />

          <div className="p-4 rounded-xl bg-arcade-surface/60 border border-arcade-border text-xs text-slate-400 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-arcade-gold shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Rule Verification: </strong>
              Each completed row, column, or diagonal line in the matrix will light up one letter of your winning word (<strong>{currentConfig.winningWord}</strong>) until a player completes all {gridSize} letters.
            </div>
          </div>
        </div>
      </form>
    </PageTransition>
  );
}

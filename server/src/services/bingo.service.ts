/**
 * Bingo Arena - Authoritative Bingo / Winning Detection Engine
 * Evaluates rows, columns, main-diagonal, anti-diagonal for any N×N matrix.
 * Awards letters sequentially from the host-configured winning word.
 * Guarantees atomic, deterministic, server-authoritative win resolution.
 */

export type LineType = 'row' | 'column' | 'main-diagonal' | 'anti-diagonal';

export interface LineDefinition {
  id: string; // "row-0", "column-1", "main-diagonal", "anti-diagonal"
  type: LineType;
  index: number; // 0..N-1 for row/column, 0 for diagonals
  cellIndices: number[]; // 0..(N^2 - 1)
  numbers: number[]; // numbers at those cells on the player's board
}

export interface PlayerLineEvaluation {
  playerId: string;
  playerName: string;
  allCompletedLines: string[];
  newlyCompletedLines: string[];
  newlyCompletedLineDetails: LineDefinition[];
  earnedLetters: string[];
  newlyEarnedLetters: string[];
  completedLineCount: number;
  hasWon: boolean;
}

export interface RoomBingoEvaluation {
  playerEvaluations: Map<string, PlayerLineEvaluation>;
  winner: PlayerLineEvaluation | null;
}

export class BingoService {
  /**
   * Generates all 2N + 2 deterministic line definitions for an N×N board.
   * Deterministic Evaluation Order:
   * 1. Rows top to bottom (row-0 .. row-(N-1))
   * 2. Columns left to right (column-0 .. column-(N-1))
   * 3. Main Diagonal (main-diagonal: [0][0]..[N-1][N-1])
   * 4. Anti-Diagonal (anti-diagonal: [0][N-1]..[N-1][0])
   */
  public getAllPossibleLines(gridSize: number, board: number[]): LineDefinition[] {
    const lines: LineDefinition[] = [];
    const N = gridSize;

    // 1. Rows (top to bottom)
    for (let r = 0; r < N; r++) {
      const cellIndices: number[] = [];
      const numbers: number[] = [];
      for (let c = 0; c < N; c++) {
        const idx = r * N + c;
        cellIndices.push(idx);
        numbers.push(board[idx]);
      }
      lines.push({
        id: `row-${r}`,
        type: 'row',
        index: r,
        cellIndices,
        numbers,
      });
    }

    // 2. Columns (left to right)
    for (let c = 0; c < N; c++) {
      const cellIndices: number[] = [];
      const numbers: number[] = [];
      for (let r = 0; r < N; r++) {
        const idx = r * N + c;
        cellIndices.push(idx);
        numbers.push(board[idx]);
      }
      lines.push({
        id: `column-${c}`,
        type: 'column',
        index: c,
        cellIndices,
        numbers,
      });
    }

    // 3. Main Diagonal: [0][0], [1][1], ..., [N-1][N-1]
    const mainDiagIndices: number[] = [];
    const mainDiagNumbers: number[] = [];
    for (let i = 0; i < N; i++) {
      const idx = i * N + i;
      mainDiagIndices.push(idx);
      mainDiagNumbers.push(board[idx]);
    }
    lines.push({
      id: 'main-diagonal',
      type: 'main-diagonal',
      index: 0,
      cellIndices: mainDiagIndices,
      numbers: mainDiagNumbers,
    });

    // 4. Anti-Diagonal: [0][N-1], [1][N-2], ..., [N-1][0]
    const antiDiagIndices: number[] = [];
    const antiDiagNumbers: number[] = [];
    for (let i = 0; i < N; i++) {
      const idx = i * N + (N - 1 - i);
      antiDiagIndices.push(idx);
      antiDiagNumbers.push(board[idx]);
    }
    lines.push({
      id: 'anti-diagonal',
      type: 'anti-diagonal',
      index: 1,
      cellIndices: antiDiagIndices,
      numbers: antiDiagNumbers,
    });

    return lines;
  }

  /**
   * Evaluates a single player's board against globally called numbers.
   * Awards letters from the winning word sequentially based on newly completed lines.
   */
  public evaluatePlayerBoard(
    playerId: string,
    playerName: string,
    board: number[],
    gridSize: number,
    calledNumbers: number[],
    previousCompletedLines: string[] = [],
    winningWord: string
  ): PlayerLineEvaluation {
    if (!board || board.length !== gridSize * gridSize) {
      return {
        playerId,
        playerName,
        allCompletedLines: [],
        newlyCompletedLines: [],
        newlyCompletedLineDetails: [],
        earnedLetters: [],
        newlyEarnedLetters: [],
        completedLineCount: 0,
        hasWon: false,
      };
    }

    const calledSet = new Set(calledNumbers);
    const prevSet = new Set(previousCompletedLines);
    const allLines = this.getAllPossibleLines(gridSize, board);

    const allCompletedLines: string[] = [];
    const newlyCompletedLines: string[] = [];
    const newlyCompletedLineDetails: LineDefinition[] = [];

    // Check each line in strict deterministic order
    for (const line of allLines) {
      const isComplete = line.numbers.every((num) => calledSet.has(num));
      if (isComplete) {
        allCompletedLines.push(line.id);
        if (!prevSet.has(line.id)) {
          newlyCompletedLines.push(line.id);
          newlyCompletedLineDetails.push(line);
        }
      }
    }

    // Award winning word letters based on total completed lines (capped at word length)
    const cleanWord = (winningWord || '').trim().toUpperCase();
    const totalLines = allCompletedLines.length;
    const maxLetters = cleanWord.length;

    // Safety: never award more letters than the winning word length
    const letterCount = Math.min(totalLines, maxLetters);
    const earnedLetters = cleanWord.slice(0, letterCount).split('');

    const prevLetterCount = Math.min(previousCompletedLines.length, maxLetters);
    const newlyEarnedLetters = earnedLetters.slice(prevLetterCount);

    const hasWon = cleanWord.length > 0 && earnedLetters.length === cleanWord.length;

    return {
      playerId,
      playerName,
      allCompletedLines,
      newlyCompletedLines,
      newlyCompletedLineDetails,
      earnedLetters,
      newlyEarnedLetters,
      completedLineCount: totalLines,
      hasWon,
    };
  }

  /**
   * Evaluates every player in the match authoritatively after a number call.
   * Determines the first valid winner according to authoritative priority order.
   */
  public evaluateAllPlayers(
    players: Array<{
      playerId: string;
      name: string;
      board?: number[];
      completedLines?: string[];
    }>,
    gridSize: number,
    calledNumbers: number[],
    winningWord: string,
    callerPlayerId?: string,
    playerOrder: string[] = []
  ): RoomBingoEvaluation {
    const playerEvaluations = new Map<string, PlayerLineEvaluation>();

    // 1. Evaluate every player's board
    for (const p of players) {
      const board = p.board || [];
      const prevLines = p.completedLines || [];
      const evalResult = this.evaluatePlayerBoard(
        p.playerId,
        p.name,
        board,
        gridSize,
        calledNumbers,
        prevLines,
        winningWord
      );
      playerEvaluations.set(p.playerId, evalResult);
    }

    // 2. Authoritative First-Winner Selection:
    // First check caller (if caller won from their own call), then follow configured playerOrder
    let winner: PlayerLineEvaluation | null = null;

    if (callerPlayerId) {
      const callerEval = playerEvaluations.get(callerPlayerId);
      if (callerEval && callerEval.hasWon) {
        winner = callerEval;
      }
    }

    if (!winner) {
      // Check players in authoritative playerOrder
      for (const pid of playerOrder) {
        const evalRes = playerEvaluations.get(pid);
        if (evalRes && evalRes.hasWon) {
          winner = evalRes;
          break;
        }
      }
    }

    if (!winner) {
      // Fallback check all evaluated players
      for (const evalRes of playerEvaluations.values()) {
        if (evalRes.hasWon) {
          winner = evalRes;
          break;
        }
      }
    }

    return {
      playerEvaluations,
      winner,
    };
  }

  /**
   * Helper: Maps a completed line ID to its cell indices for visual highlighting.
   */
  public getLineCellIndices(gridSize: number, lineId: string): number[] {
    const N = gridSize;
    if (lineId.startsWith('row-')) {
      const r = parseInt(lineId.replace('row-', ''), 10);
      if (isNaN(r) || r < 0 || r >= N) return [];
      return Array.from({ length: N }, (_, c) => r * N + c);
    }
    if (lineId.startsWith('column-')) {
      const c = parseInt(lineId.replace('column-', ''), 10);
      if (isNaN(c) || c < 0 || c >= N) return [];
      return Array.from({ length: N }, (_, r) => r * N + c);
    }
    if (lineId === 'main-diagonal') {
      return Array.from({ length: N }, (_, i) => i * N + i);
    }
    if (lineId === 'anti-diagonal') {
      return Array.from({ length: N }, (_, i) => i * N + (N - 1 - i));
    }
    return [];
  }
}

export const bingoService = new BingoService();

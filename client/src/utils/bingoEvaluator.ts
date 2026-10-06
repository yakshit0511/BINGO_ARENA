/**
 * Utility to evaluate completed lines on a player's bingo board.
 */
export function evaluateBoardLines(
  gridSize: number,
  board: (number | null)[],
  markedNumbers: number[]
): {
  completedLines: string[];
  completedCount: number;
} {
  const N = gridSize;
  const markedSet = new Set(markedNumbers);
  const completedLines: string[] = [];

  if (!board || board.length !== N * N) {
    return { completedLines: [], completedCount: 0 };
  }

  // 1. Rows
  for (let r = 0; r < N; r++) {
    let rowComplete = true;
    for (let c = 0; c < N; c++) {
      const val = board[r * N + c];
      if (val === null || !markedSet.has(val)) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      completedLines.push(`row-${r}`);
    }
  }

  // 2. Columns
  for (let c = 0; c < N; c++) {
    let colComplete = true;
    for (let r = 0; r < N; r++) {
      const val = board[r * N + c];
      if (val === null || !markedSet.has(val)) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) {
      completedLines.push(`column-${c}`);
    }
  }

  // 3. Main Diagonal
  let mainDiagComplete = true;
  for (let i = 0; i < N; i++) {
    const val = board[i * N + i];
    if (val === null || !markedSet.has(val)) {
      mainDiagComplete = false;
      break;
    }
  }
  if (mainDiagComplete) {
    completedLines.push('main-diagonal');
  }

  // 4. Anti-Diagonal
  let antiDiagComplete = true;
  for (let i = 0; i < N; i++) {
    const val = board[i * N + (N - 1 - i)];
    if (val === null || !markedSet.has(val)) {
      antiDiagComplete = false;
      break;
    }
  }
  if (antiDiagComplete) {
    completedLines.push('anti-diagonal');
  }

  return {
    completedLines,
    completedCount: completedLines.length,
  };
}

// Game Types für Zahlen-Kreuzworträtsel PWA

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'epic';

export type Operation = '+' | '-' | '*' | '/';

export interface GameConfig {
  level: DifficultyLevel;
  equationCount: number;
  gridSize: { width: number; height: number };
  timeLimit?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface CellData {
  id: string;
  type: 'number' | 'operator' | 'equals' | 'empty';
  value: string | number | null;
  position: Position;
  isFixed: boolean; // Vorgegeben oder platzierbar
  isCorrect?: boolean;
  belongsToEquation: string[]; // IDs der Gleichungen
}

export interface Equation {
  id: string;
  cells: string[]; // Cell IDs die zur Gleichung gehören
  expression: string; // z.B. "? + ? = 12"
  result: number;
  isHorizontal: boolean;
  startPosition: Position;
  isComplete: boolean;
  isValid: boolean;
}

export interface GameBoard {
  cells: Map<string, CellData>;
  equations: Map<string, Equation>;
  gridSize: { width: number; height: number };
}

export interface NumberTile {
  id: string;
  value: number;
  isUsed: boolean;
  originalPosition?: Position;
}

export interface GameState {
  config: GameConfig;
  board: GameBoard;
  availableNumbers: NumberTile[];
  currentScore: number;
  timeElapsed: number;
  isComplete: boolean;
  moves: GameMove[];
  hints: number;
}

export interface GameMove {
  id: string;
  type: 'place' | 'remove';
  tileId: string;
  cellId: string;
  timestamp: number;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalTime: number;
  bestTimes: Record<DifficultyLevel, number>;
  streak: number;
  lastPlayed: Date;
}

export interface DragState {
  isDragging: boolean;
  draggedTile: NumberTile | null;
  startPosition: Position;
  currentPosition: Position;
  targetCell: string | null;
}

// Events
export interface GameEvent {
  type: string;
  timestamp: number;
  data?: any;
}

export interface TilePlacedEvent extends GameEvent {
  type: 'tile-placed';
  data: {
    tileId: string;
    cellId: string;
    value: number;
  };
}

export interface EquationCompletedEvent extends GameEvent {
  type: 'equation-completed';
  data: {
    equationId: string;
    isValid: boolean;
  };
}

export interface GameCompletedEvent extends GameEvent {
  type: 'game-completed';
  data: {
    score: number;
    time: number;
    level: DifficultyLevel;
  };
}

// Utility Types
export type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Canvas Rendering
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
  offset: Point;
}

export interface CellStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  fontSize: number;
  isHighlighted?: boolean;
  isError?: boolean;
}

// Configuration Constants
export const DIFFICULTY_CONFIG: Record<DifficultyLevel, GameConfig> = {
  easy: {
    level: 'easy',
    equationCount: 10,
    gridSize: { width: 8, height: 6 }
  },
  medium: {
    level: 'medium', 
    equationCount: 15,
    gridSize: { width: 10, height: 8 }
  },
  hard: {
    level: 'hard',
    equationCount: 20,
    gridSize: { width: 12, height: 10 }
  },
  epic: {
    level: 'epic',
    equationCount: 25,
    gridSize: { width: 15, height: 12 }
  }
};

export const CELL_SIZE = 40;
export const CELL_PADDING = 2;
export const GRID_PADDING = 20;

// Scoring
export const SCORING = {
  BASE_POINTS: 100,
  TIME_BONUS_MULTIPLIER: 10,
  DIFFICULTY_MULTIPLIER: {
    easy: 1,
    medium: 1.5,
    hard: 2,
    epic: 2.5
  },
  HINT_PENALTY: 50
} as const;
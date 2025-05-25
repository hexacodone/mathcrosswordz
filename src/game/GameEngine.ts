import { 
    DifficultyLevel, 
    GameState, 
    GameBoard, 
    NumberTile, 
    GameMove, 
    CellData,
    Equation,
    GameEvent,
    TilePlacedEvent,
    EquationCompletedEvent,
    GameCompletedEvent,
    EventHandler,
    DIFFICULTY_CONFIG,
    SCORING 
  } from '../types/game';
  import { PuzzleGenerator } from './PuzzleGenerator';
  
  export class GameEngine {
    private gameState: GameState | null = null;
    private eventHandlers: Map<string, EventHandler[]> = new Map();
    private gameTimer: number | null = null;
    private startTime: number = 0;
  
    constructor() {
      this.initializeEventHandlers();
    }
  
    // Game Lifecycle
    startNewGame(difficulty: DifficultyLevel): GameState {
      this.stopTimer();
      
      const generator = new PuzzleGenerator(difficulty);
      const board = generator.generatePuzzle();
      const availableNumbers = generator.generateAvailableNumbers(board);
      
      this.gameState = {
        config: DIFFICULTY_CONFIG[difficulty],
        board,
        availableNumbers: availableNumbers.map((value, index) => ({
          id: `tile-${index}`,
          value,
          isUsed: false
        })),
        currentScore: 0,
        timeElapsed: 0,
        isComplete: false,
        moves: [],
        hints: 3 // Start with 3 hints
      };
  
      this.startTimer();
      this.emit({ type: 'game-started', timestamp: Date.now() });
      
      return this.gameState;
    }
  
    // Tile Placement
    placeTile(tileId: string, cellId: string): boolean {
      if (!this.gameState || this.gameState.isComplete) return false;
  
      const tile = this.gameState.availableNumbers.find(t => t.id === tileId);
      const cell = this.gameState.board.cells.get(cellId);
  
      if (!tile || !cell || tile.isUsed || cell.isFixed || cell.type !== 'number') {
        return false;
      }
  
      // Place the tile
      tile.isUsed = true;
      cell.value = tile.value;
  
      // Record the move
      const move: GameMove = {
        id: `move-${Date.now()}`,
        type: 'place',
        tileId,
        cellId,
        timestamp: Date.now()
      };
      this.gameState.moves.push(move);
  
      // Emit event
      this.emit<TilePlacedEvent>({
        type: 'tile-placed',
        timestamp: Date.now(),
        data: { tileId, cellId, value: tile.value }
      });
  
      // Check if any equations are completed
      this.checkEquations();
  
      // Check if game is complete
      this.checkGameCompletion();
  
      return true;
    }
  
    removeTile(cellId: string): boolean {
      if (!this.gameState || this.gameState.isComplete) return false;
  
      const cell = this.gameState.board.cells.get(cellId);
      if (!cell || cell.isFixed || cell.value === null) return false;
  
      // Find the tile that was placed here
      const lastMove = [...this.gameState.moves]
        .reverse()
        .find(move => move.type === 'place' && move.cellId === cellId);
  
      if (!lastMove) return false;
  
      const tile = this.gameState.availableNumbers.find(t => t.id === lastMove.tileId);
      if (!tile) return false;
  
      // Remove the tile
      tile.isUsed = false;
      cell.value = null;
  
      // Record the move
      const move: GameMove = {
        id: `move-${Date.now()}`,
        type: 'remove',
        tileId: lastMove.tileId,
        cellId,
        timestamp: Date.now()
      };
      this.gameState.moves.push(move);
  
      // Recheck equations
      this.checkEquations();
  
      return true;
    }
  
    // Undo/Redo
    undoLastMove(): boolean {
      if (!this.gameState || this.gameState.moves.length === 0) return false;
  
      const lastMove = this.gameState.moves.pop()!;
      
      if (lastMove.type === 'place') {
        // Undo a placement
        const tile = this.gameState.availableNumbers.find(t => t.id === lastMove.tileId);
        const cell = this.gameState.board.cells.get(lastMove.cellId);
        
        if (tile && cell) {
          tile.isUsed = false;
          cell.value = null;
        }
      } else if (lastMove.type === 'remove') {
        // Undo a removal (re-place the tile)
        const tile = this.gameState.availableNumbers.find(t => t.id === lastMove.tileId);
        const cell = this.gameState.board.cells.get(lastMove.cellId);
        
        if (tile && cell) {
          tile.isUsed = true;
          cell.value = tile.value;
        }
      }
  
      this.checkEquations();
      return true;
    }
  
    // Hint System
    getHint(): { cellId: string; value: number } | null {
      if (!this.gameState || this.gameState.hints <= 0) return null;
  
      // Find an unfilled cell that we can provide a hint for
      const unfilledCells: CellData[] = [];
      
      this.gameState.board.cells.forEach(cell => {
        if (cell.type === 'number' && !cell.isFixed && cell.value === null) {
          unfilledCells.push(cell);
        }
      });
  
      if (unfilledCells.length === 0) return null;
  
      // Pick a random unfilled cell
      const targetCell = unfilledCells[Math.floor(Math.random() * unfilledCells.length)];
      
      // Find the correct value for this cell
      const correctValue = this.getCorrectValueForCell(targetCell);
      if (correctValue === null) return null;
  
      // Use a hint
      this.gameState.hints--;
      this.gameState.currentScore = Math.max(0, this.gameState.currentScore - SCORING.HINT_PENALTY);
  
      return {
        cellId: targetCell.id,
        value: correctValue
      };
    }
  
    private getCorrectValueForCell(cell: CellData): number | null {
      // Find the equation this cell belongs to
      const equationId = cell.belongsToEquation[0];
      if (!equationId) return null;
  
      const equation = this.gameState!.board.equations.get(equationId);
      if (!equation) return null;
  
      // Parse the equation to get the correct values
      const match = equation.expression.match(/(\d+)\s*([+\-*/])\s*(\d+)\s*=\s*(\d+)/);
      if (!match) return null;
  
      const [, num1Str, op, num2Str, resultStr] = match;
      const num1 = parseInt(num1Str);
      const num2 = parseInt(num2Str);
      const result = parseInt(resultStr);
  
      // Determine which position this cell is in the equation
      const cellIndex = equation.cells.indexOf(cell.id);
      
      switch (cellIndex) {
        case 0: return num1;      // First operand
        case 2: return num2;      // Second operand  
        case 4: return result;    // Result
        default: return null;
      }
    }
  
    // Equation Validation
    private checkEquations(): void {
      if (!this.gameState) return;
  
      this.gameState.board.equations.forEach(equation => {
        const wasComplete = equation.isComplete;
        const isNowComplete = this.isEquationComplete(equation);
        const isValid = isNowComplete ? this.validateEquation(equation) : false;
  
        equation.isComplete = isNowComplete;
        equation.isValid = isValid;
  
        // Update cell correctness
        equation.cells.forEach(cellId => {
          const cell = this.gameState!.board.cells.get(cellId);
          if (cell && cell.type === 'number') {
            cell.isCorrect = isValid;
          }
        });
  
        // Emit event if equation was just completed
        if (!wasComplete && isNowComplete) {
          this.emit<EquationCompletedEvent>({
            type: 'equation-completed',
            timestamp: Date.now(),
            data: { equationId: equation.id, isValid }
          });
  
          // Award points for correct equation
          if (isValid) {
            this.awardPoints(SCORING.BASE_POINTS);
          }
        }
      });
    }
  
    private isEquationComplete(equation: Equation): boolean {
      return equation.cells.every(cellId => {
        const cell = this.gameState!.board.cells.get(cellId);
        return cell && (cell.value !== null || cell.type === 'operator' || cell.type === 'equals');
      });
    }
  
    private validateEquation(equation: Equation): boolean {
      const cells = equation.cells.map(id => this.gameState!.board.cells.get(id)!);
      
      // Extract values: [num1, op, num2, =, result]
      const num1 = cells[0]?.value as number;
      const operator = cells[1]?.value as string;
      const num2 = cells[2]?.value as number;
      const result = cells[4]?.value as number;
  
      if (typeof num1 !== 'number' || typeof num2 !== 'number' || typeof result !== 'number') {
        return false;
      }
  
      // Validate the equation
      switch (operator) {
        case '+': return num1 + num2 === result;
        case '-': return num1 - num2 === result;
        case '*': return num1 * num2 === result;
        case '/': return num2 !== 0 && num1 / num2 === result;
        default: return false;
      }
    }
  
    // Game Completion
    private checkGameCompletion(): void {
      if (!this.gameState || this.gameState.isComplete) return;
  
      const allEquationsValid = Array.from(this.gameState.board.equations.values())
        .every(eq => eq.isComplete && eq.isValid);
  
      if (allEquationsValid) {
        this.completeGame();
      }
    }
  
    private completeGame(): void {
      if (!this.gameState) return;
  
      this.stopTimer();
      this.gameState.isComplete = true;
  
      // Calculate final score
      const timeBonus = Math.max(0, 300 - this.gameState.timeElapsed) * SCORING.TIME_BONUS_MULTIPLIER;
      const difficultyBonus = SCORING.BASE_POINTS * SCORING.DIFFICULTY_MULTIPLIER[this.gameState.config.level];
      
      this.gameState.currentScore += timeBonus + difficultyBonus;
  
      // Emit completion event
      this.emit<GameCompletedEvent>({
        type: 'game-completed',
        timestamp: Date.now(),
        data: {
          score: this.gameState.currentScore,
          time: this.gameState.timeElapsed,
          level: this.gameState.config.level
        }
      });
    }
  
    // Timer Management
    private startTimer(): void {
      this.startTime = Date.now();
      this.gameTimer = window.setInterval(() => {
        if (this.gameState && !this.gameState.isComplete) {
          this.gameState.timeElapsed = Math.floor((Date.now() - this.startTime) / 1000);
        }
      }, 1000);
    }
  
    private stopTimer(): void {
      if (this.gameTimer) {
        clearInterval(this.gameTimer);
        this.gameTimer = null;
      }
    }
  
    // Scoring
    private awardPoints(points: number): void {
      if (this.gameState) {
        this.gameState.currentScore += points;
      }
    }
  
    // Event System
    private initializeEventHandlers(): void {
      // Initialize empty handler arrays for common events
      const eventTypes = ['game-started', 'tile-placed', 'equation-completed', 'game-completed'];
      eventTypes.forEach(type => {
        this.eventHandlers.set(type, []);
      });
    }
  
    on<T extends GameEvent>(eventType: string, handler: EventHandler<T>): void {
      if (!this.eventHandlers.has(eventType)) {
        this.eventHandlers.set(eventType, []);
      }
      this.eventHandlers.get(eventType)!.push(handler as EventHandler);
    }
  
    off(eventType: string, handler: EventHandler): void {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  
    private emit<T extends GameEvent>(event: T): void {
      const handlers = this.eventHandlers.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Error in event handler for ${event.type}:`, error);
          }
        });
      }
    }
  
    // Getters
    getGameState(): GameState | null {
      return this.gameState;
    }
  
    isGameActive(): boolean {
      return this.gameState !== null && !this.gameState.isComplete;
    }
  
    // Validation helpers
    canPlaceTile(tileId: string, cellId: string): boolean {
      if (!this.gameState) return false;
  
      const tile = this.gameState.availableNumbers.find(t => t.id === tileId);
      const cell = this.gameState.board.cells.get(cellId);
  
      return !!(tile && cell && !tile.isUsed && !cell.isFixed && cell.type === 'number' && cell.value === null);
    }
  
    // Save/Load Game State (for persistence)
    saveGameState(): string {
      if (!this.gameState) return '';
      
      const saveData = {
        ...this.gameState,
        savedAt: Date.now()
      };
      
      return JSON.stringify(saveData);
    }
  
    loadGameState(saveData: string): boolean {
      try {
        const data = JSON.parse(saveData);
        
        // Reconstruct Maps from saved data
        const board = {
          ...data.board,
          cells: new Map(Object.entries(data.board.cells)),
          equations: new Map(Object.entries(data.board.equations))
        };
        
        this.gameState = {
          ...data,
          board
        };
        
        // Restart timer if game is active
        if (!this.gameState.isComplete) {
          this.startTimer();
        }
        
        return true;
      } catch (error) {
        console.error('Failed to load game state:', error);
        return false;
      }
    }
  }
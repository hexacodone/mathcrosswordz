import { 
    DifficultyLevel, 
    GameBoard, 
    CellData, 
    Equation, 
    Position, 
    Operation,
    DIFFICULTY_CONFIG 
  } from '@/types/game';
  
  export class PuzzleGenerator {
    private gridSize: { width: number; height: number };
    private equationCount: number;
    private usedPositions: Set<string> = new Set();
    private equations: Equation[] = [];
    private cells: Map<string, CellData> = new Map();
  
    constructor(difficulty: DifficultyLevel) {
      const config = DIFFICULTY_CONFIG[difficulty];
      this.gridSize = config.gridSize;
      this.equationCount = config.equationCount;
    }
  
    generatePuzzle(): GameBoard {
      this.reset();
      
      // Generate equations with different strategies
      this.generateHorizontalEquations();
      this.generateVerticalEquations();
      this.addIntersectionChallenges();
      
      // Ensure we have enough equations
      while (this.equations.length < this.equationCount) {
        this.addRandomEquation();
      }
  
      // Create final board
      return {
        cells: this.cells,
        equations: new Map(this.equations.map(eq => [eq.id, eq])),
        gridSize: this.gridSize
      };
    }
  
    private reset(): void {
      this.usedPositions.clear();
      this.equations = [];
      this.cells.clear();
      
      // Initialize empty grid
      for (let y = 0; y < this.gridSize.height; y++) {
        for (let x = 0; x < this.gridSize.width; x++) {
          const cellId = `${x}-${y}`;
          this.cells.set(cellId, {
            id: cellId,
            type: 'empty',
            value: null,
            position: { x, y },
            isFixed: false,
            belongsToEquation: []
          });
        }
      }
    }
  
    private generateHorizontalEquations(): void {
      const targetCount = Math.ceil(this.equationCount * 0.6); // 60% horizontal
      let attempts = 0;
      
      while (this.equations.filter(eq => eq.isHorizontal).length < targetCount && attempts < 100) {
        const startX = Math.floor(Math.random() * (this.gridSize.width - 6)); // Min 7 cells for equation
        const startY = Math.floor(Math.random() * this.gridSize.height);
        
        if (this.canPlaceHorizontalEquation(startX, startY)) {
          this.createHorizontalEquation(startX, startY);
        }
        attempts++;
      }
    }
  
    private generateVerticalEquations(): void {
      const targetCount = Math.ceil(this.equationCount * 0.4); // 40% vertical
      let attempts = 0;
      
      while (this.equations.filter(eq => !eq.isHorizontal).length < targetCount && attempts < 100) {
        const startX = Math.floor(Math.random() * this.gridSize.width);
        const startY = Math.floor(Math.random() * (this.gridSize.height - 6));
        
        if (this.canPlaceVerticalEquation(startX, startY)) {
          this.createVerticalEquation(startX, startY);
        }
        attempts++;
      }
    }
  
    private canPlaceHorizontalEquation(startX: number, startY: number): boolean {
      // Check if 7 consecutive cells are available
      for (let i = 0; i < 7; i++) {
        if (startX + i >= this.gridSize.width) return false;
        if (this.usedPositions.has(`${startX + i}-${startY}`)) return false;
      }
      return true;
    }
  
    private canPlaceVerticalEquation(startX: number, startY: number): boolean {
      // Check if 7 consecutive cells are available
      for (let i = 0; i < 7; i++) {
        if (startY + i >= this.gridSize.height) return false;
        if (this.usedPositions.has(`${startX}-${startY + i}`)) return false;
      }
      return true;
    }
  
    private createHorizontalEquation(startX: number, startY: number): void {
      const equationId = `eq-${this.equations.length + 1}`;
      const operation = this.getRandomOperation();
      const { num1, num2, result } = this.generateNumbers(operation);
      
      const cellIds: string[] = [];
      const positions = [
        { x: startX, y: startY, type: 'number', value: null, isFixed: false },     // num1 (user places)
        { x: startX + 1, y: startY, type: 'operator', value: operation, isFixed: true },
        { x: startX + 2, y: startY, type: 'number', value: null, isFixed: false }, // num2 (user places)
        { x: startX + 3, y: startY, type: 'equals', value: '=', isFixed: true },
        { x: startX + 4, y: startY, type: 'number', value: null, isFixed: false }, // result (user places)
      ];
  
      // Sometimes fix one number as hint
      const hintIndex = Math.random() < 0.4 ? Math.floor(Math.random() * 3) : -1;
      if (hintIndex === 0) positions[0].value = num1, positions[0].isFixed = true;
      if (hintIndex === 1) positions[2].value = num2, positions[2].isFixed = true;
      if (hintIndex === 2) positions[4].value = result, positions[4].isFixed = true;
  
      positions.forEach(pos => {
        const cellId = `${pos.x}-${pos.y}`;
        cellIds.push(cellId);
        this.usedPositions.add(`${pos.x}-${pos.y}`);
        
        const cell = this.cells.get(cellId)!;
        cell.type = pos.type as any;
        cell.value = pos.value;
        cell.isFixed = pos.isFixed;
        cell.belongsToEquation.push(equationId);
      });
  
      const equation: Equation = {
        id: equationId,
        cells: cellIds,
        expression: `${num1} ${operation} ${num2} = ${result}`,
        result,
        isHorizontal: true,
        startPosition: { x: startX, y: startY },
        isComplete: false,
        isValid: false
      };
  
      this.equations.push(equation);
    }
  
    private createVerticalEquation(startX: number, startY: number): void {
      const equationId = `eq-${this.equations.length + 1}`;
      const operation = this.getRandomOperation();
      const { num1, num2, result } = this.generateNumbers(operation);
      
      const cellIds: string[] = [];
      const positions = [
        { x: startX, y: startY, type: 'number', value: null, isFixed: false },     // num1
        { x: startX, y: startY + 1, type: 'operator', value: operation, isFixed: true },
        { x: startX, y: startY + 2, type: 'number', value: null, isFixed: false }, // num2
        { x: startX, y: startY + 3, type: 'equals', value: '=', isFixed: true },
        { x: startX, y: startY + 4, type: 'number', value: null, isFixed: false }, // result
      ];
  
      // Sometimes fix one number as hint
      const hintIndex = Math.random() < 0.4 ? Math.floor(Math.random() * 3) : -1;
      if (hintIndex === 0) positions[0].value = num1, positions[0].isFixed = true;
      if (hintIndex === 1) positions[2].value = num2, positions[2].isFixed = true;
      if (hintIndex === 2) positions[4].value = result, positions[4].isFixed = true;
  
      positions.forEach(pos => {
        const cellId = `${pos.x}-${pos.y}`;
        cellIds.push(cellId);
        this.usedPositions.add(`${pos.x}-${pos.y}`);
        
        const cell = this.cells.get(cellId)!;
        cell.type = pos.type as any;
        cell.value = pos.value;
        cell.isFixed = pos.isFixed;
        cell.belongsToEquation.push(equationId);
      });
  
      const equation: Equation = {
        id: equationId,
        cells: cellIds,
        expression: `${num1} ${operation} ${num2} = ${result}`,
        result,
        isHorizontal: false,
        startPosition: { x: startX, y: startY },
        isComplete: false,
        isValid: false
      };
  
      this.equations.push(equation);
    }
  
    private addIntersectionChallenges(): void {
      // Try to create intersecting equations for added difficulty
      const maxIntersections = Math.min(3, Math.floor(this.equationCount * 0.2));
      let intersections = 0;
      
      for (let i = 0; i < this.equations.length && intersections < maxIntersections; i++) {
        const eq1 = this.equations[i];
        if (!eq1.isHorizontal) continue;
        
        // Try to place a vertical equation that intersects
        for (let j = 0; j < eq1.cells.length; j += 2) { // Only on number cells
          const cell = this.cells.get(eq1.cells[j])!;
          const intersectX = cell.position.x;
          const intersectY = cell.position.y;
          
          // Try to place vertical equation through this point
          const startY = Math.max(0, intersectY - 2);
          if (this.canPlaceVerticalEquationWithIntersection(intersectX, startY, intersectY)) {
            this.createVerticalEquationWithIntersection(intersectX, startY, intersectY);
            intersections++;
            break;
          }
        }
      }
    }
  
    private canPlaceVerticalEquationWithIntersection(x: number, startY: number, intersectY: number): boolean {
      for (let i = 0; i < 5; i++) {
        const y = startY + i;
        if (y >= this.gridSize.height) return false;
        if (y === intersectY) continue; // Intersection point is allowed
        if (this.usedPositions.has(`${x}-${y}`)) return false;
      }
      return true;
    }
  
    private createVerticalEquationWithIntersection(x: number, startY: number, intersectY: number): void {
      // Complex intersection logic - simplified for now
      // This would need more sophisticated handling of shared cells
    }
  
    private addRandomEquation(): void {
      const attempts = 50;
      for (let i = 0; i < attempts; i++) {
        const isHorizontal = Math.random() < 0.6;
        
        if (isHorizontal) {
          const startX = Math.floor(Math.random() * (this.gridSize.width - 6));
          const startY = Math.floor(Math.random() * this.gridSize.height);
          if (this.canPlaceHorizontalEquation(startX, startY)) {
            this.createHorizontalEquation(startX, startY);
            return;
          }
        } else {
          const startX = Math.floor(Math.random() * this.gridSize.width);
          const startY = Math.floor(Math.random() * (this.gridSize.height - 6));
          if (this.canPlaceVerticalEquation(startX, startY)) {
            this.createVerticalEquation(startX, startY);
            return;
          }
        }
      }
    }
  
    private getRandomOperation(): Operation {
      const operations: Operation[] = ['+', '-', '*'];
      // Division less common due to complexity
      if (Math.random() < 0.1) operations.push('/');
      
      return operations[Math.floor(Math.random() * operations.length)];
    }
  
    private generateNumbers(operation: Operation): { num1: number; num2: number; result: number } {
      let num1: number, num2: number, result: number;
      
      switch (operation) {
        case '+':
          num1 = Math.floor(Math.random() * 20) + 1;
          num2 = Math.floor(Math.random() * 20) + 1;
          result = num1 + num2;
          break;
          
        case '-':
          result = Math.floor(Math.random() * 30) + 1;
          num2 = Math.floor(Math.random() * result) + 1;
          num1 = result + num2;
          break;
          
        case '*':
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          result = num1 * num2;
          break;
          
        case '/':
          result = Math.floor(Math.random() * 20) + 1;
          num2 = Math.floor(Math.random() * 10) + 2;
          num1 = result * num2;
          break;
          
        default:
          num1 = 1; num2 = 1; result = 2;
      }
      
      return { num1, num2, result };
    }
  
    // Generate available numbers for the player's hand
    generateAvailableNumbers(board: GameBoard): number[] {
      const neededNumbers: number[] = [];
      
      // Collect all numbers that need to be placed
      board.cells.forEach(cell => {
        if (cell.type === 'number' && !cell.isFixed) {
          // Find the correct value from the equation
          cell.belongsToEquation.forEach(eqId => {
            const equation = board.equations.get(eqId);
            if (equation) {
              const match = equation.expression.match(/(\d+)\s*[+\-*/]\s*(\d+)\s*=\s*(\d+)/);
              if (match) {
                const [, num1, num2, result] = match.map(Number);
                
                // Determine which number this cell should contain
                const cellIndex = equation.cells.indexOf(cell.id);
                if (cellIndex === 0) neededNumbers.push(num1);
                else if (cellIndex === 2) neededNumbers.push(num2);
                else if (cellIndex === 4) neededNumbers.push(result);
              }
            }
          });
        }
      });
      
      // Add some extra numbers as red herrings (20% more)
      const extraCount = Math.ceil(neededNumbers.length * 0.2);
      for (let i = 0; i < extraCount; i++) {
        neededNumbers.push(Math.floor(Math.random() * 50) + 1);
      }
      
      // Shuffle the array
      return this.shuffleArray([...neededNumbers]);
    }
  
    private shuffleArray<T>(array: T[]): T[] {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
  }
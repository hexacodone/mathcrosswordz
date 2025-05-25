import { 
    DifficultyLevel, 
    GameBoard, 
    CellData, 
    Equation, 
    Position, 
    Operation,
    DIFFICULTY_CONFIG 
  } from '../types/game';
  
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
      
      try {
        // Generate equations with different strategies
        this.generateHorizontalEquations();
        this.generateVerticalEquations();
        
        // If we don't have enough equations, add simpler ones
        let attempts = 0;
        while (this.equations.length < this.equationCount && attempts < 50) {
          this.addRandomEquation();
          attempts++;
        }
  
        // If still not enough, fill with simple equations
        if (this.equations.length < this.equationCount) {
          this.fillWithSimpleEquations();
        }
  
        console.log(`Generated ${this.equations.length} equations for ${this.equationCount} target`);
  
        // Create final board
        return {
          cells: this.cells,
          equations: new Map(this.equations.map(eq => [eq.id, eq])),
          gridSize: this.gridSize
        };
      } catch (error) {
        console.error('Error generating puzzle:', error);
        // Fallback: create a simple puzzle
        return this.createFallbackPuzzle();
      }
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
      const targetCount = Math.min(Math.ceil(this.equationCount * 0.6), Math.floor(this.gridSize.height * 0.8));
      let attempts = 0;
      
      while (this.equations.filter(eq => eq.isHorizontal).length < targetCount && attempts < 50) {
        const startX = Math.floor(Math.random() * Math.max(1, this.gridSize.width - 4)); // Min 5 cells
        const startY = Math.floor(Math.random() * this.gridSize.height);
        
        if (this.canPlaceHorizontalEquation(startX, startY)) {
          this.createHorizontalEquation(startX, startY);
        }
        attempts++;
      }
    }
  
    private generateVerticalEquations(): void {
      const targetCount = Math.min(Math.ceil(this.equationCount * 0.4), Math.floor(this.gridSize.width * 0.8));
      let attempts = 0;
      
      while (this.equations.filter(eq => !eq.isHorizontal).length < targetCount && attempts < 50) {
        const startX = Math.floor(Math.random() * this.gridSize.width);
        const startY = Math.floor(Math.random() * Math.max(1, this.gridSize.height - 4));
        
        if (this.canPlaceVerticalEquation(startX, startY)) {
          this.createVerticalEquation(startX, startY);
        }
        attempts++;
      }
    }
  
    private canPlaceHorizontalEquation(startX: number, startY: number): boolean {
      // Check if 5 consecutive cells are available (simplified)
      for (let i = 0; i < 5; i++) {
        if (startX + i >= this.gridSize.width) return false;
        if (this.usedPositions.has(`${startX + i}-${startY}`)) return false;
      }
      return true;
    }
  
    private canPlaceVerticalEquation(startX: number, startY: number): boolean {
      // Check if 5 consecutive cells are available (simplified)
      for (let i = 0; i < 5; i++) {
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
  
    // Fallback puzzle for when generation fails
    private createFallbackPuzzle(): GameBoard {
      this.reset();
      
      // Create a few simple horizontal equations
      const simpleEquations = [
        { x: 1, y: 1, eq: "2 + 3 = 5" },
        { x: 1, y: 3, eq: "4 - 1 = 3" },
        { x: 1, y: 5, eq: "3 * 2 = 6" }
      ];
  
      simpleEquations.forEach(({ x, y, eq }, index) => {
        if (y < this.gridSize.height && x + 4 < this.gridSize.width) {
          this.createSimpleEquation(x, y, eq, `fallback-${index}`);
        }
      });
  
      return {
        cells: this.cells,
        equations: new Map(this.equations.map(eq => [eq.id, eq])),
        gridSize: this.gridSize
      };
    }
  
    private createSimpleEquation(startX: number, startY: number, expression: string, id: string): void {
      const parts = expression.split(' ');
      const num1 = parseInt(parts[0]);
      const op = parts[1];
      const num2 = parseInt(parts[2]);
      const result = parseInt(parts[4]);
  
      const positions = [
        { x: startX, y: startY, type: 'number', value: null, isFixed: false },
        { x: startX + 1, y: startY, type: 'operator', value: op, isFixed: true },
        { x: startX + 2, y: startY, type: 'number', value: null, isFixed: false },
        { x: startX + 3, y: startY, type: 'equals', value: '=', isFixed: true },
        { x: startX + 4, y: startY, type: 'number', value: null, isFixed: false },
      ];
  
      // Sometimes fix one number as hint
      const hintIndex = Math.random() < 0.5 ? Math.floor(Math.random() * 3) : -1;
      if (hintIndex === 0) positions[0].value = num1, positions[0].isFixed = true;
      if (hintIndex === 1) positions[2].value = num2, positions[2].isFixed = true;
      if (hintIndex === 2) positions[4].value = result, positions[4].isFixed = true;
  
      const cellIds: string[] = [];
      positions.forEach(pos => {
        const cellId = `${pos.x}-${pos.y}`;
        cellIds.push(cellId);
        this.usedPositions.add(`${pos.x}-${pos.y}`);
        
        const cell = this.cells.get(cellId)!;
        cell.type = pos.type as any;
        cell.value = pos.value;
        cell.isFixed = pos.isFixed;
        cell.belongsToEquation.push(id);
      });
  
      const equation: Equation = {
        id,
        cells: cellIds,
        expression,
        result,
        isHorizontal: true,
        startPosition: { x: startX, y: startY },
        isComplete: false,
        isValid: false
      };
  
      this.equations.push(equation);
    }
  
    private fillWithSimpleEquations(): void {
      const needed = this.equationCount - this.equations.length;
      console.log(`Filling ${needed} missing equations with simple ones`);
      
      for (let i = 0; i < needed; i++) {
        const operations = ['+', '-', '*'];
        const op = operations[Math.floor(Math.random() * operations.length)];
        
        let num1: number, num2: number, result: number;
        
        switch (op) {
          case '+':
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
            result = num1 + num2;
            break;
          case '-':
            result = Math.floor(Math.random() * 15) + 1;
            num2 = Math.floor(Math.random() * result) + 1;
            num1 = result + num2;
            break;
          case '*':
            num1 = Math.floor(Math.random() * 5) + 1;
            num2 = Math.floor(Math.random() * 5) + 1;
            result = num1 * num2;
            break;
          default:
            num1 = 2; num2 = 3; result = 5;
        }
  
        // Try to place this equation
        for (let attempts = 0; attempts < 20; attempts++) {
          const startX = Math.floor(Math.random() * Math.max(1, this.gridSize.width - 4));
          const startY = Math.floor(Math.random() * this.gridSize.height);
          
          if (this.canPlaceHorizontalEquation(startX, startY)) {
            this.createSimpleEquation(startX, startY, `${num1} ${op} ${num2} = ${result}`, `simple-${i}`);
            break;
          }
        }
      }
    }
  }
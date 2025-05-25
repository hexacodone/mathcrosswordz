import { GameBoard as GameBoardData, CellData, Equation, Point, CELL_SIZE, CELL_PADDING, GRID_PADDING } from '../types/game';

export class GameBoard {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private boardData: GameBoardData | null = null;
  private scale: number = 1;
  private offset: Point = { x: 0, y: 0 };
  private highlightedCells: Map<string, { message: string; timeout: number }> = new Map();
  private animationFrameId: number | null = null;

  // Color scheme
  private colors = {
    background: '#f8fafc',
    cellBg: '#ffffff',
    cellBorder: '#e2e8f0',
    cellBorderActive: '#2563eb',
    fixedCell: '#f1f5f9',
    numberText: '#1e293b',
    operatorText: '#2563eb',
    equalsText: '#059669',
    hintText: '#f59e0b',
    errorCell: '#fee2e2',
    successCell: '#dcfce7',
    dropZone: '#dbeafe',
    gridLine: '#cbd5e1'
  };

  initialize(canvas: HTMLCanvasElement, boardData: GameBoardData): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.boardData = boardData;
    
    this.setupCanvas();
    this.calculateLayout();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  private setupCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    // Set up high-DPI canvas
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  private calculateLayout(): void {
    if (!this.canvas || !this.boardData) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const gridWidth = this.boardData.gridSize.width * (CELL_SIZE + CELL_PADDING) - CELL_PADDING;
    const gridHeight = this.boardData.gridSize.height * (CELL_SIZE + CELL_PADDING) - CELL_PADDING;
    
    // Calculate scale to fit canvas
    const scaleX = (canvasRect.width - GRID_PADDING * 2) / gridWidth;
    const scaleY = (canvasRect.height - GRID_PADDING * 2) / gridHeight;
    this.scale = Math.min(scaleX, scaleY, 1); // Don't scale up
    
    // Center the grid
    const scaledWidth = gridWidth * this.scale;
    const scaledHeight = gridHeight * this.scale;
    this.offset = {
      x: (canvasRect.width - scaledWidth) / 2,
      y: (canvasRect.height - scaledHeight) / 2
    };
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Handle clicks for cell selection
    this.canvas.addEventListener('click', (e) => {
      const point = this.getCanvasPoint(e);
      const cellId = this.getCellAtPoint(point);
      if (cellId) {
        this.handleCellClick(cellId);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
      this.calculateLayout();
    });
    resizeObserver.observe(this.canvas);
  }

  private getCanvasPoint(e: MouseEvent): Point {
    if (!this.canvas) return { x: 0, y: 0 };
    
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private getCellAtPoint(point: Point): string | null {
    if (!this.boardData) return null;

    const gridX = (point.x - this.offset.x) / this.scale;
    const gridY = (point.y - this.offset.y) / this.scale;
    
    const cellX = Math.floor(gridX / (CELL_SIZE + CELL_PADDING));
    const cellY = Math.floor(gridY / (CELL_SIZE + CELL_PADDING));
    
    if (cellX >= 0 && cellX < this.boardData.gridSize.width &&
        cellY >= 0 && cellY < this.boardData.gridSize.height) {
      return `${cellX}-${cellY}`;
    }
    
    return null;
  }

  private handleCellClick(cellId: string): void {
    const cell = this.boardData?.cells.get(cellId);
    if (!cell) return;

    // Handle different cell types
    if (cell.type === 'number' && !cell.isFixed && cell.value !== null) {
      // Remove number from filled cell
      this.emitCellEvent('cell-cleared', cellId);
    }
  }

  private emitCellEvent(eventType: string, cellId: string): void {
    const event = new CustomEvent(eventType, {
      detail: { cellId }
    });
    document.dispatchEvent(event);
  }

  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    if (!this.ctx || !this.canvas || !this.boardData) return;

    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for transformations
    this.ctx.save();
    this.ctx.translate(this.offset.x, this.offset.y);
    this.ctx.scale(this.scale, this.scale);

    // Render grid background
    this.renderGridBackground();

    // Render cells
    this.boardData.cells.forEach(cell => {
      this.renderCell(cell);
    });

    // Render equations (visual connections)
    this.renderEquationConnections();

    // Render highlights and overlays
    this.renderHighlights();

    this.ctx.restore();

    // Update highlights (remove expired)
    this.updateHighlights();
  }

  private renderGridBackground(): void {
    if (!this.ctx || !this.boardData) return;

    // Draw subtle grid lines
    this.ctx.strokeStyle = this.colors.gridLine;
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.3;

    const { width, height } = this.boardData.gridSize;
    
    // Vertical lines
    for (let x = 0; x <= width; x++) {
      const xPos = x * (CELL_SIZE + CELL_PADDING) - CELL_PADDING / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(xPos, -CELL_PADDING / 2);
      this.ctx.lineTo(xPos, height * (CELL_SIZE + CELL_PADDING) - CELL_PADDING / 2);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      const yPos = y * (CELL_SIZE + CELL_PADDING) - CELL_PADDING / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(-CELL_PADDING / 2, yPos);
      this.ctx.lineTo(width * (CELL_SIZE + CELL_PADDING) - CELL_PADDING / 2, yPos);
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;
  }

  private renderCell(cell: CellData): void {
    if (!this.ctx) return;

    const x = cell.position.x * (CELL_SIZE + CELL_PADDING);
    const y = cell.position.y * (CELL_SIZE + CELL_PADDING);

    // Skip empty cells that aren't part of equations
    if (cell.type === 'empty') return;

    // Determine cell appearance
    const isHighlighted = this.highlightedCells.has(cell.id);
    const isDropTarget = cell.type === 'number' && !cell.isFixed && cell.value === null;
    const isError = cell.isCorrect === false;
    const isSuccess = cell.isCorrect === true;

    // Cell background
    let bgColor = this.colors.cellBg;
    if (cell.isFixed) {
      bgColor = this.colors.fixedCell;
    } else if (isError) {
      bgColor = this.colors.errorCell;
    } else if (isSuccess) {
      bgColor = this.colors.successCell;
    } else if (isDropTarget) {
      bgColor = this.colors.dropZone;
    }

    // Draw cell background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // Cell border
    this.ctx.strokeStyle = isHighlighted ? this.colors.cellBorderActive : this.colors.cellBorder;
    this.ctx.lineWidth = isHighlighted ? 2 : 1;
    this.ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

    // Cell content
    this.renderCellContent(cell, x, y);

    // Add cell styling classes for DOM interaction
    const cellElement = document.querySelector(`[data-cell-id="${cell.id}"]`);
    if (cellElement) {
      cellElement.className = this.getCellClasses(cell).join(' ');
    }
  }

  private renderCellContent(cell: CellData, x: number, y: number): void {
    if (!this.ctx || cell.value === null) return;

    const centerX = x + CELL_SIZE / 2;
    const centerY = y + CELL_SIZE / 2;

    // Set text properties
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    let fontSize = 16;
    let color = this.colors.numberText;

    // Adjust styling based on cell type
    switch (cell.type) {
      case 'number':
        fontSize = cell.isFixed ? 14 : 16;
        color = cell.isFixed ? this.colors.hintText : this.colors.numberText;
        break;
      case 'operator':
        fontSize = 18;
        color = this.colors.operatorText;
        break;
      case 'equals':
        fontSize = 16;
        color = this.colors.equalsText;
        break;
    }

    this.ctx.font = `${fontSize}px Inter, sans-serif`;
    this.ctx.fillStyle = color;
    this.ctx.fillText(cell.value.toString(), centerX, centerY);
  }

  private renderEquationConnections(): void {
    if (!this.ctx || !this.boardData) return;

    // Draw subtle lines connecting equation cells
    this.ctx.strokeStyle = this.colors.cellBorder;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.2;

    this.boardData.equations.forEach(equation => {
      if (equation.cells.length < 2) return;

      const cells = equation.cells.map(id => this.boardData!.cells.get(id)!).filter(Boolean);
      
      for (let i = 0; i < cells.length - 1; i++) {
        const cell1 = cells[i];
        const cell2 = cells[i + 1];
        
        const x1 = cell1.position.x * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
        const y1 = cell1.position.y * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
        const x2 = cell2.position.x * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
        const y2 = cell2.position.y * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    });

    this.ctx.globalAlpha = 1;
  }

  private renderHighlights(): void {
    if (!this.ctx) return;

    this.highlightedCells.forEach((highlight, cellId) => {
      const cell = this.boardData?.cells.get(cellId);
      if (!cell) return;

      const x = cell.position.x * (CELL_SIZE + CELL_PADDING);
      const y = cell.position.y * (CELL_SIZE + CELL_PADDING);

      // Highlight border
      this.ctx.strokeStyle = this.colors.cellBorderActive;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x - 1, y - 1, CELL_SIZE + 2, CELL_SIZE + 2);

      // Highlight message
      if (highlight.message) {
        this.ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(highlight.message, x + CELL_SIZE / 2, y - 10);
      }
    });
  }

  private updateHighlights(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.highlightedCells.forEach((highlight, cellId) => {
      if (now > highlight.timeout) {
        toRemove.push(cellId);
      }
    });

    toRemove.forEach(cellId => {
      this.highlightedCells.delete(cellId);
    });
  }

  private getCellClasses(cell: CellData): string[] {
    const classes = ['game-cell'];

    classes.push(`${cell.type}-cell`);
    
    if (cell.isFixed) classes.push('fixed');
    if (cell.value !== null) classes.push('filled');
    if (cell.isCorrect === true) classes.push('correct');
    if (cell.isCorrect === false) classes.push('error');
    
    return classes;
  }

  // Public methods for external interaction
  highlightCell(cellId: string, message?: string, duration: number = 2000): void {
    this.highlightedCells.set(cellId, {
      message: message || '',
      timeout: Date.now() + duration
    });
  }

  showEquationFeedback(equationId: string, isValid: boolean): void {
    const equation = this.boardData?.equations.get(equationId);
    if (!equation) return;

    const message = isValid ? '✓ Richtig!' : '✗ Falsch';
    const duration = isValid ? 2000 : 3000;

    equation.cells.forEach(cellId => {
      this.highlightCell(cellId, message, duration);
    });
  }

  showValidationFeedback(): void {
    if (!this.boardData) return;

    this.boardData.equations.forEach(equation => {
      if (equation.isComplete && !equation.isValid) {
        equation.cells.forEach(cellId => {
          this.highlightCell(cellId, '✗ Prüfen', 2000);
        });
      }
    });
  }

  refresh(): void {
    // Force re-render on next frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.startRenderLoop();
    }
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.highlightedCells.clear();
    this.canvas = null;
    this.ctx = null;
    this.boardData = null;
  }

  // Debug helpers
  getDebugInfo(): any {
    return {
      scale: this.scale,
      offset: this.offset,
      cellCount: this.boardData?.cells.size || 0,
      equationCount: this.boardData?.equations.size || 0,
      highlightedCells: this.highlightedCells.size
    };
  }
}
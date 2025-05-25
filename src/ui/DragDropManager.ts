import { DragState, Point, NumberTile } from '@/types/game';

export class DragDropManager {
  private dragState: DragState = {
    isDragging: false,
    draggedTile: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    targetCell: null
  };

  private dragElement: HTMLElement | null = null;
  private onTilePlaced: ((tileId: string, cellId: string) => boolean) | null = null;
  private onTileReturned: ((tileId: string) => void) | null = null;

  // Event handlers bound to this instance
  private boundHandlers = {
    mouseMove: this.handleMouseMove.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    touchMove: this.handleTouchMove.bind(this),
    touchEnd: this.handleTouchEnd.bind(this)
  };

  constructor() {
    this.initializeGlobalEvents();
  }

  // Initialize global event listeners
  private initializeGlobalEvents(): void {
    document.addEventListener('mousemove', this.boundHandlers.mouseMove);
    document.addEventListener('mouseup', this.boundHandlers.mouseUp);
    document.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
    document.addEventListener('touchend', this.boundHandlers.touchEnd);
  }

  // Set callbacks
  setCallbacks(
    onTilePlaced: (tileId: string, cellId: string) => boolean,
    onTileReturned: (tileId: string) => void
  ): void {
    this.onTilePlaced = onTilePlaced;
    this.onTileReturned = onTileReturned;
  }

  // Start dragging a tile
  startDrag(tile: NumberTile, element: HTMLElement, startPoint: Point): void {
    if (this.dragState.isDragging || tile.isUsed) return;

    this.dragState = {
      isDragging: true,
      draggedTile: tile,
      startPosition: startPoint,
      currentPosition: startPoint,
      targetCell: null
    };

    this.dragElement = element;
    
    // Style the dragged element
    element.classList.add('dragging');
    element.style.position = 'fixed';
    element.style.zIndex = '1000';
    element.style.pointerEvents = 'none';
    element.style.transform = 'scale(1.1)';
    
    // Update position
    this.updateDragElementPosition();

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    // Add visual feedback to valid drop zones
    this.highlightDropZones(true);
  }

  // Handle mouse move
  private handleMouseMove(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;

    e.preventDefault();
    this.dragState.currentPosition = { x: e.clientX, y: e.clientY };
    this.updateDragElementPosition();
    this.updateDropTarget(e.clientX, e.clientY);
  }

  // Handle touch move
  private handleTouchMove(e: TouchEvent): void {
    if (!this.dragState.isDragging) return;

    e.preventDefault();
    const touch = e.touches[0];
    this.dragState.currentPosition = { x: touch.clientX, y: touch.clientY };
    this.updateDragElementPosition();
    this.updateDropTarget(touch.clientX, touch.clientY);
  }

  // Handle mouse up
  private handleMouseUp(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    this.completeDrag();
  }

  // Handle touch end
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    this.completeDrag();
  }

  // Update drag element position
  private updateDragElementPosition(): void {
    if (!this.dragElement) return;

    const { currentPosition } = this.dragState;
    
    // Center the element on the cursor/finger
    const rect = this.dragElement.getBoundingClientRect();
    const offsetX = rect.width / 2;
    const offsetY = rect.height / 2;
    
    this.dragElement.style.left = `${currentPosition.x - offsetX}px`;
    this.dragElement.style.top = `${currentPosition.y - offsetY}px`;
  }

  // Update drop target based on current position
  private updateDropTarget(x: number, y: number): void {
    // Temporarily hide the dragged element to get element underneath
    const draggedElement = this.dragElement;
    if (draggedElement) {
      draggedElement.style.display = 'none';
    }

    const elementBelow = document.elementFromPoint(x, y);
    
    // Restore dragged element
    if (draggedElement) {
      draggedElement.style.display = '';
    }

    // Clear previous target highlighting
    if (this.dragState.targetCell) {
      const prevTarget = document.querySelector(`[data-cell-id="${this.dragState.targetCell}"]`);
      if (prevTarget) {
        prevTarget.classList.remove('drop-target');
      }
    }

    // Check if we're over a valid drop zone
    const cellElement = elementBelow?.closest('[data-cell-id]') as HTMLElement;
    if (cellElement && this.isValidDropTarget(cellElement)) {
      const cellId = cellElement.dataset.cellId!;
      this.dragState.targetCell = cellId;
      cellElement.classList.add('drop-target');
    } else {
      this.dragState.targetCell = null;
    }
  }

  // Check if element is valid drop target
  private isValidDropTarget(element: HTMLElement): boolean {
    return element.classList.contains('number-cell') && 
           !element.classList.contains('fixed') &&
           !element.classList.contains('filled');
  }

  // Complete the drag operation
  private completeDrag(): void {
    if (!this.dragState.isDragging || !this.dragState.draggedTile) return;

    const { draggedTile, targetCell } = this.dragState;
    let success = false;

    // Try to place tile if we have a valid target
    if (targetCell && this.onTilePlaced) {
      success = this.onTilePlaced(draggedTile.id, targetCell);
    }

    // Handle the result
    if (success) {
      // Tile was placed successfully - remove from hand
      this.removeDraggedElementFromHand();
    } else {
      // Return tile to hand with animation
      this.returnTileToHand();
    }

    // Clean up
    this.endDrag();
  }

  // Remove dragged element from hand (successful placement)
  private removeDraggedElementFromHand(): void {
    if (this.dragElement) {
      // Animate to target position
      const targetElement = document.querySelector(`[data-cell-id="${this.dragState.targetCell}"]`) as HTMLElement;
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        
        this.dragElement.style.transition = 'all 0.3s ease-out';
        this.dragElement.style.left = `${targetRect.left}px`;
        this.dragElement.style.top = `${targetRect.top}px`;
        this.dragElement.style.transform = 'scale(1)';
        
        // Remove after animation
        setTimeout(() => {
          if (this.dragElement && this.dragElement.parentNode) {
            this.dragElement.parentNode.removeChild(this.dragElement);
          }
        }, 300);
      } else {
        // Immediate removal if no target found
        if (this.dragElement.parentNode) {
          this.dragElement.parentNode.removeChild(this.dragElement);
        }
      }
    }
  }

  // Return tile to hand (failed placement)
  private returnTileToHand(): void {
    if (!this.dragElement) return;

    // Find the original position in the hand
    const handContainer = document.getElementById('number-tiles');
    if (handContainer) {
      const { startPosition } = this.dragState;
      
      // Animate back to start position
      this.dragElement.style.transition = 'all 0.3s ease-out';
      this.dragElement.style.left = `${startPosition.x}px`;
      this.dragElement.style.top = `${startPosition.y}px`;
      this.dragElement.style.transform = 'scale(1)';
      
      // Reset styles after animation
      setTimeout(() => {
        if (this.dragElement) {
          this.dragElement.style.position = '';
          this.dragElement.style.left = '';
          this.dragElement.style.top = '';
          this.dragElement.style.zIndex = '';
          this.dragElement.style.transition = '';
          this.dragElement.style.transform = '';
          this.dragElement.style.pointerEvents = '';
          this.dragElement.classList.remove('dragging');
        }
      }, 300);
    }

    // Notify about return
    if (this.onTileReturned && this.dragState.draggedTile) {
      this.onTileReturned(this.dragState.draggedTile.id);
    }
  }

  // End drag operation
  private endDrag(): void {
    // Clear drop target highlighting
    if (this.dragState.targetCell) {
      const targetElement = document.querySelector(`[data-cell-id="${this.dragState.targetCell}"]`);
      if (targetElement) {
        targetElement.classList.remove('drop-target');
      }
    }

    // Remove drop zone highlighting
    this.highlightDropZones(false);

    // Reset drag state
    this.dragState = {
      isDragging: false,
      draggedTile: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      targetCell: null
    };

    this.dragElement = null;

    // Restore text selection
    document.body.style.userSelect = '';
  }

  // Highlight valid drop zones
  private highlightDropZones(highlight: boolean): void {
    const dropZones = document.querySelectorAll('.number-cell:not(.fixed):not(.filled)');
    
    dropZones.forEach(zone => {
      if (highlight) {
        zone.classList.add('available-drop-zone');
      } else {
        zone.classList.remove('available-drop-zone');
      }
    });
  }

  // Cancel current drag (for external cancellation)
  cancelDrag(): void {
    if (this.dragState.isDragging) {
      this.returnTileToHand();
      this.endDrag();
    }
  }

  // Check if currently dragging
  isDragging(): boolean {
    return this.dragState.isDragging;
  }

  // Get current drag state (for debugging/external inspection)
  getDragState(): Readonly<DragState> {
    return { ...this.dragState };
  }

  // Cleanup method
  destroy(): void {
    // Cancel any active drag
    this.cancelDrag();

    // Remove global event listeners
    document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    document.removeEventListener('touchmove', this.boundHandlers.touchMove);
    document.removeEventListener('touchend', this.boundHandlers.touchEnd);

    // Clear callbacks
    this.onTilePlaced = null;
    this.onTileReturned = null;
  }

  // Static helper methods
  static getPointerPosition(e: MouseEvent | TouchEvent): Point {
    if (e instanceof MouseEvent) {
      return { x: e.clientX, y: e.clientY };
    } else {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
  }

  static preventDefault(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }
}
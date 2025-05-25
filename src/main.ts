import './style.css';
import { GameEngine } from './game/GameEngine';
import { GameBoard } from './ui/GameBoard';  
import { DragDropManager } from './ui/DragDropManager';
import { DifficultyLevel, GameState, NumberTile } from './types/game';

class App {
  private gameEngine: GameEngine;
  private gameBoard: GameBoard;
  private dragDropManager: DragDropManager;
  private currentGameState: GameState | null = null;

  // DOM Elements
  private difficultySelector: HTMLElement;
  private gameArea: HTMLElement;
  private gameControls: HTMLElement;
  private loadingScreen: HTMLElement;
  private successModal: HTMLElement;
  private timerElement: HTMLElement;
  private scoreElement: HTMLElement;
  private numberTilesContainer: HTMLElement;

  constructor() {
    this.gameEngine = new GameEngine();
    this.gameBoard = new GameBoard();
    this.dragDropManager = new DragDropManager();
    
    this.initializeDOM();
    this.setupEventListeners();
    this.setupGameEngine();
    this.setupDragDrop();
    
    // Initialize app
    this.showDifficultySelector();
  }

  private initializeDOM(): void {
    this.difficultySelector = document.getElementById('difficulty-selector')!;
    this.gameArea = document.getElementById('game-area')!;
    this.gameControls = document.getElementById('game-controls')!;
    this.loadingScreen = document.getElementById('loading')!;
    this.successModal = document.getElementById('success-modal')!;
    this.timerElement = document.getElementById('timer')!;
    this.scoreElement = document.getElementById('score')!;
    this.numberTilesContainer = document.getElementById('number-tiles')!;
  }

  private setupEventListeners(): void {
    // Difficulty selection
    this.difficultySelector.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.difficulty-btn') as HTMLElement;
      if (button) {
        const level = button.dataset.level as DifficultyLevel;
        this.startNewGame(level);
      }
    });

    // Game controls
    document.getElementById('hint-btn')?.addEventListener('click', () => {
      this.useHint();
    });

    document.getElementById('undo-btn')?.addEventListener('click', () => {
      this.undoMove();
    });

    document.getElementById('check-btn')?.addEventListener('click', () => {
      this.checkSolution();
    });

    document.getElementById('new-game-btn')?.addEventListener('click', () => {
      this.showDifficultySelector();
    });

    // Success modal buttons
    document.getElementById('next-level-btn')?.addEventListener('click', () => {
      this.nextLevel();
    });

    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.hideSuccessModal();
      this.showDifficultySelector();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.currentGameState && !this.currentGameState.isComplete) {
        switch (e.key) {
          case 'h':
          case 'H':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.useHint();
            }
            break;
          case 'z':
          case 'Z':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.undoMove();
            }
            break;
          case 'Enter':
            e.preventDefault();
            this.checkSolution();
            break;
        }
      }
    });
  }

  private setupGameEngine(): void {
    // Listen to game events
    this.gameEngine.on('game-started', () => {
      console.log('Game started');
    });

    this.gameEngine.on('tile-placed', (event) => {
      console.log('Tile placed:', event.data);
      this.updateUI();
    });

    this.gameEngine.on('equation-completed', (event) => {
      console.log('Equation completed:', event.data);
      this.showEquationFeedback(event.data.equationId, event.data.isValid);
    });

    this.gameEngine.on('game-completed', (event) => {
      console.log('Game completed:', event.data);
      this.showSuccessModal(event.data);
    });
  }

  private setupDragDrop(): void {
    this.dragDropManager.setCallbacks(
      (tileId: string, cellId: string) => {
        return this.gameEngine.placeTile(tileId, cellId);
      },
      (tileId: string) => {
        console.log('Tile returned to hand:', tileId);
      }
    );
  }

  // Game Flow Methods
  private async startNewGame(difficulty: DifficultyLevel): Promise<void> {
    this.showLoading();
    
    // Small delay to show loading animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Generate new game
      this.currentGameState = this.gameEngine.startNewGame(difficulty);
      
      // Initialize game board
      this.gameBoard.initialize(
        document.getElementById('game-board') as HTMLCanvasElement,
        this.currentGameState.board
      );
      
      // Setup number tiles
      this.setupNumberTiles();
      
      // Show game area
      this.hideLoading();
      this.hideDifficultySelector();
      this.showGameArea();
      
      // Start UI update loop
      this.startUIUpdateLoop();
      
    } catch (error) {
      console.error('Failed to start game:', error);
      this.hideLoading();
      alert('Fehler beim Erstellen des Rätsels. Bitte versuche es erneut.');
    }
  }

  private setupNumberTiles(): void {
    if (!this.currentGameState) return;

    this.numberTilesContainer.innerHTML = '';
    
    this.currentGameState.availableNumbers.forEach(tile => {
      if (!tile.isUsed) {
        const tileElement = this.createTileElement(tile);
        this.numberTilesContainer.appendChild(tileElement);
      }
    });
  }

  private createTileElement(tile: NumberTile): HTMLElement {
    const element = document.createElement('button');
    element.className = 'number-tile';
    element.textContent = tile.value.toString();
    element.dataset.tileId = tile.id;
    
    // Add drag event listeners
    element.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      const startPoint = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.dragDropManager.startDrag(tile, element, startPoint);
    });

    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const startPoint = { x: touch.clientX, y: touch.clientY };
      this.dragDropManager.startDrag(tile, element, startPoint);
    });

    return element;
  }

  private useHint(): void {
    const hint = this.gameEngine.getHint();
    if (hint) {
      // Show hint visually
      this.gameBoard.highlightCell(hint.cellId, `Tipp: ${hint.value}`, 3000);
      this.updateUI();
    } else {
      alert('Keine Tipps mehr verfügbar!');
    }
  }

  private undoMove(): void {
    if (this.gameEngine.undoLastMove()) {
      this.setupNumberTiles(); // Refresh available tiles
      this.gameBoard.refresh();
      this.updateUI();
    }
  }

  private checkSolution(): void {
    if (!this.currentGameState) return;

    const allComplete = Array.from(this.currentGameState.board.equations.values())
      .every(eq => eq.isComplete && eq.isValid);

    if (allComplete) {
      this.showSuccessModal({
        score: this.currentGameState.currentScore,
        time: this.currentGameState.timeElapsed,
        level: this.currentGameState.config.level
      });
    } else {
      // Show validation feedback
      this.gameBoard.showValidationFeedback();
      
      // Brief message
      const incompleteCount = Array.from(this.currentGameState.board.equations.values())
        .filter(eq => !eq.isComplete || !eq.isValid).length;
      
      alert(`Noch ${incompleteCount} Gleichung(en) zu lösen!`);
    }
  }

  private nextLevel(): void {
    if (!this.currentGameState) return;

    const currentLevel = this.currentGameState.config.level;
    const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'epic'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      this.hideSuccessModal();
      this.startNewGame(nextLevel);
    } else {
      alert('Du hast alle Level gemeistert! 🎉');
      this.hideSuccessModal();
      this.showDifficultySelector();
    }
  }

  // UI Management
  private showLoading(): void {
    this.loadingScreen.classList.remove('hidden');
  }

  private hideLoading(): void {
    this.loadingScreen.classList.add('hidden');
  }

  private showDifficultySelector(): void {
    this.difficultySelector.classList.remove('hidden');
  }

  private hideDifficultySelector(): void {
    this.difficultySelector.classList.add('hidden');
  }

  private showGameArea(): void {
    this.gameArea.classList.remove('hidden');
    this.gameControls.classList.remove('hidden');
  }

  private hideGameArea(): void {
    this.gameArea.classList.add('hidden');
    this.gameControls.classList.add('hidden');
  }

  private showSuccessModal(data: { score: number; time: number; level: DifficultyLevel }): void {
    const message = document.getElementById('success-message')!;
    message.innerHTML = `
      <p><strong>Level:</strong> ${this.getLevelName(data.level)}</p>
      <p><strong>Zeit:</strong> ${this.formatTime(data.time)}</p>
      <p><strong>Punkte:</strong> ${data.score.toLocaleString()}</p>
    `;
    this.successModal.classList.remove('hidden');
  }

  private hideSuccessModal(): void {
    this.successModal.classList.add('hidden');
  }

  private showEquationFeedback(equationId: string, isValid: boolean): void {
    // Visual feedback for completed equation
    this.gameBoard.showEquationFeedback(equationId, isValid);
    
    // Optional: Sound feedback
    if (isValid) {
      this.playSuccessSound();
    } else {
      this.playErrorSound();
    }
  }

  private startUIUpdateLoop(): void {
    const updateUI = () => {
      if (this.currentGameState && !this.currentGameState.isComplete) {
        this.updateUI();
        requestAnimationFrame(updateUI);
      }
    };
    requestAnimationFrame(updateUI);
  }

  private updateUI(): void {
    if (!this.currentGameState) return;

    // Update timer
    this.timerElement.textContent = this.formatTime(this.currentGameState.timeElapsed);
    
    // Update score
    this.scoreElement.textContent = this.currentGameState.currentScore.toLocaleString();
    
    // Update hint button
    const hintBtn = document.getElementById('hint-btn') as HTMLButtonElement;
    if (hintBtn) {
      hintBtn.disabled = this.currentGameState.hints <= 0;
      hintBtn.textContent = `💡 Tipp (${this.currentGameState.hints})`;
    }
    
    // Update undo button
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    if (undoBtn) {
      undoBtn.disabled = this.currentGameState.moves.length === 0;
    }
  }

  // Utility Methods
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private getLevelName(level: DifficultyLevel): string {
    const names = {
      easy: 'Einfach',
      medium: 'Mittel',
      hard: 'Schwer',
      epic: 'Episch'
    };
    return names[level];
  }

  private playSuccessSound(): void {
    // Simple audio feedback - could be enhanced with actual sound files
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  private playErrorSound(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
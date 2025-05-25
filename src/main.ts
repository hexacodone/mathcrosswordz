import './style.css';
import { DifficultyLevel } from './types/game';

class SimpleApp {
  private loadingScreen: HTMLElement;
  private difficultySelector: HTMLElement;
  private gameArea: HTMLElement;

  constructor() {
    this.loadingScreen = document.getElementById('loading')!;
    this.difficultySelector = document.getElementById('difficulty-selector')!;
    this.gameArea = document.getElementById('game-area')!;
    
    console.log('App wird initialisiert...');
    this.init();
  }

  private init(): void {
    // Verstecke Loading-Screen sofort
    this.hideLoading();
    
    // Zeige Schwierigkeitsauswahl
    this.showDifficultySelector();
    
    // Event-Listener für Schwierigkeitsauswahl
    this.setupDifficultySelector();
    
    console.log('App erfolgreich initialisiert!');
  }

  private setupDifficultySelector(): void {
    this.difficultySelector.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.difficulty-btn') as HTMLElement;
      
      if (button) {
        const level = button.dataset.level as DifficultyLevel;
        console.log(`Schwierigkeitsgrad gewählt: ${level}`);
        this.startDemoGame(level);
      }
    });
  }

  private startDemoGame(difficulty: DifficultyLevel): void {
    console.log(`Demo-Spiel wird gestartet mit Schwierigkeit: ${difficulty}`);
    
    // Zeige kurz Loading
    this.showLoading();
    
    // Simuliere Spielerstellung
    setTimeout(() => {
      this.hideLoading();
      this.hideDifficultySelector();
      this.showGameArea();
      this.createSimpleDemo();
    }, 1000);
  }

  private createSimpleDemo(): void {
    // Erstelle eine einfache Demo ohne komplexe GameEngine
    const canvas = document.getElementById('game-board') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    // Canvas-Größe setzen
    canvas.width = 600;
    canvas.height = 400;
    
    // Einfaches Demo-Gitter zeichnen
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Gitter zeichnen
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    const cellSize = 40;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
    }
    
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
    
    // Beispiel-Gleichung zeichnen
    ctx.fillStyle = '#2563eb';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 5 + 3 = 8
    ctx.fillText('5', cellSize * 1.5, cellSize * 1.5);
    ctx.fillText('+', cellSize * 2.5, cellSize * 1.5);
    ctx.fillText('3', cellSize * 3.5, cellSize * 1.5);
    ctx.fillText('=', cellSize * 4.5, cellSize * 1.5);
    ctx.fillText('8', cellSize * 5.5, cellSize * 1.5);
    
    // Demo-Zahlen in der Hand
    this.createDemoNumberTiles();
    
    console.log('Demo-Spiel erfolgreich erstellt!');
  }

  private createDemoNumberTiles(): void {
    const tilesContainer = document.getElementById('number-tiles')!;
    tilesContainer.innerHTML = '';
    
    const demoNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    demoNumbers.forEach(num => {
      const tile = document.createElement('button');
      tile.className = 'number-tile';
      tile.textContent = num.toString();
      tile.onclick = () => {
        console.log(`Zahl ${num} wurde geklickt`);
        // Einfache Animation
        tile.style.transform = 'scale(0.9)';
        setTimeout(() => {
          tile.style.transform = 'scale(1)';
        }, 100);
      };
      tilesContainer.appendChild(tile);
    });
  }

  // UI-Hilfsmethoden
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
    document.getElementById('game-controls')!.classList.remove('hidden');
  }
}

// App initialisieren wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM geladen, starte App...');
  try {
    new SimpleApp();
  } catch (error) {
    console.error('Fehler beim Starten der App:', error);
    // Verstecke Loading-Screen auch bei Fehlern
    const loadingScreen = document.getElementById('loading');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
    // Zeige Fehlermeldung
    alert('Fehler beim Laden der App. Bitte überprüfe die Konsole für Details.');
  }
});

// PWA Service Worker Registration (vereinfacht)
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
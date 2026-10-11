import { Component, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Cell, GameApiService, GameMode, GameState, GameStatus, Move, Player, Scoreboard } from './game-api.service';

@Component({
  selector: 'app-root',
  imports: [NgClass],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly board = signal<Cell[]>(Array<Cell>(9).fill(null));
  protected readonly currentPlayer = signal<Player>('X');
  protected readonly gameMode = signal<GameMode>('two-player');
  protected readonly gameStatus = signal<GameStatus>('playing');
  protected readonly winner = signal<Player | null>(null);
  protected readonly winningCells = signal<number[]>([]);
  protected readonly moveHistory = signal<Move[]>([]);
  protected readonly scoreboard = signal<Scoreboard>({ xWins: 0, oWins: 0, draws: 0 });
  protected readonly scoreboardMessage = signal('Connecting to the game server…');
  protected readonly requestPending = signal(false);

  private readonly sessionId = signal<string | null>(null);

  constructor(private readonly gameApi: GameApiService) {}

  ngOnInit(): void {
    this.startGame('two-player');
  }

  protected selectMode(mode: GameMode): void {
    if (mode !== this.gameMode()) this.startGame(mode);
  }

  protected makeMove(position: number): void {
    const gameId = this.sessionId();
    if (!gameId || !this.canPlay(position)) return;
    this.requestPending.set(true);
    this.gameApi.playMove(gameId, position).subscribe({
      next: (state) => this.applyState(state),
      error: () => this.showServerError('The game server could not accept that move.'),
    });
  }

  protected undoLastMove(): void {
    const gameId = this.sessionId();
    if (!gameId || this.moveHistory().length === 0 || this.requestPending()) return;
    this.requestPending.set(true);
    this.gameApi.undo(gameId).subscribe({
      next: (state) => this.applyState(state),
      error: () => this.showServerError('The game server could not undo the move.'),
    });
  }

  protected resetGame(): void {
    const gameId = this.sessionId();
    if (!gameId || this.requestPending()) return;
    this.requestPending.set(true);
    this.gameApi.resetGame(gameId).subscribe({
      next: (state) => this.applyState(state),
      error: () => this.showServerError('The game server could not reset this game.'),
    });
  }

  protected resetScoreboard(): void {
    if (this.requestPending()) return;
    this.requestPending.set(true);
    this.gameApi.resetScoreboard().subscribe({
      next: (scoreboard) => {
        this.scoreboard.set(scoreboard);
        this.scoreboardMessage.set('Session scoreboard reset by the backend.');
        this.requestPending.set(false);
      },
      error: () => this.showServerError('The game server could not reset the scoreboard.'),
    });
  }

  protected canPlay(position: number): boolean {
    return !this.requestPending()
      && this.gameStatus() === 'playing'
      && this.board()[position] === null
      && (this.gameMode() !== 'computer' || this.currentPlayer() === 'X');
  }

  protected cellLabel(position: number): string {
    const row = Math.floor(position / 3) + 1;
    const column = (position % 3) + 1;
    const value = this.board()[position];
    return value ? `Row ${row}, Column ${column}: ${value}` : `Row ${row}, Column ${column}`;
  }

  protected positionLabel(position: number): string {
    return `Row ${Math.floor(position / 3) + 1}, Column ${(position % 3) + 1}`;
  }

  private startGame(mode: GameMode): void {
    this.requestPending.set(true);
    this.scoreboardMessage.set('Creating a game session…');
    this.gameApi.createGame(mode).subscribe({
      next: (state) => this.applyState(state),
      error: () => this.showServerError('The game server is unavailable. Start the .NET API and try again.'),
    });
  }

  private applyState(state: GameState): void {
    this.sessionId.set(state.id);
    this.gameMode.set(state.mode);
    this.board.set(state.board);
    this.currentPlayer.set(state.currentPlayer);
    this.gameStatus.set(state.status);
    this.winner.set(state.winner);
    this.winningCells.set(state.winningCells);
    this.moveHistory.set(state.moves);
    this.scoreboard.set(state.scoreboard);
    this.scoreboardMessage.set('Game session and scoreboard are served by the .NET backend.');
    this.requestPending.set(false);
  }

  private showServerError(message: string): void {
    this.scoreboardMessage.set(message);
    this.requestPending.set(false);
  }
}

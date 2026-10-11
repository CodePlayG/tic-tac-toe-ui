import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Player = 'X' | 'O';
export type Cell = Player | null;
export type GameMode = 'two-player' | 'computer';
export type GameStatus = 'playing' | 'won' | 'draw';

export interface Move {
  player: Player;
  position: number;
}

export interface Scoreboard {
  xWins: number;
  oWins: number;
  draws: number;
}

export interface GameState {
  id: string;
  mode: GameMode;
  board: Cell[];
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  winningCells: number[];
  moves: Move[];
  scoreboard: Scoreboard;
}

@Injectable({ providedIn: 'root' })
export class GameApiService {
  private readonly gamesEndpoint = '/api/games';
  private readonly scoreboardEndpoint = '/api/scoreboard';

  constructor(private readonly http: HttpClient) {}

  createGame(mode: GameMode): Observable<GameState> {
    return this.http.post<GameState>(this.gamesEndpoint, { mode });
  }

  playMove(gameId: string, position: number): Observable<GameState> {
    return this.http.post<GameState>(`${this.gamesEndpoint}/${gameId}/moves`, { position });
  }

  undo(gameId: string): Observable<GameState> {
    return this.http.post<GameState>(`${this.gamesEndpoint}/${gameId}/undo`, {});
  }

  resetGame(gameId: string): Observable<GameState> {
    return this.http.post<GameState>(`${this.gamesEndpoint}/${gameId}/reset`, {});
  }

  resetScoreboard(): Observable<Scoreboard> {
    return this.http.post<Scoreboard>(`${this.scoreboardEndpoint}/reset`, {});
  }
}

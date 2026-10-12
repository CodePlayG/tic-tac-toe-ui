import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GameState } from './game-api.service';

const emptyBoard = () => Array<string | null>(9).fill(null);

const state = (overrides: Partial<GameState> = {}): GameState => ({
  id: 'game-123',
  mode: 'two-player',
  board: emptyBoard() as GameState['board'],
  currentPlayer: 'X',
  status: 'playing',
  winner: null,
  winningCells: [],
  moves: [],
  scoreboard: { xWins: 0, oWins: 0, draws: 0 },
  ...overrides,
});

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a backend-owned session when the UI starts', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const request = http.expectOne('/api/games');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ mode: 'two-player' });
    request.flush(state());
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Tic Tac Toe');
  });

  it('sends a move to the REST API and renders the state returned by the backend', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/games').flush(state());
    fixture.detectChanges();

    const firstCell = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.cell');
    firstCell?.click();

    const moveRequest = http.expectOne('/api/games/game-123/moves');
    expect(moveRequest.request.method).toBe('POST');
    expect(moveRequest.request.body).toEqual({ position: 0 });
    moveRequest.flush(state({
      board: ['X', null, null, null, null, null, null, null, null],
      currentPlayer: 'O',
      moves: [{ player: 'X', position: 0 }],
    }));
    fixture.detectChanges();

    expect(firstCell?.textContent?.trim()).toBe('X');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Player O’s turn');
  });

  it('uses the score reset REST endpoint', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/games').flush(state({ scoreboard: { xWins: 2, oWins: 1, draws: 3 } }));
    fixture.detectChanges();

    const resetScores = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Reset scores'));
    resetScores?.click();

    const request = http.expectOne('/api/scoreboard/reset');
    expect(request.request.method).toBe('POST');
    request.flush({ xWins: 0, oWins: 0, draws: 0 });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Session scoreboard reset by the backend.');
  });

  it('renders backend win state with highlighted cells and complete move history', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/games').flush(state({
      board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
      currentPlayer: 'X',
      status: 'won',
      winner: 'X',
      winningCells: [0, 1, 2],
      moves: [
        { player: 'X', position: 0 }, { player: 'O', position: 3 },
        { player: 'X', position: 1 }, { player: 'O', position: 4 },
        { player: 'X', position: 2 },
      ],
    }));
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.cell.winning')).toHaveLength(3);
    expect(page.querySelectorAll('.table-row')).toHaveLength(5);
    expect(page.textContent).toContain('Player X wins!');
    expect(page.textContent).toContain('Row 1, Column 3');
    expect(page.querySelector<HTMLButtonElement>('.game-actions .secondary-button')?.disabled).toBe(true);
  });

  it('disables undo when the backend reports a draw', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/games').flush(state({
      board: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'],
      status: 'draw',
      moves: [
        { player: 'X', position: 0 }, { player: 'O', position: 1 },
        { player: 'X', position: 2 }, { player: 'O', position: 4 },
        { player: 'X', position: 3 }, { player: 'O', position: 5 },
        { player: 'X', position: 7 }, { player: 'O', position: 6 },
        { player: 'X', position: 8 },
      ],
    }));
    fixture.detectChanges();

    const undoButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.game-actions .secondary-button');
    expect(undoButton?.disabled).toBe(true);
  });
});

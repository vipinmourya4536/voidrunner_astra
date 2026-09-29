export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
export class StateMachine {
  private current: GameState = 'MENU';
  get value(): GameState { return this.current; }
  set(next: GameState): void { this.current = next; }
  is(value: GameState): boolean { return this.current === value; }
}

export type TouchAction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'SPACE';

/** Track each finger independently, including two fingers on the same control. */
export class TouchInput {
  private pointers = new Map<number, TouchAction>();

  constructor(private onChange: (action: TouchAction, pressed: boolean) => void) {}

  get actions(): Set<TouchAction> {
    return new Set(this.pointers.values());
  }

  press(pointerId: number, action: TouchAction): void {
    if (this.pointers.get(pointerId) === action) return;
    this.release(pointerId);
    const alreadyPressed = this.actions.has(action);
    this.pointers.set(pointerId, action);
    if (!alreadyPressed) this.onChange(action, true);
  }

  release(pointerId: number): void {
    const action = this.pointers.get(pointerId);
    if (!action) return;
    this.pointers.delete(pointerId);
    if (!this.actions.has(action)) this.onChange(action, false);
  }

  clear(): void {
    const held = this.actions;
    this.pointers.clear();
    held.forEach((action) => this.onChange(action, false));
  }
}

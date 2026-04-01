import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <div>
      <button (click)="decrement()">-</button>
      <span data-testid="count">{{ count() }}</span>
      <button (click)="increment()">+</button>
    </div>
  `,
})
export class CounterComponent {
  @Input() step = 1;
  count = signal(0);

  increment(): void {
    this.count.update((c) => c + this.step);
  }

  decrement(): void {
    this.count.update((c) => c - this.step);
  }
}

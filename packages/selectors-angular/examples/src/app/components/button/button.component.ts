import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button [attr.disabled]="disabled || null" [class]="type" (click)="clicked.emit()">
      {{ label }}
    </button>
  `,
})
export class ButtonComponent {
  @Input() label = 'Button';
  @Input() disabled = false;
  @Input() type = 'primary';

  @Output() clicked = new EventEmitter<void>();
}

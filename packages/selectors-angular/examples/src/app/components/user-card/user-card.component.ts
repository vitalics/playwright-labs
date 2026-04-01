import { Component, Input } from '@angular/core';

export interface User {
  name: string;
  role: string;
}

@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `
    <div class="user-card">
      <strong>{{ user.name }}</strong>
      <span>{{ user.role }}</span>
    </div>
  `,
})
export class UserCardComponent {
  @Input() user: User = { name: '', role: '' };
}

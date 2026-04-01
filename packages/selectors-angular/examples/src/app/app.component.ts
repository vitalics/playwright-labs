import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ButtonComponent } from './components/button/button.component';
import { CounterComponent } from './components/counter/counter.component';
import { UserCardComponent } from './components/user-card/user-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ButtonComponent, CounterComponent, UserCardComponent, NgFor, NgIf, RouterOutlet],
  template: `
    <h1>Angular Selector Engine Example</h1>

    <section id="buttons">
      <h2>Buttons</h2>
      <app-button label="Submit" type="primary"></app-button>
      <app-button label="Cancel" type="secondary"></app-button>
      <app-button label="Delete" [disabled]="true" type="danger"></app-button>
    </section>

    <section id="counters">
      <h2>Counters</h2>
      <app-counter [step]="1"></app-counter>
      <app-counter [step]="5"></app-counter>
    </section>

    <section id="user-cards">
      <h2>User Cards</h2>
      <app-user-card [user]="alice"></app-user-card>
      <app-user-card [user]="bob"></app-user-card>
    </section>

    <section id="directives">
      <h2>Directives</h2>
      <ul id="ng-for-list">
        <li *ngFor="let tag of tags" class="tag-item">{{ tag }}</li>
      </ul>
      <p id="ng-if-visible" *ngIf="showMessage">Hello from NgIf</p>
      <p id="ng-if-hidden" *ngIf="!showMessage">Hidden by default</p>
    </section>

    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  alice = { name: 'Alice', role: 'admin' };
  bob = { name: 'Bob', role: 'user' };
  tags = ['angular', 'playwright', 'testing'];
  showMessage = true;
}

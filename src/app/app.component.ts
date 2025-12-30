import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>DA Bubble</h1>
      </header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .app-header {
      background-color: #4a154b;
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .app-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .app-header p {
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
      opacity: 0.9;
    }
    .app-main {
      flex: 1;
      padding: 2rem;
      background-color: #f8f8f8;
    }
  `]
})
export class AppComponent {
  title = 'DA Bubble';
}


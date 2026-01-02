import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent, HeaderComponent],
  template: `
    <div class="app-wrapper">
      <app-header></app-header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .app-wrapper {
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      max-width: 100vw;
      max-height: 100vh;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
    .app-main {
      flex: 1;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AppComponent {
  title = 'da bubble 200';
}


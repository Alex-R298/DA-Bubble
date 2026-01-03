import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent, HeaderComponent, CommonModule],
  template: `
    <div class="app-wrapper">
      @if (showHeader) {
        <app-header></app-header>
      }
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
      height: 100vh;
      width: 100%;
      overflow: hidden;
    }
    .app-main {
      flex: 1;
      display: flex;
      min-height: 0;
      overflow: hidden;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'da bubble 200';
  private router = inject(Router);
  private routerSubscription?: Subscription;
  showHeader = false;

  ngOnInit(): void {
    this.updateHeaderVisibility(this.router.url);
    
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateHeaderVisibility(event.url);
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private updateHeaderVisibility(url: string): void {
    this.showHeader = url.startsWith('/dashboard');
  }
}


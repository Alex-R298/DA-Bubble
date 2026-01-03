import { Component, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent, HeaderComponent, NgIf],
  template: `
    <div class="app-wrapper">
      <app-header *ngIf="showHeader"></app-header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
      <app-footer *ngIf="showFooter"></app-footer>
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
export class AppComponent implements OnDestroy {
  showHeader = true;
  showFooter = true;

  private routerSub?: Subscription;

  constructor(private router: Router) {
    this.updateVisibility(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(ev => this.updateVisibility(ev.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateVisibility(url: string): void {
    const path = this.normalizePath(url);

    // Login/Register pages (in this project: login + signup + root login)
    const hideHeaderOn = ['/', '/login', '/signup'];

    // Footer should also be hidden on the dashboard view
    const hideFooterOn = ['/dashboard'];

    this.showHeader = !this.matchesAnyPath(path, hideHeaderOn);
    this.showFooter = !this.matchesAnyPath(path, hideFooterOn);
  }

  private normalizePath(url: string): string {
    return (url || '').split('?')[0].split('#')[0] || '/';
  }

  private matchesAnyPath(path: string, prefixes: string[]): boolean {
    return prefixes.some(prefix => {
      if (prefix === '/') return path === '/';
      return path === prefix || path.startsWith(`${prefix}/`);
    });
  }
}


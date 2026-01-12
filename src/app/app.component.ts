import { Component, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { filter, Subscription } from 'rxjs';
import { ThreadStateService } from './services/thread-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent, HeaderComponent, NgIf],
  template: `
    <div class="app-wrapper" [class.auth-gradient]="useAuthGradient" [class.thread-open]="isThreadOpen">
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
    .app-wrapper.auth-gradient {
      background: linear-gradient(135deg, #ECEEFE 0%, #E8EAFE 100%);
    }
    .app-main {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  `]
})
export class AppComponent implements OnDestroy {
  showHeader = true;
  showFooter = true;
  useAuthGradient = false;

  isThreadOpen = false;

  private routerSub?: Subscription;
  private threadSub?: Subscription;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private threadStateService: ThreadStateService
  ) {
    this.updateVisibility(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(ev => this.updateVisibility(ev.urlAfterRedirects));

    this.threadSub = this.threadStateService.messageId$.subscribe(messageId => {
      this.isThreadOpen = !!messageId;
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.threadSub?.unsubscribe();
  }

  private updateVisibility(url: string): void {
    const path = this.normalizePath(url);

    // Check if current route has hideHeaderFooter data
    let currentRoute = this.activatedRoute;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    const hideHeaderFooter = currentRoute.snapshot.data['hideHeaderFooter'];

    if (hideHeaderFooter) {
      this.showHeader = false;
      this.showFooter = false;
      this.useAuthGradient = false;
      return;
    }

    const authGradientOn = ['/', '/login', '/signup', '/forgot-password'];
    this.useAuthGradient = this.matchesAnyPath(path, authGradientOn);

    // Login/Register pages (in this project: login + signup + root login)
    const hideHeaderOn = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/choose-avatar', '/imprint', '/privacy-policy'];

    // Footer should also be hidden on the dashboard view
    const hideFooterOn = ['/dashboard', '/reset-password', '/choose-avatar', '/imprint', '/privacy-policy'];

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


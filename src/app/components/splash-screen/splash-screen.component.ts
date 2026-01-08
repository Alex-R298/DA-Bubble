import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.css'
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  isAnimating = true;
  private animationTimeout?: ReturnType<typeof setTimeout>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.animationTimeout = setTimeout(() => {
      this.isAnimating = false;
      setTimeout(() => {
        this.navigateToLogin();
      }, 300);
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }

  private navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}

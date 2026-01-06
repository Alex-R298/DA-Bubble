import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-choose-avatar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './choose-avatar.component.html',
  styleUrl: './choose-avatar.component.css'
})
export class ChooseAvatarComponent implements OnInit {
  private router = inject(Router);
  
  userName: string = '';
  selectedAvatar: number | null = null;
  
  avatars: string[] = [
    'assets/avatars/avatar-1.svg',
    'assets/avatars/avatar-2.svg',
    'assets/avatars/avatar-3.svg',
    'assets/avatars/avatar-4.svg',
    'assets/avatars/avatar-5.svg',
    'assets/avatars/avatar-6.svg'
  ];

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = history.state;
    
    if (state && state.userName) {
      this.userName = state.userName;
    } else {
      this.userName = 'Benutzer';
    }
  }

  selectAvatar(index: number): void {
    this.selectedAvatar = index;
  }

  goBack(): void {
    this.router.navigate(['/signup']);
  }

  onContinue(): void {
    if (this.selectedAvatar !== null) {
      // Avatar-Auswahl speichern (kann später in AuthService implementiert werden)
      const selectedAvatarUrl = this.avatars[this.selectedAvatar];
      console.log('Selected avatar:', selectedAvatarUrl);
      
      this.router.navigate(['/dashboard']);
    }
  }
}

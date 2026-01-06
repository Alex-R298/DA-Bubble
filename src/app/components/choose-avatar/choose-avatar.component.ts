import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-choose-avatar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './choose-avatar.component.html',
  styleUrl: './choose-avatar.component.css'
})
export class ChooseAvatarComponent implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  
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

  async onContinue(): Promise<void> {
    if (this.selectedAvatar !== null) {
      const selectedAvatarUrl = this.avatars[this.selectedAvatar];
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        await this.userService.updateUserAvatar(currentUser.uid, selectedAvatarUrl);
      }
      
      this.router.navigate(['/dashboard']);
    }
  }
}

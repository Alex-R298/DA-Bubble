import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { HeaderLoginComponent } from '../header-login/header-login.component';

@Component({
  selector: 'app-choose-avatar',
  standalone: true,
  imports: [CommonModule, RouterModule, SvgImagesComponent, HeaderLoginComponent],
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
    'steffen-hoffmann',
    'sofia-mueller',
    'noah-braun',
    'frederik-beck',
    'elise-roth',
    'elias-neumann'
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

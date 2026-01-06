import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

@Component({
  selector: 'app-choose-avatar',
  standalone: true,
  imports: [CommonModule, RouterModule, SvgImagesComponent],
  templateUrl: './choose-avatar.component.html',
  styleUrl: './choose-avatar.component.css'
})
export class ChooseAvatarComponent implements OnInit {
  private router = inject(Router);
  
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

  goBack(): void {
    this.router.navigate(['/signup']);
  }

  onContinue(): void {
    if (this.selectedAvatar !== null) {
      // Avatar-Auswahl speichern (kann später in AuthService implementiert werden)
      const selectedAvatarName = this.avatars[this.selectedAvatar];
      console.log('Selected avatar:', selectedAvatarName);
      
      this.router.navigate(['/dashboard']);
    }
  }
}

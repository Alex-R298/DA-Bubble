import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  currentChannel: string = 'general';
  user: { name: string; imageUrl?: string } = { name: 'John Doe' };
}


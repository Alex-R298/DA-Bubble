import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

@Component({
  selector: 'app-header-login',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent],
  templateUrl: './header-login.component.html',
  styleUrl: './header-login.component.css'
})
export class HeaderLoginComponent {

}


import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.css'
})
export class ImprintComponent {
  constructor(private location: Location) { }

  goBack(): void {
    this.location.back();
  }
}


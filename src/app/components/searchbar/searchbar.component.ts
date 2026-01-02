import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchbar.component.html',
  styleUrl: './searchbar.component.css'
})
export class SearchbarComponent {
  @Output() search = new EventEmitter<string>();
  searchQuery: string = '';

  onSearch(): void {
    this.search.emit(this.searchQuery);
  }

  onInputChange(): void {
    if (this.searchQuery.trim()) {
      this.onSearch();
    }
  }
}


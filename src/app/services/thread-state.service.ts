import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class ThreadStateService {
  private messageIdSubject = new BehaviorSubject<string>('');
  private channelIdSubject = new BehaviorSubject<string>('');
  private selectedMessageSubject = new BehaviorSubject<Message | null>(null);
  
  messageId$ = this.messageIdSubject.asObservable();
  channelId$ = this.channelIdSubject.asObservable();
  selectedMessage$ = this.selectedMessageSubject.asObservable();

  openThread(message: Message, channelId: string): void {
    this.messageIdSubject.next(message.id!);
    this.channelIdSubject.next(channelId);
    this.selectedMessageSubject.next(message);
  }
  
  closeThread(): void {
    this.messageIdSubject.next('');
    this.channelIdSubject.next('');
    this.selectedMessageSubject.next(null);
  }
}
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message } from './message.service';

/**
 * Service for managing thread state across the application.
 * Handles opening and closing of message threads and maintains
 * the currently selected message and channel context.
 */
@Injectable({
  providedIn: 'root'
})
export class ThreadStateService {
  private messageIdSubject = new BehaviorSubject<string>('');
  private channelIdSubject = new BehaviorSubject<string>('');
  private selectedMessageSubject = new BehaviorSubject<Message | null>(null);
  
  /** Observable stream of the current thread's message ID */
  messageId$ = this.messageIdSubject.asObservable();
  
  /** Observable stream of the current thread's channel ID */
  channelId$ = this.channelIdSubject.asObservable();
  
  /** Observable stream of the currently selected message */
  selectedMessage$ = this.selectedMessageSubject.asObservable();

  /**
   * Opens a thread for the specified message
   * @param message - The message to open the thread for
   * @param channelId - The ID of the channel containing the message
   */
  openThread(message: Message, channelId: string): void {
    this.messageIdSubject.next(message.id!);
    this.channelIdSubject.next(channelId);
    this.selectedMessageSubject.next(message);
  }
  
  /**
   * Closes the currently open thread and resets all state
   */
  closeThread(): void {
    this.messageIdSubject.next('');
    this.channelIdSubject.next('');
    this.selectedMessageSubject.next(null);
  }
}
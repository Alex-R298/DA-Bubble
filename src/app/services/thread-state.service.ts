import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
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
  private conversationIdSubject = new BehaviorSubject<string>('');
  private isDirectMessageSubject = new BehaviorSubject<boolean>(false);
  private selectedMessageSubject = new BehaviorSubject<Message | null>(null);
  private threadClosedSubject = new Subject<void>();
  
  /** Observable stream of the current thread's message ID */
  messageId$ = this.messageIdSubject.asObservable();
  
  /** Observable stream of the current thread's channel ID */
  channelId$ = this.channelIdSubject.asObservable();

  /** Observable stream of the current thread's conversation ID (for DMs) */
  conversationId$ = this.conversationIdSubject.asObservable();

  /** Observable stream indicating if the thread is for a direct message */
  isDirectMessage$ = this.isDirectMessageSubject.asObservable();
  
  /** Observable stream of the currently selected message */
  selectedMessage$ = this.selectedMessageSubject.asObservable();

  /** Observable that emits when a thread is closed */
  threadClosed$ = this.threadClosedSubject.asObservable();

  /**
   * Opens a thread for the specified message in a channel
   * @param message - The message to open the thread for
   * @param channelId - The ID of the channel containing the message
   */
  openThread(message: Message, channelId: string): void {
    this.messageIdSubject.next(message.id!);
    this.channelIdSubject.next(channelId);
    this.conversationIdSubject.next('');
    this.isDirectMessageSubject.next(false);
    this.selectedMessageSubject.next(message);
  }

  /**
   * Opens a thread for the specified direct message
   * @param message - The message to open the thread for
   * @param conversationId - The ID of the DM conversation
   */
  openDirectMessageThread(message: Message, conversationId: string): void {
    this.messageIdSubject.next(message.id!);
    this.channelIdSubject.next('');
    this.conversationIdSubject.next(conversationId);
    this.isDirectMessageSubject.next(true);
    this.selectedMessageSubject.next(message);
  }
  
  /**
   * Closes the currently open thread and resets all state
   */
  closeThread(): void {
    this.messageIdSubject.next('');
    this.channelIdSubject.next('');
    this.conversationIdSubject.next('');
    this.isDirectMessageSubject.next(false);
    this.selectedMessageSubject.next(null);
    this.threadClosedSubject.next();
  }
}
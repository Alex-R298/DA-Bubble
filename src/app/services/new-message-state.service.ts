import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NewMessageStateService {
    private isNewMessageActiveSubject = new BehaviorSubject<boolean>(false);
    isNewMessageActive$ = this.isNewMessageActiveSubject.asObservable();

    openNewMessage(): void {
        this.isNewMessageActiveSubject.next(true);
    }

    closeNewMessage(): void {
        this.isNewMessageActiveSubject.next(false);
    }
}

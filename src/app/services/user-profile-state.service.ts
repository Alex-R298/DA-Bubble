import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { UserProfileModalUser } from '../components/user-profile-modal/user-profile-modal.component';

@Injectable({
    providedIn: 'root'
})
export class UserProfileStateService {
    private openProfileSubject = new Subject<UserProfileModalUser>();
    profileOpened$ = this.openProfileSubject.asObservable();

    openProfile(user: UserProfileModalUser): void {
        if (!user?.uid) return;
        this.openProfileSubject.next(user);
    }
}

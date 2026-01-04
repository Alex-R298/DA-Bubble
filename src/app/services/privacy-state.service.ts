import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrivacyStateService {
  private privacyAcceptedFromPolicy = new BehaviorSubject<boolean>(false);
  private returnRoute = new BehaviorSubject<string | null>(null);

  getPrivacyAcceptedStatus(): Observable<boolean> {
    return this.privacyAcceptedFromPolicy.asObservable();
  }

  setPrivacyAccepted(accepted: boolean): void {
    this.privacyAcceptedFromPolicy.next(accepted);
  }

  setReturnRoute(route: string): void {
    this.returnRoute.next(route);
  }

  getReturnRoute(): string | null {
    return this.returnRoute.value;
  }

  clearReturnRoute(): void {
    this.returnRoute.next(null);
  }

  resetPrivacyAcceptance(): void {
    this.privacyAcceptedFromPolicy.next(false);
  }
}

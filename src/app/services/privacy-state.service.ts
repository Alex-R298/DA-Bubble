import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrivacyStateService {
  private privacyAcceptedFromPolicy = new BehaviorSubject<boolean>(false);
  private returnRoute = new BehaviorSubject<string | null>(null);

  /**
   * Returns an observable of the privacy acceptance status.
   * @returns An observable emitting the current acceptance state.
   */
  getPrivacyAcceptedStatus(): Observable<boolean> {
    return this.privacyAcceptedFromPolicy.asObservable();
  }

  /**
   * Sets the privacy policy acceptance status.
   * @param accepted - Whether the privacy policy was accepted.
   */
  setPrivacyAccepted(accepted: boolean): void {
    this.privacyAcceptedFromPolicy.next(accepted);
  }

  /**
   * Sets the route to return to after viewing the privacy policy.
   * @param route - The route path to return to.
   */
  setReturnRoute(route: string): void {
    this.returnRoute.next(route);
  }

  /**
   * Gets the current return route.
   * @returns The return route path or null if not set.
   */
  getReturnRoute(): string | null {
    return this.returnRoute.value;
  }

  /**
   * Clears the stored return route.
   */
  clearReturnRoute(): void {
    this.returnRoute.next(null);
  }

  /**
   * Resets the privacy acceptance status to false.
   */
  resetPrivacyAcceptance(): void {
    this.privacyAcceptedFromPolicy.next(false);
  }
}

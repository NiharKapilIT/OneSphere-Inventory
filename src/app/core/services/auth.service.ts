import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  constructor() { }


  private hasToken(): boolean {
    return !!sessionStorage.getItem('token');
  }


  setSession(
    token: string,
    username: string,
    companyCode: string,
    branchCode: string,
    userId: number,
    branchId: number,
    ipAddress: string
  ): void {

    // Store individual values
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('companyCode', companyCode);
    sessionStorage.setItem('branchCode', branchCode);
    sessionStorage.setItem('branchId', branchId.toString());
    sessionStorage.setItem('userId', userId.toString());
    sessionStorage.setItem('ipAddress', ipAddress);

    // Store combined object
    sessionStorage.setItem('loggedInUser', JSON.stringify({
      username,
      companyCode,
      branchCode,
      userId,
      branchId,
      ipAddress
    }));

    this.isAuthenticatedSubject.next(true);
  }


  logout(): void {
    sessionStorage.clear();
    this.isAuthenticatedSubject.next(false);
  }


  isAuthenticated(): boolean {
    return this.hasToken();
  }



  getToken(): string {
    return sessionStorage.getItem('token') || '';
  }

  getUsername(): string {
    return sessionStorage.getItem('username') || '';
  }

  getCompanyCode(): string {
    return sessionStorage.getItem('companyCode') || '';
  }

  getBranchCode(): string {
    return sessionStorage.getItem('branchCode') || '';
  }

  getUserId(): number {
    return Number(sessionStorage.getItem('userId') || 0);
  }

  // Get full logged user object

  getLoggedInUser(): {
    username: string;
    companyCode: string;
    branchCode: string;
    userId: number;
    branchId: number;
    ipAddress: string;
  } | null {
    const user = sessionStorage.getItem('loggedInUser');
    return user ? JSON.parse(user) : null;
  }
}
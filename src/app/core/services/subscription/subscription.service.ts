import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ModulePricingItem {
  id: number;
  moduleCode: string;
  moduleName: string;
  icon?: string;
  isCore: boolean;
  monthlyPrice: number;
  subscribed: boolean;
}

export interface SubscriptionPlan {
  planId?: number;
  subscriptionStatus: string;
  maxBranches: number;
  maxUsers: number;
  currentBranchCount: number;
  currentUserCount: number;
  modules: ModulePricingItem[];
}

export interface UpgradeRequest {
  moduleIds: number[];
  maxBranches: number;
  maxUsers: number;
}

export interface CalculateUpgradeResponse {
  modulesAdded: ModulePricingItem[];
  branchesAdded: number;
  usersAdded: number;
  modulesCost: number;
  branchesCost: number;
  usersCost: number;
  totalAmount: number;
  temporaryApproval: boolean;
}

export interface SubscriptionOrderResponse {
  orderId: number;
  paymentStatus: string;
  appliedAt?: string;
  subscribedModuleIds: number[];
  maxBranches: number;
  maxUsers: number;
}

export interface SubscriptionOrderListItem {
  id: number;
  orderType: string;
  amount: number;
  paymentStatus: string;
  requestedMaxBranches: number;
  requestedMaxUsers: number;
  moduleCodes: string[];
  createdAt: string;
  appliedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);

  private apiUrl(): string {
    return sessionStorage.getItem('apiURL') ?? '';
  }

  getAvailableModules(): Observable<{ success: boolean; data: ModulePricingItem[] }> {
    return this.http.get<{ success: boolean; data: ModulePricingItem[] }>(
      `${this.apiUrl()}/subscription/modules`
    );
  }

  getSubscription(): Observable<{ success: boolean; data: SubscriptionPlan }> {
    return this.http.get<{ success: boolean; data: SubscriptionPlan }>(
      `${this.apiUrl()}/subscription`
    );
  }

  calculateUpgrade(request: UpgradeRequest): Observable<{ success: boolean; data: CalculateUpgradeResponse }> {
    return this.http.post<{ success: boolean; data: CalculateUpgradeResponse }>(
      `${this.apiUrl()}/subscription/calculate`,
      request
    );
  }

  upgrade(request: UpgradeRequest): Observable<{ success: boolean; message: string; data: SubscriptionOrderResponse }> {
    return this.http.post<{ success: boolean; message: string; data: SubscriptionOrderResponse }>(
      `${this.apiUrl()}/subscription/upgrade`,
      request
    );
  }

  getOrders(): Observable<{ success: boolean; data: SubscriptionOrderListItem[] }> {
    return this.http.get<{ success: boolean; data: SubscriptionOrderListItem[] }>(
      `${this.apiUrl()}/subscription/orders`
    );
  }
}

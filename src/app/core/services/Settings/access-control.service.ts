import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface BranchResponse {
  id: number;
  companyId: number;
  branchCode: string;
  branchName: string;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  isHeadOffice: boolean;
  isDefault: boolean;
  status: string;
}

export interface BranchUpsertRequest {
  branchCode: string;
  branchName: string;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  isHeadOffice: boolean;
  status: string;
}

export interface RoleResponse {
  id: number;
  companyId?: number | null;
  roleCode: string;
  roleName: string;
  roleType: string;
  description?: string | null;
  status: string;
}

export interface ModuleResponse {
  id: number;
  moduleCode: string;
  moduleName: string;
  icon?: string | null;
  displayOrder: number;
  status: string;
}

export interface UserResponse {
  id: number;
  companyId: number;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  loginIdentifier: string;
  isSuperAdmin: boolean;
  hasPassword: boolean;
  status: string;
  lastLoginAt?: string | null;
  branches: BranchResponse[];
  modules: ModuleResponse[];
  roles: RoleResponse[];
}

export interface UserUpsertRequest {
  fullName: string;
  username: string;
  email?: string | null;
  mobile?: string | null;
  branchIds: number[];
  defaultBranchId?: number | null;
  moduleIds: number[];
  roleIds: number[];
  password?: string | null;
  status: string;
}

export interface RoleUpsertRequest {
  roleCode: string;
  roleName: string;
  roleType: string;
  description?: string | null;
  status: string;
}

export interface PermissionFlags {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export interface RoleScreenPermissionResponse {
  screenId: number;
  screenCode: string;
  screenName: string;
  permissions: PermissionFlags;
}

export interface SaveRoleScreenPermissionsRequest {
  roleId: number;
  permissions: Array<{
    screenId: number;
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport: boolean;
  }>;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly http = inject(HttpClient);

  getUsers(): Observable<ApiResponse<UserResponse[]>> {
    return this.http.get<ApiResponse<UserResponse[]>>(`${this.apiUrl()}/users`);
  }

  createUser(request: UserUpsertRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.post<ApiResponse<UserResponse>>(`${this.apiUrl()}/users`, request);
  }

  updateUser(id: number, request: UserUpsertRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.put<ApiResponse<UserResponse>>(`${this.apiUrl()}/users/${id}`, request);
  }

  inactivateUser(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl()}/users/${id}`);
  }

  getBranches(): Observable<ApiResponse<BranchResponse[]>> {
    return this.http.get<ApiResponse<BranchResponse[]>>(`${this.apiUrl()}/branches`);
  }

  getAssignableModules(): Observable<ApiResponse<ModuleResponse[]>> {
    return this.http.get<ApiResponse<ModuleResponse[]>>(`${this.apiUrl()}/users/assignable-modules`);
  }

  createBranch(request: BranchUpsertRequest): Observable<ApiResponse<BranchResponse>> {
    return this.http.post<ApiResponse<BranchResponse>>(`${this.apiUrl()}/branches`, request);
  }

  updateBranch(id: number, request: BranchUpsertRequest): Observable<ApiResponse<BranchResponse>> {
    return this.http.put<ApiResponse<BranchResponse>>(`${this.apiUrl()}/branches/${id}`, request);
  }

  inactivateBranch(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl()}/branches/${id}`);
  }

  getRoles(): Observable<ApiResponse<RoleResponse[]>> {
    return this.http.get<ApiResponse<RoleResponse[]>>(`${this.apiUrl()}/roles`);
  }

  createRole(request: RoleUpsertRequest): Observable<ApiResponse<RoleResponse>> {
    return this.http.post<ApiResponse<RoleResponse>>(`${this.apiUrl()}/roles`, request);
  }

  updateRole(id: number, request: RoleUpsertRequest): Observable<ApiResponse<RoleResponse>> {
    return this.http.put<ApiResponse<RoleResponse>>(`${this.apiUrl()}/roles/${id}`, request);
  }

  inactivateRole(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl()}/roles/${id}`);
  }

  getRolePermissions(roleId: number): Observable<ApiResponse<RoleScreenPermissionResponse[]>> {
    return this.http.get<ApiResponse<RoleScreenPermissionResponse[]>>(`${this.apiUrl()}/permissions/role/${roleId}`);
  }

  saveRolePermissions(request: SaveRoleScreenPermissionsRequest): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(
      `${this.apiUrl()}/permissions/role/${request.roleId}`,
      request
    );
  }

  private apiUrl(): string {
    return sessionStorage.getItem('apiURL') ?? '';
  }
}

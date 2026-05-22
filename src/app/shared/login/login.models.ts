export interface CompanyCode {
  tbl_mst_chit_company_configuration_id: number;
  company_name: string;
  company_code: string;
}

export interface BranchCode {
  branch_name: string;
  branch_code: string;
}

export interface LoginResponse {
  user_name?: string;
  username?: string;
  token: string;
  userId: any;
  branchId: any;
  ipAddress: string;
}
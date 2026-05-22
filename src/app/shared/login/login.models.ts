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
  accessToken:  string;     
  refreshToken: string;     
  token:        string;     
  username:     string;
  user_name:    string;
  userId:       number;
  branchId:     number;
  IPAddress:    string;     
  ipAddress:    string;     
  companyCode:  string;
  branchCode:   string;
}
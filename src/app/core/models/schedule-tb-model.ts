export interface ScheduleTbRow {
  type: string | null;
  accountName: string;
  accountId: string;
  debitAmount: number | string;   
  creditAmount: number | string;
  mainName: string;
  groupName: string;
  subGroupName: string;
  subHead: string;
  mainNameSortOrder: number;
  groupSortOrder: number;
  subGroupSortOrder: number;
  subHeadSortOrder: number;
}
export interface AccountRow {
  mainname: string;
  groupname: string;
  subgroupname: string;
  subhead: string;
  vchaccountname: string;
  accountid: string;
  debitamount: number;
  creditamount: number;
  mainsortorder: number;
  groupsortorder: number;
  subgroupsortorder: number;
  subheadsortorder: number;
}
export type ScheduleTree = Record<
  string,
  Record<string, Record<string, Record<string, AccountRow[]>>>
>;
export interface ScheduleTbRequest {
  date: string;         
  companyCode: string;
  branchCode: string;
}
export interface ReportHeader {
  companyName: string;
  address: string;
  cin: string;
  branch: string;
  asOnDate: string;
}
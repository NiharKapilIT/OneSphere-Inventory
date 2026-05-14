import { Params } from '@angular/router';

export interface ReferenceDataRouteMatcher {
  path: string;
  match?: 'exact' | 'prefix';
}

export interface ReferenceDataLink {
  label: string;
  route?: string | any[];
  url?: string;
  queryParams?: Params;
  icon?: string;
}

export interface ReferenceDataField {
  label: string;
  value: string | number | null | undefined;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  link?: ReferenceDataLink;
}

export interface ReferenceDataTableColumn {
  field: string;
  header: string;
}

export interface ReferenceDataBindRow {
  target: string;
  sourceRef: string;
  sourceLabel: string;
  fields?: Record<string, string>;
  lines?: string[][];
}

export interface ReferenceDataBindEvent {
  configId: string;
  target: string;
  rows: ReferenceDataBindRow[];
}

export interface ReferenceDataTableRow {
  [field: string]: string | number | boolean | null | undefined | string[][] | Record<string, string>;
  bindKey?: string;
  bindTarget?: string;
  bindLabel?: string;
  bindFields?: Record<string, string>;
  bindLines?: string[][];
}

export interface ReferenceDataTable {
  title?: string;
  columns: ReferenceDataTableColumn[];
  rows: ReferenceDataTableRow[];
  bindable?: boolean;
}

export interface ReferenceDataSection {
  title: string;
  subtitle?: string;
  icon?: string;
  fields?: ReferenceDataField[];
  table?: ReferenceDataTable;
  links?: ReferenceDataLink[];
}

export interface ReferenceDataTrayConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  routes: ReferenceDataRouteMatcher[];
  autoOpen?: boolean;
  sections: ReferenceDataSection[];
}

export interface ReferenceDataTrayState {
  isOpen: boolean;
  position?: {
    left: number;
    top: number;
  };
}

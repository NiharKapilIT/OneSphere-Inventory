import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { InventoryReportPageComponent } from './inventory-report-page';

describe('InventoryReportPageComponent (Inventory Audit Trail Report)', () => {
  let fixture: ComponentFixture<InventoryReportPageComponent>;
  let component: InventoryReportPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryReportPageComponent],
      providers: [
        provideHttpClient(),
        DatePipe,
        { provide: MessageService, useValue: { add: () => {}, addAll: () => {}, clear: () => {} } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ reportKey: 'inventory-audit-trail' })) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryReportPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the Inventory Audit Trail Report definition from the route reportKey', () => {
    expect(component.report().slug).toBe('inventory-audit-trail');
    expect(component.report().title).toBe('Inventory Audit Trail Report');
    expect(component.groupTitle()).toBe('Audit & Control Reports');
  });

  it('shows preview rows immediately, before any API call resolves', () => {
    expect(component.loadedFromApi()).toBe(false);
    expect(component.rows().length).toBeGreaterThan(0);
    expect(component.totalRecords()).toBe(component.rows().length);
  });

  it('defaults visible columns to every non-hidden column on the report definition', () => {
    const expectedKeys = component.report().columns
      .filter(col => col.defaultVisible !== false)
      .map(col => col.key);
    expect(component.visibleColumns().map(col => col.key)).toEqual(expectedKeys);
  });

  it('groups rows by module when sorted/grouped with the default grouping', () => {
    expect(component.groupBy()).toBe('module');
    const groupLabels = component.groupedRows().map(group => group.label);
    expect(new Set(groupLabels).size).toBe(groupLabels.length);
  });

  it('filters rows by the "action" text search', () => {
    // Clear the default this-month date range so the fixed sample dates aren't excluded by matchesDateFilter
    component.updateFilter('fromDate', null);
    component.updateFilter('toDate', null);
    component.searchText.set('Rejected');
    fixture.detectChanges();
    expect(component.searchableRows().every(row => String(row['action'] ?? '').includes('Rejected') || Object.values(row).some(v => String(v).includes('Rejected')))).toBe(true);
    expect(component.searchableRows().length).toBeGreaterThan(0);
    expect(component.searchableRows().length).toBeLessThan(component.rows().length);
  });
});

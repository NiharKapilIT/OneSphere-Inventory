import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReferenceDataTrayComponent } from './reference-data-tray.component';
import { ReferenceDataTrayConfig } from './reference-data-tray.models';

describe('ReferenceDataTrayComponent', () => {
  let fixture: ComponentFixture<ReferenceDataTrayComponent>;
  let component: ReferenceDataTrayComponent;

  const config: ReferenceDataTrayConfig = {
    id: 'test-reference-tray',
    title: 'Test Reference',
    subtitle: 'Reference data for testing',
    routes: [{ path: '/dashboard/test' }],
    sections: [
      {
        title: 'Source',
        fields: [
          { label: 'Document', value: 'DOC-001' },
          { label: 'Status', value: 'Approved', tone: 'success' }
        ]
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceDataTrayComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    localStorage.clear();
    fixture = TestBed.createComponent(ReferenceDataTrayComponent);
    component = fixture.componentInstance;
  });

  it('renders the tray when reference data is configured', () => {
    fixture.componentRef.setInput('config', config);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.reference-tray')).toBeTruthy();
    expect(element.textContent).toContain('Test Reference');
    expect(element.textContent).toContain('DOC-001');
  });

  it('renders nothing when no reference data is configured', () => {
    fixture.componentRef.setInput('config', null);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.reference-tray')).toBeNull();
    expect(element.querySelector('.reference-tray-trigger')).toBeNull();
  });

  it('shows a floating trigger after the tray is closed', () => {
    fixture.componentRef.setInput('config', config);
    fixture.detectChanges();

    component.closeTray();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.reference-tray')).toBeNull();
    expect(element.querySelector('.reference-tray-trigger')).toBeTruthy();
  });
});

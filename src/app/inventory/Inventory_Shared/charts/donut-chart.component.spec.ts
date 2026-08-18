import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonutChartComponent } from './donut-chart.component';
import { CHART_SERIES_COLORS } from './chart-palette';

describe('DonutChartComponent', () => {
  let fixture: ComponentFixture<DonutChartComponent>;
  let component: DonutChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DonutChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(DonutChartComponent);
    component = fixture.componentInstance;
  });

  function set(inputs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  }

  it('shows the empty state when every slice is zero', () => {
    set({ slices: [{ label: 'Payables', value: 0 }, { label: 'Receivables', value: 0 }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chart-empty')).toBeTruthy();
  });

  it('renders the canvas and the center total once there is real data', () => {
    set({ slices: [{ label: 'Payables', value: 40 }, { label: 'Receivables', value: 60 }], centerValue: '₹ 100' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.donut-center strong').textContent).toContain('₹ 100');
  });

  it('assigns categorical colors per slice in fixed order', () => {
    set({ slices: [{ label: 'Payables', value: 40 }, { label: 'Receivables', value: 60 }] });
    const colors = component.chartData().datasets[0].backgroundColor;
    expect(colors).toEqual([CHART_SERIES_COLORS[0], CHART_SERIES_COLORS[1]]);
  });

  it('always shows a legend (2+ slices always need identity beyond color alone)', () => {
    set({ slices: [{ label: 'Payables', value: 40 }, { label: 'Receivables', value: 60 }] });
    expect(component.chartOptions()!.plugins!.legend!.display).toBe(true);
  });
});

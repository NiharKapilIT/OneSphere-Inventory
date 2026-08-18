import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart.component';
import { CHART_SERIES_COLORS } from './chart-palette';

describe('BarChartComponent', () => {
  let fixture: ComponentFixture<BarChartComponent>;
  let component: BarChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BarChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
  });

  function set(inputs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  }

  it('shows the empty state when every series is all-zero', () => {
    set({ labels: ['Mon', 'Tue'], series: [{ label: 'Inward', data: [0, 0] }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chart-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('renders the canvas once any series has a positive value', () => {
    set({ labels: ['Mon', 'Tue'], series: [{ label: 'Inward', data: [0, 5] }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chart-empty')).toBeNull();
    expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy();
  });

  it('assigns categorical colors to each series in fixed order, never cycled from a random source', () => {
    set({ labels: ['A'], series: [{ label: 'Inward', data: [1] }, { label: 'Outward', data: [2] }] });
    const datasets = component.chartData().datasets;
    expect(datasets[0].backgroundColor).toBe(CHART_SERIES_COLORS[0]);
    expect(datasets[1].backgroundColor).toBe(CHART_SERIES_COLORS[1]);
  });

  it('hides the legend for a single series (the card title already names it)', () => {
    set({ labels: ['A'], series: [{ label: 'Inward', data: [1] }] });
    expect(component.chartOptions()!.plugins!.legend!.display).toBe(false);
  });

  it('shows the legend once there are 2+ series', () => {
    set({ labels: ['A'], series: [{ label: 'Inward', data: [1] }, { label: 'Outward', data: [2] }] });
    expect(component.chartOptions()!.plugins!.legend!.display).toBe(true);
  });

  it('flips the index axis to y for a horizontal bar chart', () => {
    set({ labels: ['A'], series: [{ label: 'X', data: [1] }], horizontal: true });
    expect(component.chartOptions()!.indexAxis).toBe('y');
  });

  it('defaults to a vertical (x-index) bar chart', () => {
    set({ labels: ['A'], series: [{ label: 'X', data: [1] }] });
    expect(component.chartOptions()!.indexAxis).toBe('x');
  });
});

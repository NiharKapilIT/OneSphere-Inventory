import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;
  let component: StatCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
  });

  function set(inputs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }

  it('renders label, value, and note', () => {
    set({ label: 'Stock Value', value: '₹ 1,15,000', note: 'All warehouses' });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-card-label')?.textContent).toContain('Stock Value');
    expect(el.querySelector('.stat-card-value')?.textContent).toContain('₹ 1,15,000');
    expect(el.querySelector('.stat-card-note')?.textContent).toContain('All warehouses');
  });

  it('omits the note element entirely when none is given', () => {
    set({ label: 'X', value: '1' });
    expect(fixture.nativeElement.querySelector('.stat-card-note')).toBeNull();
  });

  it('applies the tone class matching the tone input', () => {
    set({ label: 'X', value: '1', tone: 'rose' });
    expect(fixture.nativeElement.querySelector('.stat-card').classList).toContain('tone-rose');
  });

  it('defaults to the blue tone when none is given', () => {
    set({ label: 'X', value: '1' });
    expect(fixture.nativeElement.querySelector('.stat-card').classList).toContain('tone-blue');
  });

  it('shows an up-trend badge with the arrow-up icon', () => {
    set({ label: 'X', value: '1', trend: '+12%', trendUp: true });
    const trend = fixture.nativeElement.querySelector('.stat-card-trend');
    expect(trend.classList).toContain('is-up');
    expect(trend.querySelector('i').classList).toContain('pi-arrow-up');
    expect(trend.textContent).toContain('+12%');
  });

  it('shows a down-trend badge with the arrow-down icon', () => {
    set({ label: 'X', value: '1', trend: '-4%', trendUp: false });
    const trend = fixture.nativeElement.querySelector('.stat-card-trend');
    expect(trend.classList).toContain('is-down');
    expect(trend.querySelector('i').classList).toContain('pi-arrow-down');
  });

  it('omits the trend badge entirely when no trend is given', () => {
    set({ label: 'X', value: '1' });
    expect(fixture.nativeElement.querySelector('.stat-card-trend')).toBeNull();
  });

  it('emits cardClick on click only when clickable is true', () => {
    set({ label: 'X', value: '1', clickable: true });
    let clicked = false;
    component.cardClick.subscribe(() => (clicked = true));
    fixture.nativeElement.querySelector('.stat-card').click();
    expect(clicked).toBe(true);
  });

  it('does not emit cardClick when clickable is false (default)', () => {
    set({ label: 'X', value: '1' });
    let clicked = false;
    component.cardClick.subscribe(() => (clicked = true));
    fixture.nativeElement.querySelector('.stat-card').click();
    expect(clicked).toBe(false);
  });
});

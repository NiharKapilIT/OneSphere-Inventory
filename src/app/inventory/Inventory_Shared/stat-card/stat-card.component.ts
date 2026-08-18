import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export type StatCardTone = 'blue' | 'green' | 'amber' | 'rose';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string>('');
  readonly icon = input<string>('pi pi-chart-bar');
  readonly tone = input<StatCardTone>('blue');
  /** e.g. "+12%" / "-4%" — omitted entirely when not provided. */
  readonly trend = input<string>('');
  readonly trendUp = input<boolean>(true);
  readonly clickable = input<boolean>(false);

  readonly cardClick = output<void>();

  onClick(): void {
    if (this.clickable()) this.cardClick.emit();
  }
}

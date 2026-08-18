import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CHART_SERIES_COLORS } from './chart-palette';

export interface DonutSlice {
  label: string;
  value: number;
}

// A donut, not a pie — the missing center is real estate for the total
// figure (the single most useful number in a "share of total" chart),
// composed here as an absolutely-positioned overlay rather than a Chart.js
// plugin so it stays plain, ordinary Angular/CSS.
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './donut-chart.component.html',
  styleUrl: './chart-common.scss'
})
export class DonutChartComponent {
  readonly slices = input.required<DonutSlice[]>();
  readonly centerLabel = input<string>('Total');
  readonly centerValue = input<string>('');
  readonly valuePrefix = input<string>('');
  readonly height = input<string>('200px');

  readonly hasData = computed(() => this.slices().some(s => s.value > 0));

  readonly chartData = computed<ChartData<'doughnut'>>(() => ({
    labels: this.slices().map(s => s.label),
    datasets: [{
      data: this.slices().map(s => s.value),
      backgroundColor: this.slices().map((_, i) => CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length]),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 4
    }]
  }));

  readonly chartOptions = computed<ChartConfiguration<'doughnut'>['options']>(() => {
    const prefix = this.valuePrefix();
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', color: '#334155', font: { size: 11 }, padding: 12 }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${prefix}${Number(ctx.parsed).toLocaleString('en-IN')}`
          }
        }
      }
    };
  });
}

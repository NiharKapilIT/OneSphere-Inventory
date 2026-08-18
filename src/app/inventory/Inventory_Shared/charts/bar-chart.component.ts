import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CHART_INK, CHART_SERIES_COLORS } from './chart-palette';

export interface ChartSeries {
  label: string;
  data: number[];
}

// Thin wrapper around Chart.js's bar chart applying this app's dataviz
// rules on top: fixed-order categorical colors (never cycled), thin bars
// with rounded data-ends, a legend whenever there's more than one series
// (none for a single series — the card title already names it), real hover
// tooltips (Chart.js ships these by default, kept on rather than disabled),
// one axis only (never a dual y-axis, even with two series of different
// scale — that's a caller's problem to solve by choosing comparable series,
// not this component's to paper over).
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './bar-chart.component.html',
  styleUrl: './chart-common.scss'
})
export class BarChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly horizontal = input<boolean>(false);
  readonly valuePrefix = input<string>('');
  readonly height = input<string>('220px');

  readonly hasData = computed(() => this.series().some(s => s.data.some(v => v > 0)));

  readonly chartData = computed<ChartData<'bar'>>(() => ({
    labels: this.labels(),
    datasets: this.series().map((s, i) => ({
      label: s.label,
      data: s.data,
      backgroundColor: CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length],
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: 28,
      categoryPercentage: 0.7,
      barPercentage: 0.85
    }))
  }));

  readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const prefix = this.valuePrefix();
    const showLegend = this.series().length > 1;
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: this.horizontal() ? 'y' : 'x',
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          align: 'end',
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', color: CHART_INK.text, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 8,
          cornerRadius: 6,
          titleFont: { size: 11, weight: 'normal' },
          bodyFont: { size: 12, weight: 'bold' },
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${prefix}${Number(ctx.parsed[this.horizontal() ? 'x' : 'y']).toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: this.horizontal(), color: CHART_INK.grid },
          border: { color: CHART_INK.axis },
          ticks: { color: CHART_INK.muted, font: { size: 10 } }
        },
        y: {
          grid: { display: !this.horizontal(), color: CHART_INK.grid },
          border: { color: CHART_INK.axis },
          ticks: { color: CHART_INK.muted, font: { size: 10 } },
          beginAtZero: true
        }
      }
    };
  });
}

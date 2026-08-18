import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CHART_INK, CHART_SERIES_COLORS } from './chart-palette';
import { ChartSeries } from './bar-chart.component';

// Trend line — 2px stroke, filled area at low opacity, no point markers
// between hovers (kept a small radius so a lone data point is still
// visible), crosshair-style tooltip via Chart.js's built-in 'index' mode.
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './line-chart.component.html',
  styleUrl: './chart-common.scss'
})
export class LineChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly valuePrefix = input<string>('');
  readonly height = input<string>('220px');

  readonly hasData = computed(() => this.series().some(s => s.data.some(v => v > 0)));

  readonly chartData = computed<ChartData<'line'>>(() => ({
    labels: this.labels(),
    datasets: this.series().map((s, i) => {
      const color = CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
      return {
        label: s.label,
        data: s.data,
        borderColor: color,
        backgroundColor: `${color}1f`,
        pointBackgroundColor: color,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.25,
        fill: true
      };
    })
  }));

  readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const prefix = this.valuePrefix();
    const showLegend = this.series().length > 1;
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${prefix}${Number(ctx.parsed.y).toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: CHART_INK.axis },
          ticks: { color: CHART_INK.muted, font: { size: 10 } }
        },
        y: {
          grid: { color: CHART_INK.grid },
          border: { color: CHART_INK.axis },
          ticks: { color: CHART_INK.muted, font: { size: 10 } },
          beginAtZero: true
        }
      }
    };
  });
}

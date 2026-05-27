import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnDestroy,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TOUR_STEPS, TourStep, WalkthroughTourService } from './walkthrough-tour.service';

interface SpotGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

@Component({
  selector: 'app-walkthrough-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './walkthrough-tour.component.html',
  styleUrl: './walkthrough-tour.component.scss'
})
export class WalkthroughTourComponent implements OnDestroy {
  private static readonly AUTOPLAY_MS = 6000;
  private static readonly PAD = 10;
  private static readonly TOOLTIP_W = 340;
  private static readonly TOOLTIP_H = 260;

  protected readonly service = inject(WalkthroughTourService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly active = this.service.active;
  protected readonly stepIndex = this.service.stepIndex;
  protected readonly steps = TOUR_STEPS;
  protected readonly currentStep = computed<TourStep>(() => TOUR_STEPS[this.service.stepIndex()]);
  protected readonly isFirst = computed(() => this.service.stepIndex() === 0);
  protected readonly isLast = computed(() => this.service.stepIndex() === TOUR_STEPS.length - 1);

  // SVG overlay geometry
  protected svgVB = '0 0 1920 1080';
  protected vpW = 1920;
  protected vpH = 1080;
  protected spot: SpotGeometry = { x: 0, y: 0, w: 200, h: 60 };

  // Tooltip card position
  protected ttTop = 0;
  protected ttLeft = 0;

  // Progress bar
  protected progW = 0;
  protected progTrans = 'none';
  protected isPaused = false;

  // Unique mask ID per instance to avoid SVG ID collisions
  protected readonly maskId = `tm-${Math.random().toString(36).slice(2, 8)}`;

  private autoTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handleResize = () => this.recalculate();

  // Track previous step to compute panel transitions
  private prevStepIndex = -1;

  constructor() {
    if (this.service.shouldAutoStart()) {
      setTimeout(() => this.service.start(), 1000);
    }

    effect(() => {
      const active = this.active();
      const idx = this.stepIndex();

      untracked(() => {
        this.clearTimer();

        if (!active) {
          this.prevStepIndex = -1;
          return;
        }

        const prev = this.prevStepIndex >= 0 ? TOUR_STEPS[this.prevStepIndex] : null;
        const curr = TOUR_STEPS[idx];
        this.prevStepIndex = idx;

        this.handleStepTransition(prev, curr, () => {
          this.recalculate();
          this.cdr.detectChanges();
          if (!this.isPaused) this.startTimer();
        });
      });
    });

    window.addEventListener('resize', this.handleResize, { passive: true });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.handleResize);
      this.clearTimer();
    });
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (!this.active()) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); this.service.next(); }
    if (e.key === 'ArrowLeft')                        { e.preventDefault(); this.service.back(); }
    if (e.key === 'Escape')                           { e.preventDefault(); this.skip(); }
  }

  // ── Panel & setup transition logic ──────────────────────────────────────

  private handleStepTransition(prev: TourStep | null, curr: TourStep, onDone: () => void): void {
    const wasAvatar = prev?.panel === 'avatar';
    const isAvatar = curr.panel === 'avatar';

    if (wasAvatar && !isAvatar) {
      // Leaving avatar steps — close the dropdown first
      this.closeAvatarPanel();
      setTimeout(() => this.runSetup(curr, onDone), 260);
      return;
    }

    if (isAvatar && !wasAvatar) {
      // Entering avatar steps — open the dropdown
      this.openAvatarPanel();
      setTimeout(() => this.runSetup(curr, onDone), curr.actionDelay ?? 400);
      return;
    }

    // Same panel state — no open/close needed
    this.runSetup(curr, onDone);
  }

  private runSetup(step: TourStep, onDone: () => void): void {
    if (step.setup === 'open-sidebar') {
      this.ensureSidebarOpen();
      setTimeout(onDone, step.actionDelay ?? 500);
      return;
    }
    setTimeout(onDone, 80);
  }

  private openAvatarPanel(): void {
    const panel = document.querySelector('.avatar-panel');
    if (!panel) {
      document.querySelector<HTMLElement>('[data-tour="avatar-menu"]')?.click();
    }
  }

  private closeAvatarPanel(): void {
    const panel = document.querySelector('.avatar-panel');
    if (panel) {
      document.querySelector<HTMLElement>('[data-tour="avatar-menu"]')?.click();
    }
  }

  private ensureSidebarOpen(): void {
    // Select first module tab if none is active yet
    const activeTab = document.querySelector('.nav-modules .module-tab.active');
    if (!activeTab) {
      document.querySelector<HTMLElement>('.nav-modules .module-tab')?.click();
    }
    // Open sidebar if currently collapsed
    const sidebar = document.querySelector('.sidebar');
    if (sidebar?.classList.contains('collapsed')) {
      document.querySelector<HTMLElement>('[data-tour="sidebar-toggle"]')?.click();
    }
  }

  // ── Spotlight / tooltip positioning ─────────────────────────────────────

  private recalculate(): void {
    const step = TOUR_STEPS[this.service.stepIndex()];
    if (!step) return;

    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const pad = WalkthroughTourComponent.PAD;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      this.vpW = vw;
      this.vpH = vh;
      this.svgVB = `0 0 ${vw} ${vh}`;
      this.spot = {
        x: Math.max(0, rect.left - pad),
        y: Math.max(0, rect.top - pad),
        w: rect.width + pad * 2,
        h: rect.height + pad * 2
      };

      this.placeTooltip(rect, step.position, vw, vh);
      this.cdr.detectChanges();
    }, 100);
  }

  private placeTooltip(rect: DOMRect, pos: string, vw: number, vh: number): void {
    const W = WalkthroughTourComponent.TOOLTIP_W;
    const H = WalkthroughTourComponent.TOOLTIP_H;
    const gap = 18;
    const edge = 12;
    let top: number;
    let left: number;

    switch (pos) {
      case 'bottom':
        top  = rect.bottom + gap;
        left = rect.left + rect.width / 2 - W / 2;
        break;
      case 'bottom-right':
        top  = rect.bottom + gap;
        left = rect.left;
        break;
      case 'bottom-left':
        top  = rect.bottom + gap;
        left = rect.right - W;
        break;
      case 'top':
        top  = rect.top - H - gap;
        left = rect.left + rect.width / 2 - W / 2;
        break;
      case 'top-right':
        top  = rect.top - H - gap;
        left = rect.right + gap;
        break;
      case 'top-left':
        top  = rect.top - H - gap;
        left = rect.left - W - gap;
        break;
      case 'right':
        top  = rect.top + rect.height / 2 - H / 2;
        left = rect.right + gap;
        break;
      case 'left':
        top  = rect.top + rect.height / 2 - H / 2;
        left = rect.left - W - gap;
        break;
      default:
        top  = rect.bottom + gap;
        left = rect.left + rect.width / 2 - W / 2;
    }

    this.ttLeft = Math.max(edge, Math.min(left, vw - W - edge));
    this.ttTop  = Math.max(edge, Math.min(top,  vh - H - edge));
  }

  // ── Auto-play ────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.progW = 0;
    this.progTrans = 'none';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.progTrans = `width ${WalkthroughTourComponent.AUTOPLAY_MS}ms linear`;
        this.progW = 100;
        this.cdr.detectChanges();
      });
    });

    this.autoTimer = setTimeout(
      () => this.service.next(),
      WalkthroughTourComponent.AUTOPLAY_MS
    );
  }

  private clearTimer(): void {
    if (this.autoTimer !== null) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  // ── Pause / resume on tooltip hover ─────────────────────────────────────

  protected pausePlay(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.clearTimer();

    const fill = document.querySelector<HTMLElement>('.tour-prog-fill');
    if (fill?.parentElement) {
      const pct = fill.getBoundingClientRect().width /
                  fill.parentElement.getBoundingClientRect().width * 100;
      this.progTrans = 'none';
      this.progW = pct;
    }
  }

  protected resumePlay(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.startTimer();
  }

  // ── Public controls ──────────────────────────────────────────────────────

  protected next(): void  { this.service.next(); }
  protected back(): void  { this.service.back(); }

  protected skip(): void {
    // Close avatar panel if currently open for this step
    const currStep = TOUR_STEPS[this.service.stepIndex()];
    if (currStep?.panel === 'avatar') {
      this.closeAvatarPanel();
    }
    this.prevStepIndex = -1;
    this.service.stop();
  }

  protected goTo(i: number): void { this.service.goTo(i); }

  ngOnDestroy(): void { /* handled by destroyRef */ }
}

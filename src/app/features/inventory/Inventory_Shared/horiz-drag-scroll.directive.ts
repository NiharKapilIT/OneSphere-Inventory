import { Injectable, OnDestroy, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class HorizDragScrollService implements OnDestroy {
  private doc = inject(DOCUMENT);
  private wrap: HTMLElement | null = null;
  private startX = 0;
  private scrollStart = 0;
  private moved = false;

  constructor() { this.attach(); }

  private attach(): void {
    this.doc.addEventListener('mousedown', this.onDown, { passive: false });
    this.doc.addEventListener('mousemove', this.onMove, { passive: true });
    this.doc.addEventListener('mouseup', this.onUp, { passive: true });
  }

  private onDown = (e: MouseEvent): void => {
    const el = e.target as HTMLElement;
    // Skip clicks on interactive elements
    if (el.closest('button, a, input, select, textarea, .ng-select, .p-datepicker')) return;
    const tblWrap = el.closest<HTMLElement>('.tbl-wrap');
    if (!tblWrap) return;
    this.wrap = tblWrap;
    this.moved = false;
    this.startX = e.clientX;
    this.scrollStart = tblWrap.scrollLeft;
    tblWrap.style.cursor = 'grabbing';
    tblWrap.style.userSelect = 'none';
  };

  private onMove = (e: MouseEvent): void => {
    if (!this.wrap) return;
    const dx = e.clientX - this.startX;
    if (Math.abs(dx) > 4) this.moved = true;
    this.wrap.scrollLeft = this.scrollStart - dx;
  };

  private onUp = (): void => {
    if (!this.wrap) return;
    this.wrap.style.cursor = '';
    this.wrap.style.userSelect = '';
    this.wrap = null;
    // Brief flag so accidental row-clicks after drag don't fire
    if (this.moved) {
      this.doc.addEventListener('click', this.suppressClick, { capture: true, once: true });
    }
  };

  private suppressClick = (e: MouseEvent): void => {
    if (this.moved) { e.stopPropagation(); e.preventDefault(); this.moved = false; }
  };

  ngOnDestroy(): void {
    this.doc.removeEventListener('mousedown', this.onDown);
    this.doc.removeEventListener('mousemove', this.onMove);
    this.doc.removeEventListener('mouseup', this.onUp);
  }
}

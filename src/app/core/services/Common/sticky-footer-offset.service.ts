import { Injectable, signal } from '@angular/core';

/**
 * Lets a page with its own fixed/sticky bottom action-bar push the global
 * SOS help button up above it, so the two never visually overlap.
 */
@Injectable({ providedIn: 'root' })
export class StickyFooterOffsetService {
  readonly offsetPx = signal(0);

  set(px: number): void {
    this.offsetPx.set(px);
  }

  clear(): void {
    this.offsetPx.set(0);
  }
}

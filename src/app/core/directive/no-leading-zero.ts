// import { Directive } from "@angular/core";

// @Directive({
//   selector: "[appNoLeadingZero]",
// })
// export class NoLeadingZero {
//   constructor() {}
// }


import {
  Directive,
  HostListener,
  Input,
  Self,
  Optional,
  OnInit,
} from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * NoLeadingZeroDirective
 *
 * Reusable directive that:
 *  - Blocks '0' as the first character via keyboard
 *  - Strips leading zeros from pasted / autofilled / programmatic values
 *  - Optionally allows only numeric characters (default: true)
 *  - Pushes cleaned value back into the bound NgControl (reactive + template forms)
 *
 * Usage examples:
 *
 *  Reactive form:
 *    <input appNoLeadingZero formControlName="pAccountnumber" />
 *
 *  Template form:
 *    <input appNoLeadingZero [(ngModel)]="accountNumber" />
 *
 *  Allow decimals (e.g. invoice amount — no leading zero, but allow one dot):
 *    <input appNoLeadingZero [allowDecimal]="true" formControlName="amount" />
 *
 *  Plain input (no Angular forms, just DOM sanitisation):
 *    <input appNoLeadingZero />
 */
@Directive({
  selector: '[appNoLeadingZero]',
  standalone: true,
})
export class NoLeadingZero implements OnInit {

  /**
   * When true (default) only digits — and optionally a decimal point — are allowed.
   * Set to false if the host field already handles character filtering itself.
   */
  @Input() numbersOnly = true;

  /**
   * Allow a single decimal point in the value (e.g. opening balance fields).
   * Has no effect when numbersOnly is false.
   */
  @Input() allowDecimal = false;

  /**
   * Maximum number of decimal places permitted when allowDecimal is true.
   * Default: 2
   */
  @Input() decimalPlaces = 2;

  constructor(@Self() @Optional() private readonly ngControl: NgControl) {}

  ngOnInit(): void {
    // Patch the initial value on the control in case it was pre-filled with a leading zero
    if (this.ngControl?.control) {
      const initial = this.ngControl.control.value;
      if (typeof initial === 'string' && /^0/.test(initial)) {
        const clean = this.sanitise(initial);
        this.ngControl.control.setValue(clean, { emitEvent: false });
      }
    }
  }

  // ── Keyboard guard ────────────────────────────────────────────────────────────
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;

    // Block '0' only when it would become the leading character
    if (
      event.key === '0' &&
      this.cursorAtStart(input) &&
      input.value.replace(/[^0-9]/g, '').length === 0
    ) {
      event.preventDefault();
      return;
    }

    if (!this.numbersOnly) return;

    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ];

    if (allowed.includes(event.key)) return;
    if (event.ctrlKey || event.metaKey) return; // allow Ctrl+C, Ctrl+V, etc.

    const isDot = event.key === '.';
    if (this.allowDecimal && isDot) {
      // Block second decimal point
      if (input.value.includes('.')) event.preventDefault();
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // ── Paste guard ───────────────────────────────────────────────────────────────
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted  = event.clipboardData?.getData('text') ?? '';
    const clean   = this.sanitise(pasted);
    this.applyValue(event.target as HTMLInputElement, clean);
  }

  // ── Input event (covers autofill, programmatic sets, IME) ────────────────────
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = this.sanitise(input.value);
    if (input.value === clean) return;
    this.applyValue(input, clean);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /** Returns a cleaned string with no leading zeros and optional digit-only enforcement */
  private sanitise(raw: string): string {
    let value = raw;

    if (this.numbersOnly) {
      if (this.allowDecimal) {
        // Keep only digits and first dot; enforce decimal places
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
          value = `${parts[0]}.${parts.slice(1).join('')}`;
        }
        if (parts.length === 2 && parts[1].length > this.decimalPlaces) {
          value = `${parts[0]}.${parts[1].substring(0, this.decimalPlaces)}`;
        }
      } else {
        value = value.replace(/[^0-9]/g, '');
      }
    }

    // Strip leading zeros — preserve '0.' for decimal inputs
    if (this.allowDecimal && /^0[0-9]/.test(value)) {
      value = value.replace(/^0+(\d)/, '$1');
    } else if (!this.allowDecimal) {
      value = value.replace(/^0+/, '');
    }

    return value;
  }

  /** Writes the clean value to the DOM input and the bound Angular control */
  private applyValue(input: HTMLInputElement, clean: string): void {
    // Preserve cursor position as best we can
    const cursor = input.selectionStart ?? 0;
    const diff   = input.value.length - clean.length;

    input.value = clean;

    const newCursor = Math.max(0, cursor - diff);
    input.setSelectionRange(newCursor, newCursor);

    // Sync with Angular's form model
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(clean, { emitEvent: true });
      this.ngControl.control.markAsDirty();
    }
  }

  /** True when the cursor is at position 0 (or the whole text is selected) */
  private cursorAtStart(input: HTMLInputElement): boolean {
    return (
      input.selectionStart === 0 &&
      (input.selectionEnd === 0 || input.selectionEnd === input.value.length)
    );
  }
}

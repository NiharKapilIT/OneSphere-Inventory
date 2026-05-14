import { Component, OnDestroy, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected readonly title = signal('global-erp');
  private placeholderObserver?: MutationObserver;
  private placeholderSyncTimer: number | null = null;
  private routeSubscription: Subscription;
  private activeModalDrag: {
    modal: HTMLElement;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null = null;
  private readonly modalHeaderSelector = [
    '.modal-header',
    '.pay-modal-header',
    '.dash-modal-header',
    '.login-demo-modal-header',
    '.inventory-modal-header',
    '.contact-modal-header',
    '.role-modal-header',
    '.p-dialog-header'
  ].join(',');
  private readonly modalSelector = [
    '.modal-dialog:not(.modal-dialog--drawer)',
    '.pay-modal',
    '.dash-modal',
    '.login-demo-modal',
    '.inventory-modal',
    '.contact-modal',
    '.role-modal',
    '.payroll-slip-modal',
    '.p-dialog'
  ].join(',');
  private readonly handleComboSearchInput = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const select = target?.closest?.('ng-select') as HTMLElement | null;
    if (select) {
      this.updateNgSelectSearchState(select);
    }
  };
  private readonly handleModalPointerDown = (event: PointerEvent): void => this.startModalDrag(event);
  private readonly handleModalPointerMove = (event: PointerEvent): void => this.moveModalDrag(event);
  private readonly handleModalPointerUp = (event: PointerEvent): void => this.stopModalDrag(event);

  constructor(private router: Router) {
    document.addEventListener('mouseover', (e: any) => {
      const target = e.target;
      if (!target || !target.classList) return;

      const isDropdownLabel =
        target.classList.contains('ng-value-label') ||
        target.classList.contains('p-multiselect-token-label') ||
        target.classList.contains('p-dropdown-label') ||
        target.classList.contains('ng-option-label');

      if (isDropdownLabel && !target.hasAttribute('title')) {
        const text = target.innerText || target.textContent;
        if (text) target.setAttribute('title', text.trim());
      }
    }, true);
    document.addEventListener('input', this.handleComboSearchInput, true);
    document.addEventListener('keyup', this.handleComboSearchInput, true);
    document.addEventListener('pointerdown', this.handleModalPointerDown, true);
    document.addEventListener('pointermove', this.handleModalPointerMove, true);
    document.addEventListener('pointerup', this.handleModalPointerUp, true);
    document.addEventListener('pointercancel', this.handleModalPointerUp, true);

    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.schedulePlaceholderSync());

    this.placeholderObserver = new MutationObserver(() => this.schedulePlaceholderSync());
    this.placeholderObserver.observe(document.body, { childList: true, subtree: true });
    this.schedulePlaceholderSync();
  }

  ngOnDestroy(): void {
    this.placeholderObserver?.disconnect();
    this.routeSubscription.unsubscribe();
    document.removeEventListener('input', this.handleComboSearchInput, true);
    document.removeEventListener('keyup', this.handleComboSearchInput, true);
    document.removeEventListener('pointerdown', this.handleModalPointerDown, true);
    document.removeEventListener('pointermove', this.handleModalPointerMove, true);
    document.removeEventListener('pointerup', this.handleModalPointerUp, true);
    document.removeEventListener('pointercancel', this.handleModalPointerUp, true);

    if (this.placeholderSyncTimer !== null) {
      window.clearTimeout(this.placeholderSyncTimer);
    }
  }

  private schedulePlaceholderSync(): void {
    if (this.placeholderSyncTimer !== null) {
      return;
    }

    this.placeholderSyncTimer = window.setTimeout(() => {
      this.placeholderSyncTimer = null;
      this.syncSelectPlaceholders();
    });
  }

  private syncSelectPlaceholders(): void {
    document.querySelectorAll<HTMLElement>('ng-select').forEach(select => {
      const label = this.resolveFieldLabel(select);
      if (!label) return;

      const placeholder = `Select ${label}`;
      const currentAttr = (select.getAttribute('placeholder') || '').trim();

      if (this.isGenericPlaceholder(currentAttr)) {
        select.setAttribute('placeholder', placeholder);
      }

      select.querySelectorAll<HTMLElement>('.ng-placeholder').forEach(node => {
        const currentText = (node.textContent || '').trim();

        if (this.isGenericPlaceholder(currentText)) {
          node.textContent = placeholder;
        }
      });

      this.updateNgSelectSearchState(select);
    });

    document.querySelectorAll<HTMLSelectElement>('select').forEach(select => {
      const label = this.resolveFieldLabel(select);
      if (!label) return;

      if (!select.getAttribute('aria-label')) {
        select.setAttribute('aria-label', label);
      }

      const placeholderOption = select.options.item(0);
      if (!placeholderOption) return;

      const isPlaceholderOption = placeholderOption.value === '' || placeholderOption.disabled;
      if (isPlaceholderOption && this.isGenericPlaceholder(placeholderOption.textContent || '')) {
        placeholderOption.textContent = `Select ${label}`;
      }
    });
  }

  private resolveFieldLabel(control: Element): string {
    const id = control.getAttribute('id');

    if (id) {
      const explicitLabel = document.querySelector<HTMLLabelElement>(`label[for="${this.escapeSelector(id)}"]`);
      const explicitText = this.cleanLabel(explicitLabel?.textContent || '');
      if (explicitText) return explicitText;
    }

    const wrapper = control.closest('.erp-form-group, .form-group, .filter-group, [class*="col-"]');
    const wrapperLabel = wrapper?.querySelector<HTMLLabelElement>('label:not(.erp-checkbox):not(.erp-radio):not(.erp-radio-button)');
    const wrapperText = this.cleanLabel(wrapperLabel?.textContent || '');
    if (wrapperText) return wrapperText;

    const title = this.cleanLabel(control.getAttribute('title') || '');
    if (title) return title;

    const ariaLabel = this.cleanLabel(control.getAttribute('aria-label') || '');
    if (ariaLabel) return ariaLabel;

    const fieldName =
      control.getAttribute('formControlName') ||
      control.getAttribute('name') ||
      id ||
      '';

    return this.humanizeFieldName(fieldName);
  }

  private cleanLabel(value: string): string {
    return value
      .replace(/\*/g, '')
      .replace(/\b(required|optional)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/[:\-]+$/g, '')
      .trim();
  }

  private humanizeFieldName(value: string): string {
    return value
      .replace(/^p(?=[A-Z_ -]|[a-z]{3,})/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\bid\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  private isGenericPlaceholder(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return !normalized ||
      normalized === 'select' ||
      normalized === '--select--' ||
      normalized === '-select-' ||
      normalized === 'please select';
  }

  private updateNgSelectSearchState(select: HTMLElement): void {
    const hasSearchText = Array.from(select.querySelectorAll<HTMLInputElement>('.ng-input input'))
      .some(input => input.value.trim().length > 0);

    select.classList.toggle('erp-ng-select-searching', hasSearchText);
  }

  private startModalDrag(event: PointerEvent): void {
    if (event.button !== 0 || this.isModalDragControl(event.target as Element | null)) {
      return;
    }

    const target = event.target as Element | null;
    const header = target?.closest?.(this.modalHeaderSelector) as HTMLElement | null;
    if (!header) return;

    const modal = header.closest(this.modalSelector) as HTMLElement | null;
    if (!modal) return;

    const rect = modal.getBoundingClientRect();
    modal.classList.add('erp-modal-dragging');
    modal.style.position = 'fixed';
    modal.style.left = `${rect.left}px`;
    modal.style.top = `${rect.top}px`;
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';
    modal.style.margin = '0';
    modal.style.transform = 'none';
    modal.style.width = `${rect.width}px`;

    this.activeModalDrag = {
      modal,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height
    };

    header.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  private moveModalDrag(event: PointerEvent): void {
    const drag = this.activeModalDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const viewportPadding = 12;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - drag.width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - Math.min(drag.height, window.innerHeight - viewportPadding * 2) - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, event.clientX - drag.offsetX), maxLeft);
    const top = Math.min(Math.max(viewportPadding, event.clientY - drag.offsetY), maxTop);

    drag.modal.style.left = `${left}px`;
    drag.modal.style.top = `${top}px`;
  }

  private stopModalDrag(event: PointerEvent): void {
    const drag = this.activeModalDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    drag.modal.classList.remove('erp-modal-dragging');
    this.activeModalDrag = null;
  }

  private isModalDragControl(target: Element | null): boolean {
    return !!target?.closest?.('button,a,input,select,textarea,ng-select,.ng-select,.p-dropdown,.p-multiselect,.p-calendar,.p-datepicker,[contenteditable="true"]');
  }

  private escapeSelector(value: string): string {
    return value.replace(/(["\\])/g, '\\$1');
  }
}

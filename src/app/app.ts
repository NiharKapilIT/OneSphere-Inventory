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
  private readonly handleComboSearchInput = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const select = target?.closest?.('ng-select') as HTMLElement | null;
    if (select) {
      this.updateNgSelectSearchState(select);
    }
  };

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

  private escapeSelector(value: string): string {
    return value.replace(/(["\\])/g, '\\$1');
  }
}

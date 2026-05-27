import { Injectable, signal } from '@angular/core';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Keep this panel open while the step is active */
  panel?: 'avatar';
  /** One-time DOM setup to run when entering this step */
  setup?: 'open-sidebar';
  /** ms to wait after panel open or setup before recalculating (default 400) */
  actionDelay?: number;
}

export const TOUR_STEPS: TourStep[] = [
  // ── 1. Welcome ──────────────────────────────────────────────────────────────
  {
    target: '[data-tour="brand"]',
    title: 'Welcome to OneSphere ERP',
    description: 'Your all-in-one platform for Accounts, HRMS, Inventory, CRM and more. This 60-second guided tour walks you through every key feature so you can hit the ground running.',
    icon: 'pi-globe',
    position: 'bottom-right'
  },
  // ── 2. Module Tabs ───────────────────────────────────────────────────────────
  {
    target: '[data-tour="module-tabs"]',
    title: 'Module Navigation Tabs',
    description: 'Every ERP module you are subscribed to appears here — Accounts, HRMS, Inventory and more. Click any tab to instantly switch your workspace. Tabs scroll horizontally when many modules are active.',
    icon: 'pi-th-large',
    position: 'bottom'
  },
  // ── 3. Open sidebar ──────────────────────────────────────────────────────────
  {
    target: '.sidebar',
    title: 'Sub-Module Sidebar',
    description: 'After selecting a module, this left sidebar lists all its sub-sections: Transactions, Reports, Masters and more. Each item expands into a flyout panel with individual screens.',
    icon: 'pi-list',
    position: 'right',
    setup: 'open-sidebar',
    actionDelay: 500
  },
  // ── 4. Sidebar items ─────────────────────────────────────────────────────────
  {
    target: '.sb-items',
    title: 'Sub-Module List',
    description: 'Click any sub-module to expand a flyout with all its screens. Use the flyout search to quickly find any form. Your last-opened screen stays highlighted for fast return.',
    icon: 'pi-list',
    position: 'right'
  },
  // ── 5. Sidebar toggle ────────────────────────────────────────────────────────
  {
    target: '[data-tour="sidebar-toggle"]',
    title: 'Toggle the Sidebar',
    description: 'Click the hamburger to show or hide the sub-module sidebar at any time. Collapsing it maximises your form area — especially useful on smaller screens.',
    icon: 'pi-bars',
    position: 'bottom-right'
  },
  // ── 6. Recent forms ──────────────────────────────────────────────────────────
  {
    target: '[data-tour="recent-forms"]',
    title: 'Recent History',
    description: 'Tracks every screen you open in this session. Click the history icon to see your recent forms and jump back to any one instantly — your data and scroll position are preserved.',
    icon: 'pi-history',
    position: 'bottom-left'
  },
  // ── 7. Voice assistant ───────────────────────────────────────────────────────
  {
    target: '[data-tour="voice-assistant"]',
    title: 'Voice Assistant — Hands-Free',
    description: 'Navigate the entire ERP without touching the mouse. Click the mic and say "Kap" followed by any screen name — try "Kap Trial Balance" or "Kap Inventory". It also explains form relationships.',
    icon: 'pi-microphone',
    position: 'bottom-left'
  },
  // ── 8. Contacts ──────────────────────────────────────────────────────────────
  {
    target: '[data-tour="contacts"]',
    title: 'Global Contacts Directory',
    description: 'A unified directory of employees, subscribers and channel partners across your organisation. Search, view full profiles and manage contact records from one central screen.',
    icon: 'pi-users',
    position: 'bottom-left'
  },
  // ── 9. Quick menu ────────────────────────────────────────────────────────────
  {
    target: '[data-tour="quick-menu"]',
    title: 'Quick Menu — Jump Anywhere',
    description: 'The fastest navigation tool. Opens a searchable full-app menu across all modules. Type any form name and jump there directly — no drilling through tabs or sidebars required.',
    icon: 'pi-th-large',
    position: 'bottom-left'
  },
  // ── 10. Navbar toggle ────────────────────────────────────────────────────────
  {
    target: '[data-tour="navbar-toggle"]',
    title: 'Collapse the Navbar',
    description: 'Need more screen space? Click this tab to slide the entire top navbar out of view. A small tab remains so you can restore it instantly. Your preference is saved across sessions.',
    icon: 'pi-chevron-up',
    position: 'left'
  },
  // ── 11. Avatar button intro ──────────────────────────────────────────────────
  {
    target: '[data-tour="avatar-menu"]',
    title: 'Your Profile & Settings',
    description: 'Click your avatar to open the profile panel with account switching, password reset, personalisation, help, subscription management and sign-out — all from one place.',
    icon: 'pi-user-circle',
    position: 'bottom-left'
  },
  // ── 12. User header (opens avatar) ──────────────────────────────────────────
  {
    target: '[data-tour="ap-user-header"]',
    title: 'Your Profile Summary',
    description: 'Shows your logged-in name and the active company and branch. Everything in this session is scoped to this context. Use the switcher below if you manage multiple entities.',
    icon: 'pi-id-card',
    position: 'bottom',
    panel: 'avatar'
  },
  // ── 13. Switch context ───────────────────────────────────────────────────────
  {
    target: '[data-tour="ap-switch-context"]',
    title: 'Switch Company or Branch',
    description: 'If you have access to multiple companies or branches, select them here and click Switch Context. All screens, reports and data reload instantly for the chosen entity.',
    icon: 'pi-refresh',
    position: 'bottom',
    panel: 'avatar'
  },
  // ── 14. Reset password ───────────────────────────────────────────────────────
  {
    target: '[data-tour="ap-reset-pwd"]',
    title: 'Reset Your Password',
    description: 'Click to expand the password form. Enter your current password (if already set) then your new password twice. Passwords are hashed — never stored in plain text.',
    icon: 'pi-lock',
    position: 'left',
    panel: 'avatar'
  },
  // ── 15. Settings / SOS / Subscription group ──────────────────────────────────
  {
    target: '[data-tour="ap-quick-actions"]',
    title: 'Settings, Help & Subscription',
    description: 'Access personal Settings, open the SOS Help Desk to raise support tickets with screenshots, and manage your Subscription plan and billing — all from this section.',
    icon: 'pi-cog',
    position: 'left',
    panel: 'avatar'
  },
  // ── 16. Themes ───────────────────────────────────────────────────────────────
  {
    target: '[data-tour="ap-theme"]',
    title: 'Personalise Your Theme',
    description: 'Choose from 8 colour themes — Sky, Royal, Emerald, Slate, Gold, Copper and Pink. Your selection is saved in the browser and applied instantly across the entire application.',
    icon: 'pi-palette',
    position: 'left',
    panel: 'avatar'
  },
  // ── 17. Sign out ─────────────────────────────────────────────────────────────
  {
    target: '[data-tour="ap-signout"]',
    title: 'Sign Out Securely',
    description: 'Click Sign Out to end your session. All unsaved form data will be lost, so save your work first. You can sign back in from the login page at any time.',
    icon: 'pi-sign-out',
    position: 'top',
    panel: 'avatar'
  },
  // ── 18. SOS FAB ──────────────────────────────────────────────────────────────
  {
    target: '.sos-fab',
    title: 'SOS Help Desk — Always Available',
    description: 'The red SOS button is visible from every screen. Click it to raise a support ticket, describe your issue, set a priority level and attach a screenshot. Our team responds promptly.',
    icon: 'pi-question-circle',
    position: 'top-right'
  }
];

const TOUR_KEY = 'oneSphere_tourSeen';

@Injectable({ providedIn: 'root' })
export class WalkthroughTourService {
  private readonly _active = signal(false);
  private readonly _stepIndex = signal(0);

  readonly active = this._active.asReadonly();
  readonly stepIndex = this._stepIndex.asReadonly();
  readonly steps = TOUR_STEPS;
  readonly totalSteps = TOUR_STEPS.length;

  start(): void {
    this._stepIndex.set(0);
    this._active.set(true);
  }

  stop(): void {
    this._active.set(false);
    localStorage.setItem(TOUR_KEY, 'true');
  }

  next(): void {
    const idx = this._stepIndex();
    if (idx < TOUR_STEPS.length - 1) {
      this._stepIndex.set(idx + 1);
    } else {
      this.stop();
    }
  }

  back(): void {
    const idx = this._stepIndex();
    if (idx > 0) {
      this._stepIndex.set(idx - 1);
    }
  }

  goTo(index: number): void {
    this._stepIndex.set(Math.max(0, Math.min(TOUR_STEPS.length - 1, index)));
  }

  shouldAutoStart(): boolean {
    return !localStorage.getItem(TOUR_KEY);
  }
}

import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, NavigationError, Router, RouterModule } from '@angular/router';
import {
  Module,
  NavigationService,
  NavigationPath,
  SubModule,
  Screen
} from '../../../core/services/Navigation/navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SosHelpComponent } from '../../sos-help/sos-help.component';
import { VoiceAssistantComponent } from '../../voice-assistant/voice-assistant.component';
import { ReferenceDataTrayComponent } from '../../reference-data-tray/reference-data-tray.component';
import { ReferenceDataTrayConfig } from '../../reference-data-tray/reference-data-tray.models';
import { ReferenceDataTrayService } from '../../reference-data-tray/reference-data-tray.service';

export interface Theme {
  id: string;
  name: string;
  colors: [string, string];
}

export interface RecentForm {
  name: string;
  route: string;
  moduleId: string;
  moduleName: string;
  subModuleId: string;
  subModuleName: string;
  screenId: string;
  icon: string;
  time: Date;
}

interface FlyoutScreenGroup {
  name: string;
  screens: Screen[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SosHelpComponent, VoiceAssistantComponent, ReferenceDataTrayComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit, AfterViewInit {
  @ViewChild('moduleScroller') private moduleScroller?: ElementRef<HTMLElement>;
  @ViewChild('contentArea') private contentArea?: ElementRef<HTMLElement>;

  modules: Module[] = [];
  selectedModule: Module | null = null;
  selectedSubModule: SubModule | null = null;
  selectedScreen: Screen | null = null;

  sidebarCollapsed = true;
  username = '';
  companyName = '';
  branchCode = '';
  expandedSubModules: Set<string> = new Set<string>();
  expandedFlyoutGroups: Set<string> = new Set<string>();

  // Snapshot of the path for the currently active screen
  breadcrumbPath = {
    module: null as Module | null,
    subModule: null as SubModule | null,
    screen: null as Screen | null
  };

  showMegaMenu = false;
  showAvatarMenu = false;
  showRecentForms = false;
  showFlyoutSearch = false;
  showThemeDropdown = false;
  showModuleScrollLeft = false;
  showModuleScrollRight = false;

  flyoutSearchQuery = '';
  megaMenuSearch = '';
  activeTheme = 'sky';

  recentForms: RecentForm[] = [];
  referenceTrayConfig: ReferenceDataTrayConfig | null = null;

  themes: Theme[] = [
    { id: 'sky', name: 'Sky', colors: ['#7fb3ff', '#4d8fff'] },
    { id: 'mist', name: 'Mist', colors: ['#b8d7ff', '#7aaeff'] },
    { id: 'royal', name: 'Royal', colors: ['#6f8cff', '#5175ff'] },
    { id: 'emerald', name: 'Emerald', colors: ['#76d5c7', '#4fb8a8'] },
    { id: 'slate', name: 'Slate', colors: ['#aab8d6', '#7d8fb3'] },
    { id: 'gold', name: 'Gold', colors: ['#f0cf6a', '#c9a227'] },
    { id: 'copper', name: 'Copper', colors: ['#d9996b', '#a85f3a'] },
    { id: 'pink', name: 'Pink', colors: ['#f7a9c4', '#e26aa5'] }
  ];

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService,
    private router: Router,
    private referenceDataTrayService: ReferenceDataTrayService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.modules = this.navigationService.getModules();
    this.username = this.authService.getUsername() || 'User';
    this.branchCode = this.authService.getBranchCode();
    const raw = sessionStorage.getItem('CompanyDetails');
    if (raw) {
      const parsed = JSON.parse(raw);
      const details = Array.isArray(parsed) ? parsed[0] : parsed;
      this.companyName = details?.companyName ?? '';
    }

    const savedTheme = localStorage.getItem('erp-theme');
    this.setTheme(savedTheme || this.activeTheme);

    const savedSidebarState = localStorage.getItem('sidebar-collapsed');
    if (savedSidebarState !== null) {
      this.sidebarCollapsed = JSON.parse(savedSidebarState);
    }

    this.navigationService.selectedModule$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((module: Module | null) => {
        this.selectedModule = module;
        this.queueModuleScrollStateUpdate(true);
      });

    this.navigationService.selectedSubModule$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subModule: SubModule | null) => {
        this.selectedSubModule = subModule;
        this.initializeFlyoutGroups(subModule);
      });

    this.navigationService.selectedScreen$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((screen: Screen | null) => {
        this.selectedScreen = screen;
        
        // Only update breadcrumb when a screen is actually active
        if (screen) {
          this.breadcrumbPath = {
            module: this.selectedModule,
            subModule: this.selectedSubModule,
            screen: screen
          };
        }
      });

    this.restoreNavigationFromRoute(this.router.url);
    this.updateReferenceTray(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.restoreNavigationFromRoute(event.urlAfterRedirects);
        this.updateReferenceTray(event.urlAfterRedirects);
        this.contentArea?.nativeElement.scrollTo({ top: 0 });
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationError => event instanceof NavigationError),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        console.error('Navigation failed:', event.error);
        // Chunk load failure (lazy module not found on server) — navigate back to dashboard root
        if (event.error?.name === 'ChunkLoadError' || String(event.error).includes('Loading chunk')) {
          this.router.navigate(['/dashboard']);
        }
      });

    // Set General Receipt as default selection
    // this.setDefaultSelection();
  }

  ngAfterViewInit(): void {
    this.queueModuleScrollStateUpdate(true);
  }

  private setDefaultSelection(): void {
    // Find Accounts module
    const accountsModule = this.modules.find(m => m.id === 'accounts');
    if (!accountsModule) return;

    // Find Accounts Transactions sub-module
    const transactionsSubModule = accountsModule.subModules.find(
      s => s.id === 'accounts-transactions'
    );
    if (!transactionsSubModule) return;

    // Find General Receipt screen
    const generalReceiptScreen = transactionsSubModule.screens.find(
      s => s.id === 'general-receipt'
    );
    if (!generalReceiptScreen) return;

    // Select module, sub-module, and screen
    this.navigationService.selectModule(accountsModule);
    this.navigationService.selectSubModule(transactionsSubModule);
    this.navigationService.selectScreen(generalReceiptScreen);

    // Expand the sub-module in the sidebar
    this.expandedSubModules.add(transactionsSubModule.id);

    // Navigate to the General Receipt route
    this.router.navigate([generalReceiptScreen.route]);
  }

  setTheme(themeId: string): void {
    this.activeTheme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('erp-theme', themeId);
  }

  getActiveThemeName(): string {
    return this.themes.find(theme => theme.id === this.activeTheme)?.name || 'Sky';
  }

  selectModule(module: Module, event?: Event): void {
    sessionStorage.setItem('moduleName', module.id);
    this.scrollModuleTabIntoView(event);

    this.closeFlyoutSearch();

    if (this.selectedModule?.id !== module.id) {
      this.navigationService.selectModule(module);
    }

    this.openFirstPageOfModule(module);
    this.sidebarCollapsed = false;
    this.saveSidebarState();
  }

  private openFirstPageOfModule(module: Module): void {
    this.expandedSubModules.clear();

    const firstSubModule = module.subModules[0];
    if (!firstSubModule) {
      this.selectedSubModule = null;
      return;
    }

    if (this.hasFlyoutItems(firstSubModule)) {
      this.expandedSubModules.add(firstSubModule.id);
    }

    this.navigationService.selectSubModule(firstSubModule);

    const firstScreen = firstSubModule.screens[0];
    if (firstScreen) {
      this.selectScreen(firstScreen);
    }
  }

  toggleSubModule(subModule: SubModule): void {
    if (!this.hasFlyoutItems(subModule)) {
      this.openSingleScreenSubModule(subModule);
      return;
    }

    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
      this.saveSidebarState();
    }

    if (this.expandedSubModules.has(subModule.id)) {
      this.expandedSubModules.delete(subModule.id);

      this.closeFlyoutSearch();
      return;
    }

    this.expandedSubModules.clear();
    this.expandedSubModules.add(subModule.id);
    this.navigationService.selectSubModule(subModule);
    this.initializeFlyoutGroups(subModule);
    this.closeFlyoutSearch();
  }

  hasFlyoutItems(subModule?: SubModule | null): boolean {
    return (subModule?.screens?.length ?? 0) > 1;
  }

  private openSingleScreenSubModule(subModule: SubModule): void {
    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
      this.saveSidebarState();
    }

    this.expandedSubModules.clear();
    this.navigationService.selectSubModule(subModule);
    this.initializeFlyoutGroups(subModule);
    this.closeFlyoutSearch();

    const firstScreen = subModule.screens[0];
    if (firstScreen) {
      this.selectScreen(firstScreen);
    }
  }

  isSubModuleExpanded(subModuleId: string): boolean {
    return this.expandedSubModules.has(subModuleId);
  }

  selectScreen(screen: Screen): void {
    this.navigationService.selectScreen(screen);
    this.router.navigate([screen.route]);
    this.addToRecent(screen);
    this.showMegaMenu = false;
    this.showRecentForms = false;
    this.closeFlyoutSearch();
    
    // Ensure sidebar is expanded to show where we are
    this.sidebarCollapsed = false;
    this.saveSidebarState();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.saveSidebarState();

    if (this.sidebarCollapsed) {
      this.expandedSubModules.clear();
      this.closeFlyoutSearch();
    } else if (!this.selectedModule && this.modules.length > 0) {
      this.navigationService.selectModule(this.modules[0]);
    }
  }

  private saveSidebarState(): void {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(this.sidebarCollapsed));
  }

  private restoreNavigationFromRoute(route: string): void {
    const activePath = this.navigationService.findPathByRoute(route);

    if (activePath) {
      this.applyNavigationPath(activePath);
      return;
    }

    if (this.isStandaloneShellRoute(route)) {
      this.applyStandalonePageState();
      return;
    }

    if (this.isDashboardHome(route)) {
      this.applyDefaultMenuState();
    }
  }

  private applyNavigationPath(path: NavigationPath): void {
    if (this.selectedModule?.id !== path.module.id) {
      this.navigationService.selectModule(path.module);
    }

    this.expandedSubModules.clear();

    if (this.hasFlyoutItems(path.subModule)) {
      this.expandedSubModules.add(path.subModule.id);
    }

    this.initializeFlyoutGroups(path.subModule);
    this.expandActiveFlyoutGroup(path.subModule, path.screen);

    if (this.selectedSubModule?.id !== path.subModule.id) {
      this.navigationService.selectSubModule(path.subModule);
    }

    if (this.selectedScreen?.id !== path.screen.id) {
      this.navigationService.selectScreen(path.screen);
    }

    this.breadcrumbPath = {
      module: path.module,
      subModule: path.subModule,
      screen: path.screen
    };

    this.sidebarCollapsed = false;
    this.saveSidebarState();
  }

  private scrollModuleTabIntoView(event?: Event): void {
    const element = event?.currentTarget as HTMLElement | null;

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });

    this.queueModuleScrollStateUpdate();
  }

  scrollModuleTabs(direction: 'left' | 'right'): void {
    const scroller = this.moduleScroller?.nativeElement;
    if (!scroller) return;

    const distance = Math.max(180, Math.round(scroller.clientWidth * 0.72));
    scroller.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });

    this.queueModuleScrollStateUpdate();
  }

  onModuleTabsScroll(): void {
    this.updateModuleScrollState();
  }

  private queueModuleScrollStateUpdate(scrollSelected = false): void {
    window.requestAnimationFrame(() => {
      if (scrollSelected) {
        this.scrollActiveModuleTabIntoView();
      }

      this.updateModuleScrollState();
    });
  }

  private scrollActiveModuleTabIntoView(): void {
    const activeTab = this.moduleScroller?.nativeElement.querySelector('.module-tab.active') as HTMLElement | null;
    activeTab?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }

  private updateModuleScrollState(): void {
    const scroller = this.moduleScroller?.nativeElement;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const hasOverflow = maxScrollLeft > 2;

    this.showModuleScrollLeft = hasOverflow && scroller.scrollLeft > 2;
    this.showModuleScrollRight = hasOverflow && scroller.scrollLeft < maxScrollLeft - 2;
  }

  private applyDefaultMenuState(): void {
    if (this.selectedModule || this.modules.length === 0) {
      return;
    }

    const module = this.modules[0];
    const subModule = module.subModules[0];

    this.navigationService.selectModule(module);
    this.sidebarCollapsed = false;
    this.saveSidebarState();

    if (subModule) {
      if (this.hasFlyoutItems(subModule)) {
        this.expandedSubModules.add(subModule.id);
      }

      this.navigationService.selectSubModule(subModule);
    }
  }

  private updateReferenceTray(route: string): void {
    this.referenceTrayConfig = this.referenceDataTrayService.resolveForRoute(route);
  }

  private isDashboardHome(route: string): boolean {
    return this.normalizeRoute(route) === '/dashboard';
  }

  private isStandaloneShellRoute(route: string): boolean {
    const normalized = this.normalizeRoute(route);
    return normalized === '/dashboard/contacts' || normalized === '/dashboard/sos-dashboard';
  }

  private applyStandalonePageState(): void {
    this.selectedModule = null;
    this.selectedSubModule = null;
    this.selectedScreen = null;
    this.expandedSubModules.clear();
    this.breadcrumbPath = {
      module: null,
      subModule: null,
      screen: null
    };
    this.closeAllPanels();
    this.closeFlyoutSearch();
    this.sidebarCollapsed = true;
    this.saveSidebarState();
  }

  openContacts(): void {
    this.applyStandalonePageState();
  }

  openSosDashboard(): void {
    this.showAvatarMenu = false;
    this.showMegaMenu = false;
    this.showRecentForms = false;
    this.applyStandalonePageState();
    this.router.navigate(['/dashboard/sos-dashboard']);
  }

  private normalizeRoute(route: string): string {
    const pathOnly = (route || '/').split(/[?#]/)[0] || '/';
    const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    return withLeadingSlash.replace(/\/+$/, '') || '/';
  }

  closeFlyout(): void {
    this.expandedSubModules.clear();
    this.closeFlyoutSearch();
  }

  toggleFlyoutSearch(): void {
    this.showFlyoutSearch = !this.showFlyoutSearch;

    if (!this.showFlyoutSearch) {
      this.flyoutSearchQuery = '';
    }
  }

  closeFlyoutSearch(): void {
    this.showFlyoutSearch = false;
    this.flyoutSearchQuery = '';
  }

  toggleThemeDropdown(): void {
    this.showThemeDropdown = !this.showThemeDropdown;
  }

  get filteredFlyoutScreens(): any[] {
    const q = this.flyoutSearchQuery.trim().toLowerCase();
    
    if (!q) {
      return this.selectedSubModule?.screens || [];
    }

    const allResults: any[] = [];
    this.selectedModule?.subModules.forEach(sub => {
      const matches = sub.screens.filter(s => s.name.toLowerCase().includes(q));
      matches.forEach(m => {
        allResults.push({
          ...m,
          subModule: sub,
          isFromOtherSubModule: sub.id !== this.selectedSubModule?.id
        });
      });
    });

    return allResults;
  }

  get hasGroupedFlyoutScreens(): boolean {
    return !this.flyoutSearchQuery.trim() && !!this.selectedSubModule?.screens?.some(screen => !!screen.group);
  }

  get groupedFlyoutScreens(): FlyoutScreenGroup[] {
    const groups = new Map<string, Screen[]>();

    for (const screen of this.selectedSubModule?.screens || []) {
      const groupName = screen.group || 'Other';
      groups.set(groupName, [...(groups.get(groupName) || []), screen]);
    }

    return Array.from(groups.entries()).map(([name, screens]) => ({ name, screens }));
  }

  toggleFlyoutGroup(groupName: string): void {
    if (this.expandedFlyoutGroups.has(groupName)) {
      this.expandedFlyoutGroups.delete(groupName);
      return;
    }

    this.expandedFlyoutGroups.add(groupName);
  }

  isFlyoutGroupExpanded(groupName: string): boolean {
    return this.expandedFlyoutGroups.has(groupName);
  }

  isFlyoutGroupActive(group: FlyoutScreenGroup): boolean {
    return !!this.selectedScreen && group.screens.some(screen => screen.id === this.selectedScreen?.id);
  }

  private initializeFlyoutGroups(subModule: SubModule | null): void {
    this.expandedFlyoutGroups.clear();
  }

  private expandActiveFlyoutGroup(subModule: SubModule, screen: Screen): void {
    if (screen.group && subModule.screens.some(item => item.group === screen.group)) {
      this.expandedFlyoutGroups.add(screen.group);
    }
  }

  navigateToScreen(item: any): void {
    if (item.subModule) {
      this.navigationService.selectSubModule(item.subModule);
      this.expandedSubModules.clear();

      if (this.hasFlyoutItems(item.subModule)) {
        this.expandedSubModules.add(item.subModule.id);
      }

      this.initializeFlyoutGroups(item.subModule);
    }

    this.selectScreen(item);
  }

  get filteredMegaModules(): Module[] {
    if (!this.megaMenuSearch.trim()) {
      return this.modules;
    }

    const q = this.megaMenuSearch.toLowerCase();

    return this.modules
      .map((mod: Module) => ({
        ...mod,
        subModules: mod.subModules
          .map((sub: SubModule) => ({
            ...sub,
            screens: (sub.screens || []).filter((sc: Screen) =>
              sc.name.toLowerCase().includes(q) ||
              sub.name.toLowerCase().includes(q) ||
              mod.name.toLowerCase().includes(q)
            )
          }))
          .filter((sub: SubModule) =>
            sub.screens.length > 0 ||
            sub.name.toLowerCase().includes(q) ||
            mod.name.toLowerCase().includes(q)
          )
      }))
      .filter((mod: Module) =>
        mod.subModules.length > 0 || mod.name.toLowerCase().includes(q)
      );
  }

  navigateFromMega(mod: Module, sub: SubModule, screen: Screen): void {
    this.navigationService.selectModule(mod);
    this.sidebarCollapsed = false;
    this.saveSidebarState();
    this.expandedSubModules.clear();

    if (this.hasFlyoutItems(sub)) {
      this.expandedSubModules.add(sub.id);
    }

    this.navigationService.selectSubModule(sub);
    this.selectScreen(screen);
    this.showMegaMenu = false;
  }

  addToRecent(screen: Screen): void {
    const existingIndex = this.recentForms.findIndex(item => item.route === screen.route);

    if (existingIndex > -1) {
      this.recentForms.splice(existingIndex, 1);
    }

    this.recentForms.unshift({
      name: screen.name,
      route: screen.route,
      moduleId: this.selectedModule?.id || '',
      moduleName: this.selectedModule?.name || '',
      subModuleId: this.selectedSubModule?.id || '',
      subModuleName: this.selectedSubModule?.name || '',
      screenId: screen.id,
      icon: this.getScreenIcon(screen.name),
      time: new Date()
    });

    if (this.recentForms.length > 8) {
      this.recentForms.pop();
    }
  }

  navigateRecent(form: RecentForm): void {
    const module =
      this.modules.find(item => item.id === form.moduleId) ||
      this.modules.find(item => item.name === form.moduleName);

    if (module) {
      this.navigationService.selectModule(module);
      this.sidebarCollapsed = false;
      this.saveSidebarState();

      const subModule =
        module.subModules.find(item => item.id === form.subModuleId) ||
        module.subModules.find(item => item.name === form.subModuleName);

      if (subModule) {
        this.expandedSubModules.clear();

        if (this.hasFlyoutItems(subModule)) {
          this.expandedSubModules.add(subModule.id);
        }

        this.navigationService.selectSubModule(subModule);

        const screen =
          subModule.screens.find(item => item.id === form.screenId) ||
          subModule.screens.find(item => item.route === form.route);

        if (screen) {
          this.selectScreen(screen);
        }
      }
    }

    this.router.navigate([form.route]);
    this.showRecentForms = false;
  }

  clearRecent(): void {
    this.recentForms = [];
  }

  getRecentTimeLabel(date: Date): string {
    const diffMinutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  }

  closeAllPanels(): void {
    this.showMegaMenu = false;
    this.showAvatarMenu = false;
    this.showRecentForms = false;
    this.showThemeDropdown = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAllPanels();
    this.closeFlyoutSearch();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.queueModuleScrollStateUpdate();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getModuleIcon(name?: string): string {
    const value = (name || '').toLowerCase();

    if (value.includes('account')) return 'pi pi-briefcase';
    if (value.includes('inventory')) return 'pi pi-box';
    if (value.includes('hr')) return 'pi pi-users';
    if (value.includes('setting')) return 'pi pi-cog';
    if (value.includes('payroll')) return 'pi pi-wallet';
    if (value.includes('report')) return 'pi pi-chart-bar';
    if (value.includes('admin')) return 'pi pi-shield';

    return 'pi pi-th-large';
  }

  getSubModuleIcon(name?: string): string {
    const value = (name || '').toLowerCase();

    if (value.includes('dashboard')) return 'pi pi-chart-bar';
    if (value.includes('config')) return 'pi pi-wrench';
    if (value.includes('transactions')) return 'pi pi-indian-rupee';
    if (value.includes('withdraw')) return 'pi pi-folder-open';
    if (value.includes('transfer')) return 'pi pi-arrow-right-arrow-left';
    if (value.includes('report')) return 'pi pi-chart-line';
    if (value.includes('payroll')) return 'pi pi-wallet';
    if (value.includes('customer')) return 'pi pi-users';
    if (value.includes('employee')) return 'pi pi-id-card';
    if (value.includes('leave')) return 'pi pi-calendar';
    if (value.includes('setting')) return 'pi pi-sliders-h';
    if (value.includes('master')) return 'pi pi-database';
    if (value.includes('verification')) return 'pi pi-check-square';

    return 'pi pi-wrench';
  }

  getScreenIcon(name?: string): string {
    const value = (name || '').toLowerCase();

    if (value.includes('dashboard')) return 'pi pi-chart-bar';
    if (value.includes('salary')) return 'pi pi-wallet';
    if (value.includes('esi')) return 'pi pi-shield';
    if (value.includes('pf')) return 'pi pi-building-columns';
    if (value.includes('tax')) return 'pi pi-percentage';
    if (value.includes('bonus')) return 'pi pi-gift';
    if (value.includes('leave')) return 'pi pi-calendar';
    if (value.includes('loyalty')) return 'pi pi-star';
    if (value.includes('payslip')) return 'pi pi-file';
    if (value.includes('statement')) return 'pi pi-file-edit';
    if (value.includes('attendance')) return 'pi pi-clock';
    if (value.includes('withdrawal')) return 'pi pi-angle-right';
    if (value.includes('transfer')) return 'pi pi-angle-right';
    if (value.includes('cheque')) return 'pi pi-angle-right';
    if (value.includes('receipt')) return 'pi pi-angle-right';
    if (value.includes('voucher')) return 'pi pi-angle-right';

    return 'pi pi-angle-right';
  }
}

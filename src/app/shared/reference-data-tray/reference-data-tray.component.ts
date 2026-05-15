import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ReferenceDataBindRow,
  ReferenceDataField,
  ReferenceDataLink,
  ReferenceDataSection,
  ReferenceDataTable,
  ReferenceDataTableColumn,
  ReferenceDataTableRow,
  ReferenceDataTrayConfig
} from './reference-data-tray.models';
import { ReferenceDataTrayService } from './reference-data-tray.service';

@Component({
  selector: 'app-reference-data-tray',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reference-data-tray.component.html',
  styleUrl: './reference-data-tray.component.scss'
})
export class ReferenceDataTrayComponent implements OnChanges {
  @Input() config: ReferenceDataTrayConfig | null = null;
  @ViewChild('tray') private tray?: ElementRef<HTMLElement>;

  isOpen = false;
  position = { left: 0, top: 116 };
  dragging = false;
  selectedBindKeys = new Set<string>();

  private activeConfigId = '';
  private dragOffset = { x: 0, y: 0 };

  constructor(private referenceDataTrayService: ReferenceDataTrayService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['config']) return;

    const nextId = this.config?.id || '';
    if (nextId === this.activeConfigId) return;

    this.activeConfigId = nextId;
    this.dragging = false;
    this.selectedBindKeys.clear();

    if (!this.config) {
      this.isOpen = false;
      return;
    }

    const savedState = this.referenceDataTrayService.loadState(this.config.id);
    this.isOpen = this.config.autoOpen === false ? (savedState?.isOpen ?? false) : true;
    this.position = savedState?.position ?? this.defaultPosition();
  }

  closeTray(): void {
    this.isOpen = false;
    this.persistState();
  }

  openTray(): void {
    if (!this.config) return;

    this.position = this.clampPosition(this.position);
    this.isOpen = true;
    this.persistState();
  }

  startDrag(event: PointerEvent): void {
    if (!this.config || this.isMobileViewport()) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a')) return;

    this.dragging = true;
    this.dragOffset = {
      x: event.clientX - this.position.left,
      y: event.clientY - this.position.top
    };
    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;

    this.position = this.clampPosition({
      left: event.clientX - this.dragOffset.x,
      top: event.clientY - this.dragOffset.y
    });
  }

  @HostListener('document:pointerup')
  onPointerUp(): void {
    if (!this.dragging) return;

    this.dragging = false;
    this.persistState();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.config) return;

    this.position = this.clampPosition(this.position);
    this.persistState();
  }

  fieldValue(field: ReferenceDataField): string {
    const value = field.value;
    return value === null || value === undefined || value === '' ? '--' : String(value);
  }

  tableCellValue(row: ReferenceDataTableRow, column: ReferenceDataTableColumn): string {
    const value = row[column.field];
    return value === null || value === undefined || value === '' || Array.isArray(value) || typeof value === 'object'
      ? '--'
      : String(value);
  }

  linkIsExternal(link: ReferenceDataLink): boolean {
    return !!link.url;
  }

  bindKey(section: ReferenceDataSection, table: ReferenceDataTable, row: ReferenceDataTableRow, rowIndex: number): string {
    return row.bindKey || `${this.config?.id || 'reference'}:${section.title}:${table.title || 'table'}:${rowIndex}`;
  }

  rowIsBound(section: ReferenceDataSection, table: ReferenceDataTable, row: ReferenceDataTableRow, rowIndex: number): boolean {
    return this.selectedBindKeys.has(this.bindKey(section, table, row, rowIndex));
  }

  toggleRowBinding(
    section: ReferenceDataSection,
    table: ReferenceDataTable,
    row: ReferenceDataTableRow,
    rowIndex: number,
    checked: boolean
  ): void {
    const key = this.bindKey(section, table, row, rowIndex);

    if (checked) {
      this.selectedBindKeys.add(key);
    } else {
      this.selectedBindKeys.delete(key);
    }

    this.referenceDataTrayService.bindReferenceData({
      configId: this.config?.id || '',
      target: String(row.bindTarget || ''),
      rows: this.boundRows()
    });
  }

  floatingTop(): number {
    return Math.max(72, Math.min(this.position.top, this.viewportHeight() - 76));
  }

  private boundRows(): ReferenceDataBindRow[] {
    if (!this.config) return [];

    const rows: ReferenceDataBindRow[] = [];

    for (const section of this.config.sections) {
      const table = section.table;
      if (!table?.bindable) continue;

      table.rows.forEach((row, rowIndex) => {
        if (!this.selectedBindKeys.has(this.bindKey(section, table, row, rowIndex))) return;

        const sourceRef = String(row.bindKey || row['ref'] || row['document'] || row['reference'] || rowIndex);
        rows.push({
          target: String(row.bindTarget || ''),
          sourceRef,
          sourceLabel: String(row.bindLabel || row['ref'] || row['document'] || row['reference'] || sourceRef),
          fields: row.bindFields,
          lines: row.bindLines
        });
      });
    }

    return rows;
  }

  private persistState(): void {
    if (!this.config) return;

    this.referenceDataTrayService.saveState(this.config.id, {
      isOpen: this.isOpen,
      position: this.position
    });
  }

  private defaultPosition(): { left: number; top: number } {
    return this.clampPosition({
      left: (this.viewportWidth() - this.trayWidth()) / 2,
      top: 8
    });
  }

  private clampPosition(position: { left: number; top: number }): { left: number; top: number } {
    if (this.isMobileViewport()) {
      return { left: 8, top: 8 };
    }

    const margin = 8;
    const maxLeft = Math.max(margin, this.viewportWidth() - this.trayWidth() - margin);
    const maxTop = Math.max(margin, this.viewportHeight() - this.trayHeight() - margin);

    return {
      left: Math.min(Math.max(position.left, margin), maxLeft),
      top: Math.min(Math.max(position.top, margin), maxTop)
    };
  }

  private trayWidth(): number {
    return this.tray?.nativeElement.offsetWidth || 960;
  }

  private trayHeight(): number {
    return this.tray?.nativeElement.offsetHeight || 520;
  }

  private viewportWidth(): number {
    return typeof window === 'undefined' ? 1440 : window.innerWidth;
  }

  private viewportHeight(): number {
    return typeof window === 'undefined' ? 900 : window.innerHeight;
  }

  private isMobileViewport(): boolean {
    return this.viewportWidth() < 768;
  }
}

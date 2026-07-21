import { CommonModule } from '@angular/common';
import { Component, HostBinding, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SosTicket, SosTicketService } from './sos-ticket.service';
import { StickyFooterOffsetService } from '../../core/services/Common/sticky-footer-offset.service';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 3;

export interface SosAttachment {
  file: File;
  preview: string | null;
  isVideo: boolean;
}

@Component({
  selector: 'app-sos-help',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sos-help.component.html',
  styleUrl: './sos-help.component.scss'
})
export class SosHelpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(SosTicketService);
  private readonly router = inject(Router);
  private readonly footerOffset = inject(StickyFooterOffsetService);

  @HostBinding('style.bottom.px') get hostBottom(): number { return 22 + this.footerOffset.offsetPx(); }

  readonly open = signal(false);
  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly sendError = signal('');
  readonly lastTicket = signal<SosTicket | null>(null);
  readonly tickets = signal<SosTicket[]>(this.ticketService.getTickets());
  readonly categories = ['Error / Bug', 'Data Issue', 'Report Issue', 'Access Issue', 'Other'];
  readonly priorities = ['High', 'Medium', 'Low'];
  readonly attachments = signal<SosAttachment[]>([]);
  readonly fileError = signal('');
  readonly mailtoLink = signal('');

  readonly form = this.fb.group({
    category: ['Error / Bug', Validators.required],
    priority: ['High', Validators.required],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1200)]],
    contact: ['', Validators.maxLength(120)]
  });

  toggle(): void {
    this.open.update(value => !value);
    if (this.open()) {
      this.refreshTickets();
    }
  }

  close(): void {
    this.open.set(false);
  }

  openDashboard(): void {
    this.close();
    this.router.navigate(['/dashboard/sos-dashboard']);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!event.dataTransfer?.files) return;
    this.addFiles(Array.from(event.dataTransfer.files));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  removeAttachment(index: number): void {
    const current = this.attachments();
    URL.revokeObjectURL(current[index].preview ?? '');
    this.attachments.set(current.filter((_, i) => i !== index));
    this.fileError.set('');
  }

  submitTicket(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const files = this.attachments().map(a => a.file);
    const ticket = this.ticketService.createTicket(
      {
        category: raw.category || 'Other',
        priority: raw.priority || 'Medium',
        subject: (raw.subject || '').trim(),
        message: (raw.message || '').trim(),
        contact: (raw.contact || '').trim()
      },
      files.length
    );

    this.sending.set(true);
    this.sendError.set('');
    this.mailtoLink.set('');

    const mailto = this.ticketService.buildMailtoLink(ticket);

    this.ticketService.submitTicket(ticket, files).subscribe({
      next: () => {
        this.lastTicket.set({ ...ticket, status: 'Submitted' });
        this.mailtoLink.set(mailto);
        this.refreshTickets();
        this.resetForm();
        window.open(mailto, '_self');
      },
      error: () => {
        this.lastTicket.set({ ...ticket, status: 'Pending Backend' });
        this.mailtoLink.set(mailto);
        this.refreshTickets();
        this.sendError.set('Backend did not confirm. Use the email button below to send directly.');
        this.resetForm();
        window.open(mailto, '_self');
      }
    });
  }

  resend(ticket: SosTicket): void {
    this.sending.set(true);
    this.sendError.set('');

    this.ticketService.submitTicket(ticket).subscribe({
      next: () => {
        this.refreshTickets();
        this.sending.set(false);
      },
      error: () => {
        this.refreshTickets();
        this.sending.set(false);
        this.sendError.set('Backend did not confirm within timeout. Please retry after API/mail service is available.');
      }
    });
  }

  private addFiles(files: File[]): void {
    this.fileError.set('');
    const current = this.attachments();
    const remaining = MAX_FILES - current.length;

    if (remaining <= 0) {
      this.fileError.set(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }

    const toAdd: SosAttachment[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.fileError.set('Only images (JPG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.fileError.set(`"${file.name}" exceeds 10 MB limit.`);
        continue;
      }
      const isVideo = file.type.startsWith('video/');
      toAdd.push({
        file,
        preview: isVideo ? null : URL.createObjectURL(file),
        isVideo
      });
    }

    this.attachments.set([...current, ...toAdd]);
  }

  private resetForm(): void {
    this.submitted.set(false);
    this.sending.set(false);
    this.clearAttachments();
    this.form.reset({
      category: 'Error / Bug',
      priority: 'High',
      subject: '',
      message: '',
      contact: ''
    });
  }

  private clearAttachments(): void {
    this.attachments().forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
    this.attachments.set([]);
    this.fileError.set('');
  }

  private refreshTickets(): void {
    this.tickets.set(this.ticketService.getTickets());
  }
}

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CpsBatch, PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-cps-batches',
  templateUrl: './portal-cps-batches.component.html',
  styleUrls: ['./portal-cps-batches.component.scss'],
  standalone: false,
})
export class PortalCpsBatchesComponent implements OnInit {
  loading = true;
  uploading = false;
  error = '';
  successMessage = '';

  batches: CpsBatch[] = [];
  merchantId = '';
  selectedFile: File | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private readonly api: PortalApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getCpsBatches(this.merchantId || undefined).subscribe({
      next: (batches) => { this.batches = batches; this.loading = false; setTimeout(() => window.dispatchEvent(new Event('resize')), 50); },
      error: (err) => { this.error = err?.error?.message || 'Failed to load batches.'; this.loading = false; },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  upload(): void {
    if (!this.selectedFile || !this.merchantId) {
      this.error = 'Select a merchant and a CSV file before uploading.';
      return;
    }
    this.uploading = true;
    this.error = '';
    this.api.uploadCpsBatch(this.merchantId, this.selectedFile).subscribe({
      next: (batch) => {
        this.uploading = false;
        this.successMessage = `Batch #${batch.sequenceNumber} uploaded (status: DRAFT).`;
        this.selectedFile = null;
        if (this.fileInput) this.fileInput.nativeElement.value = '';
        this.load();
      },
      error: (err) => { this.error = err?.error?.message || 'Upload failed.'; this.uploading = false; },
    });
  }

  submit(batch: CpsBatch): void {
    if (!confirm(`Submit batch #${batch.sequenceNumber} to the clearing house?`)) return;
    this.api.submitCpsBatch(batch.id).subscribe({
      next: (updated) => {
        this.successMessage = `Batch #${updated.sequenceNumber} submitted.`;
        this.batches = this.batches.map((b) => (b.id === updated.id ? updated : b));
      },
      error: (err) => { this.error = err?.error?.message || 'Submit failed.'; },
    });
  }

  get draftCount(): number { return this.batches.filter((b) => b.status === 'DRAFT').length; }
  get submittedCount(): number { return this.batches.filter((b) => b.status === 'SUBMITTED').length; }

  statusBadge(status: string): string {
    switch (status) {
      case 'DRAFT':            return 'bg-secondary-subtle text-secondary';
      case 'SUBMITTED':        return 'bg-info-subtle text-info';
      case 'ACK':              return 'bg-success-subtle text-success';
      case 'NACK':             return 'bg-danger-subtle text-danger';
      case 'PARTIALLY_FAILED': return 'bg-warning-subtle text-warning';
      default:                 return 'bg-secondary-subtle text-secondary';
    }
  }
}

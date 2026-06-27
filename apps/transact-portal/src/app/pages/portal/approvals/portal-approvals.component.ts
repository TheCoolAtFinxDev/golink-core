import { Component, OnInit } from '@angular/core';
import { ApprovalRequest, PortalApiService } from '../shared/portal-api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-portal-approvals',
  templateUrl: './portal-approvals.component.html',
  styleUrls: ['./portal-approvals.component.scss'],
  standalone: false,
})
export class PortalApprovalsComponent implements OnInit {
  loading = true;
  error = '';
  successMessage = '';

  requests: ApprovalRequest[] = [];
  total = 0;

  statusFilter: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' = 'PENDING';

  constructor(private readonly api: PortalApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getApprovals(this.statusFilter || undefined).subscribe({
      next: (items) => {
        this.requests = items;
        this.total = items.length;
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load approvals.';
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    this.load();
  }

  async approve(req: ApprovalRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Approve this request?',
      html: `<b>${req.action}</b><br><span class="text-muted small">${req.resourceType}${req.resourceId ? ' · ' + req.resourceId : ''}</span>`,
      input: 'textarea',
      inputLabel: 'Notes (optional)',
      inputPlaceholder: 'Add a note…',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ab39c',
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    this.api.approveRequest(req.id, result.value || undefined).subscribe({
      next: () => {
        this.successMessage = 'Request approved.';
        this.load();
      },
      error: (err) => { this.error = err?.error?.message || 'Failed to approve.'; },
    });
  }

  async reject(req: ApprovalRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Reject this request?',
      html: `<b>${req.action}</b>`,
      input: 'textarea',
      inputLabel: 'Reason (optional)',
      inputPlaceholder: 'Why are you rejecting this?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    this.api.rejectRequest(req.id, result.value || undefined).subscribe({
      next: () => {
        this.successMessage = 'Request rejected.';
        this.load();
      },
      error: (err) => { this.error = err?.error?.message || 'Failed to reject.'; },
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge bg-warning-subtle text-warning';
      case 'APPROVED': return 'badge bg-success-subtle text-success';
      case 'REJECTED': return 'badge bg-danger-subtle text-danger';
      case 'CANCELLED': return 'badge bg-secondary-subtle text-secondary';
      default: return 'badge bg-secondary-subtle text-secondary';
    }
  }

  get pendingCount(): number {
    return this.requests.filter((r) => r.status === 'PENDING').length;
  }
}

import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { AdminPaymentRecord, Organization, PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-dashboard',
  templateUrl: './portal-dashboard.component.html',
  styleUrls: ['./portal-dashboard.component.scss'],
  standalone: false,
})
export class PortalDashboardComponent implements OnInit {
  loading = true;
  error = '';

  // KPI
  totalPartners = 0;
  livePartners = 0;
  totalPayments = 0;
  successfulPayments = 0;
  failedPayments = 0;
  successRate = 0;
  totalVolume = 0;
  volumeCurrency = 'LSL';

  // Pending KYB
  pendingKybCount = 0;
  approvedKybCount = 0;

  // Recent payments table
  recentPayments: AdminPaymentRecord[] = [];

  // Payment status donut
  paymentStatusData: ChartData<'doughnut'> = {
    labels: ['Succeeded', 'Failed', 'Pending', 'Other'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#0ab39c', '#f06548', '#f7b84b', '#878a99'],
      borderWidth: 0,
    }],
  };

  // Partner readiness donut
  partnerReadinessData: ChartData<'doughnut'> = {
    labels: ['Live', 'Ready', 'Incomplete', 'Draft', 'Suspended'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      backgroundColor: ['#0ab39c', '#299cdb', '#f7b84b', '#878a99', '#f06548'],
      borderWidth: 0,
    }],
  };

  chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, boxWidth: 12, font: { size: 12 } },
      },
    },
    cutout: '70%',
  };

  // Partner status table
  partnerStatusRows: Array<{ label: string; count: number; color: string }> = [];

  constructor(private readonly api: PortalApiService) {}

  ngOnInit(): void {
    forkJoin({
      organizations: this.api.getOrganizations({ pageSize: 500 }),
      payments: this.api.getPayments(),
    }).subscribe({
      next: ({ organizations, payments }) => {
        this.buildPartnerStats(organizations.items);
        this.buildPaymentStats(payments);
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: () => {
        this.error = 'Failed to load dashboard data.';
        this.loading = false;
      },
    });
  }

  private buildPartnerStats(orgs: Organization[]): void {
    this.totalPartners = orgs.length;
    this.livePartners = orgs.filter((o) => o.readinessStatus === 'LIVE').length;

    const readyCounts: Record<string, number> = {
      LIVE: 0, READY: 0, INCOMPLETE: 0, DRAFT: 0, SUSPENDED: 0,
    };
    for (const org of orgs) {
      const key = org.readinessStatus ?? 'DRAFT';
      readyCounts[key] = (readyCounts[key] ?? 0) + 1;
    }

    this.partnerReadinessData = {
      labels: ['Live', 'Ready', 'Incomplete', 'Draft', 'Suspended'],
      datasets: [{
        data: [
          readyCounts['LIVE'],
          readyCounts['READY'],
          readyCounts['INCOMPLETE'],
          readyCounts['DRAFT'],
          readyCounts['SUSPENDED'],
        ],
        backgroundColor: ['#0ab39c', '#299cdb', '#f7b84b', '#878a99', '#f06548'],
        borderWidth: 0,
      }],
    };

    this.partnerStatusRows = [
      { label: 'Live', count: readyCounts['LIVE'], color: 'success' },
      { label: 'Ready', count: readyCounts['READY'], color: 'info' },
      { label: 'Incomplete', count: readyCounts['INCOMPLETE'], color: 'warning' },
      { label: 'Draft', count: readyCounts['DRAFT'], color: 'secondary' },
      { label: 'Suspended', count: readyCounts['SUSPENDED'], color: 'danger' },
    ];

    this.pendingKybCount = orgs.filter(
      (o) => o.verificationDecision === 'PENDING' || o.partnerStatus === 'COMPLIANCE_REVIEW',
    ).length;
    this.approvedKybCount = orgs.filter(
      (o) => o.verificationDecision === 'APPROVED',
    ).length;
  }

  private buildPaymentStats(payments: AdminPaymentRecord[]): void {
    this.totalPayments = payments.length;
    this.successfulPayments = payments.filter((p) => p.status === 'SUCCEEDED').length;
    this.failedPayments = payments.filter((p) => p.status === 'FAILED').length;
    const pending = payments.filter(
      (p) => p.status === 'PENDING' || p.status === 'PROCESSING',
    ).length;
    const other = payments.length - this.successfulPayments - this.failedPayments - pending;

    this.successRate = this.totalPayments > 0
      ? Math.round((this.successfulPayments / this.totalPayments) * 100)
      : 0;

    this.totalVolume = payments
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    if (payments.length > 0 && payments[0].currency) {
      this.volumeCurrency = payments[0].currency;
    }

    this.paymentStatusData = {
      labels: ['Succeeded', 'Failed', 'Pending', 'Other'],
      datasets: [{
        data: [this.successfulPayments, this.failedPayments, pending, Math.max(other, 0)],
        backgroundColor: ['#0ab39c', '#f06548', '#f7b84b', '#878a99'],
        borderWidth: 0,
      }],
    };

    this.recentPayments = [...payments]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-LS', {
      style: 'currency',
      currency: currency || 'LSL',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  }

  statusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SUCCEEDED': return 'badge bg-success-subtle text-success';
      case 'FAILED':    return 'badge bg-danger-subtle text-danger';
      case 'PENDING':   return 'badge bg-warning-subtle text-warning';
      case 'PROCESSING': return 'badge bg-info-subtle text-info';
      default:          return 'badge bg-secondary-subtle text-secondary';
    }
  }
}

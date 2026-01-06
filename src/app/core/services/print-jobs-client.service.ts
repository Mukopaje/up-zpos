import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { PrintService } from './print.service';

@Injectable({ providedIn: 'root' })
export class PrintJobsClientService {
  private api = inject(ApiService);
  private printService = inject(PrintService);

  /**
   * Fetch pending print jobs from the backend and attempt to process them.
   * Currently supports KITCHEN jobs by delegating to PrintService.printKitchenTickets.
   */
  async processPendingJobsOnce(limit = 10): Promise<void> {
    const jobs = await this.api.getPrintJobs('pending', limit);

    for (const job of jobs) {
      try {
        if (job.type === 'KITCHEN') {
          await this.printService.printKitchenTickets(job.payload);
        }
        // RECEIPT jobs are currently handled directly at checkout on-device.
        // We may support them here later once full receipt payloads are synced.

        await this.api.markPrintJobProcessed(job.id);
      } catch (error: any) {
        console.error('Failed to process print job', job.id, error);
        await this.api.markPrintJobFailed(job.id, error?.message || 'Print error');
      }
    }
  }
}

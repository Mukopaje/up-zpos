import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent,
  IonGrid, IonRow, IonCol, IonProgressBar, IonNote, IonText, IonRefresher,
  IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline, statsChartOutline, syncOutline,
  alertCircleOutline, receiptOutline, downloadOutline, timeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-zra-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent,
    IonGrid, IonRow, IonCol, IonProgressBar, IonNote, IonText, IonRefresher,
    IonRefresherContent
  ],
  templateUrl: './zra-dashboard.page.html',
  styleUrls: ['./zra-dashboard.page.scss']
})
export class ZraDashboardPage implements OnInit {
  
  // Status state
  isCompliant = signal(true);
  syncProgress = signal(0.85); // 85% synced
  
  // Metrics (Simulated for UI)
  totalSalesToday = signal(5420.50);
  taxCollectedToday = signal(867.28);
  pendingFiscalization = signal(4);
  
  // Mock recent activity
  recentInvoices = signal([
    { fdn: 'FDN-2026-000124', time: '10:45 AM', amount: 150.00, tax: 24.00, status: 'fiscalized' },
    { fdn: 'FDN-2026-000123', time: '10:30 AM', amount: 85.50, tax: 13.68, status: 'fiscalized' },
    { fdn: 'PENDING-001', time: '10:15 AM', amount: 200.00, tax: 32.00, status: 'queued' },
    { fdn: 'FDN-2026-000121', time: '09:50 AM', amount: 310.00, tax: 49.60, status: 'fiscalized' }
  ]);

  constructor() {
    addIcons({
      shieldCheckmarkOutline, statsChartOutline, syncOutline,
      alertCircleOutline, receiptOutline, downloadOutline, timeOutline
    });
  }

  ngOnInit() {}

  async refresh(event?: any) {
    // Simulated refresh
    setTimeout(() => {
      if (event) event.target.complete();
    }, 1000);
  }

  exportReport() {
    console.log('Exporting ZRA report...');
  }
}

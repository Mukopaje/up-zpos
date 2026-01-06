import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, desktopOutline, addOutline, checkmarkCircleOutline } from 'ionicons/icons';

import { Terminal } from '../../models';
import { TerminalsService } from '../../core/services/terminals.service';
import { StorageService } from '../../core/services/storage.service';

interface LocationInfo {
  id: string; // we use the location string as ID for now
  name: string;
  terminalCount: number;
  activeTerminals: number;
}

@Component({
  selector: 'app-locations',
  templateUrl: './locations.page.html',
  styleUrls: ['./locations.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class LocationsPage implements OnInit {
  private terminalsService = inject(TerminalsService);
  private storage = inject(StorageService);

  terminals = signal<Terminal[]>([]);
  loading = signal(false);
  currentLocationId = signal<string | null>(null);

  locations = computed<LocationInfo[]>(() => {
    const map = new Map<string, LocationInfo>();

    for (const t of this.terminals()) {
      const loc = (t.location || 'default').trim() || 'default';
      const entry = map.get(loc) || {
        id: loc,
        name: loc,
        terminalCount: 0,
        activeTerminals: 0
      };

      entry.terminalCount += 1;
      if (t.active) {
        entry.activeTerminals += 1;
      }

      map.set(loc, entry);
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor() {
    addIcons({
      'location-outline': locationOutline,
      'desktop-outline': desktopOutline,
      'add-outline': addOutline,
      'checkmark-circle-outline': checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadCurrentLocation();
    await this.loadTerminals();
  }

  private async loadCurrentLocation() {
    try {
      const loc = await this.storage.get<string>('location_id');
      this.currentLocationId.set(loc ?? 'default');
    } catch (error) {
      console.error('Error loading current location:', error);
      this.currentLocationId.set('default');
    }
  }

  private async loadTerminals() {
    this.loading.set(true);
    try {
      await this.terminalsService.loadTerminals();
      this.terminals.set(this.terminalsService.terminals());
    } catch (error) {
      console.error('Error loading terminals for locations:', error);
    } finally {
      this.loading.set(false);
    }
  }

  isCurrentLocation(locationId: string): boolean {
    return this.currentLocationId() === locationId;
  }

  async setCurrentLocation(locationId: string) {
    try {
      await this.storage.set('location_id', locationId);
      this.currentLocationId.set(locationId);
    } catch (error) {
      console.error('Error setting current location:', error);
    }
  }

  getLocationLabel(loc: LocationInfo): string {
    if (!loc.id || loc.id === 'default') {
      return 'Default Location';
    }
    return loc.name;
  }
}

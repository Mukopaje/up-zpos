import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonInput,
  IonButtons,
  IonBackButton,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, arrowBack, business, call, mail } from 'ionicons/icons';
import { SuppliersService } from '../../core/services/suppliers.service';

@Component({
  selector: 'app-suppliers',
  templateUrl: './suppliers.page.html',
  styleUrls: ['./suppliers.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonInput,
    IonButtons,
    IonBackButton,
    IonSearchbar,
  ],
})
export class SuppliersPage implements OnInit {
  private suppliersService = inject(SuppliersService);

  suppliers = this.suppliersService.suppliers;
  isLoading = this.suppliersService.isLoading;

  searchQuery = signal('');

  filteredSuppliers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    let list = this.suppliers();
    if (query) {
      list = list.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        (s.contactName ?? '').toLowerCase().includes(query) ||
        (s.phone ?? '').includes(query) ||
        (s.email ?? '').toLowerCase().includes(query),
      );
    }
    return list;
  });

  constructor() {
    addIcons({ add, create, trash, 'arrow-back': arrowBack, business, call, mail });
  }

  async ngOnInit() {
    await this.suppliersService.loadSuppliers();
  }

  async handleRefresh(event: any) {
    await this.suppliersService.loadSuppliers();
    event.target.complete();
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  async addSupplier() {
    const name = prompt('Supplier name');
    if (!name) return;
    await this.suppliersService.createSupplier({ name });
  }

  async editSupplier(supplier: any) {
    const name = prompt('Supplier name', supplier.name);
    if (!name) return;
    await this.suppliersService.updateSupplier(supplier.id, { name });
  }

  async deleteSupplier(supplier: any) {
    if (!confirm(`Delete supplier ${supplier.name}?`)) return;
    await this.suppliersService.deleteSupplier(supplier.id);
  }
}

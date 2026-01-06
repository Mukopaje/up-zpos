import { Injectable, signal } from '@angular/core';
import { Table } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class HospitalityContextService {
  // Indicates whether the current sale is linked to a hospitality table
  mode = signal<'none' | 'hospitality'>('none');

  // Basic table/session info for hospitality workflows
  tableId = signal<string | null>(null);
  tableNumber = signal<string | null>(null);
  guestName = signal<string | null>(null);
  guestCount = signal<number | null>(null);
  waiterName = signal<string | null>(null);

  // When changing tables, track the source table id so that the
  // next table selected in the hospitality view becomes the
  // destination for the move.
  movingFromTableId = signal<string | null>(null);

  startFromTable(table: Table): void {
    this.mode.set('hospitality');
    this.tableId.set(table._id);
    this.tableNumber.set(table.number);
    this.guestName.set(table.guestName ?? null);
    this.guestCount.set(table.guestCount ?? null);
    this.waiterName.set(table.waiterName ?? null);
    // Starting a fresh session clears any pending move
    this.movingFromTableId.set(null);
  }

  clear(): void {
    this.mode.set('none');
    this.tableId.set(null);
    this.tableNumber.set(null);
    this.guestName.set(null);
    this.guestCount.set(null);
    this.waiterName.set(null);
    this.movingFromTableId.set(null);
  }

  beginTableMove(sourceTableId: string): void {
    this.movingFromTableId.set(sourceTableId);
  }
}

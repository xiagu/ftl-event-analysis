import {Component, Inject} from '@angular/core';
import {MatButtonToggleChange} from '@angular/material/button-toggle';
import {BehaviorSubject, Observable} from 'rxjs';

import {SECTORS_TOKEN} from '../app_tokens';
import {Sector} from '../shared/models/sector';

@Component({
  selector: 'ftl-sector-stats',
  templateUrl: './sector-stats.component.html',
  styleUrls: ['./sector-stats.component.scss'],
})
export class SectorStatsComponent {
  /**
   * Has to be a BehaviorSubject so the ngFor inside the ngIf will get a
   * replayed value on subscribe.
   *
   * With NgRx this would live in the app state, I think? Should also be
   * reflected in a route.
   */
  private readonly selectedSector = new BehaviorSubject<Sector|null>(null);

  constructor(
      @Inject(SECTORS_TOKEN) private readonly sectors: Observable<Sector[]>,
  ) {}

  sectorChanged(change: MatButtonToggleChange): void {
    this.selectedSector.next(change.value);
  }
}

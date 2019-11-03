import {Component, Inject, OnInit} from '@angular/core';
import {MatButtonToggleChange} from '@angular/material/button-toggle';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, withLatestFrom} from 'rxjs/operators';

import {SECTOR_DATA_TOKEN} from '../app_tokens';
import {FTLTags} from '../ftl_tags';

@Component({
  selector: 'ftl-sector-stats',
  templateUrl: './sector-stats.component.html',
  styleUrls: ['./sector-stats.component.scss']
})
export class SectorStatsComponent {
  readonly sectorNames: Observable<string[]> = this.sectorData.pipe(
      map((sectorDoc) => {
        return Array
            .from(sectorDoc.querySelectorAll(FTLTags.SECTOR_DESCRIPTION))
            .map((sector) => sector.getAttribute('name'))
            .filter((name): name is string => !!name);
      }),
  );

  /**
   * Has to be a BehaviorSubject so the ngFor inside the ngIf will get a
   * replayed value on subscribe.
   *
   * With NgRx this would live in the app state, I think? Should also be
   * reflected in a route.
   */
  private readonly selectedSector = new BehaviorSubject<string>('');

  readonly sectorEvents: Observable<string[]> = this.selectedSector.pipe(
      withLatestFrom(this.sectorData),
      map(([sector, sectorDoc]) => {
        const description = sectorDoc.querySelector(
            `${FTLTags.SECTOR_DESCRIPTION}[name=${sector}]`);
        if (!description) throw new Error(`Couldn't find sector ${sector}`);
        return Array.from(description.querySelectorAll(FTLTags.EVENT));
      }),
      map((events) => {
        return events.map((e) => e.getAttribute('name'))
            .filter((name): name is string => !!name);
      }),
  );

  constructor(@Inject(SECTOR_DATA_TOKEN) private readonly sectorData:
                  Observable<XMLDocument>) {}

  sectorChanged(change: MatButtonToggleChange): void {
    this.selectedSector.next(change.value);
  }
}

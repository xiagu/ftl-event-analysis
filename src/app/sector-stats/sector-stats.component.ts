import {Component, Inject, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {SECTOR_DATA_TOKEN} from '../app_tokens';

@Component({
  selector: 'ftl-sector-stats',
  templateUrl: './sector-stats.component.html',
  styleUrls: ['./sector-stats.component.scss']
})
export class SectorStatsComponent {
  readonly sectorNames = this.sectorData.pipe(
      map((doc) => Array.from(doc.querySelectorAll('sectorDescription'))),
      map((sectors) => sectors.map((sector) => sector.getAttribute('name'))),
  );

  constructor(@Inject(SECTOR_DATA_TOKEN) private readonly sectorData:
                  Observable<XMLDocument>) {}
}

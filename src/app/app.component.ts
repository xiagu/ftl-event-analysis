import {Component} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {xhrLoad} from './tools/xhr_load';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ftl-event-analysis';

  /** Could probably be in some singleton service. */
  events: Observable<XMLDocument> = from(xhrLoad('/assets/data/events.xml'));

  sectorData: Observable<XMLDocument> =
      from(xhrLoad('/assets/data/sector_data.xml'));

  eventCount = this.events.pipe(
      map((document) => document.querySelectorAll('event').length),
  );

  sectors = this.sectorData.pipe(
      map((document) =>
              Array.from(document.querySelectorAll('sectorDescription'))),
      map((sectors) => sectors.map((sector) => sector.getAttribute('name'))),
  );
}

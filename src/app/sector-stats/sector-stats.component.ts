import {Component, Inject} from '@angular/core';
import {MatButtonToggleChange} from '@angular/material/button-toggle';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map, shareReplay, startWith} from 'rxjs/operators';

import {EVENT_DATA_TOKEN, SECTORS_TOKEN} from '../app_tokens';
import {FTLTags} from '../ftl_tags';
import {Sector, SectorEventDefinition} from '../shared/models/sector';

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

  /** Counts of unique events for each top-level sector event. */
  readonly eventData: Observable<Map<string, number>> =
      combineLatest(
          // Extract all relevant top-level event key names.
          this.sectors.pipe(
              map((sectors) => new Set(sectors.flatMap(
                      (sector) =>
                          sector.events.map((event) => event.keyName)))),
              ),
          this.events)
          .pipe(
              map(([eventKeyNames, eventDoc]) => {
                const countMap = new Map<string, number>();
                eventKeyNames.forEach((keyName) => {
                  countMap.set(
                      keyName,
                      countEvents(
                          lookupEventByName(keyName, eventDoc, true),
                          eventDoc));
                });
                return countMap;
              }),
              startWith(new Map()),
              shareReplay({bufferSize: 1, refCount: false}),
          );


  constructor(
      @Inject(SECTORS_TOKEN) private readonly sectors: Observable<Sector[]>,
      @Inject(EVENT_DATA_TOKEN) private readonly events:
          Observable<XMLDocument>,
  ) {}

  sectorChanged(change: MatButtonToggleChange): void {
    this.selectedSector.next(change.value);
  }
}

function countEvents(elem: Element, eventDoc: XMLDocument): number {
  if (elem.tagName === 'event') {
    const loadId = elem.getAttribute('load');
    if (loadId) {
      // Call this on the loaded event instead.
      return countEvents(lookupEventByName(loadId, eventDoc), eventDoc);
    }
    return 1;
  }
  if (elem.tagName !== 'eventList') {
    throw new Error(`Expected event or eventList, but got ${elem.tagName}.`);
  }

  return Array.from(elem.children)
      .reduce((count, el) => count + countEvents(el, eventDoc), 0);
}

function lookupEventByName(
    name: string, eventDoc: XMLDocument, favorEventList = false): Element {
  const eventList =
      eventDoc.querySelector(`${FTLTags.EVENT_LIST}[name="${name}"`);
  const event = eventDoc.querySelector(`${FTLTags.EVENT}[name="${name}"`);

  if (eventList && event) {
    return favorEventList ? eventList : event;
  }
  if (eventList) return eventList;
  if (event) return event;
  throw new Error(`Couldn't find ${name} event definition.`);
}

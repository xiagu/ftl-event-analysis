import {combineLatest, from, Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';

import {FTLTags} from './ftl_tags';
import {Sector} from './shared/models/sector';
import {xhrLoad} from './tools/xhr_load';

/** Filenames of all the event data files. */
const EVENT_FILES = [
  'dlcEvents',
  'dlcEvents_anaerobic',
  'dlcEventsOverwrite',
  'events',
  'events_boss',
  'events_crystal',
  'events_engi',
  'events_fuel',
  'events_mantis',
  'events_nebula',
  'events_pirate',
  'events_rebel',
  'events_rock',
  // Worryingly, we may need to track what events are possible from ship events.
  'events_ships',
  'events_slug',
  'events_zoltan',
  'newEvents',
];

export function eventDataFactory(): Observable<XMLDocument> {
  return combineLatest(
             EVENT_FILES.map(
                 (filename) => from(xhrLoad(`assets/data/${filename}.xml`))))
      .pipe(
          map((docs) => {
            const merged =
                document.implementation.createDocument(null, 'allEvents', null);
            merged.documentElement.append(
                ...docs.map((doc) => doc.documentElement))
            return merged;
          }),
          map((doc) => {
            // Remove the unused eventCounts node, because they're going to
            // confuse us.
            doc.querySelectorAll('eventCounts').forEach((el) => {
              el.remove();
            });
            return doc;
          }),
          shareReplay({bufferSize: 1, refCount: false}),
      );
}

export function sectorDataFactory(): Observable<XMLDocument> {
  return from(xhrLoad('assets/data/sector_data.xml'))
      .pipe(shareReplay({bufferSize: 1, refCount: false}));
}

const FULL_SECTOR_NAME = /^[a-z]+_(?<keyName>[A-Z_]+)$/;

/** Extract the map of sector keys to their readable text names. */
export function sectorNameMapFactory(): Observable<Map<string, string>> {
  return from(xhrLoad('assets/data/text_sectorname.xml'))
      .pipe(
          map((nameDoc) => Array.from(nameDoc.querySelectorAll(FTLTags.TEXT))),
          map((sectorNames) => {
            return sectorNames
                .map((elem) => [elem.getAttribute('name'), elem.textContent])
                .filter((mapping): mapping is[string, string] => !!mapping[0]);
          }),
          map((nameMapping) => {
            const map = new Map<string, string>();
            nameMapping.forEach(([attrName, humanReadableName]) => {
              const results = attrName.match(FULL_SECTOR_NAME);
              if (!results) return;
              map.set(results.groups!['keyName'], humanReadableName)
            });
            return map;
          }),
          shareReplay({bufferSize: 1, refCount: false}),
      );
}

/** Synthesize extracted sector information into one useful thing. */
export function sectorsFactory(
    data: Observable<XMLDocument>,
    nameMap: Observable<Map<string, string>>): Observable<Sector[]> {
  return combineLatest([data, nameMap])
      .pipe(
          map(([sectorDoc, nameMap]) => {
                  return Array
                      .from(sectorDoc.querySelectorAll(
                          FTLTags.SECTOR_DESCRIPTION))
                      .map((sector) => Sector(sector, nameMap))
                      .filter((sector): sector is Sector => !!sector)}),
          shareReplay({bufferSize: 1, refCount: false}),
      );
}

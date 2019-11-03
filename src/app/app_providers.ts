import {from, Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';

import {FTLTags} from './ftl_tags';
import {xhrLoad} from './tools/xhr_load';

export function sectorDataFactory(): Observable<XMLDocument> {
  return from(xhrLoad('/assets/data/sector_data.xml'))
      .pipe(shareReplay({bufferSize: 1, refCount: false}));
}

const FULL_SECTOR_NAME = /^[a-z]+_(?<keyName>[A-Z_]+)$/;

/** Extract the map of sector keys to their readable text names. */
export function sectorNameMapFactory(): Observable<Map<string, string>> {
  return from(xhrLoad('/assets/data/text_sectorname.xml'))
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

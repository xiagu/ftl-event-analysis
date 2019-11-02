import {from} from 'rxjs';
import {shareReplay} from 'rxjs/operators';

import {xhrLoad} from './tools/xhr_load';

export function sectorDataFactory() {
  return from(xhrLoad('/assets/data/sector_data.xml')).pipe(shareReplay());
}

import {from} from 'rxjs';

import {xhrLoad} from './tools/xhr_load';

export function sectorDataFactory() {
  return from(xhrLoad('/assets/data/sector_data.xml'));
}

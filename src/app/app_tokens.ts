import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

import {Sector} from './shared/models/sector';

export const EVENT_DATA_TOKEN =
    new InjectionToken<Observable<XMLDocument>>('EVENT_DATA');

export const SECTOR_DATA_TOKEN =
    new InjectionToken<Observable<XMLDocument>>('SECTOR_DATA');

export const SECTOR_NAME_MAP_TOKEN =
    new InjectionToken<Map<string, string>>('SECTOR_NAME_MAP');

export const SECTORS_TOKEN = new InjectionToken<Sector[]>('SECTORS');

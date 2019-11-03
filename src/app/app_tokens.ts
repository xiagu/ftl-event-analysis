import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

export const SECTOR_DATA_TOKEN =
    new InjectionToken<Observable<XMLDocument>>('SECTOR_DATA');

export const SECTOR_NAME_MAP_TOKEN =
    new InjectionToken<Map<string, string>>('SECTOR_NAME_MAP');

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AppComponent} from './app.component';
import {eventDataFactory, sectorDataFactory, sectorNameMapFactory, sectorsFactory} from './app_providers';
import {EVENT_DATA_TOKEN, SECTOR_DATA_TOKEN, SECTOR_NAME_MAP_TOKEN, SECTORS_TOKEN} from './app_tokens';
import {SectorStatsComponent} from './sector-stats/sector-stats.component';

@NgModule({
  declarations: [AppComponent, SectorStatsComponent],
  imports: [
    BrowserModule,
    CommonModule,  // AsyncPipe
    MatButtonToggleModule,
    BrowserAnimationsModule,
  ],
  providers: [
    {provide: EVENT_DATA_TOKEN, useFactory: eventDataFactory},
    {provide: SECTOR_DATA_TOKEN, useFactory: sectorDataFactory},
    {provide: SECTOR_NAME_MAP_TOKEN, useFactory: sectorNameMapFactory},
    {
      provide: SECTORS_TOKEN,
      deps: [SECTOR_DATA_TOKEN, SECTOR_NAME_MAP_TOKEN],
      useFactory: sectorsFactory,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}

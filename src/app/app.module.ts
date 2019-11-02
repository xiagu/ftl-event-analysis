import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {sectorDataFactory} from './app_providers';
import {SECTOR_DATA_TOKEN} from './app_tokens';
import { SectorStatsComponent } from './sector-stats/sector-stats.component';

@NgModule({
  declarations: [AppComponent, SectorStatsComponent],
  imports: [
    BrowserModule,
    CommonModule,  // AsyncPipe
  ],
  providers: [
    {provide: SECTOR_DATA_TOKEN, useFactory: sectorDataFactory},
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}

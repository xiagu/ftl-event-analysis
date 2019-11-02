import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AppComponent} from './app.component';
import {sectorDataFactory} from './app_providers';
import {SECTOR_DATA_TOKEN} from './app_tokens';
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
    {provide: SECTOR_DATA_TOKEN, useFactory: sectorDataFactory},
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}

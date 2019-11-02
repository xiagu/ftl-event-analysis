import {AfterViewInit, Component} from '@angular/core';

import {xhrLoad} from './tools/xhr_load';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'ftl-event-analysis';

  async ngAfterViewInit(): Promise<void> {
    const events = await xhrLoad('/assets/data/events.xml');
    console.log(events);
  }
}

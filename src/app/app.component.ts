import {Component} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {xhrLoad} from './tools/xhr_load';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ftl-event-analysis';
}

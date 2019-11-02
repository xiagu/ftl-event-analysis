import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SectorStatsComponent } from './sector-stats.component';

describe('SectorStatsComponent', () => {
  let component: SectorStatsComponent;
  let fixture: ComponentFixture<SectorStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SectorStatsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SectorStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

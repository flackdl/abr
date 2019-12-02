import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimateNotesComponent } from './estimate-notes.component';

describe('EstimateNotesComponent', () => {
  let component: EstimateNotesComponent;
  let fixture: ComponentFixture<EstimateNotesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EstimateNotesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EstimateNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

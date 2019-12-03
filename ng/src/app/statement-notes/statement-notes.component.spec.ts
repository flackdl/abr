import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StatementNotesComponent } from './statement-notes.component';

describe('StatementNotesComponent', () => {
  let component: StatementNotesComponent;
  let fixture: ComponentFixture<StatementNotesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StatementNotesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatementNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MainConcernComponent } from './main-concern.component';

describe('MainConcernComponent', () => {
  let component: MainConcernComponent;
  let fixture: ComponentFixture<MainConcernComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MainConcernComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainConcernComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

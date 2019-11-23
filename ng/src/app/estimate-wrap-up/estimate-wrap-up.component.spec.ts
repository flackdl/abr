import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimateWrapUpComponent } from './estimate-wrap-up.component';

describe('EstimateWrapUpComponent', () => {
  let component: EstimateWrapUpComponent;
  let fixture: ComponentFixture<EstimateWrapUpComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EstimateWrapUpComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EstimateWrapUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

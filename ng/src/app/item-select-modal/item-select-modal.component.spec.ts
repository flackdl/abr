import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemSelectModalComponent } from './item-select-modal.component';

describe('ItemSelectModalComponent', () => {
  let component: ItemSelectModalComponent;
  let fixture: ComponentFixture<ItemSelectModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ItemSelectModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemSelectModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

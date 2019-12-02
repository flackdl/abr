import { TestBed, async, inject } from '@angular/core/testing';

import { WizardGuard } from './wizard.guard';

describe('WizardGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WizardGuard]
    });
  });

  it('should ...', inject([WizardGuard], (guard: WizardGuard) => {
    expect(guard).toBeTruthy();
  }));
});

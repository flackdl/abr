import {WizardStepsService} from "../wizard-steps.service";
import { ApiService } from "../api.service";
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-estimate-notes',
  templateUrl: './estimate-notes.component.html',
  styleUrls: ['./estimate-notes.component.scss']
})
export class EstimateNotesComponent implements OnInit {

  constructor(
    public api: ApiService,
    public wizardSteps: WizardStepsService,
  ) { }

  ngOnInit() {
  }

  public changed(notes: string) {
    this.api.updateEstimateData({
      public_notes: notes,
    });
  }

  public submit() {
    this.wizardSteps.navigateToNextStep(this);
  }
}

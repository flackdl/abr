import {WizardStepsService} from "../wizard-steps.service";
import {ApiService} from "../api.service";
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-concern',
  templateUrl: './main-concern.component.html',
  styleUrls: ['./main-concern.component.scss']
})
export class MainConcernComponent implements OnInit {

  constructor(
    public api: ApiService,
    public router: Router,
    public wizardSteps: WizardStepsService,
  ) { }

  public question: string = 'What are the main concerns?';
  public inputType: string = 'textarea';
  public defaultAnswer: string = '';

  ngOnInit() {
    // populate value if it already exists in storage
    if (this.api.estimateData.main_concern) {
      this.defaultAnswer = this.api.estimateData.main_concern;
    }
  }

  public save(answer) {
    this.api.updateEstimateData({main_concern: answer});
    this.router.navigate([this.wizardSteps.nextStep(this)]);
  }
}

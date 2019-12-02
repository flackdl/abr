import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import { Component, OnInit } from '@angular/core';
import {WizardStepsService} from "../wizard-steps.service";

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {

  constructor(
    public api: ApiService,
    private router: Router,
    private wizardSteps: WizardStepsService,
  ) { }

  public reset() {
    this.api.clearEstimateData();
    this.router.navigate(['/wizard']);
  }

  ngOnInit() {
  }

}

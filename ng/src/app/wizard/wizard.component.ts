import { ToastrService } from 'ngx-toastr';
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
    private toastr: ToastrService,
  ) { }

  public reset() {
    this.api.clearEstimateData();
    this.router.navigate(['/wizard']);
  }

  ngOnInit() {
    if (this.api.errorState.errored) {
      this.toastr.error(this.api.errorState.message);
    }
  }

  public getQBOCustomerURL() {
    if (this.api.settings.is_debug) {
      return `https://c50.sandbox.qbo.intuit.com/app/customerdetail?nameId=${this.api.estimateData.customer_id}`;
    }
    return `https://c21.qbo.intuit.com/app/customerdetail?nameId=${this.api.estimateData.customer_id}`;
  }
}

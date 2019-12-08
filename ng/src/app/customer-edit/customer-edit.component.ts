import {Router} from "@angular/router";
import {WizardStepsService} from "../wizard-steps.service";
import {ApiService} from "../api.service";
import { ToastrService } from 'ngx-toastr';
import { Component, OnInit } from '@angular/core';
import {FormGroup} from "@angular/forms";

@Component({
  selector: 'app-customer-edit',
  templateUrl: './customer-edit.component.html',
  styleUrls: ['./customer-edit.component.scss']
})
export class CustomerEditComponent implements OnInit {
  public isLoading = false;
  public initial: any;

  constructor(
    public wizardSteps: WizardStepsService,
    public api: ApiService,
    private toastr: ToastrService,
    private router: Router,
  ) { }

  ngOnInit() {
    // populate initial data
    this.initial = {
      first_name: this.api.estimateData.first_name,
      last_name: this.api.estimateData.last_name,
      email: this.api.estimateData.email,
      phone: this.api.estimateData.phone,
      crm: this.api.estimateData.crm,
      address_line1: this.api.estimateData.address_line1,
      address_line2: this.api.estimateData.address_line2,
      city: this.api.estimateData.city,
      zip: this.api.estimateData.zip,
    };
  }

  public submit(form: FormGroup) {

    this.isLoading = true;
    // edit customer
    this.api.updateCustomer(this.api.estimateData.customer_id, form.value).subscribe(
      (data: any) => {
        this.toastr.success('Successfully updated customer');
        this.api.updateEstimateData(form.value);
        this.wizardSteps.navigateToFurthestStep();
        this.isLoading = false;
      }, (response) => {
        console.error(response);
        this.isLoading = false;
        if (response.error && response.error.message) {
          this.toastr.error(response.error.message);
        } else {
          this.toastr.error('An unknown error occurred');
        }
      }
    );
  }

}

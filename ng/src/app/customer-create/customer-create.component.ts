import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import {EstimateData} from "../estimate-data";
import {FormGroup} from "@angular/forms";

@Component({
  selector: 'app-customer-create',
  templateUrl: './customer-create.component.html',
  styleUrls: ['./customer-create.component.scss']
})
export class CustomerCreateComponent implements OnInit {
  public isLoading = false;

  constructor(
    private router: Router,
    public api: ApiService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
  }

  public submit(form: FormGroup) {

    this.isLoading = true;
    // create new customer
    this.api.createCustomer(form.value).subscribe(
      (data: any) => {
        this.toastr.success('Successfully created new customer');
        // update estimate data
        const estimateData: EstimateData = form.value;
        // add customer id
        estimateData.customer_id = data.Id;
        this.api.updateEstimateData(estimateData);
        this.router.navigate(['wizard', 'main-concern']).then(() => {
          this.isLoading = false;
        })
      }, (response) => {
        console.error(response);
        this.isLoading = false;
        if (response.error && response.error.message) {
          this.toastr.error(response.error.message);
        } else {
          this.toastr.error('An unknown error occurred');
        }
      }, () => {
      }
    );
  }
}

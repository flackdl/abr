import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {Router, ActivatedRoute} from "@angular/router";
import {EstimateData} from "../estimate-data";
import {FormGroup} from "@angular/forms";

@Component({
  selector: 'app-customer-create',
  templateUrl: './customer-create.component.html',
  styleUrls: ['./customer-create.component.scss']
})
export class CustomerCreateComponent implements OnInit {
  public isLoading = false;
  public initialValues: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public api: ApiService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {

    // populate any initial data from query params
    if (this.route.snapshot.queryParams['customerSearchValue']) {
      // try and split by first and last name
      const searchValueSplit = this.route.snapshot.queryParams['customerSearchValue'].split(' ');
      let firstName = '';
      let lastName = '';
      if (searchValueSplit.length === 1) {
        lastName = searchValueSplit[0];
      } else if (searchValueSplit.length > 1) {
        firstName = searchValueSplit[0];
        lastName = searchValueSplit.slice(1).join( ' ');
      }
      this.initialValues = {
        first_name: firstName,
        last_name: lastName,
      };
    }
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

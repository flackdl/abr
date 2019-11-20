import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {ApiService} from "../api.service";
import * as _ from 'lodash';

@Component({
  selector: 'app-customer-create',
  templateUrl: './customer-create.component.html',
  styleUrls: ['./customer-create.component.scss']
})
export class CustomerCreateComponent implements OnInit {
  public isLoading = false;
  public form: FormGroup;

  constructor(
    public api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: new FormControl('', [Validators.email, Validators.required]),
      phone: new FormControl('', [Validators.pattern(/^\d{10}$/), Validators.required]),
      crm: ['', Validators.required],
      billing_address: ['', Validators.required],
    });
  }

  public create() {
    // validate form
    this.api.markFormDirty(this.form);

    if (this.form.valid) {
      this.isLoading = true;
      // create new customer
      this.api.createCustomer(this.form.value).subscribe(
        (data) => {
          this.toastr.success('Successfully created new customer');
          // update estimate data
          _.assign(this.api.estimateData, this.form.value);
        }, (error) => {
          console.error(error);
          this.toastr.error('An unknown error occurred');
        }, () => {
          this.isLoading = false;
        }
      );
    } else {
      this.toastr.error('Invalid inputs');
    }
  }
}

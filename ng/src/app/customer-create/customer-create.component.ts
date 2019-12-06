import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {ApiService} from "../api.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-customer-create',
  templateUrl: './customer-create.component.html',
  styleUrls: ['./customer-create.component.scss']
})
export class CustomerCreateComponent implements OnInit {
  public isLoading = false;
  public form: FormGroup;

  constructor(
    private router: Router,
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
      address_line1: [''],
      address_line2: [''],
      city: [''],
      zip: ['', Validators.required],
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
          this.api.updateEstimateData(this.form.value);
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
    } else {
      this.toastr.error('Invalid form');
    }
  }
}

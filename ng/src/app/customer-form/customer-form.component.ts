import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {ApiService} from "../api.service";

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent implements OnInit {
  public form: FormGroup;
  @Output('validSubmit') submitted = new EventEmitter<FormGroup>();
  @Input('initial') initial: any = {};

  constructor(
    private fb: FormBuilder,
    public api: ApiService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {

    this.initial = this.initial || {};

    // remove non-digits from phone
    let phone = this.initial.phone || '';
    phone = phone.replace(/\D/g,'');

    // populate with any initial values
    this.form = this.fb.group({
      first_name: [this.initial.first_name, Validators.required],
      last_name: [this.initial.last_name, Validators.required],
      email: new FormControl(this.initial.email, [Validators.email, Validators.required]),
      phone: new FormControl(phone, [Validators.pattern(/^\d{10}$/), Validators.required]),
      crm: [this.initial.crm, Validators.required],
      address_line1: [this.initial.address_line1],
      address_line2: [this.initial.address_line2],
      city: [this.initial.city],
      zip: [this.initial.zip, Validators.required],
    });
  }

  public submit() {
    // validate form
    this.api.markFormDirty(this.form);

    if (this.form.valid) {
      this.submitted.emit(this.form);
    } else {
      this.toastr.error('Invalid form');
    }
  }

}

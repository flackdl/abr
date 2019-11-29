import {Router} from "@angular/router";
import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';


@Component({
  selector: 'app-estimate-wrap-up',
  templateUrl: './estimate-wrap-up.component.html',
  styleUrls: ['./estimate-wrap-up.component.scss']
})
export class EstimateWrapUpComponent implements OnInit {
  public form: FormGroup;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
  ) { }

  ngOnInit() {

    this.form = this.fb.group({
      expiration_date: [this.api.estimateData.expiration_date, Validators.required],
      expiration_time: [this.api.estimateData.expiration_time, Validators.required],
      tag_number: [this.api.estimateData.tag_number, Validators.required],
      employee_initials: [this.api.estimateData.employee_initials, Validators.required],
      need_parts: [this.api.estimateData.need_parts, Validators.required],
      parts_in_inventory: [this.api.estimateData.parts_in_inventory],  // conditionally required if need_parts is true
    });

    // update estimate data in local storage on update
    this.form.valueChanges.subscribe((data) => {
      this.api.updateEstimateData(this.form.value);
    });
  }

  public submit() {
    // mark form dirty
    this.api.markFormDirty(this.form);

    // toggle "parts in inventory" question if parts need to be ordered or not
    if (this.form.value.need_parts) {
      this.form.get('parts_in_inventory').setValidators(Validators.required);
      this.form.get('parts_in_inventory').updateValueAndValidity();
    } else {
      this.form.get('parts_in_inventory').clearValidators();
    }

    if (!this.form.valid) {
      this.toastr.error('Invalid form');
      return;
    }

    this.router.navigate(['/wizard', 'review']);
  }

}

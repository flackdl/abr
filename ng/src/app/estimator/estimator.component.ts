import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import * as moment from 'moment';

@Component({
  selector: 'app-estimator',
  templateUrl: './estimator.component.html',
  styleUrls: ['./estimator.component.scss']
})
export class EstimatorComponent implements OnInit {
  public isLoading = true;
  public signature: any;
  public form: FormGroup;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
  ) {
  }

  ngOnInit() {

    this.form = this.fb.group({
      status: ['', Validators.required],
      email: ['', Validators.email],
      phone: ['', Validators.pattern(/^\d{10}$/)],
      crm: ['', Validators.required],
      billingAddress: ['', Validators.required],
      estimateDate: [moment().format('YYYY-MM-DD'), Validators.required],
      expirationDate: ['', Validators.required],
      expirationTime: ['', Validators.required],
      bikeModel: ['', Validators.required],
      tagNumber: ['', Validators.required],
    });

    this.signature = new SignaturePad(this.signatureEl.nativeElement);
  }

  public createEstimate() {

    // mark all controls as dirty to force validation
    Object.keys(this.form.controls).forEach(field => {
      this.form.get(field).markAsDirty();
    });

    if (this.form.valid) {
      const data = {
        // TODO
        // customer_id: this.customer-search.Id,
        status: this.form.get('status').value,
        tag_number: this.form.get('tagNumber').value,
        bike_model: this.form.get('bikeModel').value,
        crm: this.form.get('crm').value,
        estimate_date: this.form.get('estimateDate').value,
        expiration_date: this.form.get('expirationDate').value,
        expiration_time: this.form.get('expirationTime').value,
      };
      this.api.createEstimate(data).subscribe((data) => {
        // TODO
        console.log(data);
      });
    }
  }
}

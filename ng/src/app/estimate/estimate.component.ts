import { ToastrService } from 'ngx-toastr';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import * as moment from 'moment';

@Component({
  selector: 'app-estimator',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  public isLoading = false;
  public signature: any;
  public form: FormGroup;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) {
  }

  ngOnInit() {

    this.form = this.fb.group({
      status: ['', Validators.required],
      estimate_date: [moment().format('YYYY-MM-DD'), Validators.required],
      expiration_date: ['', Validators.required],
      expiration_time: ['', Validators.required],
      tag_number: ['', Validators.required],
    });

    this.signature = new SignaturePad(this.signatureEl.nativeElement);
  }

  public createEstimate() {

    // mark all controls as dirty to force validation
    Object.keys(this.form.controls).forEach(field => {
      this.form.get(field).markAsDirty();
    });

    if (this.form.valid) {
      this.api.createEstimate(this.form.value).subscribe((data) => {
        // TODO
        console.log(data);
      }, (error) => {
        this.toastr.error('An unknown error occurred');
      });
    }
  }
}

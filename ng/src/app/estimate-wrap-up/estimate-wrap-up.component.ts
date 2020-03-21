import SignaturePad from "signature_pad";
import {WizardStepsService} from "../wizard-steps.service";
import {Router} from "@angular/router";
import { ToastrService } from 'ngx-toastr';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

import * as moment from 'moment';


@Component({
  selector: 'app-estimate-wrap-up',
  templateUrl: './estimate-wrap-up.component.html',
  styleUrls: ['./estimate-wrap-up.component.scss']
})
export class EstimateWrapUpComponent implements OnInit {
  public form: FormGroup;
  public signature: SignaturePad;
  public signatureValid = true;

  @ViewChild("signatureEl", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    public wizardSteps: WizardStepsService,
  ) { }

  ngOnInit() {

    this.signature = new SignaturePad(this.signatureEl.nativeElement,
      {
        backgroundColor: "white",  // sets non-transparent background and saves as a jpg
        onEnd: () => {
          this.signatureValid = true;
          this.formChanges(this.form.value);
        }
      });
    if (this.api.estimateData.signature) {
      this.signature.fromDataURL(this.api.estimateData.signature);
    }

    this.form = this.fb.group({
      expiration_date: [this.api.estimateData.expiration_date, Validators.required],
      expiration_time: [this.api.estimateData.expiration_time || '18:00', Validators.required],
      tag_number: [this.api.estimateData.tag_number, Validators.required],
      employee_initials: [this.api.estimateData.employee_initials, Validators.required],
      waiting_on_approval: [this.api.estimateData.waiting_on_approval, Validators.required],
      need_parts: [this.api.estimateData.need_parts, Validators.required],
      parts_in_inventory: [this.api.estimateData.parts_in_inventory],  // conditionally required if need_parts is true
      waiting_on_customer_bring_parts: [this.api.estimateData.waiting_on_customer_bring_parts, Validators.required],
      contact_method: [this.api.estimateData.contact_method, Validators.required],
      payment_option: [this.api.estimateData.payment_option, Validators.required],
      bike_model: [this.api.estimateData.bike_model, Validators.required],
    });

    // update estimate data in local storage on update
    this.form.valueChanges.subscribe((data) => {
      this.formChanges(data);
    });

    // toggle "parts in inventory" based on "need parts"
    this.form.get('need_parts').valueChanges.subscribe((value) => {
      if (!value) {
        this.form.get('parts_in_inventory').disable();
      } else {
        this.form.get('parts_in_inventory').enable();
      }
    });

  }

  public submit() {
    this.signatureValid = !this.signature.isEmpty();

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

    this.router.navigate([this.wizardSteps.nextStep(this)]);
  }

  public formChanges(data: any) {
    // overwrite signature with data url
    if (!this.signature.isEmpty()) {
      data['signature'] = this.signature.toDataURL();
    }

    if (data.waiting_on_approval || data.waiting_on_customer_bring_parts || data.need_parts) {
      data['status'] = 'Pending';
    } else {
      data['status'] = 'Accepted';
    }

    this.api.updateEstimateData(data);
  }

  public clearSignature() {
    this.signatureValid = false;
    this.signature.clear();
    this.api.updateEstimateData({
      signature: '',
    });
  }

}

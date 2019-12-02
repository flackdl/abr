import {WizardStepsService} from "../wizard-steps.service";
import { ToastrService } from 'ngx-toastr';
import {Router} from "@angular/router";
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-review',
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.scss']
})
export class ReviewComponent implements OnInit {
  public signature: SignaturePad;
  public form: FormGroup;
  public signatureValid = true;

  @ViewChild("signatureEl", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private router: Router,
    private fb: FormBuilder,
    private toastr: ToastrService,
    public wizardSteps: WizardStepsService,
  ) { }

  ngOnInit() {

    this.signature = new SignaturePad(this.signatureEl.nativeElement,
      {
        onEnd: () => {
          this.signatureValid = true;
          this.formChanges(this.form.value);
        }
      });

    if (this.api.estimateData.signature) {
      this.signature.fromDataURL(this.api.estimateData.signature);
    }

    this.signatureValid = !this.signature.isEmpty();

    this.form = this.fb.group({
      review_ok: [this.api.estimateData.review_ok, Validators.required],
      contact_method: [this.api.estimateData.contact_method, Validators.required],
    });

    this.form.valueChanges.subscribe(
      (data) => {
        this.formChanges(data);
      },
    )
  }

  public formChanges(data) {
    // overwrite signature with data url
    data['signature'] = this.signature.toDataURL();
    this.api.updateEstimateData(data);
  }

  public clearSignature() {
    this.signatureValid = false;
    this.signature.clear();
    this.api.updateEstimateData({
      signature: '',
    });
  }

  public submit() {

    this.api.markFormDirty(this.form);

    if (!this.form.valid || !this.signatureValid) {
      this.toastr.error('Invalid form');
      return;
    }
    this.router.navigate([this.wizardSteps.nextStep(this)]);
  }
}

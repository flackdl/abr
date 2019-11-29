import { ToastrService } from 'ngx-toastr';
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

  @ViewChild("signatureEl", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
    this.signature = new SignaturePad(this.signatureEl.nativeElement);
    if (this.api.estimateData.signature) {
      this.signature.fromDataURL(this.api.estimateData.signature);
    }

    this.form = this.fb.group({
      review_ok: [this.api.estimateData.review_ok, Validators.required],
      contact_method: [this.api.estimateData.contact_method, Validators.required],
    });
  }

  public clearSignature() {
    this.signature.clear();
    delete this.api.estimateData.signature;
    this.api.updateEstimateData();
  }

  public submit() {
    console.log(this.signature);
    console.log(this.form);

    this.api.markFormDirty(this.form);

    if (!this.form.valid || this.signature.isEmpty()) {
      this.toastr.error('Invalid form');
      return;
    }

    this.api.updateEstimateData({
      signature: this.signature.toDataURL(),
    });
  }
}

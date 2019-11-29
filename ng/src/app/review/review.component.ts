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
  public signature: any;
  public form: FormGroup;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
  ) { }

  ngOnInit() {
    this.signature = new SignaturePad(this.signatureEl.nativeElement);

    this.form = this.fb.group({
      review_ok: [this.api.estimateData.review_ok, Validators.required],
      contact_method: [this.api.estimateData.contact_method, Validators.required],
    });
  }
}

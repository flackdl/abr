import { ToastrService } from 'ngx-toastr';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import SignaturePad from "signature_pad";
import * as moment from "moment";


@Component({
  selector: 'app-estimate-wrap-up',
  templateUrl: './estimate-wrap-up.component.html',
  styleUrls: ['./estimate-wrap-up.component.scss']
})
export class EstimateWrapUpComponent implements OnInit {
  public signature: any;
  public form: FormGroup;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {

    this.signature = new SignaturePad(this.signatureEl.nativeElement);

    this.form = this.fb.group({
      status: ['', Validators.required],
      estimate_date: [moment().format('YYYY-MM-DD'), Validators.required],
      expiration_date: ['', Validators.required],
      expiration_time: ['', Validators.required],
      tag_number: ['', Validators.required],
    });
  }

  public submit() {
    console.log(this.form);
  }

}

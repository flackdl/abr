import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";

@Component({
  selector: 'app-estimator',
  templateUrl: './estimator.component.html',
  styleUrls: ['./estimator.component.scss']
})
export class EstimatorComponent implements OnInit {
  public signature: any;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor() {
  }

  ngOnInit() {
    this.signature = new SignaturePad(this.signatureEl.nativeElement);
  }

}

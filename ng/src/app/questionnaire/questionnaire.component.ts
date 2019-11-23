import {ToastrService} from "ngx-toastr";
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-questionnaire',
  templateUrl: './questionnaire.component.html',
  styleUrls: ['./questionnaire.component.scss']
})
export class QuestionnaireComponent implements OnInit {
  public form: FormGroup;
  public QUALITY_GOOD = 'good';
  public QUALITY_OK = 'ok';
  public QUALITY_BAD = 'bad';
  public qualityRadioChoices = [this.QUALITY_GOOD, this.QUALITY_OK, this.QUALITY_BAD];
  public qualityRadioChoiceRows = [
    ['Chain Wear', 'Hanger'],
    ['Cassette/Freewheel', 'Chainrings'],
    ['Rear DER cable', 'Front DER cable'],
    ['Rear DER', 'Front DER'],
    ['RR Brake Cable', 'FT Brake Cable'],
    ['Rear Brake', 'Front Brake'],
    ['Rear Tire', 'Front Tire'],
  ];
  public serviceBooleanQuestions = [
    {name: "Overhauled bottom bracket in the past year?", required: true},
    {name: "Overhauled headset in the past year?", required: true},
    {name: "Bled disc breaks in the last year?", required: false},
    {name: "Sealant in the past 3 months?", required: false},
    {name: "Suspension service in the past year?", required: false},
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private router: Router,
  ) { }

  ngOnInit() {

    const qualityGroup = {};
    const serviceGroup = {};

    // build form
    this.qualityRadioChoiceRows.forEach((row) => {
      row.forEach((name) => {
        qualityGroup[name] = [this.getExistingQuality(name), Validators.required];
      });
    });

    this.serviceBooleanQuestions.forEach((option) => {
      serviceGroup[option.name] = [this.getExistingService(option.name), option.required ? Validators.required : false];
    });
    this.form = this.fb.group({
      bike_model: [this.getExistingBikeModel(), Validators.required],
      qualities: this.fb.group(qualityGroup),
      services: this.fb.group(serviceGroup),
    });
  }

  public getExistingBikeModel() {
    if (this.api.estimateData.questionnaire && this.api.estimateData.questionnaire.bike_model) {
      return this.api.estimateData.questionnaire.bike_model;
    }
    return null;
  }

  public getExistingService(item: string) {
    if (this.api.estimateData.questionnaire && this.api.estimateData.questionnaire.services) {
      return this.api.estimateData.questionnaire.services[item];
    }
    return null;
  }

  public getExistingQuality(item: string) {
    if (this.api.estimateData.questionnaire && this.api.estimateData.questionnaire.qualities) {
      return this.api.estimateData.questionnaire.qualities[item];
    }
    return null;
  }

  public create() {
    // mark all inputs as dirty then validate
    this.form.get('bike_model').markAsDirty();
    Object.keys((this.form.controls['qualities'] as FormGroup).controls).forEach((key) => {
      const input = this.form.get('qualities').get(key);
      input.markAsDirty();
    });
    Object.keys((this.form.controls['services'] as FormGroup).controls).forEach((key) => {
      const input = this.form.get('services').get(key);
      input.markAsDirty();
    });

    if (this.form.valid) {
      this.api.updateEstimateData({
        questionnaire: this.form.value,
      });
      this.router.navigate(['/wizard', 'estimate']);
    } else {
      this.toastr.error('Invalid form');
    }
  }

  public isQualityDirty(quality: string): boolean {
    const input = this.form.get('qualities').get(quality);
    return input.dirty;
  }

  public isQualityValid(quality: string): boolean {
    const input = this.form.get('qualities').get(quality);
    return input.valid;
  }

}

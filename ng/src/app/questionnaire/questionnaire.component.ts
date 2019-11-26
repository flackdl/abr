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
  public qualityAssessments: any[] = [];
  public servicedAssessments: any[] = [];
  public qualityChoices = [this.QUALITY_GOOD, this.QUALITY_OK, this.QUALITY_BAD];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private router: Router,
  ) { }

  ngOnInit() {

    // quality questions
    this.qualityAssessments = this.api.categoryAssessments.filter((assessment) => {
      return assessment.type === 'quality';
    });

    // serviced questions
    this.servicedAssessments = this.api.categoryAssessments.filter((assessment) => {
      return assessment.type === 'serviced';
    });

    const qualityGroup = {};
    const serviceGroup = {};

    // build assessment form controls
    this.qualityAssessments.forEach((assessment) => {
        qualityGroup[assessment.name] = [this.getExistingQuality(assessment.name), Validators.required];
    });
    this.servicedAssessments.forEach((assessment) => {
      serviceGroup[assessment.name] = [this.getExistingService(assessment.name), assessment.required ? Validators.required : false];
    });

    this.form = this.fb.group({
      bike_model: [this.getExistingBikeModel(), Validators.required],
      qualities: this.fb.group(qualityGroup),
      services: this.fb.group(serviceGroup),
    });

    this.form.valueChanges.subscribe((data) => {
      this.api.updateEstimateData({
        questionnaire: this.form.value,
      });
    })
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

  public submit() {

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

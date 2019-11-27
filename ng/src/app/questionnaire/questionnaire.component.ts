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
  public ASSESSMENT_GOOD = 'good';
  public ASSESSMENT_OK = 'ok';
  public ASSESSMENT_BAD = 'bad';
  public assessmentChoices = [this.ASSESSMENT_GOOD, this.ASSESSMENT_OK, this.ASSESSMENT_BAD];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private router: Router,
  ) { }

  ngOnInit() {

    const assessmentGroup = {};

    // build assessment form controls
    this.api.categories.forEach((category) => {
        assessmentGroup[category.name] = [this.getExistingAssessment(category.name), Validators.required];
    });

    this.form = this.fb.group({
      bike_model: [this.getExistingBikeModel(), Validators.required],
      assessments: this.fb.group(assessmentGroup),
    });

    this.form.valueChanges.subscribe((data) => {
      this.api.updateEstimateData(this.form.value);
    })
  }

  public getExistingBikeModel() {
    if (this.api.estimateData.assessments && this.api.estimateData.bike_model) {
      return this.api.estimateData.bike_model;
    }
    return null;
  }

  public getExistingAssessment(category: string) {
    if (this.api.estimateData.assessments && this.api.estimateData.assessments[category]) {
      return this.api.estimateData.assessments[category];
    }
    return null;
  }

  public submit() {

    // mark all inputs as dirty then validate
    this.form.get('bike_model').markAsDirty();
    Object.keys((this.form.controls['assessments'] as FormGroup).controls).forEach((key) => {
      const input = this.form.get('assessments').get(key);
      input.markAsDirty();
    });

    if (this.form.valid) {
      this.router.navigate(['/wizard', 'estimate']);
    } else {
      this.toastr.error('Invalid form');
    }
  }

  public isAssessmentInputDirty(assessment: string): boolean {
    const input = this.form.get('assessments').get(assessment);
    return input.dirty;
  }

  public isAssessmentInputValid(assessment: string): boolean {
    const input = this.form.get('assessments').get(assessment);
    return input.valid;
  }
}

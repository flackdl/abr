import {ToastrService} from "ngx-toastr";
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {WizardStepsService} from "../wizard-steps.service";

@Component({
  selector: 'app-questionnaire',
  templateUrl: './questionnaire.component.html',
  styleUrls: ['./questionnaire.component.scss']
})
export class QuestionnaireComponent implements OnInit {
  public form: FormGroup;
  public assessmentChoices = [this.api.ASSESSMENT_GOOD, this.api.ASSESSMENT_OK, this.api.ASSESSMENT_BAD, this.api.ASSESSMENT_NA];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private router: Router,
    public wizardSteps: WizardStepsService,
  ) { }

  ngOnInit() {

    const assessmentGroup = {};

    // build assessment form controls
    this.getAssessmentCategories().forEach((category) => {
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

  public getAssessmentCategories() {
    return this.api.categories.filter((cat) => {
      return cat.show_in_assessment && !cat.service_only;
    });
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
      this.router.navigate([this.wizardSteps.nextStep(this)]);
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

  public setAssessmentAll(assessment: string) {
    Object.keys((this.form.controls['assessments'] as FormGroup).controls).forEach((key) => {
      const input = this.form.get('assessments').get(key);
      input.setValue(assessment);
    });
  }
}

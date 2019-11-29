import {ApiService} from "../api.service";
import {Router} from "@angular/router";
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  public steps = [
    {name: "Customer", url: "/wizard/customer", complete: () => { return this.stepCustomerComplete() }},
    {name: "Main Concern", url: "/wizard/main-concern", complete: () => { return this.stepMainConcernComplete() }},
    {name: "Assessment", url: "/wizard/questionnaire",  complete: () => { return this.stepQuestionnaireComplete() }},
    {name: "Estimate", url: "/wizard/estimate",  complete: () => { return this.stepEstimateComplete() }},
    {name: "Wrap Up", url: "/wizard/wrap-up",  complete: () => { return this.stepWrapUpComplete() }},
    {name: "Review", url: "/wizard/review",  complete: () => { return this.stepReviewComplete() }},
    {name: "Notes", url: "TODO",  complete: () => false},
  ];

  constructor(
    public api: ApiService,
    private router: Router,
  ) { }

  public reset() {
    this.api.clearEstimateData();
    this.router.navigate(['/wizard']);
  }

  public stepCustomerComplete(): boolean {
    return this.api.hasCurrentCustomer();
  }

  public stepMainConcernComplete(): boolean {
    return this.api.hasMainConcern();
  }

  public stepQuestionnaireComplete(): boolean {
    return this.api.hasQuestionnaire();
  }

  public stepEstimateComplete(): boolean {
    return this.api.hasEstimate();
  }

  public stepWrapUpComplete(): boolean {
    return this.api.hasEstimateWrapUp();
  }

  public stepReviewComplete(): boolean {
    return this.api.hasReview();
  }

  ngOnInit() {
  }

}

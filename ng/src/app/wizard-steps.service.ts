import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {CustomerSearchComponent} from "./customer-search/customer-search.component";
import {MainConcernComponent} from "./main-concern/main-concern.component";
import {QuestionnaireComponent} from "./questionnaire/questionnaire.component";
import {EstimateComponent} from "./estimate/estimate.component";
import {EstimateWrapUpComponent} from "./estimate-wrap-up/estimate-wrap-up.component";
import {ReviewComponent} from "./review/review.component";
import {EstimateNotesComponent} from "./estimate-notes/estimate-notes.component";

@Injectable({
  providedIn: 'root'
})
export class WizardStepsService {

  constructor(
    public api: ApiService,
  ) {}

  public steps = [
    {name: "Customer", component: CustomerSearchComponent, url: "/wizard/customer/search", complete: () => { return this.api.hasCurrentCustomer() }},
    {name: "Main Concern", component: MainConcernComponent, url: "/wizard/main-concern", complete: () => { return this.api.hasMainConcern() }},
    {name: "Assessment", component: QuestionnaireComponent, url: "/wizard/questionnaire",  complete: () => { return this.api.hasQuestionnaire() }},
    {name: "Estimate", component: EstimateComponent, url: "/wizard/estimate",  complete: () => { return this.api.hasEstimate() }},
    {name: "Wrap Up", component: EstimateWrapUpComponent, url: "/wizard/wrap-up",  complete: () => { return this.api.hasEstimateWrapUp() }},
    {name: "Review", component: ReviewComponent, url: "/wizard/review",  complete: () => { return this.api.hasReview() }},
    {name: "Notes", component: EstimateNotesComponent, url: "/wizard/notes",  complete: () => { return this.api.hasNotes() }},
  ];

  public canEnter(step: any): boolean {
    const matchIndex = this.steps.findIndex((s) => {
      return step.name === s.name;
    });
    if (matchIndex !== -1) {
      if (matchIndex === 0) {
        return true;
      }
      // can enter if the previous is complete
      return this.steps[matchIndex - 1].complete();
    }
    return false;
  }

  public nextStep(componentInstance: any) {
    const matchingIndex = this.steps.findIndex((step) => {
      return componentInstance instanceof step.component;
    });
    if (matchingIndex !== -1 && this.steps.length >= matchingIndex + 1) {
      return this.steps[matchingIndex + 1].url;
    }
  }

}

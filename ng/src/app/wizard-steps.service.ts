import {Router} from "@angular/router";
import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {CustomerSearchComponent} from "./customer-search/customer-search.component";
import {MainConcernComponent} from "./main-concern/main-concern.component";
import {QuestionnaireComponent} from "./questionnaire/questionnaire.component";
import {EstimateComponent} from "./estimate/estimate.component";
import {EstimateWrapUpComponent} from "./estimate-wrap-up/estimate-wrap-up.component";
import {EstimateNotesComponent} from "./estimate-notes/estimate-notes.component";
import {StatementNotesComponent} from "./statement-notes/statement-notes.component"

@Injectable({
  providedIn: 'root'
})
export class WizardStepsService {

  constructor(
    public api: ApiService,
    private router: Router,
  ) {}

  public steps = [
    {name: "Customer", component: CustomerSearchComponent, url: "/wizard/customer/search", complete: () => { return this.api.hasCurrentCustomer() }},
    {name: "Main Concern", component: MainConcernComponent, url: "/wizard/main-concern", complete: () => { return this.api.hasMainConcern() }},
    {name: "Assessment", component: QuestionnaireComponent, url: "/wizard/questionnaire",  complete: () => { return this.api.hasQuestionnaire() }},
    {name: "Estimate", component: EstimateComponent, url: "/wizard/estimate",  complete: () => { return this.api.hasEstimate() }},
    {name: "Wrap Up", component: EstimateWrapUpComponent, url: "/wizard/wrap-up",  complete: () => { return this.api.hasEstimateWrapUp() }},
    {name: "Estimate Notes", component: EstimateNotesComponent, url: "/wizard/estimate-notes",  complete: () => { return this.api.hasEstimateNotes() }},
    {name: "Statement Notes", component: StatementNotesComponent, url: "/wizard/statement-notes",  complete: () => { return this.api.hasStatementNotes() }},
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

  public navigateToNextStep(componentInstance: any) {
    this.router.navigate([this.nextStep(componentInstance)]);
  }

  public navigateToFurthestStep() {
    let step = this.steps.find((step) => {
      return !step.complete();
    });
    if (!step) {
      // last step
      step = this.steps[this.steps.length];
    }
    // navigate to the furthest step or the last
    this.router.navigate([step.url]);
  }

  public nextStep(componentInstance: any): string {
    const matchingIndex = this.steps.findIndex((step) => {
      return componentInstance instanceof step.component;
    });
    if (matchingIndex !== -1 && this.steps.length >= matchingIndex + 1) {
      return this.steps[matchingIndex + 1].url;
    }
  }

}

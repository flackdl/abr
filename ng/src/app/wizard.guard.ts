import {Router} from "@angular/router";
import { Injectable } from '@angular/core';
import { CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import {MainConcernComponent} from "./main-concern/main-concern.component";
import {ApiService} from "./api.service";
import { ToastrService } from 'ngx-toastr';
import {WizardStepsService} from './wizard-steps.service';

@Injectable({
  providedIn: 'root'
})
export class WizardGuard implements CanActivateChild {
  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private router: Router,
    private wizardSteps: WizardStepsService,
    ) {
  }
  canActivateChild(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    let success = true;
    let returnPath;

    if (next.component === MainConcernComponent) {
      const stepIndex = this.wizardSteps.steps.findIndex((step) => {
        return step.component === next.component;
      });
      if (stepIndex !== 0 && stepIndex !== -1) {
        success = this.wizardSteps.steps[stepIndex - 1].complete();
        returnPath = [this.wizardSteps.steps[stepIndex - 1].url];
      }
    }

    if (!success) {
      this.router.navigate(returnPath || '/wizard');
      return false;
    }

    return true;
  }

}

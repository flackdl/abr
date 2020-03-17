import {Router} from "@angular/router";
import { ToastrService } from 'ngx-toastr';
import {WizardStepsService} from "../wizard-steps.service";
import { ApiService } from "../api.service";
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-statement-notes',
  templateUrl: './statement-notes.component.html',
  styleUrls: ['./statement-notes.component.scss']
})
export class StatementNotesComponent implements OnInit {
  public isLoading = false;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    public api: ApiService,
    public wizardSteps: WizardStepsService,
  ) { }

  ngOnInit() {
  }

  public change(notes: string) {
    this.api.updateEstimateData({
      private_notes: notes,
    });
  }

  public submit(keepEstimateDataOnSuccess?: boolean) {
    this.isLoading = true;
    this.api.createEstimate(this.api.estimateData, keepEstimateDataOnSuccess).subscribe(
      (data) => {
        this.isLoading = false;
        this.toastr.success('Successfully created estimate');
        this.router.navigate(['/wizard']);
      }, (error) => {
        this.toastr.error('An unknown error occurred');
      }
    );
  }
}

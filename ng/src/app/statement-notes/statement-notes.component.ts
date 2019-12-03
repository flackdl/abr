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

  constructor(
    private router: Router,
    private toastr: ToastrService,
    public api: ApiService,
    public wizardSteps: WizardStepsService,
  ) { }

  ngOnInit() {
  }

  public submit(notes: string) {
    this.api.updateEstimateData({
      private_notes: notes,
    });
    console.log('all done');
    this.api.createEstimate(this.api.estimateData).subscribe(
      (data) => {
        this.toastr.success('Successfully created estimate');
        // TODO - clear local storage
        this.router.navigate(['/wizard']);
      }, (error) => {
        this.toastr.error('An unknown error occurred');
      }
    );
  }
}

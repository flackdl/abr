import {ApiService} from "../api.service";
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-concern',
  templateUrl: './main-concern.component.html',
  styleUrls: ['./main-concern.component.scss']
})
export class MainConcernComponent implements OnInit {

  constructor(
    public api: ApiService,
    public router: Router,
  ) { }

  public question: string = 'What are the main concerns?';
  public inputType: string = 'textarea';

  public save(answer) {
    this.api.updateEstimateData({main_concern: answer});
    this.router.navigate(['/wizard', 'questionnaire'])
  }

  ngOnInit() {
  }

}

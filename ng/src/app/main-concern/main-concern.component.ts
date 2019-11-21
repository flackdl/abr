import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-main-concern',
  templateUrl: './main-concern.component.html',
  styleUrls: ['./main-concern.component.scss']
})
export class MainConcernComponent implements OnInit {

  constructor() { }

  public question: string = 'What are the main concerns?';
  public input: string = 'textarea';

  ngOnInit() {
  }

}

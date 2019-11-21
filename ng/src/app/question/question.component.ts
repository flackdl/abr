import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormControl, Validators} from "@angular/forms";


@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss']
})
export class QuestionComponent implements OnInit {
  @Input('question') question: string;
  @Input('inputType') inputType: string;
  @Output() answer = new EventEmitter<string>();

  public input: FormControl;

  constructor() {
    this.input = new FormControl('', Validators.required);
  }

  ngOnInit() {
  }

  submit() {
    this.input.markAsDirty();
    if (!this.input.valid) {
      return;
    }
    this.answer.emit(this.input.value);
  }

}

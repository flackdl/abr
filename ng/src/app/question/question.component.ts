import {Component, EventEmitter, Input, OnInit, Output, OnChanges} from '@angular/core';
import {FormControl, Validators} from "@angular/forms";
import {SimpleChanges} from "@angular/core";


@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss']
})
export class QuestionComponent implements OnInit, OnChanges {
  @Input('question') question: string;
  @Input('inputType') inputType: string;
  @Input('defaultAnswer') defaultAnswer: string = '';
  @Input('submitButtonClass') submitButtonClass: string = 'btn-primary';
  @Input('submitButtonLabel') submitButtonLabel: string = 'Next';
  @Input('required') required = true;
  @Output() submitted = new EventEmitter<string>();
  @Output() changed = new EventEmitter<string>();

  public input: FormControl;

  constructor() {
    this.input = new FormControl('', this.required ? Validators.required : null);
    this.input.valueChanges.subscribe((data) => {
      this.changed.emit(data);
    })
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.defaultAnswer) {
      this.input.setValue(changes.defaultAnswer.currentValue);
      this.input.setValidators(this.required ? Validators.required : null);
    }
  }

  submit() {
    this.input.markAsDirty();
    if (!this.input.valid) {
      return;
    }
    this.submitted.emit();
  }

}

import {Component, Input, OnInit} from '@angular/core';
import {Item} from "../estimate-data";

@Component({
  selector: 'app-item-dropdown',
  templateUrl: './item-dropdown.component.html',
  styleUrls: ['./item-dropdown.component.scss']
})
export class ItemDropdownComponent implements OnInit {
  @Input('item') item: Item;

  constructor() { }

  ngOnInit() {
  }

}

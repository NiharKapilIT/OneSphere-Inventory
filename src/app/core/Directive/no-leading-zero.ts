import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appNoLeadingZero]'
})
export class NoLeadingZeroDirective {

  constructor(private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: any): void {
    let value = event.target.value;

    // Remove leading zeros
    if (value.length > 1 && value.startsWith('0')) {
      value = value.replace(/^0+/, '');
    }

    // If only "0" entered, clear it
    if (value === '0') {
      value = '';
    }

    this.control.control?.setValue(value, { emitEvent: false });
    event.target.value = value;
  }
}
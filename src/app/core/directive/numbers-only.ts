import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[numbersOnly]'
})
export class NumbersOnlyDirective {

  constructor(private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: any): void {
    let value = event.target.value;

    // Allow only numbers
    value = value.replace(/[^0-9]/g, '');

    // Remove leading zero
    if (value.startsWith('0')) {
      value = value.replace(/^0+/, '');
    }

    this.ngControl.control?.setValue(value, { emitEvent: false });
    event.target.value = value;
  }

  @HostListener('keypress', ['$event'])
  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;

    // Allow only digits
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }

    return true;
  }
}
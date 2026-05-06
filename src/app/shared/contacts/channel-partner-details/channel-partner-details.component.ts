import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-channel-partner-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './channel-partner-details.component.html',
  styleUrl: './channel-partner-details.component.scss'
})
export class ChannelPartnerDetailsComponent {
  @Input() contact: any = null;
  tdsOptions = ['194H', '194C', '194J', '194I', '194M', '194N'];

  maskPan(pan: string | undefined): string {
    if (!pan || pan.length < 4) return pan || 'N/A';
    return 'X'.repeat(pan.length - 4) + pan.slice(-4);
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Channel } from '../../models/channel.model';

@Component({
    selector: 'app-channel-members-list',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './channel-members-list.component.html',
    styleUrls: ['./channel-members-list.component.scss']
})
export class ChannelMembersListComponent {
    @Input() channel: Channel | null = null;
}

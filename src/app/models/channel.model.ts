import { User } from './user.model';

export interface Channel {
    id: string;
    name: string;
    members?: User[];
}

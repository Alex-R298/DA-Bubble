export interface User {
    uid: string;
    name?: string;
    profileImageUrl?: string;
    status?: 'online' | 'offline' | string;
}

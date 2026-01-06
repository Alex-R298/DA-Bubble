import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChannelHeaderModalsComponent } from './channel-header-modals.component';

describe('ChannelHeaderModalsComponent', () => {
    let component: ChannelHeaderModalsComponent;
    let fixture: ComponentFixture<ChannelHeaderModalsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChannelHeaderModalsComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ChannelHeaderModalsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

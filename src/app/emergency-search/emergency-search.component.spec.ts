import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EmergencySearchComponent } from './emergency-search.component';
import { EmergencyService } from './emergency.service';
import { SpecialtiesService } from '../specialties/specialties.service';

describe('EmergencySearchComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencySearchComponent],
      providers: [
        {
          provide: EmergencyService,
          useValue: {
            findHospital: () => of()
          }
        },
        {
          provide: SpecialtiesService,
          useValue: {
            getSpecialties: () => of({ content: [] })
          }
        }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EmergencySearchComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});

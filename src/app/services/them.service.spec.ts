import { TestBed } from '@angular/core/testing';

import { ThemService } from './them.service';

describe('ThemService', () => {
  let service: ThemService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

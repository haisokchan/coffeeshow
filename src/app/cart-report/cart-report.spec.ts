import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartReport } from './cart-report';

describe('CartReport', () => {
  let component: CartReport;
  let fixture: ComponentFixture<CartReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CartReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

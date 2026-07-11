import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-simulador-page',
  imports: [MatToolbarModule, MatCardModule, MatDividerModule],
  templateUrl: './simulador-page.component.html',
  styleUrl: './simulador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimuladorPageComponent {}

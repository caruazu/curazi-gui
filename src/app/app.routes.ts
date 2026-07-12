import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/simulador/simulador-page/simulador-page.component').then((m) => m.SimuladorPageComponent),
  },
];

import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'login',
    renderMode: RenderMode.Prerender   // ✅ login can be static
  },
  {
    path: 'register',
    renderMode: RenderMode.Prerender   // ✅ register can be static
  },
  {
    path: '**',
    renderMode: RenderMode.Server      // ✅ all protected routes: render on-demand
  }
];
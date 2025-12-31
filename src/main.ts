import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

// Sanitize API responses to avoid recursive payloads (Family.members -> Person.family -> ...)
const apiSanitizeInterceptor = (req: any, next: any) => {
  return next(req).pipe(
    map((event: any) => {
      if (event instanceof HttpResponse) {
        try {
          const url: string = req.url || '';
          const isFamilies = /\/api\/families(\/?$|\?)/.test(url);
          const isPersonsByFamily = /\/api\/persons\/by-family\//.test(url);

          if (isFamilies && Array.isArray(event.body)) {
            const sanitized = event.body.map((it: any) => ({
              id: it?.id,
              name: it?.name,
              createdAt: it?.createdAt
            }));
            return event.clone({ body: sanitized });
          }

          if (isPersonsByFamily && Array.isArray(event.body)) {
            const sanitized = event.body.map((p: any) => ({
              id: p?.id,
              firstName: p?.firstName,
              lastName: p?.lastName,
              gender: p?.gender,
              birthDate: p?.birthDate ?? null,
              email: p?.email ?? null,
              phone: p?.phone ?? null,
              address: p?.address ?? null,
              job: p?.job ?? null,
              notes: p?.notes ?? null,
              photoUrl: p?.photoUrl ?? null,
              familyId: p?.familyId ?? (p?.family?.id ?? null),
              fatherId: p?.fatherId ?? null,
              motherId: p?.motherId ?? null,
              spouseIds: p?.spouseIds ?? null
            }));
            return event.clone({ body: sanitized });
          }
        } catch {
          // In case of any error, return the original response untouched
          return event;
        }
      }
      return event;
    })
  );
};

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([apiSanitizeInterceptor])),
    provideAnimations()
    // Ajoutez d'autres providers ici si nécessaire
  ]
}).catch(err => console.error(err));

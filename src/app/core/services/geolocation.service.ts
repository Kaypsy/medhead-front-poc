import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  getCurrentPosition(): Observable<GeolocationResult> {
    return new Observable((observer) => {
      if (!navigator.geolocation) {
        observer.error({ code: 0, message: 'Géolocalisation non supportée par ce navigateur' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          observer.complete();
        },
        (error) => {
          let message = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Accès à la position refusé';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position non disponible';
              break;
            case error.TIMEOUT:
              message = 'Délai de détection dépassé';
              break;
          }
          observer.error({ code: error.code, message });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }
}

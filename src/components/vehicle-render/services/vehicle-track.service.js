import { BehaviorSubject, identity, of, defer } from 'rxjs';
import { map, catchError, retry, repeat, tap } from 'rxjs/operators';
import { HttpClientService } from '../../../services/http-client-service.js'; 
import { loadProgressService } from './../../../services/load-progress.service.js';
export class VehicleService extends HttpClientService {
  constructor(apiUrl, token) {
    super(apiUrl);
    this.token = token;
    this.vehicleTrack$ = new BehaviorSubject(null);
  }

  getInitialVehicles() {
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const vehicles = [
      { id: '24121', name: 'ID:24121', startDateTime: now, endDateTime: now, speed: 4, active: true, color: '#e74c3c' },
      { id: '22654', name: 'ID:22654', startDateTime: now, endDateTime: now, speed: 4, active: false, color: '#3498db' },
      { id: '25489', name: 'ID:25489', startDateTime: now, endDateTime: now, speed: 4, active: false, color: '#2ecc71' },
      { id: '25496', name: 'ID:25496', startDateTime: now, endDateTime: now, speed: 4, active: false, color: '#f39c12' },
      { id: '24492', name: 'ID:24492', startDateTime: now, endDateTime: now, speed: 4, active: false, color: '#9b59b6' }
    ];

    return of(vehicles);
  }

  getVehicleTrack(vehicleId, start, end, isRepeat = false) {
    const params = new URLSearchParams({
      token: this.token,
      vehicle_id: vehicleId,
      start,
      end
    });

    return defer(() =>
      this.get(`/tracking?${params.toString()}`)
    ).pipe(
      map(response => response),
      catchError(error => {
        console.error('Ошибка загрузки трека:', error);
        return of(null);
      }),
      retry({ delay: 10000 }),
      isRepeat ? repeat({ delay: 10000 }) : identity,
      tap(data => this.vehicleTrack$.next({ vehicleId, data }), 
    )
    );
  }
}
export const vehicleTrackService = new VehicleService('http://artemis.itmontag.keenetic.pro:4242', '27afb877422133945a0f5241bc649145bd928fa17ca239d23b942850a770cd06');
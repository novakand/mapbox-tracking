import { BehaviorSubject, defer, of, identity, repeat, retry, catchError, tap } from 'rxjs';
import { map, } from 'rxjs/operators';
import { HttpClientService } from '../../../services/http-client-service.js';

export class VehicleService extends HttpClientService {
  constructor(apiUrl, token) {
    super(apiUrl);
    this.token = token;
    this.vehicleTrack$ = new BehaviorSubject(null);
  }

  getInitialVehicles() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();

    const format = (d) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const formattedStart = format(start);
    const formattedEnd = format(end);

    const vehicles = [
      { id: '24121', name: 'ID:24121', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: true, isRepeat: true, color: '#e74c3c' },
      { id: '22654', name: 'ID:22654', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#3498db' },
      { id: '25489', name: 'ID:25489', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#2ecc71' },
      { id: '25496', name: 'ID:25496', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#f39c12' },
      { id: '24492', name: 'ID:24492', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#9b59b6' }
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
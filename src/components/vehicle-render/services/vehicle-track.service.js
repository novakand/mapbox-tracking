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
  { id: '22216', name: 'ID:22216', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: true, isRepeat: true, color: '#1abc9c' },  // turquoise
  { id: '24121', name: 'ID:24121', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false,  isRepeat: true, color: '#e74c3c' },  // alizarin
  { id: '24488', name: 'ID:24488', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#3498db' },  // peter river
  { id: '27067', name: 'ID:27067', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#2ecc71' },  // emerald
  { id: '07322', name: 'ID:07322', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#f39c12' },  // orange
  { id: '07496', name: 'ID:07496', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#9b59b6' },  // amethyst
  { id: '07321', name: 'ID:07321', startDateTime: formattedStart, endDateTime: formattedEnd, speed: 4, active: false, isRepeat: true, color: '#34495e' },  // wet asphalt
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
        console.error('Error loading track:', error);
        return of(null);
      }),
      retry({ delay: 5000 }),
      isRepeat ? repeat({ delay: 5000 }) : identity,
      tap(data => this.vehicleTrack$.next({ vehicleId, data, isRepeat }),
      )
    );
  }
}
export const vehicleTrackService = new VehicleService('https://artemis.itmontag.keenetic.pro', '27afb877422133945a0f5241bc649145bd928fa17ca239d23b942850a770cd06');
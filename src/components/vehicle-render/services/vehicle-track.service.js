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

  getVehicleTrack(
  vehicleId,
  start,
  end,
  isRepeat = false
) {
  return defer(() => {
    // Если isRepeat === true, на каждой итерации формируем "end" как текущее UTC-время без миллисекунд:
    const currentEnd = isRepeat
      ? new Date().toISOString().split('.')[0] + 'Z'
      : end;

    console.log(
      `Fetching track for ${vehicleId} from ${start} to ${currentEnd}`
    );

    const params = new URLSearchParams({
      token: this.token,
      vehicle_id: vehicleId,
      start,
      end: currentEnd,
    });

    return this.get(`/tracking?${params.toString()}`);
  }).pipe(
    // Тут просто возвращаем ответ без изменений
    map(response => response),

    // Ловим ошибки, логируем и отдаём null, чтобы поток не “упал” окончательно
    catchError(error => {
      console.error('Error loading track:', error);
      return of(null);
    }),

    // При ошибке (до catchError) повторяем конкретный запрос через 5 секунд
    retry({ delay: 5000 }),

    // Если нужно в цикле, каждый 5 секунд заново вызываем defer и формируем новый end
    isRepeat ? repeat({ delay: 5000 }) : identity,

    // После получения (или null) пушим данные в vehicleTrack$
    tap(data => {
      this.vehicleTrack$.next({ vehicleId, data, isRepeat });
    })
  );
}


  // getVehicleTrack(vehicleId, start, end, isRepeat = false) {
  //   console.log(start, end)
  //   const params = new URLSearchParams({
  //     token: this.token,
  //     vehicle_id: vehicleId,
  //     start,
  //     end
  //   });

  //   return defer(() =>
  //     this.get(`/tracking?${params.toString()}`)
  //   ).pipe(
  //     map(response => response),
  //     catchError(error => {
  //       console.error('Error loading track:', error);
  //       return of(null);
  //     }),
  //     retry({ delay: 5000 }),
  //     isRepeat ? repeat({ delay: 5000 }) : identity,
  //     tap(data => this.vehicleTrack$.next({ vehicleId, data, isRepeat }),
  //     )
  //   );
  // }
}
export const vehicleTrackService = new VehicleService('https://artemis.itmontag.keenetic.pro', '27afb877422133945a0f5241bc649145bd928fa17ca239d23b942850a770cd06');
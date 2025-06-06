
import flatpickr from 'flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil } from "rxjs";
import { loadProgressService } from './../../services/load-progress.service.js';

export class VehicleList {
  constructor(
    containerId,
    vehicleService
  ) {
    this.container = document.getElementById(containerId);
    this.vehicleService = vehicleService;
    this.vehicles = [];
    this.getTrack$ = new Subject();
    this.destroy$ = new Subject();

  }

  init() {
    this.vehicleService.getInitialVehicles().subscribe((vehicles) => {
      this.vehicles = vehicles;
      this.render();
      this.setupListeners();
      this.setupFlatpickr();
      this._listenGetTrack();
      const activeVehicle = this.vehicles.find(v => v.active);
      if (activeVehicle) {
        this.loadVehicleTracks();
      }
    });
  }

  _listenGetTrack() {
    this.getTrack$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) =>
          prev.id === curr.id &&
          prev.startDateTime === curr.startDateTime &&
          prev.endDateTime === curr.endDateTime &&
          prev.isRepeat === curr.isRepeat
        ),
        switchMap(({ id, startDateTime, endDateTime, isRepeat }) => {
          loadProgressService.show();
          const interval = this.getTrackInterval(isRepeat, startDateTime, endDateTime);
          return this.vehicleService.getVehicleTrack(id, interval.startDateTime, interval.endDateTime, isRepeat);
        }),
        takeUntil(this.destroy$),
      ).subscribe();
  }

  getTrackInterval(isRepeat, startDateTime, endDateTime) {
    if (!isRepeat) {
      return {
        startDateTime: this.toServerIso(startDateTime),
        endDateTime: this.toServerIso(endDateTime)
      };
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return {
      startDateTime: start.toISOString().split('.')[0] + 'Z',
      endDateTime: now.toISOString().split('.')[0] + 'Z'
    };
  }

  toServerIso(dateString) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateString)) {
      return dateString;
    }
    if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(dateString)) {
      const [datePart, timePart] = dateString.split(' ');
      const [day, month, year] = datePart.split('.').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      return d.toISOString().split('.')[0] + 'Z';
    }
    const d = new Date(dateString);
    return d.toISOString().split('.')[0] + 'Z';
  }

  render() {
    if (!this.container) {
      console.error('error container');
      return;
    }

    this.container.innerHTML = '';

    this.vehicles.forEach(vehicle => {
      const card = document.createElement('sl-details');
      card.dataset.id = vehicle.id;

      card.innerHTML = `
      
  <div slot="summary" class="flex items-center gap-2">
    <sl-checkbox data-id="${vehicle.id}"></sl-checkbox>
    <span>${vehicle.name}</span>
    <span class="inline-block w-3 h-3 rounded-full" style="background-color: ${vehicle.color};"></span>
  </div>

  <div class="p-2 space-y-2 text-xs  pt-2">
    <div data-id="${vehicle.id}" class="space-y-1">
      <div class="field-timestamp"><strong>Date time:</strong> <span data-field="timestamp">—</span></div>
      <div class="field-lat"><strong>Lat:</strong> <span data-field="lat">—</span></div>
      <div class="field-lng"><strong>Lng:</strong> <span data-field="lng">—</span></div>
    </div>

    <div>
      <label class="block text-sm mb-1">ONLINE</label>
      <sl-switch class="w-full" data-id="${vehicle.id}" data-field="isRepeat"></sl-switch>
    </div>

    <div>
      <label class="block text-sm mb-1">Date and time range</label>
      <sl-input class="w-full" type="text" data-id="${vehicle.id}" data-field="dateRange"></sl-input>
    </div>
  </div>
`;

      this.container.appendChild(card);
    });


    this.container.querySelectorAll('sl-checkbox').forEach((checkbox) => {
      const vehicleId = checkbox.dataset.id;
      const vehicle = this.vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        checkbox.checked = vehicle.active;
      }
    });

    this.container.querySelectorAll('sl-switch').forEach((toggle) => {
      const vehicleId = toggle.dataset.id;
      const vehicle = this.vehicles.find(v => v.id === vehicleId);

      // Set initial state
      if (vehicle) {
        toggle.checked = vehicle.isRepeat;
      }

      // Add event listener (only once)
      if (!toggle.hasListener) {
        toggle.addEventListener('sl-change', (e) => {
          const id = e.target.dataset.id;
          const vehicle = this.vehicles.find(v => v.id === id);
          if (!vehicle) return;

          vehicle.isRepeat = e.target.checked;

          const card = this.container.querySelector(`sl-details[data-id="${id}"]`);
          if (card) {
            card.querySelectorAll('sl-input').forEach(input => {
              input.disabled = vehicle.isRepeat;
            });
          }

          this.loadVehicleTracks();
        });

        toggle.hasListener = true;
      }
    });
  }

  setupListeners() {
    this.container.addEventListener('click', (event) => {
      const checkbox = event.target.closest('sl-checkbox');
      if (!checkbox) return;

      const vehicleId = checkbox.dataset.id;
      if (!vehicleId) return;

      this.activateVehicle(vehicleId);
      this.loadVehicleTracks();
    });


    this.container.addEventListener('sl-show', (event) => {
      const openedId = event.target.dataset.id;
      if (!openedId) return;

      this.container.querySelectorAll('sl-details').forEach(details => {
        if (details.dataset.id !== openedId) details.open = false;
      });

      this.activateVehicle(openedId);
      this.loadVehicleTracks();
    });

    this.container.addEventListener('sl-change', (event) => {
      const target = event.target;
      const id = target.dataset.id;
      const field = target.dataset.field;
      if (!id || !field) return;

      const vehicle = this.vehicles.find(v => v.id === id);
      if (!vehicle) return;

      if (target.tagName.toLowerCase() === 'sl-switch') {
        vehicle[field] = target.checked;
      } else {
        vehicle[field] = target.value;
      }


    });
  }


  activateVehicle(id) {
    this.vehicles.forEach(v => v.active = false);
    this.container.querySelectorAll('sl-checkbox[data-id]').forEach(cb => {
      cb.checked = false;
    });

    const vehicle = this.vehicles.find(v => v.id === id);
    if (!vehicle) return;

    vehicle.active = true;
    const checkbox = this.container.querySelector(`sl-checkbox[data-id="${id}"]`);
    if (checkbox) checkbox.checked = true;

  }


  loadVehicleTracks() {
    const activeVehicle = this.vehicles.find(v => v.active);
    if (!activeVehicle) {
      console.warn('Нет активного транспортного средства для загрузки трека');
      return;
    }

    const { id, startDateTime, endDateTime, isRepeat } = activeVehicle;
    if (!startDateTime || !endDateTime) {
      console.warn('Не указаны даты для загрузки трека');
      return;
    }
    this.getTrack$.next({ id, startDateTime, endDateTime, isRepeat });
  }

  setupFlatpickr() {
    this.container.querySelectorAll('sl-input[data-field="dateRange"]').forEach((input) => {
      const container = input.closest('sl-details');
      const vehicleId = container?.dataset.id;
      const vehicle = this.vehicles.find(v => v.id === vehicleId);

      // По умолчанию (или из модели) — можно подставить значения
      const defaultStart = vehicle?.startDateTime || '';
      const defaultEnd = vehicle?.endDateTime || '';

      flatpickr(input, {
        mode: "range",
        enableTime: true,
        time_24hr: true,
        // locale: Russian,
        dateFormat: 'd.m.Y H:i',
        showMonths: 2,
        defaultDate: [defaultStart, defaultEnd].filter(Boolean), // если есть значения
        onClose: (selectedDates, dateStr, fp) => {
          if (!selectedDates || selectedDates.length < 2) return;
          const startISO = selectedDates[0].toISOString().split('.')[0] + 'Z';
          const endISO = selectedDates[1].toISOString().split('.')[0] + 'Z';

          // Сохраняем в модель
          vehicle.startDateTime = startISO;
          vehicle.endDateTime = endISO;

          this.getTrack$.next({ id: vehicleId, startDateTime: startISO, endDateTime: endISO, isRepeat: false });
        }
      });

      input.disabled = !!vehicle.isRepeat;
    });
  }

  destroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

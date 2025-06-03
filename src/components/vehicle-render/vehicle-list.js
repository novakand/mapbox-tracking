
import flatpickr from 'flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';

export class VehicleList {
  constructor(containerId, vehicleService) {
    this.container = document.getElementById(containerId);
    this.vehicleService = vehicleService;
    this.vehicles = [];
  }

  init() {
    this.vehicleService.getInitialVehicles().subscribe((vehicles) => {
      this.vehicles = vehicles;
      this.render();
      this.setupListeners();
      this.setupFlatpickr();
    });
  }

  render() {
    if (!this.container) {
      console.error('Контейнер не найден');
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

        <div class="p-2 space-y-2">
          <label class="block text-sm">Start Date & Time</label>
          <sl-input type="datetime-local" data-id="${vehicle.id}" data-field="startDateTime" value="${vehicle.startDateTime || ''}"></sl-input>

          <label class="block text-sm">End Date & Time</label>
          <sl-input type="datetime-local" data-id="${vehicle.id}" data-field="endDateTime" value="${vehicle.endDateTime || ''}"></sl-input>
        </div>
      `;

      this.container.appendChild(card);
    });

    // Устанавливаем состояние чекбоксов через свойство checked
    this.container.querySelectorAll('sl-checkbox').forEach((checkbox) => {
      const vehicleId = checkbox.dataset.id;
      const vehicle = this.vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        checkbox.checked = vehicle.active;
      }
    });
  }

setupListeners() {
  // ✅ Слушаем клики на контейнере (чекбоксы)
  this.container.addEventListener('click', (event) => {
    const checkbox = event.target.closest('sl-checkbox');
    if (!checkbox) return;

    const vehicleId = checkbox.dataset.id;
    if (!vehicleId) return;

    this.activateVehicle(vehicleId);
    this.loadVehicleTracks();
  });

  // ✅ Слушаем открытие деталей (чтобы открывался только один)
  this.container.addEventListener('sl-show', (event) => {
    const openedId = event.target.dataset.id;
    if (!openedId) return;

    this.container.querySelectorAll('sl-details').forEach(details => {
      if (details.dataset.id !== openedId) details.open = false;
    });

    this.activateVehicle(openedId);
    this.loadVehicleTracks();
  });

  // ✅ Слушаем изменения полей (дата/время, скорость и т.д.)
  this.container.addEventListener('sl-change', (event) => {
    const target = event.target;
    const id = target.dataset.id;
    const field = target.dataset.field;
    if (!id || !field) return;

    const vehicle = this.vehicles.find(v => v.id === id);
    if (!vehicle) return;

    vehicle[field] = target.value;
    console.log(`Изменение ${field} -> ${target.value}`);

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

  console.log(`Активирован: ${vehicle.name}`);
}


  loadVehicleTracks() {
    const activeVehicle = this.vehicles.find(v => v.active);
    if (!activeVehicle) {
      console.warn('Нет активного транспортного средства для загрузки трека');
      return;
    }

    const { id, startDateTime, endDateTime } = activeVehicle;
    if (!startDateTime || !endDateTime) {
      console.warn('Не указаны даты для загрузки трека');
      return;
    }

    this.vehicleService.getVehicleTrack(id, startDateTime, endDateTime).subscribe((data) => {
      if (data) {
        console.log(`Трек загружен для ${activeVehicle.name}`);
        // Здесь вставь код для обновления карты/интерфейса, если нужно
      } else {
        console.warn(`Трек для ${id} не найден`);
      }
    });
  }

  setupFlatpickr() {
    this.container.querySelectorAll('sl-input[type="datetime-local"]').forEach((input) => {
      const container = input.closest('sl-details');
      const vehicleId = container?.dataset.id;

      flatpickr(input, {
        enableTime: true,
        time_24hr: true,
        locale: Russian,
        dateFormat: 'd.m.Y H:i',
        onClose: () => {
          const start = container?.querySelector('sl-input[data-field="startDateTime"]')?.value;
          const end = container?.querySelector('sl-input[data-field="endDateTime"]')?.value;

          const startISO = flatpickr.parseDate(start, 'd.m.Y H:i')?.toISOString()?.split('.')[0] + 'Z';
          const endISO = flatpickr.parseDate(end, 'd.m.Y H:i')?.toISOString()?.split('.')[0] + 'Z';

          if (vehicleId && startISO && endISO) {
            this.vehicleService.getVehicleTrack(vehicleId, startISO, endISO).subscribe((data) => {
              if (data) {
                console.log(`Трек загружен для ${vehicleId}`);
                // Обнови карту или UI здесь, если нужно
              } else {
                console.warn(`Трек для ${vehicleId} не найден`);
              }
            });
          } else {
            console.warn('Не все данные заполнены');
          }
        }
      });
    });
  }
}

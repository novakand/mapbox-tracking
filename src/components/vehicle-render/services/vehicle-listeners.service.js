// import { loadVehicleTracks } from './vehicle-tracks.js';

// export function setupVehicleListeners(vehicles, container, vehicleApi) {
//   container.addEventListener('click', e => {
//     const checkbox = e.target.closest('sl-checkbox');
//     if (!checkbox) return;

//     const id = checkbox.dataset.id;
//     if (!id) return;

//     activateVehicle(id);
//     loadVehicleTracks(vehicleApi, vehicles);
//   });

//   container.addEventListener('sl-show', e => {
//     const openedId = e.target.dataset.id;
//     if (!openedId) return;

//     container.querySelectorAll('sl-details').forEach(details => {
//       if (details.dataset.id !== openedId) details.open = false;
//     });

//     activateVehicle(openedId);
//     loadVehicleTracks(vehicleApi, vehicles);
//   });

//   container.addEventListener('sl-change', e => {
//     const id = e.target.dataset.id;
//     const field = e.target.dataset.field;
//     if (!id || !field) return;

//     const vehicle = vehicles.find(v => v.id === id);
//     if (!vehicle) return;

//     vehicle[field] = e.target.value;
//     console.log(`Изменение ${field} -> ${e.target.value}`);

//     // Если дата/время или скорость — обновляем трек
//     if (['startDateTime', 'endDateTime', 'speed'].includes(field)) {
//       loadVehicleTracks(vehicleApi, vehicles);
//     }
//   });

//   function activateVehicle(id) {
//     vehicles.forEach(v => v.active = false);
//     container.querySelectorAll('sl-checkbox[data-id]').forEach(cb => cb.removeAttribute('checked'));

//     const vehicle = vehicles.find(v => v.id === id);
//     if (!vehicle) return;

//     vehicle.active = true;
//     const checkbox = container.querySelector(`sl-checkbox[data-id="${id}"]`);
//     if (checkbox) checkbox.setAttribute('checked', '');
//   }
// }

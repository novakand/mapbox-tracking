import '.././style.css';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/shoelace.js';
import 'flatpickr/dist/flatpickr.min.css';
import { MapService } from './map/map-service.js';
import { vehicleTrackService } from './components/vehicle-render/services/vehicle-track.service.js';
import { VehicleList } from './components/vehicle-render/vehicle-list.js';
import { loadProgressService } from './services/load-progress.service.js';
import { ChartPanel } from './components/chart-panel/chart-panel.js';

const mapService = new MapService();
mapService.initMap();
const vehicleManager = new VehicleList('vehicle-list', vehicleTrackService);
vehicleManager.init();

// const progressBar = document.querySelector('sl-progress-bar');
// const chartPanel = new ChartPanel();

// loadProgressService.inProgress.subscribe((isLoading) => {
//   progressBar.style.display = isLoading ? 'block' : 'none';
// });

window.addEventListener('load', () => {
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    preloader.style.opacity = '0';
    preloader.style.pointerEvents = 'none';
    preloader.remove();
  }
});

// const drawer = document.querySelector('.drawer-contained');
//   const openButton = drawer.parentElement.nextElementSibling;
//   const closeButton = drawer.querySelector('sl-button[variant="primary"]');

//   openButton.addEventListener('click', () => (drawer.open = !drawer.open));
//   closeButton.addEventListener('click', () => drawer.hide());

const drawer = document.querySelector('.drawer-contained');
drawer.addEventListener('sl-show', () => {
  document.querySelector('#map').parentElement.style.width = '75%';
});
drawer.addEventListener('sl-hide', () => {
  document.querySelector('#map').parentElement.style.width = '100%';
});

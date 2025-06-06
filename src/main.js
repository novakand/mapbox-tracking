import '.././style.css';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/shoelace.js';
import 'flatpickr/dist/flatpickr.min.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import { registerIconLibrary } from '@shoelace-style/shoelace/dist/utilities/icon-library.js';

registerIconLibrary('default', {
  resolver: name => `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/${name}.svg`,
  mutator: svg => svg.setAttribute('fill', 'currentColor')
});

setBasePath('/mapbox-tracking/');
import { MapService } from './map/map-service.js';
import { vehicleTrackService } from './components/vehicle-render/services/vehicle-track.service.js';
import { VehicleList } from './components/vehicle-render/vehicle-list.js';
import { loadProgressService } from './services/load-progress.service.js';
import { ChartPanel } from './components/chart-panel/chart-panel.js';

const mapService = new MapService();
mapService.initMap();
const vehicleManager = new VehicleList('vehicle-list', vehicleTrackService);
vehicleManager.init();



loadProgressService.inProgress.subscribe((isLoading) => {
  progressBar.style.display = isLoading ? 'block' : 'none';
});

window.addEventListener('load', () => {
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    preloader.style.opacity = '0';
    preloader.style.pointerEvents = 'none';
    preloader.remove();
  }
});

const progressBar = document.querySelector('sl-progress-bar');
const chartPanel = new ChartPanel(mapService);



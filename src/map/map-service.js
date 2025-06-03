import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { vehicleTrackService } from '../components/vehicle-render/services/vehicle-track.service';
import { filter, map,tap } from 'rxjs/operators';
import { scenegraphLayer } from '../map/layers.js';
import { loadProgressService } from './../services/load-progress.service.js';
export class MapService {
  constructor(containerId = 'map') {
    this.containerId = containerId;
    this.map = null;
    this.deckOverlay = null;

    mapboxgl.accessToken = 'pk.eyJ1Ijoibm92YWthbmQiLCJhIjoiY2p3OXFlYnYwMDF3eTQxcW5qenZ2eGNoNCJ9.PTZDfrwxfMd-hAwzZjwPTg';
  }

  initMap() {
    this.map = new mapboxgl.Map({
      projection: 'mercator',
      container: this.containerId,
      pitch: 62,
      bearing: -20,
      style: 'mapbox://styles/mapbox/streets-v12',
      hash: true,
      antialias: true,
      center: [37.6176, 55.7558],
      zoom: 12
    });

    this.deckOverlay = new MapboxOverlay({
      interleaved: true,
      layers: [scenegraphLayer]
    });

    this.map.on('load', () => {
     // this.map.addControl(this.deckOverlay);

      this.map.addSource('track', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
      });

      this.map.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        paint: { 'line-color': '#007bff', 'line-width': 4 }
      });

      this.map.addSource('track-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

this.map.addLayer({
  id: 'track-points-circles',
  type: 'circle',
  source: 'track-points',
  paint: {
    'circle-radius': 12,
    'circle-color': [
      'match',
      ['get', 'pointType'],
      'start', '#00cc66',  // A - зеленый
      'end', '#ff3300',    // B - красный
      '#007bff'            // fallback
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff'
  }
});

// Затем добавляем текстовый слой поверх
this.map.addLayer({
  id: 'track-points-labels',
  type: 'symbol',
  source: 'track-points',
  layout: {
    'text-field': ['get', 'label'],
    'text-font': ['Open Sans Bold'],
    'text-size': 16,
    'text-anchor': 'center',
    'text-offset': [0, 0]
  },
  paint: {
    'text-color': '#fff'
  }
});


      this._setupTrackSubscription();
    });
  }

_setupTrackSubscription() {
  vehicleTrackService.vehicleTrack$
    .pipe(
      // Показываем прелоадер при любом новом событии
      tap(() => loadProgressService.show()),

      map(payload => {
        // Проверка на пустой payload
        if (!payload || !payload.vehicleId || !payload.data) {
          console.warn('Пропускаем пустой payload:', payload);
          return null;
        }

        const { vehicleId, data } = payload;

        // Если трек пустой, возвращаем null для очистки карты
        if (!data.features || data.features.length === 0) {
          console.warn(`Нет трека для машины ${vehicleId}`);
          return { vehicleId, coordinates: [], geojsonLine: null, geojsonPoints: null };
        }

        // Обработка трека с данными
        const features = data.features;
        const startPoint = features[0];
        const endPoint = features[features.length - 1];

        startPoint.properties = {
          ...startPoint.properties,
          pointType: 'start',
          label: 'A'
        };

        endPoint.properties = {
          ...endPoint.properties,
          pointType: 'end',
          label: 'B'
        };

        const coordinates = features.map(f => f.geometry.coordinates);

        return {
          vehicleId,
          coordinates,
          geojsonLine: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates
            }
          },
          geojsonPoints: {
            type: 'FeatureCollection',
            features: [startPoint, endPoint]
          }
        };
      }),

      // Отфильтруем null
      filter(Boolean)
    )
    .subscribe(({ vehicleId, geojsonLine, geojsonPoints, coordinates }) => {
      console.log(`Обновляем трек для машины ${vehicleId}`);

      // Скрываем прелоадер при завершении обновления
      loadProgressService.hide();

      // Если данных нет, очищаем карту
      if (!geojsonLine || !geojsonPoints) {
        console.log('Очищаем слои трека и точек на карте');
        this.map.getSource('track')?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] }
        });
        this.map.getSource('track-points')?.setData({
          type: 'FeatureCollection',
          features: []
        });
        return;
      }

      // Обновляем карту с данными
      this.map.getSource('track')?.setData(geojsonLine);
      this.map.getSource('track-points')?.setData(geojsonPoints);

      // Центрируем карту
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce(
          (b, coord) => b.extend(coord),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        this.map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      }
    });
}


}



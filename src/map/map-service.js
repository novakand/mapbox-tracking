import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { vehicleTrackService } from '../components/vehicle-render/services/vehicle-track.service';
import { loadProgressService } from './../services/load-progress.service.js';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, filter, map, tap } from 'rxjs';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';

export class MapService {
  constructor(containerId = 'map') {
    this.containerId = containerId;
    this.map = null;
    this.deckOverlay = null;
    this.destroy$ = new Subject();
    this.trackData = [];
    this.playIndex = 0;

    mapboxgl.accessToken = 'pk.eyJ1Ijoibm92YWthbmQiLCJhIjoiY2p3OXFlYnYwMDF3eTQxcW5qenZ2eGNoNCJ9.PTZDfrwxfMd-hAwzZjwPTg';
  }

  initMap() {
    this.map = new mapboxgl.Map({
      container: this.containerId,
      projection: 'mercator',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [37.6176, 55.7558],
      zoom: 3,
      pitch: 0,
      bearing: 0,
    });

    this.deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
    this.map.on('load', () => {
      this.map.addControl(this.deckOverlay);
      this.map.dragRotate.disable();
      this.map.touchZoomRotate.disableRotation();
      this.map.doubleClickZoom.disable();
      this.map.keyboard.disableRotation();
      this._setupTrackSubscription();


      this.routeVisible = true;
      this.headingVisible = true;

      this.toggleRouteSwitch = document.getElementById('toggleRoute');
      this.toggleHeadingSwitch = document.getElementById('toggleHeading');

      this.toggleRouteSwitch.addEventListener('sl-change', (e) => {
        this.routeVisible = e.target.checked;
        this._updateLayerVisibility();
      });

      this.toggleHeadingSwitch.addEventListener('sl-change', (e) => {
        this.headingVisible = e.target.checked;
        this._updateLayerVisibility();
      });
    });
  }

  _updateLayerVisibility() {
    if (this.map.getLayer('track-path-layer')) {
      this.map.setLayoutProperty(
        'track-path-layer',
        'visibility',
        this.routeVisible ? 'visible' : 'none'
      );
    }

    if (this.map.getLayer('heading-lines-layer')) {
      this.map.setLayoutProperty(
        'heading-lines-layer',
        'visibility',
        this.headingVisible ? 'visible' : 'none'
      );
    }
  }


  _clearPreviousLayersAndMarkers() {
    const layersUsingTrackPoints = ['track-points-circles', 'track-points-labels'];
    const layers = ['track-path-layer', 'heading-lines-layer', ...layersUsingTrackPoints];
    const sources = ['track-path', 'heading-lines', 'track-points'];

    // Удаляем все слои
    for (const layerId of layers) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    // Удаляем все источники (после удаления слоев)
    for (const sourceId of sources) {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    }


    // Очистка deck.gl
    this.deckOverlay.setProps({ layers: [] });
  }


  _setupTrackSubscription() {
    vehicleTrackService.vehicleTrack$
      .pipe(
        tap(() => loadProgressService.hide()),
        takeUntil(this.destroy$),
        filter(payload => payload && payload.vehicleId && payload.data),
        map(payload => payload.data.features),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe(features => {
        this._clearPreviousLayersAndMarkers();

        if (!features || features.length === 0) {
          this.trackData = [];
          this.deckOverlay.setProps({ layers: [] });
          return;
        }

        this.trackData = features.map((f, index, arr) => {
          const [lng, lat] = f.geometry.coordinates;
          const current = [lng, lat];
          const directFromData = f.properties.direct_angle;

          let direct_angle = null;

          if (directFromData != null && !isNaN(directFromData)) {
            direct_angle = directFromData;
          } else {
            const next = arr[index + 1]?.geometry?.coordinates?.slice(0, 2);
            if (next) {
              direct_angle = this.calculateAngle(current, next);
            }
          }

          return {
            coordinates: current,
            timestamp: f.properties.timestamp,
            direct_angle
          };
        });

        if (this.trackData.length >= 2) {
          const start = this.trackData[0].coordinates;
          const end = this.trackData[this.trackData.length - 1].coordinates;
          this._updateRouteMarkers(start, end);
        }

        this.playIndex = 0;

        const pathData = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.trackData.map(d => d.coordinates)
          }
        };

        if (!this.map.getSource('track-path')) {
          this.map.addSource('track-path', {
            type: 'geojson',
            data: pathData
          });

          this.map.addLayer({
            id: 'track-path-layer',
            type: 'line',
            source: 'track-path',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#007bff',
              'line-width': 4
            }
          });
        } else {
          this.map.getSource('track-path').setData(pathData);
        }

        const modelLayer = new ScenegraphLayer({
          id: 'model-layer',
          data: [this.trackData[0]],
          scenegraph: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb',
          getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
          getOrientation: d => [0, -d.direct_angle, 90],
          getColor: d => (d.suspicious ? [255, 0, 0] : [255, 255, 255]),
          sizeScale: 10,
          pickable: true,
          getTooltip: ({ object }) => this._getTooltip(object),
          sizeMinPixels: 2,
          sizeMaxPixels: 2,
          _animations: { '*': { speed: 1 } }
        });

        const headingFeatures = this.trackData
          .filter(d => d.direct_angle != null)
          .map(d => {
            const [lng, lat] = d.coordinates;
            const angleRad = (d.direct_angle * Math.PI) / 180;
            const dx = 0.05 * Math.sin(angleRad);
            const dy = 0.05 * Math.cos(angleRad);
            return {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [lng, lat],
                  [lng + dx, lat + dy]
                ]
              },
              properties: {
                suspicious: d.suspicious
              }
            };
          });

        const headingData = {
          type: 'FeatureCollection',
          features: headingFeatures
        };

        if (!this.map.getSource('heading-lines')) {
          this.map.addSource('heading-lines', {
            type: 'geojson',
            data: headingData
          });

          this.map.addLayer({
            id: 'heading-lines-layer',
            type: 'line',
            source: 'heading-lines',
            paint: {
              'line-color': [
                'case',
                ['boolean', ['get', 'suspicious'], false],
                '#ff0000',
                '#00ff00'
              ],
              'line-width': 2
            }
          });
        } else {
          this.map.getSource('heading-lines').setData(headingData);
        }

        this.deckOverlay.setProps({ layers: [modelLayer] });

        const bounds = this.trackData.reduce(
          (b, d) => b.extend([d.coordinates[0], d.coordinates[1]]),
          new mapboxgl.LngLatBounds(this.trackData[0].coordinates, this.trackData[0].coordinates)
        );
        this.map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      });
  }


  _getTooltip(object) {
    if (!object) return null;

    const props = Object.entries(object)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return {
      text: props
    };
  }

  _updateModel(point) {
    if (!point) return;

    const headingFeatures = this.trackData
      .filter(d => d.direct_angle != null)
      .map(d => {
        const [lng, lat] = d.coordinates;
        const angleRad = (d.direct_angle * Math.PI) / 180;
        const dx = 0.05 * Math.sin(angleRad);
        const dy = 0.05 * Math.cos(angleRad);
        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [lng, lat],
              [lng + dx, lat + dy]
            ]
          },
          properties: {
            suspicious: d.suspicious
          }
        };
      });

    const headingData = {
      type: 'FeatureCollection',
      features: headingFeatures
    };

    if (!this.map.getSource('heading-lines')) {
      this.map.addSource('heading-lines', {
        type: 'geojson',
        data: headingData
      });

      this.map.addLayer({
        id: 'heading-lines-layer',
        type: 'line',
        source: 'heading-lines',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'suspicious'], false],
            '#ff0000',
            '#00ff00'
          ],
          'line-width': 2
        }
      });
    } else {
      this.map.getSource('heading-lines').setData(headingData);
    }

    const modelLayer = new ScenegraphLayer({
      id: 'model-layer',
      data: [point],
      scenegraph: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb',
      getPosition: d => [d.coordinates[0], d.coordinates[1], 0], // Без высоты (плоская карта)

      getOrientation: d => [0, -d.direct_angle, 90],
      sizeScale: 10,
      sizeScale: 10,
      pickable: true,
      getTooltip: ({ object }) => this._getTooltip(object),
      sizeMinPixels: 2,
      sizeMaxPixels: 2,
      _animations: { '*': { speed: 1 } }
    });

    this.deckOverlay.setProps({ layers: [modelLayer], getTooltip: ({ object }) => this._getTooltip(object) });
  }


  calculateAngle(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    const deltaLng = lng2 - lng1;
    const deltaLat = lat2 - lat1;
    const angleRad = Math.atan2(deltaLng, deltaLat);
    const angleDeg = (angleRad * 180) / Math.PI;
    return (angleDeg + 360) % 360;
  }

  _updateRouteMarkers(start, end) {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: start },
          properties: { pointType: 'start', label: 'A' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: end },
          properties: { pointType: 'end', label: 'B' }
        }
      ]
    };

    if (!this.map.getSource('track-points')) {
      this.map.addSource('track-points', { type: 'geojson', data: geojson });

      this.map.addLayer({
        id: 'track-points-circles',
        type: 'circle',
        source: 'track-points',
        paint: {
          'circle-radius': 12,
          'circle-color': [
            'match',
            ['get', 'pointType'],
            'start', '#00cc66',
            'end', '#ff3300',
            '#007bff'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

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
          'text-color': '#ffffff'
        }
      });
    } else {
      this.map.getSource('track-points').setData(geojson);
    }

  }




  destroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}







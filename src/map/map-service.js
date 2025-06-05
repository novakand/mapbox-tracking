import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { vehicleTrackService } from '../components/vehicle-render/services/vehicle-track.service';
import { loadProgressService } from './../services/load-progress.service.js';
import { Subject, takeUntil, delay, finalize, distinctUntilChanged, switchMap, filter, map, tap } from 'rxjs';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';

export class MapService {
  constructor(containerId = 'map') {
    this.containerId = containerId;
    this.map = null;
    this.deckOverlay = null;
    this.destroy$ = new Subject();
    this.trackData = [];
    this.playIndex = 0;
    this.didFitBoundsInRepeat = false;

    mapboxgl.accessToken = 'pk.eyJ1Ijoibm92YWthbmQiLCJhIjoiY2p3OXFlYnYwMDF3eTQxcW5qenZ2eGNoNCJ9.PTZDfrwxfMd-hAwzZjwPTg';
    this.defaultLayerOrder = [
      'track-points-full-layer',
      'heading-lines-layer',
      'track-path-layer',
      'track-points-labels',
      'track-points-circles',
    ];
    this.layerOrder = [...this.defaultLayerOrder];
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


      this.modelPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      });


      this.routeVisible = true;
      this.headingVisible = false;
      this.pointsVisible = false;

      this.toggleRouteSwitch = document.getElementById('toggleRoute');
      this.toggleHeadingSwitch = document.getElementById('toggleHeading');
      this.togglePointsSwitch = document.getElementById('togglePoint');

      this.toggleRouteSwitch.addEventListener('sl-change', (e) => {
        this.routeVisible = e.target.checked;
        this._updateLayerVisibility();
      });

      this.toggleHeadingSwitch.addEventListener('sl-change', (e) => {
        this.headingVisible = e.target.checked;
        this._updateLayerVisibility();
      });


      this.togglePointsSwitch.addEventListener('sl-change', (e) => {
        this.pointsVisible = e.target.checked;
        this._updateLayerVisibility();
      });
    });
  }

  setLayerOrder(newOrder) {
    if (!Array.isArray(newOrder)) {
      console.error('Layer order must be an array');
      return;
    }

    const missingLayers = this.defaultLayerOrder.filter(id => !newOrder.includes(id));
    if (missingLayers.length > 0) {
      console.error(`Missing layers in new order: ${missingLayers.join(', ')}`);
      return;
    }

    this.layerOrder = newOrder;

    if (this.map) {
      this._applyLayerOrder();
    }
  }


  getLayerOrder() {
    return [...this.layerOrder];
  }

  resetLayerOrder() {
    this.layerOrder = [...this.defaultLayerOrder];
    if (this.map) {
      this._applyLayerOrder();
    }
  }

  safeAddLayer(map, layerConfig, beforeId) {
    try {
      if (beforeId && map.getLayer(beforeId)) {
        map.addLayer(layerConfig, beforeId);
      } else {
        map.addLayer(layerConfig);
      }

      if (layerConfig.id === 'track-points-full-layer' && !this._hoverListenersAttached) {
        this._hoverListenersAttached = true;

        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });
        map.on('mouseenter', 'track-points-full-layer', (e) => {

          map.getCanvas().style.cursor = 'pointer';

          const coordinates = e.features[0].geometry.coordinates.slice();
          const props = e.features[0].properties;
          const content = Object.entries(props)
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('<br>');

          if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
          }

          popup.setLngLat(coordinates).setHTML(content).addTo(map);
        });

        map.on('mouseleave', 'track-points-full-layer', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });
      }
    } catch (err) {
      console.warn(`Failed to add layer ${layerConfig.id}`, err);
    }
  }


  _applyLayerOrder(order) {
    const existingLayers = this.layerOrder.filter(id => this.map.getLayer(id));

    for (let i = existingLayers.length - 1; i > 0; i--) {
      const currentLayer = existingLayers[i];
      const layerBelow = existingLayers[i - 1];

      try {
        if (this.map.getLayer(currentLayer) && this.map.getLayer(layerBelow)) {
          this.map.moveLayer(currentLayer, layerBelow);
        }
      } catch (err) {
        console.warn(`Cannot move layer ${currentLayer} before ${layerBelow}`, err);
      }
    }
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
    if (this.map.getLayer('track-points-full-layer')) {
      this.map.setLayoutProperty(
        'track-points-full-layer',
        'visibility',
        this.pointsVisible ? 'visible' : 'none'
      );
    }
  }

  _clearPreviousLayersAndMarkers() {
    const layersUsingTrackPoints = [
      'track-points-circles',
      'track-points-labels',
      'track-points-full-layer'
    ];
    const layers = ['track-path-layer', 'heading-lines-layer', ...layersUsingTrackPoints];
    const sources = [
      'track-path',
      'heading-lines',
      'track-points',
      'track-points-full'
    ];


    for (const layerId of layers) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    for (const sourceId of sources) {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    }

    this.deckOverlay.setProps({ layers: [] });
  }


  _setupTrackSubscription() {
    vehicleTrackService.vehicleTrack$
      .pipe(
        delay(300),
        takeUntil(this.destroy$),
        filter(payload => payload && payload.vehicleId && payload.data),
        tap(payload => {
          this._isRepeat = payload.isRepeat;
          if (payload.isRepeat) {
            this.shouldFitBounds = !this.didFitBoundsInRepeat;
            this.didFitBoundsInRepeat = true;
          } else {
            this.shouldFitBounds = true;
            this.didFitBoundsInRepeat = false;
          }
        }),
        map(payload => payload.data.features),
        tap(() => loadProgressService.hide()),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      )
      .subscribe(features => {
        if (!features || features.length === 0) {
          this.trackData = [];
          this.deckOverlay.setProps({ layers: [] });
          this._clearPreviousLayersAndMarkers();
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
            direct_angle,
            ...f.properties,
          };
        });

        this.playIndex = 0;

        if (this.trackData.length >= 2) {
          const start = this.trackData[0].coordinates;
          const end = this.trackData[this.trackData.length - 1].coordinates;
          this._updateRouteMarkers(start, end);
        }


        const geojson = {
          type: 'FeatureCollection',
          features: this.trackData.map((d, i) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: d.coordinates
            },
            properties: {
              ...d,
            }
          }))
        };

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
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#007bff', 'line-width': 4 }
          });
        } else {
          this.map.getSource('track-path').setData(pathData);
        }


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
                coordinates: [[lng, lat], [lng + dx, lat + dy]]
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


        if (!this.map.getSource('track-points-full')) {
          this.map.addSource('track-points-full', {
            type: 'geojson',
            data: geojson
          });

          this.safeAddLayer(this.map, {
            id: 'track-points-full-layer',
            type: 'circle',
            source: 'track-points-full',
            paint: {
              'circle-radius': 5,
              'circle-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#007bff'
            }
          });
        } else {
          this.map.getSource('track-points-full').setData(geojson);
        }

        this._updateLayerVisibility();
        this._applyLayerOrder(this.layerOrder);

        const modelLayer = new ScenegraphLayer({
          id: 'model-layer',
          data: [this.trackData[this._isRepeat ? this.trackData.length - 1 : 0]],
          scenegraph: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb',
          getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
          getOrientation: d => [0, -d.direct_angle, 90],
          getColor: d => (d.suspicious ? [255, 0, 0] : [255, 255, 255]),
          pickable: true,
          getTooltip: ({ object }) => this._getTooltip(object),
          sizeScale: 10,
          sizeMinPixels: 0.5,
          sizeMaxPixels: 1.8,
          _lighting: 'pbr',
          _animations: { '*': { speed: 1 } }
        });

        this.deckOverlay.setProps({
          layers: [modelLayer],
          onHover: info => {
            if (info.object) {
              const tooltipText = this._getTooltip(info.object)?.text || '';
              const [lng, lat] = info.object.coordinates;

              this.modelPopup
                .setLngLat([lng, lat])
                .setHTML(`
  <pre style="margin: 0; max-width: 440px;">${tooltipText}</pre>
`)
                .addTo(this.map);
            } else {
              this.modelPopup.remove();
            }
          },
          getTooltip: () => null
        });

        if (this.shouldFitBounds && this.trackData.length >= 2) {
          const bounds = this.trackData.reduce(
            (b, d) => b.extend(d.coordinates),
            new mapboxgl.LngLatBounds(this.trackData[0].coordinates, this.trackData[0].coordinates)
          );
          this.map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
        }
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
    const speed = point?.speed ?? 0;
    const modelLayer = new ScenegraphLayer({
      id: 'model-layer',
      data: [point],
      scenegraph: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb',
      getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
      getOrientation: d => [0, -d.direct_angle, 90],
      pickable: true,
      getTooltip: ({ object }) => this._getTooltip(object),
      sizeScale: Math.max(speed / 20, 1),
      getColor: d => {
        const speed = d?.speed;
        if (speed == null || speed === 0) return [180, 180, 180];
        if (speed < 1) return [255, 50, 50];
        if (speed < 5) return [255, 150, 100];
        if (speed < 20) return [100, 255, 100];
        return [50, 200, 255];
      },
      sizeMinPixels: 0.5,
      sizeMaxPixels: 1.8,
      _lighting: 'pbr',
      _animations: { '*': { speed: Math.max(speed / 20, 0.2) } }
    });

    this.deckOverlay.setProps({
      layers: [modelLayer],
      onHover: info => {
        if (info.object) {
          const tooltipText = this._getTooltip(info.object)?.text || '';
          const [lng, lat] = info.object.coordinates;

          this.modelPopup
            .setLngLat([lng, lat])
            .setHTML(`
  <pre style="margin: 0; max-width: 440px;">${tooltipText}</pre>
`)
            .addTo(this.map);
        } else {
          this.modelPopup.remove();
        }
      },
      getTooltip: () => null
    });
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


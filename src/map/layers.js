import { ScenegraphLayer } from '@deck.gl/mesh-layers';

export const scenegraphLayer = new ScenegraphLayer({
  id: 'garbage-truck-layer',
  data: [{ position: [37.6173, 55.7558] }],
  scenegraph: '/mapbox-tracking/models/test2-optimized.glb',
  getPosition: d => d.position,
  sizeMinPixels: 4,
  sizeScale: 4,
  getTranslation: [0, 0, 0],
  getOrientation: () => [0, 90, 90],
  visible: true,
  _lighting: 'pbr',
  pickable: true,
});
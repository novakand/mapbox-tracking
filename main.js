import '@shoelace-style/shoelace';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1Ijoibm92YWthbmQiLCJhIjoiY2p3OXFlYnYwMDF3eTQxcW5qenZ2eGNoNCJ9.PTZDfrwxfMd-hAwzZjwPTg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [37.6176, 55.7558],
  zoom: 12
});

const track = [
  [37.6176, 55.7558],
  [37.6200, 55.7600],
  [37.6250, 55.7650],
  [37.6300, 55.7700]
];

map.on('load', () => {
  map.addSource('track', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: track }
    }
  });

  map.addLayer({
    id: 'track-line',
    type: 'line',
    source: 'track',
    paint: { 'line-color': '#007bff', 'line-width': 4 }
  });

  const marker = new mapboxgl.Marker().setLngLat(track[0]).addTo(map);

  let index = 0;
  let timer = null;
  let speed = 4;

  document.getElementById('play-btn').addEventListener('click', () => {
    if (timer) return;
    timer = setInterval(() => {
      index++;
      if (index >= track.length) { clearInterval(timer); timer = null; return; }
      marker.setLngLat(track[index]);
      map.flyTo({ center: track[index], speed: 0.5, zoom: 14 });
    }, 1000 / speed);
  });

  document.getElementById('pause-btn').addEventListener('click', () => {
    clearInterval(timer);
    timer = null;
  });

  document.getElementById('speed-slider').addEventListener('sl-change', (e) => {
    speed = parseInt(e.target.value);
    if (timer) {
      clearInterval(timer);
      timer = null;
      index--; // чуть назад, чтобы плавнее
      document.getElementById('play-btn').click();
    }
  });
});

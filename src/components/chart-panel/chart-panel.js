
import { vehicleTrackService } from './../vehicle-render/services/vehicle-track.service'; // твой сервис

import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil,filter,map } from "rxjs";

export class ChartPanel {
    constructor(mapService) {
        this.mapService = mapService;
        this.chartDrawer = document.querySelector('#chartDrawer');
        this.chartCanvas = this.chartDrawer.querySelector('#chartCanvas');
        this.chartEmptyMessage = this.chartDrawer.querySelector('#chartEmptyMessage');
        this.chartInstance = null;
        this.playInterval = null;
        this.playIndex = 0;
        this.speed = 1;

        if (!this.chartDrawer || !this.chartCanvas) {
            console.error('ChartPanel: Не найден sl-drawer или canvas!');
            return;
        }

        this._setupControls();
        this._setupSubscription();
    }

    _setupControls() {
        this.playButton = this.chartDrawer.querySelector('#playButton');
        this.stopButton = this.chartDrawer.querySelector('#stopButton');
        this.speedButtons = this.chartDrawer.querySelectorAll('.speedButton');

        this.playButton.addEventListener('click', () => this._play());
        this.stopButton.addEventListener('click', () => this._stop());
        this.speedButtons.forEach(btn =>
            btn.addEventListener('click', (e) => {
                this.speed = parseInt(e.target.dataset.speed, 10) || 1;
            })
        );
    }

_setupSubscription() {
    vehicleTrackService.vehicleTrack$
        .pipe(
            filter(payload => payload && payload.vehicleId && payload.data),
            map(payload => this._prepareChartData(payload.data.features)),
            distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
        )
        .subscribe((chartData) => {
            if (!chartData.length) {
                this.showEmptyMessage();
                this._destroyChart();
                return;
            }

            this.fullChartData = chartData;
            this.playIndex = 0;
            this.hideEmptyMessage();
            this._renderChart(this.fullChartData);
        });
}

    _play() {
        if (!this.fullChartData || this.fullChartData.length === 0) return;

        this._stop();
        this.playIndex = 0;

        this.playInterval = setInterval(() => {
            if (this.playIndex >= this.fullChartData.length) {
                this._stop();
                return;
            }

            const currentData = this.fullChartData[this.playIndex];
            this._updateCurrentPoint(this.playIndex);

            const mapPoint = this._getMapPointByTimestamp(currentData.timestamp);
            if (mapPoint) {
                this.mapService._updateModel(mapPoint);
            }

            this.playIndex += this.speed;
        }, 300);
    }


    _stop() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this._updateCurrentPoint(null);
    }

    _prepareChartData(features) {
        return features
            .filter(f => f.geometry?.type === 'Point' && f.properties?.timestamp)
            .map(f => ({
                timestamp: new Date(f.properties.timestamp),
                speed: f.properties.speed ?? null,
                altitude: f.properties.altitude ?? null,
                waterfall: f.properties.waterfall ?? 'inactive'
            }));
    }

    _renderChart(data) {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

       const wrapper = this.chartCanvas.parentElement;
const ctx = this.chartCanvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
const width = wrapper.clientWidth;
const height = 180; // или rect.height, если нужен расчёт по DOM

// Физические пиксели для рендеринга
this.chartCanvas.width = width * dpr;
this.chartCanvas.height = height * dpr;

// CSS-пиксели для отображения (в браузере)
this.chartCanvas.style.width = `${width}px`;
this.chartCanvas.style.height = `${height}px`;
       
        ctx.scale(dpr, dpr);

        const labels = data.map(d => d.timestamp.toLocaleTimeString());
        const altitudes = data.map(d => d.altitude);
        const speeds = data.map(d => d.speed);
        const waterfallColors = data.map(d =>
            d.waterfall === 'active' ? 'green' : 'red'
        );

        const currentPointPlugin = {
            id: 'currentPointPlugin',
            afterDatasetsDraw(chart) {
                const datasetIndex = chart.data.datasets.findIndex(d => d.label === 'Текущая позиция');
                if (datasetIndex === -1) return;
                const dataset = chart.getDatasetMeta(datasetIndex);
                const ctx = chart.ctx;

                dataset.data.forEach((point, i) => {
                    if (chart.data.datasets[datasetIndex].data[i] !== null) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
                        ctx.fillStyle = 'red';
                        ctx.shadowColor = '#fff';
                        ctx.shadowBlur = 8;
                        ctx.fill();
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = '#fff';
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            }
        };
        this.chartInstance = new Chart(this.chartCanvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Высота (м)',
                        data: altitudes,
                        borderColor: 'orange',
                        backgroundColor: 'rgba(255,165,0,0.2)',
                        fill: true,
                        tension: 0.4,
                        order: 1
                    },
                    {
                        label: 'Скорость (км/ч)',
                        data: speeds,
                        borderColor: 'blue',
                        backgroundColor: 'rgba(0,0,255,0.2)',
                        fill: false,
                        tension: 0.4,
                        order: 2
                    },
                    {
                        label: 'Статус waterfall',
                        data: altitudes,  // Для позиционирования точек по оси Y
                        pointBackgroundColor: waterfallColors,
                        pointRadius: 5,
                        showLine: false,
                        order: 98
                    },
                    // Переносим Текущую позицию В КОНЕЦ
                    {
                        label: 'Текущая позиция',
                        data: new Array(data.length).fill(null),
                        pointBackgroundColor: 'red',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 1,
                        pointStyle: 'circle',
                        showLine: false,
                        order: 99,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: true } },
                scales: {
                    x: { title: { display: true, text: 'Время' } },
                    y: { title: { display: true, text: 'Значение' } }
                },

            },
            plugins: [currentPointPlugin]
        });
    }

    _updateCurrentPoint(index) {
        if (!this.chartInstance) return;

        const dataset = this.chartInstance.data.datasets.find(d => d.label === 'Текущая позиция');
        if (!dataset) return;

        dataset.data = this.fullChartData.map((d, i) => (i === index ? d.altitude : null));
        this.chartInstance.update('none');
    }

    _getMapPointByTimestamp(timestamp) {
        if (!this.mapService.trackData) return null;
        return this.mapService.trackData.find(point =>
            new Date(point.timestamp).getTime() === timestamp.getTime()
        );
    }

    showEmptyMessage() {
        this.chartEmptyMessage.classList.remove('hidden');
        this.chartCanvas.classList.add('hidden');
    }

    hideEmptyMessage() {
        this.chartEmptyMessage.classList.add('hidden');
        this.chartCanvas.classList.remove('hidden');
    }

    _destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}



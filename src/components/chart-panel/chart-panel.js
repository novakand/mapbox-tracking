// import Chart from 'chart.js/auto';
import { vehicleTrackService } from './../vehicle-render/services/vehicle-track.service'; // твой сервис

import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export class ChartPanel {
    constructor() {
        this.chartDrawer = document.querySelector('#chartDrawer');
        this.chartCanvas = this.chartDrawer.querySelector('#chartCanvas');
         this.chartEmptyMessage = this.chartDrawer.querySelector('#chartEmptyMessage');
        this.chartInstance = null;

        if (!this.chartDrawer || !this.chartCanvas) {
            console.error('ChartPanel: Не найден sl-drawer или canvas!');
            return;
        }

        this._setupSubscription();
    }

    _setupSubscription() {
        vehicleTrackService.vehicleTrack$.subscribe((payload) => {
            if (!payload || !payload.vehicleId || !payload.data) {
                return;
            }

            const { data } = payload;

            if (!data.features || data.features.length === 0) {
               this.showEmptyMessage();
                this._destroyChart();
                return;
            }

            const chartData = this._prepareChartData(data.features);
            this.hideEmptyMessage();
            this._renderChart(chartData);

        });
    }

    _prepareChartData(features) {
        return features
            .filter(f => f.geometry?.type === 'Point' && f.properties?.timestamp)
            .map(f => ({
                timestamp: new Date(f.properties.timestamp),
                speed: f.properties.speed ?? null,
                altitude: f.properties.altitude ?? null
            }));
    }

    _renderChart(data) {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = this.chartCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = this.chartCanvas.getBoundingClientRect();
        this.chartCanvas.width = rect.width * dpr;
        this.chartCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const gradient = ctx.createLinearGradient(0, 0, 0, this.chartCanvas.height);
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.5)'); // Orange
        gradient.addColorStop(1, 'rgba(34, 139, 34, 0.3)'); // Green

        const labels = data.map(d => d.timestamp.toLocaleTimeString());
        const altitudes = data.map(d => d.altitude);
        const speeds = data.map(d => d.speed);

        const peakIndices = [0, ...altitudes.reduce((acc, val, i, arr) => {
            if (i > 0 && val > arr[i - 1] && val > (arr[i + 1] || 0)) acc.push(i);
            return acc;
        }, [])];

        this.chartInstance = new Chart(this.chartCanvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Высота (м)',
                        data: altitudes,
                        borderColor: 'orange',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: (ctx) => peakIndices.includes(ctx.dataIndex) ? 'yellow' : 'transparent',
                        pointBorderColor: 'orange',
                        pointRadius: (ctx) => peakIndices.includes(ctx.dataIndex) ? 6 : 0
                    },
                    {
                        label: 'Скорость (км/ч)',
                        data: speeds,
                        borderColor: 'blue',
                        backgroundColor: 'rgba(0, 0, 255, 0.2)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    x: { title: { display: true, text: 'Время' } },
                    y: { title: { display: true, text: 'Значение' } }
                }
            }
        });
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
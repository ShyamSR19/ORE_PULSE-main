/**
 * OrePulse - Spectral Signature Chart Manager
 * Uses Chart.js to plot reflectance across Sentinel-2 bands (B2, B3, B4, B8, B11, B12)
 * for pixel-level mineral diagnostics.
 */

window.SpectralChart = {
    chartInstance: null,

    initChart: function(canvasId = 'spectralChart') {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Default initial data: Manganese Oxide signature
        const spectralData = window.SentinelService.getPixelSpectralSignature(21.8024, 80.1885, true);

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: spectralData.bands,
                datasets: [
                    {
                        label: 'Observed Sentinel-2 Pixel Reflectance',
                        data: spectralData.reflectance,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        borderWidth: 3,
                        pointBackgroundColor: '#f59e0b',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        tension: 0.2,
                        fill: true
                    },
                    {
                        label: 'Standard Host Schist Baseline',
                        data: [0.06, 0.11, 0.07, 0.45, 0.25, 0.23],
                        borderColor: '#94a3b8',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 3,
                        tension: 0.2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Outfit', size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${(context.raw * 100).toFixed(1)}% Reflectance`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        title: { display: true, text: 'Reflectance (0 - 1.0)', color: '#94a3b8' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        min: 0,
                        max: 0.6
                    }
                }
            }
        });
    },

    updateSpectralProfile: function(lat, lng, isMnTarget = true) {
        const sig = window.SentinelService.getPixelSpectralSignature(lat, lng, isMnTarget);

        if (this.chartInstance) {
            this.chartInstance.data.datasets[0].data = sig.reflectance;
            this.chartInstance.data.datasets[0].borderColor = isMnTarget ? '#f59e0b' : '#3b82f6';
            this.chartInstance.data.datasets[0].pointBackgroundColor = isMnTarget ? '#f59e0b' : '#3b82f6';
            this.chartInstance.update();
        }

        // Update UI Diagnostics
        document.getElementById('pixelCoordInfo').innerText = `Selected Location: Lat ${lat.toFixed(4)}, Lon ${lng.toFixed(4)}`;
        document.getElementById('diagMineral').innerText = sig.mineralType;
        document.getElementById('diagMineral').className = isMnTarget ? 'text-amber' : 'text-blue';
        document.getElementById('diagSwirRatio').innerText = `${sig.swirRatio} ${isMnTarget ? '(Strong Mn Absorption)' : '(Normal Baseline)'}`;
        document.getElementById('diagVnirRatio').innerText = `${sig.vnirRatio}`;
        
        const recEl = document.getElementById('diagRec');
        if (isMnTarget) {
            recEl.innerText = 'HIGH PRIORITY CORE DRILL TARGET (Depth ~25-40m)';
            recEl.className = 'text-green';
        } else {
            recEl.innerText = 'LOW PROSPECTIVITY (Baseline Host Rock / Overburden)';
            recEl.className = 'text-sub';
        }

        // Expand drawer if collapsed
        const drawer = document.getElementById('spectralDrawer');
        if (drawer) {
            drawer.classList.remove('collapsed');
        }
    }
};

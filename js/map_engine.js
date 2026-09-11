/**
 * OrePulse - Leaflet.js Map Engine
 * Manages satellite imagery basemaps, Sentinel-2 spectral layer overlays,
 * Heatmaps (PyKrige interpolation), drill site markers, and vehicle route lines.
 */

window.MapEngine = {
    map: null,
    layers: {},
    krigingLayer: null,
    geojsonLayer: null,
    drillMarkersGroup: null,
    fleetMarkersGroup: null,
    activeRegionKey: 'balaghat',

    /**
     * Initialize Leaflet GIS map viewport
     */
    initMap: function(containerId = 'leafletMap') {
        const defaultRegion = window.SentinelService.regions.balaghat;

        // Create Leaflet Map Instance
        this.map = L.map(containerId, {
            center: [defaultRegion.lat, defaultRegion.lng],
            zoom: defaultRegion.zoom,
            zoomControl: false
        });

        // Add Zoom Control to Top Left
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        // Tile Basemaps
        this.layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri, Maxar, Earthstar Geographics, Sentinel-2 Open Access',
            maxZoom: 18
        });

        this.layers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: OpenStreetMap, SRTM | Map style: OpenTopoMap',
            maxZoom: 17
        });

        this.layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        });

        // Set default basemap
        this.layers.satellite.addTo(this.map);

        // Create Layer Feature Groups
        this.drillMarkersGroup = L.layerGroup().addTo(this.map);
        this.fleetMarkersGroup = L.layerGroup().addTo(this.map);

        // Initialize Map Click Listener for Spectral Signature Ingestion
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            console.log(`[MapEngine] Clicked Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
            const isTarget = Math.random() > 0.3;
            window.SpectralChart.updateSpectralProfile(lat, lng, isTarget);
        });

        // Render Initial Map Layers & Data
        this.updateMapForRegion('balaghat');
    },

    /**
     * Switch Basemap Tile Layer
     */
    setBasemap: function(basemapKey) {
        Object.keys(this.layers).forEach(key => {
            if (this.map.hasLayer(this.layers[key])) {
                this.map.removeLayer(this.layers[key]);
            }
        });

        if (this.layers[basemapKey]) {
            this.layers[basemapKey].addTo(this.map);
        }
    },

    /**
     * Update map focus & overlays for region preset (Async loading)
     */
    updateMapForRegion: async function(regionKey) {
        this.activeRegionKey = regionKey;
        const region = window.SentinelService.regions[regionKey] || window.SentinelService.regions.balaghat;

        this.map.flyTo([region.lat, region.lng], region.zoom, { duration: 1.2 });

        // Load site metadata, GeoJSON contour overlays, and borehole CSV
        const [meta, geojson] = await Promise.all([
            window.SentinelService.fetchRegionMetadata(regionKey),
            window.SentinelService.fetchRegionGeoJSON(regionKey),
            window.ExplorationEngine.fetchBoreholes(regionKey)
        ]);

        // Re-render location-specific overlays
        this.renderKrigingImageOverlay(region, meta);
        this.renderGeoJSONOverlay(geojson);
        this.renderDrillTargets(regionKey);
        this.renderFleetVehicles(regionKey);

        return { meta, geojson };
    },

    /**
     * Render site-specific Kriging PNG heatmap overlay
     */
    renderKrigingImageOverlay: function(region, meta) {
        if (this.krigingLayer && this.map.hasLayer(this.krigingLayer)) {
            this.map.removeLayer(this.krigingLayer);
        }

        const bounds = (meta && meta.bounds) ? meta.bounds : region.defaultBounds;
        const krigingUrl = region.krigingUrl;

        this.krigingLayer = L.imageOverlay(krigingUrl, bounds, {
            opacity: 0.65,
            interactive: false
        });

        const showKriging = document.getElementById('layerKriging')?.checked ?? true;
        if (showKriging) {
            this.krigingLayer.addTo(this.map);
        }
    },

    /**
     * Render site-specific GeoJSON manganese grade contours overlay
     */
    renderGeoJSONOverlay: function(geojsonData) {
        if (this.geojsonLayer && this.map.hasLayer(this.geojsonLayer)) {
            this.map.removeLayer(this.geojsonLayer);
        }

        if (!geojsonData) return;

        this.geojsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                const props = feature.properties || {};
                return {
                    fillColor: props.fill || '#f59e0b',
                    fillOpacity: props['fill-opacity'] !== undefined ? props['fill-opacity'] : 0.6,
                    color: props.stroke || '#b45309',
                    weight: props['stroke-width'] || 1,
                    opacity: props['stroke-opacity'] || 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                if (props.title) {
                    layer.bindTooltip(`Mn Grade Contour: ${props.title}%`, { sticky: true });
                }
                layer.on('click', (e) => {
                    const { lat, lng } = e.latlng;
                    window.SpectralChart.updateSpectralProfile(lat, lng, true);
                });
            }
        });

        const showMnIndex = document.getElementById('layerMnIndex')?.checked ?? true;
        if (showMnIndex) {
            this.geojsonLayer.addTo(this.map);
        }
    },

    /**
     * Render location-specific AI core drill target markers
     */
    renderDrillTargets: function(regionKey) {
        this.drillMarkersGroup.clearLayers();
        const targets = window.ExplorationEngine.getOptimizedDrillTargets(regionKey);

        targets.forEach(tgt => {
            const customIcon = L.divIcon({
                className: 'custom-drill-icon',
                html: `<div style="
                    background: #f59e0b;
                    color: #000;
                    border: 2px solid #fff;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 11px;
                    box-shadow: 0 0 12px rgba(245, 158, 11, 0.8);
                "><i class="fa-solid fa-crosshairs"></i></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([tgt.lat, tgt.lng], { icon: customIcon });

            const popupContent = `
                <div style="font-family: sans-serif; color: #000; padding: 4px;">
                    <h4 style="margin:0 0 4px 0; color: #d97706;">${tgt.id}: ${tgt.name}</h4>
                    <p style="margin:0 0 4px 0; font-size:12px;"><strong>Priority:</strong> ${tgt.priority}</p>
                    <p style="margin:0 0 4px 0; font-size:12px;"><strong>Target Depth:</strong> ${tgt.estDepth} m</p>
                    <p style="margin:0 0 4px 0; font-size:12px;"><strong>Est. Grade:</strong> ${tgt.estGrade}</p>
                    <p style="margin:0 0 4px 0; font-size:12px;"><strong>SWIR B11/B12 Ratio:</strong> ${tgt.swirRatio}</p>
                    <p style="margin:0 0 4px 0; font-size:12px;"><strong>Mineral:</strong> ${tgt.mineral}</p>
                    <p style="margin:4px 0 0 0; font-size:11px; color:#666;">${tgt.description}</p>
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('click', () => {
                window.SpectralChart.updateSpectralProfile(tgt.lat, tgt.lng, true);
            });

            this.drillMarkersGroup.addLayer(marker);
        });
    },

    /**
     * Render Fleet Telematics & Vehicle Routes positioned per region
     */
    renderFleetVehicles: function(regionKey) {
        this.fleetMarkersGroup.clearLayers();
        const region = window.SentinelService.regions[regionKey] || window.SentinelService.regions.balaghat;
        const fleet = window.ProductionEngine.getFleetTelematics(regionKey);

        const offsets = [
            { dLat: 0.0012, dLng: -0.0028 },
            { dLat: -0.0035, dLng: 0.0018 },
            { dLat: 0.0024, dLng: 0.0042 },
            { dLat: -0.0028, dLng: -0.0036 }
        ];

        fleet.forEach((item, index) => {
            const offset = offsets[index % offsets.length];
            const vLat = region.lat + offset.dLat;
            const vLng = region.lng + offset.dLng;

            const isWarning = item.status === "WARNING";
            const color = isWarning ? '#ef4444' : '#10b981';

            const vehicleIcon = L.divIcon({
                className: 'custom-fleet-icon',
                html: `<div style="
                    background: ${color};
                    color: #fff;
                    border: 2px solid #fff;
                    border-radius: 6px;
                    padding: 2px 6px;
                    font-weight: bold;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    box-shadow: 0 0 10px ${color};
                "><i class="fa-solid ${item.id.startsWith('EX') ? 'fa-digger' : 'fa-truck-monster'}"></i> ${item.id}</div>`,
                iconSize: [60, 20],
                iconAnchor: [30, 10]
            });

            const marker = L.marker([vLat, vLng], { icon: vehicleIcon });
            marker.bindPopup(`
                <div style="color:#000;">
                    <h4 style="margin:0;">${item.name} (${item.id})</h4>
                    <p style="margin:4px 0;"><strong>Status:</strong> ${item.status}</p>
                    <p style="margin:4px 0;"><strong>Speed:</strong> ${item.speed}</p>
                    <p style="margin:4px 0;"><strong>Location:</strong> ${item.location}</p>
                    <p style="margin:4px 0; color:#dc2626;"><strong>Alert:</strong> ${item.riskStatus}</p>
                </div>
            `);

            this.fleetMarkersGroup.addLayer(marker);
        });

        // Add Dynamic Haul Road Polyline Route for active region
        const haulRoutePoints = [
            [region.lat - 0.004, region.lng + 0.002],
            [region.lat - 0.001, region.lng + 0.001],
            [region.lat + 0.002, region.lng + 0.003],
            [region.lat + 0.004, region.lng + 0.005]
        ];

        const routeLine = L.polyline(haulRoutePoints, {
            color: '#f59e0b',
            weight: 4,
            dashArray: '8, 8',
            opacity: 0.85
        }).bindTooltip(`${region.name.split(' ')[0]} Haul Road #2 (Incline Bench)`);

        this.fleetMarkersGroup.addLayer(routeLine);
    },

    /**
     * Toggle layer visibility
     */
    toggleLayerVisibility: function(layerName, visible) {
        if (layerName === 'mnIndex' && this.geojsonLayer) {
            if (visible) { this.map.addLayer(this.geojsonLayer); }
            else { this.map.removeLayer(this.geojsonLayer); }
        } else if (layerName === 'kriging' && this.krigingLayer) {
            if (visible) { this.map.addLayer(this.krigingLayer); }
            else { this.map.removeLayer(this.krigingLayer); }
        } else if (layerName === 'drillTargets' && this.drillMarkersGroup) {
            if (visible) { this.map.addLayer(this.drillMarkersGroup); }
            else { this.map.removeLayer(this.drillMarkersGroup); }
        }
    }
};

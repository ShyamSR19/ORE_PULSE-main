/**
 * OrePulse - Main Dashboard Controller & UI Event Handlers
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("[OrePulse App] Initializing Dashboard Application...");

    // 1. Initialize Map & Chart Modules
    window.MapEngine.initMap('leafletMap');
    window.SpectralChart.initChart('spectralChart');

    // Initial region data load
    await handleRegionChange('balaghat');

    // 2. Sidebar Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 3. Region Selector Handler
    const regionSelect = document.getElementById('regionPresetSelect');
    regionSelect.addEventListener('change', async (e) => {
        const selectedRegion = e.target.value;
        await handleRegionChange(selectedRegion);
    });

    // 4. Fetch Sentinel-2 Live Scene Sync
    const btnSync = document.getElementById('btnSyncSentinel');
    btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        btnSync.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching Sentinel-2 STAC...`;

        const currentRegion = regionSelect.value;
        const res = await window.SentinelService.fetchSentinelScene(currentRegion);

        setTimeout(() => {
            btnSync.disabled = false;
            btnSync.innerHTML = `<i class="fa-solid fa-satellite"></i> Fetch Live Sentinel-2 Scene`;

            const statusEl = document.getElementById('stacStatus');
            statusEl.innerText = `Scene: ${res.sceneId.substring(0, 18)}... (Cloud: ${res.cloudCover}%)`;
            
            alert(`Sentinel-2 Live Scene Synchronized Successfully!\n\nScene ID: ${res.sceneId}\nAcquisition Date: ${res.acquisitionDate}\nCloud Cover: ${res.cloudCover}%\nTile MGRS: ${res.tileId}`);
        }, 1200);
    });

    // 5. Layer Toggle Checkboxes
    const layerMnIndex = document.getElementById('layerMnIndex');
    if (layerMnIndex) {
        layerMnIndex.addEventListener('change', (e) => {
            window.MapEngine.toggleLayerVisibility('mnIndex', e.target.checked);
        });
    }

    document.getElementById('layerKriging').addEventListener('change', (e) => {
        window.MapEngine.toggleLayerVisibility('kriging', e.target.checked);
    });

    document.getElementById('layerDrillTargets').addEventListener('change', (e) => {
        window.MapEngine.toggleLayerVisibility('drillTargets', e.target.checked);
    });

    // 6. Spectral Parameter Sliders
    const sliderCutoff = document.getElementById('sliderCutoff');
    const cutoffValue = document.getElementById('cutoffValue');
    sliderCutoff.addEventListener('input', (e) => {
        cutoffValue.innerText = e.target.value;
    });

    // 7. Basemap Mode Buttons
    document.getElementById('btnSatelliteBasemap').addEventListener('click', function() {
        setActiveBasemapBtn(this);
        window.MapEngine.setBasemap('satellite');
    });

    document.getElementById('btnTopoBasemap').addEventListener('click', function() {
        setActiveBasemapBtn(this);
        window.MapEngine.setBasemap('topo');
    });

    document.getElementById('btnOpenStreetMap').addEventListener('click', function() {
        setActiveBasemapBtn(this);
        window.MapEngine.setBasemap('osm');
    });

    function setActiveBasemapBtn(clickedBtn) {
        document.querySelectorAll('.map-mode-btn').forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
    }

    // 8. Spectral Drawer Collapse / Close
    const spectralDrawer = document.getElementById('spectralDrawer');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');

    btnCloseDrawer.addEventListener('click', (e) => {
        e.stopPropagation();
        spectralDrawer.classList.toggle('collapsed');
    });

    // 9. Export Drill Targets CSV
    document.getElementById('btnExportDrillTargets').addEventListener('click', () => {
        const currentRegion = regionSelect.value;
        const targets = window.ExplorationEngine.getOptimizedDrillTargets(currentRegion);

        let csvContent = "data:text/csv;charset=utf-8,TargetID,Priority,Latitude,Longitude,EstDepth_m,EstGrade_Mn,SWIR_Ratio,Confidence\n";
        targets.forEach(t => {
            csvContent += `${t.id},${t.priority},${t.lat},${t.lng},${t.estDepth},${t.estGrade},${t.swirRatio},${t.confidence}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `OrePulse_Manganese_Drill_Targets_${currentRegion}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

/**
 * Async master region change handler
 */
async function handleRegionChange(regionKey) {
    const { meta } = await window.MapEngine.updateMapForRegion(regionKey);
    updateDashboardStats(regionKey, meta);
    updateDrillTargetsList(regionKey);
    populateFleetList(regionKey);
    populateReroutesFeed(regionKey);
}

/**
 * Update summary stats cards on sidebar
 */
function updateDashboardStats(regionKey, meta) {
    const stats = window.ExplorationEngine.getSiteStats(regionKey, meta);
    
    const elArea = document.getElementById('statHighProbArea');
    const elGrade = document.getElementById('statAvgGrade');
    const elTargets = document.getElementById('statTargetsFound');
    const elConf = document.getElementById('statConfidence');

    if (elArea) elArea.innerText = stats.highProbArea;
    if (elGrade) elGrade.innerText = stats.avgGrade;
    if (elTargets) elTargets.innerText = stats.targetsFound;
    if (elConf) elConf.innerText = stats.confidence;
}

/**
 * Populate Fleet Telematics List UI
 */
function populateFleetList(regionKey = 'balaghat') {
    const listEl = document.getElementById('fleetList');
    if (!listEl) return;

    const fleet = window.ProductionEngine.getFleetTelematics(regionKey);
    listEl.innerHTML = '';

    fleet.forEach(item => {
        const isWarning = item.status === "WARNING";
        const badgeClass = isWarning ? 'badge-warning' : 'badge-info';

        const div = document.createElement('div');
        div.className = 'drill-item';
        div.innerHTML = `
            <div class="drill-header">
                <span>${item.name} (${item.id})</span>
                <span class="risk-badge ${badgeClass}">${item.status}</span>
            </div>
            <div class="drill-coords">Location: ${item.location}</div>
            <div class="drill-coords" style="color:${isWarning ? '#ef4444' : '#10b981'}; font-weight:600;">Alert: ${item.riskStatus}</div>
        `;
        listEl.appendChild(div);
    });
}

/**
 * Populate Drill Targets UI
 */
function updateDrillTargetsList(regionKey = 'balaghat') {
    const listEl = document.getElementById('drillTargetsList');
    if (!listEl) return;

    const targets = window.ExplorationEngine.getOptimizedDrillTargets(regionKey);
    listEl.innerHTML = '';

    targets.forEach(t => {
        const div = document.createElement('div');
        div.className = 'drill-item';
        div.innerHTML = `
            <div class="drill-header">
                <span>${t.id}: ${t.name}</span>
                <span class="text-amber">${t.priority}</span>
            </div>
            <div class="drill-coords">Coords: Lat ${t.lat.toFixed(4)}, Lon ${t.lng.toFixed(4)}</div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-top:4px; color:#94a3b8;">
                <span>Depth: <strong>${t.estDepth}m</strong></span>
                <span>Grade: <strong>${t.estGrade}</strong></span>
                <span>Conf: <strong class="text-green">${t.confidence}</strong></span>
            </div>
        `;
        div.addEventListener('click', () => {
            window.MapEngine.map.flyTo([t.lat, t.lng], 15);
            window.SpectralChart.updateSpectralProfile(t.lat, t.lng, true);
        });
        listEl.appendChild(div);
    });
}

/**
 * Populate Reroute Dispatch Feed
 */
function populateReroutesFeed(regionKey = 'balaghat') {
    const feedEl = document.getElementById('rerouteFeed');
    if (!feedEl) return;

    const reroutes = window.ProductionEngine.getDispatchReroutes(regionKey);
    feedEl.innerHTML = '';

    reroutes.forEach(r => {
        const div = document.createElement('div');
        div.className = 'risk-card high-risk';
        div.innerHTML = `
            <div class="risk-header">
                <span><i class="fa-solid fa-route"></i> ${r.id}</span>
                <span class="risk-badge badge-warning">${r.status}</span>
            </div>
            <p class="risk-body"><strong>Target Fleet:</strong> ${r.targetFleet.join(', ')}</p>
            <p class="risk-body"><strong>Original Route:</strong> ${r.originalRoute}</p>
            <p class="risk-body" style="color:#10b981;"><strong>Suggested Bypass:</strong> ${r.suggestedRoute}</p>
            <p class="risk-body" style="font-size:11px; margin-top:4px;">${r.reason} (Saved: ${r.timeSaved})</p>
        `;
        feedEl.appendChild(div);
    });
}

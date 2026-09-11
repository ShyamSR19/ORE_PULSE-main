/**
 * OrePulse - Proactive Production Management & Dispatch Re-routing Engine
 * Monitors real-time mine weather, machinery telemetry (excavators, dumpers),
 * predicts flooding / road instability risks, and issues automated truck schedule re-routes.
 */

window.ProductionEngine = {
    /**
     * Heavy Mining Machinery Telematics (Dumpers & Excavators) per region
     */
    getFleetTelematics: function(regionKey = 'balaghat') {
        const siteNames = {
            balaghat: "Bharveli Pit Bench #4",
            dongri: "Dongri Main West Cut",
            ukwa: "Ukwa Incline Sector"
        };
        const siteName = siteNames[regionKey] || "Pit Sector";

        return [
            {
                id: "HT-101",
                name: "CAT 777 Haul Truck",
                status: "ACTIVE",
                location: `${siteName} -> Main Crusher`,
                speed: "28 km/h",
                payload: "92 Tonnes",
                riskStatus: "NORMAL",
                routeId: `${regionKey.toUpperCase()}_ROUTE_ALPHA`
            },
            {
                id: "HT-104",
                name: "Komatsu HD785 Haul Truck",
                status: "WARNING",
                location: `${siteName} (Incline Bench 3)`,
                speed: "14 km/h (Restricted)",
                payload: "88 Tonnes",
                riskStatus: "ROAD SLICKNESS ALERT",
                routeId: `${regionKey.toUpperCase()}_HAZARD_BETA`
            },
            {
                id: "EX-02",
                name: "Hitachi EX1200 Excavator",
                status: "ACTIVE",
                location: `${siteName} (Mn Ore Horizon)`,
                statusDetail: "Loading Dumpers (Cycle time: 2.1 min)",
                riskStatus: "NORMAL",
                routeId: `${regionKey.toUpperCase()}_BENCH_4`
            },
            {
                id: "EX-04",
                name: "CAT 390F Excavator",
                status: "WARNING",
                location: `${siteName} Extension`,
                statusDetail: "Hydraulic Temp: 92°C (High)",
                riskStatus: "BREAKDOWN RISK",
                routeId: `${regionKey.toUpperCase()}_BENCH_2`
            }
        ];
    },

    /**
     * Automated Fleet Schedule Re-Routing Dispatch Generator per region
     */
    getDispatchReroutes: function(regionKey = 'balaghat') {
        const sitePrefix = (regionKey || 'balaghat').toUpperCase();
        return [
            {
                id: `DISPATCH-${sitePrefix}-892`,
                timestamp: "10 mins ago",
                targetFleet: ["HT-104", "HT-108", "HT-112"],
                originalRoute: `${sitePrefix} Haul Road #2 (Incline 12° Slope)`,
                suggestedRoute: `${sitePrefix} Haul Bypass #4 via East Ridge Cut`,
                reason: "Predicted 64mm rainfall causing friction coefficient drop (< 0.35) and rollover risk.",
                action: "REDIRECTED VIA AUTO-DISPATCH",
                timeSaved: "22 mins per dumper cycle",
                status: "ACTIVE_REROUTE"
            },
            {
                id: `DISPATCH-${sitePrefix}-893`,
                timestamp: "Just Now",
                targetFleet: ["HT-102", "HT-105"],
                originalRoute: `${sitePrefix} Pit Sump Exit Bench #4`,
                suggestedRoute: `${sitePrefix} Ramp #1 North Highwall`,
                reason: "Pit flooding risk (NDWI 0.74, soil saturation 88%). Water accumulation 1,420 m³/hr.",
                action: "AUTO-ASSIGNED TO HIGHWALL RAMP",
                timeSaved: "Prevents pit lock-in downtime",
                status: "PENDING_CONFIRMATION"
            }
        ];
    }
};

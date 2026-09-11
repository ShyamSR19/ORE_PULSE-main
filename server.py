import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="OrePulse API Server", description="Sentinel-2 Manganese AI GIS Platform")

# Serve static files (HTML, CSS, JS, overlays, data)
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
if os.path.exists("public"):
    app.mount("/public", StaticFiles(directory="public"), name="public")
if os.path.exists("data"):
    app.mount("/data", StaticFiles(directory="data"), name="data")
if os.path.exists("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
async def read_index():
    return FileResponse("index.html")

@app.get("/api/health")
async def health_check():
    return {"status": "online", "platform": "OrePulse AI-GIS v2.4", "stac": "Copernicus / Sentinel-2 STAC Active"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

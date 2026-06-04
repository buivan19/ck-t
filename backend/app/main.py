import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import models, database, schemas, auth, routers

app = FastAPI(title="IoT Health Monitoring API", version="0.1.0")

# Include routers
app.include_router(routers.auth.router, prefix="/auth", tags=["auth"])
app.include_router(routers.sensor.router, prefix="/sensor", tags=["sensor"])
app.include_router(routers.alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(routers.devices.router, prefix="/devices", tags=["devices"])
app.include_router(routers.admin.router, prefix="/admin", tags=["admin"])

# Create DB tables on startup (use Alembic in real project)
@app.on_event("startup")
async def startup():
    models.Base.metadata.create_all(bind=database.engine)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

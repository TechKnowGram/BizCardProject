from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.concurrency import run_in_threadpool
from app.bootstrap import initialize_application
from app.api.routes.auth import router as auth_router
from app.api.routes.cards import router as cards_router
from app.api.routes.companies import router as companies_router
from app.api.routes.employees import router as employees_router
from app.api.routes.templates import router as templates_router
from app.api.routes.profile import router as profile_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.verification import router as verification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(initialize_application)
    yield


app = FastAPI(title='BizCard API', version='1.0.0', lifespan=lifespan)
app.include_router(auth_router)
app.include_router(companies_router)
app.include_router(employees_router)
app.include_router(templates_router)
app.include_router(cards_router)
app.include_router(profile_router)
app.include_router(notifications_router)
app.include_router(verification_router)


@app.get('/', tags=['Health'])
def health():
    return {'message': 'BizCard API is running'}

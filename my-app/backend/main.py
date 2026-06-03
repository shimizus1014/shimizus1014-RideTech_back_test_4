from fastapi import FastAPI
from sqlalchemy import text

from database import SessionLocal

app = FastAPI()

@app.get("/")
def root():
    db = SessionLocal()

    try:
        db.execute(text("SELECT 1"))
        return {"message": "DB connection OK"}
    finally:
        db.close()
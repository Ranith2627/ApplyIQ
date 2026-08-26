from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def home():
    return {"message": "ApplyIQ backend is running"}
from trash_segment import trash_percentage as advanced_trash_percentage
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import open_clip
import io


import torchvision.transforms as T
from torchvision.models.segmentation import deeplabv3_resnet101
import numpy as np

from ultralytics import YOLO

app = FastAPI()

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load CLIP model once at startup
device = "cpu" if torch.cuda.is_available() else "cpu"

model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="openai"
)

model = model.to(device)
model.eval()

# Load YOLOv8 model
yolo_model = YOLO("yolov8n.pt")

# Load segmentation model
seg_model = deeplabv3_resnet101(pretrained=True)
seg_model = seg_model.to("cpu")
seg_model.eval()


@app.post("/embedding")
async def get_embedding(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    image_input = preprocess(image).unsqueeze(0).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image_input)
        image_features /= image_features.norm(dim=-1, keepdim=True)

    embedding = image_features.cpu().numpy().flatten().tolist()

    return {"embedding": embedding}


@app.post("/detect-trash")
async def detect_trash(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    results = yolo_model(image)

    trash_classes = [
        "bottle",
        "cup",
        "banana",
        "apple",
        "sandwich",
        "orange",
        "broccoli",
        "carrot"
    ]

    trash_count = 0

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = yolo_model.names[cls_id]

            if label in trash_classes:
                trash_count += 1

    return {"trash_objects": trash_count}


@app.post("/trash-percentage")
async def trash_percentage(file: UploadFile = File(...)):

    contents = await file.read()

    image = Image.open(io.BytesIO(contents)).convert("RGB")

    results = yolo_model(image)

    width, height = image.size
    image_area = width * height

    trash_classes = [
        "bottle",
        "cup",
        "wine glass",
        "fork",
        "knife",
        "spoon",
        "banana",
        "apple",
        "sandwich",
        "orange",
        "broccoli",
        "carrot"
    ]

    trash_area = 0

    for r in results:
        for box in r.boxes:

            cls_id = int(box.cls[0])
            label = yolo_model.names[cls_id]

            if label in trash_classes:

                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                box_area = (x2 - x1) * (y2 - y1)

                trash_area += box_area

    percentage = (trash_area / image_area) * 100

    return {"trash_percentage": float(percentage)}

@app.post("/trash-percentage-advanced")
async def trash_percentage_advanced(file: UploadFile = File(...)):

    contents = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(contents)
        path = tmp.name

    percentage = advanced_trash_percentage(path)

    return {"trash_percentage": percentage}
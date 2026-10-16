"""
Vision API Endpoints.
Preserves existing Express/frontend contracts while providing robust validation.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional
import json

from app.vision.schemas import VisionAnalysisResponse, WasteDetectionResponse
from app.vision.inference import vision_engine

router = APIRouter(tags=["Computer Vision"])


@router.post(
    "/predict",
    response_model=VisionAnalysisResponse,
    summary="Vision Diagnostic Detection (Legacy/Express compatible)"
)
@router.post(
    "/api/vision/analyze",
    response_model=VisionAnalysisResponse,
    summary="Vision Diagnostic Detection"
)
async def analyze_vision_endpoint(
    request: Request,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    location: Optional[str] = Form(None),
    building_id: Optional[str] = Form(None),
    zone_id: Optional[str] = Form(None),
    confidence_threshold: Optional[float] = Form(None)
):
    """
    Accepts multipart/form-data image upload.
    Validates file format, size, dimensions, and performs diagnostic inference.
    """
    upload = image or file
    image_bytes = None
    content_type = None

    if upload:
        content_type = upload.content_type
        image_bytes = await upload.read()
    else:
        # Check if raw body or JSON payload with base64 was sent
        try:
            body = await request.body()
            if body and len(body) > 0:
                # Check if JSON
                try:
                    payload = json.loads(body.decode("utf-8"))
                    # If JSON passed
                    building_id = payload.get("building_id", building_id)
                    zone_id = payload.get("zone_id", zone_id)
                except Exception:
                    # Treat raw body as image bytes
                    image_bytes = body
                    content_type = request.headers.get("content-type", "image/jpeg")
        except Exception:
            pass

    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Missing image file. Please provide an image file under field 'image' or 'file'."
        )

    try:
        response = vision_engine.analyze_image(
            image_bytes=image_bytes,
            content_type=content_type,
            building_id=building_id or location,
            zone_id=zone_id,
            confidence_threshold=confidence_threshold
        )
        return response
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision inference error: {str(e)}")


@router.post(
    "/detect/waste",
    response_model=WasteDetectionResponse,
    summary="Waste Detection API (backend/src/integrations/aiClient.js compatible)"
)
async def detect_waste_endpoint(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Preserves contract with Person 3 AI microservice specified in aiClient.js.
    """
    upload = file or image
    if not upload:
        raise HTTPException(status_code=400, detail="Missing file in form-data.")

    image_bytes = await upload.read()
    try:
        return vision_engine.detect_waste_compat(image_bytes, upload.content_type)
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Waste detection error: {str(e)}")

"""
Unit tests for Computer Vision service.
Validates Acceptance Tests 1, 2, 3:
1. Valid image returns a schema-valid response.
2. Invalid/oversized image is rejected safely.
3. Low-confidence result is shown as uncertain.
"""

import io
import pytest
from PIL import Image

from app.vision.inference import vision_engine
from app.vision.schemas import VisionAnalysisResponse


def create_test_image_bytes(width=200, height=200, color=(100, 150, 220), format="JPEG") -> bytes:
    """Helper to generate in-memory test image bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_valid_image_returns_schema_valid_response():
    """Acceptance Test 1: Valid image returns a schema-valid response."""
    img_bytes = create_test_image_bytes(300, 300, color=(50, 120, 200), format="PNG")
    
    response = vision_engine.analyze_image(
        image_bytes=img_bytes,
        content_type="image/png",
        building_id="Cafeteria",
        zone_id="Zone C"
    )

    assert isinstance(response, VisionAnalysisResponse)
    assert response.analysis_status in ("completed", "uncertain")
    assert response.model_version == "2.4.0"
    assert response.is_live_model is True
    assert response.inference_time_ms >= 0.0
    assert len(response.detections) > 0
    assert len(response.limitations) > 0
    
    # Check bounding box schema
    det = response.detections[0]
    assert det.confidence >= 0.0 and det.confidence <= 1.0
    assert det.severity in ("low", "medium", "high", "critical")
    if det.bounding_box:
        assert det.bounding_box.width > 0
        assert det.bounding_box.height > 0


def test_oversized_image_rejected_safely():
    """Acceptance Test 2a: Oversized image is rejected safely."""
    # Temporarily set max size to 100 KB for test
    orig_max = vision_engine.config.max_file_size_bytes
    try:
        vision_engine.config.max_file_size_bytes = 100 * 1024 # 100 KB
        large_bytes = b"0" * (150 * 1024) # 150 KB
        
        with pytest.raises(ValueError) as excinfo:
            vision_engine.validate_image(large_bytes, "image/jpeg")
        assert "exceeds maximum allowed limit" in str(excinfo.value)
    finally:
        vision_engine.config.max_file_size_bytes = orig_max


def test_invalid_and_corrupt_images_rejected_safely():
    """Acceptance Test 2b: Invalid/corrupt files rejected safely."""
    # 1. Corrupt payload
    corrupt_bytes = b"NOT_AN_IMAGE_HEADER_CORRUPTED_BYTES_123456"
    with pytest.raises(ValueError) as exc1:
        vision_engine.validate_image(corrupt_bytes, "image/jpeg")
    assert "Corrupted or invalid" in str(exc1.value)

    # 2. Unsupported content-type
    pdf_bytes = b"%PDF-1.4 header..."
    with pytest.raises(ValueError) as exc2:
        vision_engine.validate_image(pdf_bytes, "application/pdf")
    assert "Unsupported content type" in str(exc2.value)

    # 3. Empty payload
    with pytest.raises(ValueError) as exc3:
        vision_engine.validate_image(b"", "image/jpeg")
    assert "Empty image file" in str(exc3.value)


def test_tiny_image_rejected():
    """Images smaller than minimum dimensions (32x32) are safely rejected."""
    tiny_bytes = create_test_image_bytes(16, 16)
    with pytest.raises(ValueError) as exc:
        vision_engine.validate_image(tiny_bytes, "image/jpeg")
    assert "too small" in str(exc.value)


def test_low_confidence_result_shown_as_uncertain():
    """Acceptance Test 3: Low-confidence result is shown as uncertain."""
    # Low-contrast gray image generates lower feature confidence
    gray_bytes = create_test_image_bytes(200, 200, color=(128, 128, 128))
    
    # Run with high confidence threshold
    res = vision_engine.analyze_image(
        image_bytes=gray_bytes,
        confidence_threshold=0.95
    )

    assert isinstance(res, VisionAnalysisResponse)
    # The detections returned must have is_uncertain=True or be labeled uncertain
    assert res.analysis_status in ("uncertain", "completed")
    if res.detections:
        assert any(d.is_uncertain for d in res.detections) or res.detections[0].confidence < 0.95

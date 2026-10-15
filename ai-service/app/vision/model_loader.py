"""
Vision Model Loader Singleton.
Loads neural weights once at application startup.
Supports ONNX Runtime models and feature-calibrated vision analyzers.
"""

import os
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("econexus.vision.loader")

class VisionModelLoader:
    """Manages lifecycle of Computer Vision model sessions."""
    _instance: Optional['VisionModelLoader'] = None

    def __init__(self):
        self.session = None
        self.model_name = "ecopulse-cv-v2.4"
        self.model_version = "2.4.0"
        self.framework = "ONNX Runtime / PIL CV Engine"
        self.license = "Apache-2.0"
        self.device = "CPU (Optimized SIMD)"
        self.is_loaded = False
        self.load_duration_ms: float = 0.0

    @classmethod
    def get_instance(cls) -> 'VisionModelLoader':
        if cls._instance is None:
            cls._instance = VisionModelLoader()
        return cls._instance

    def load_model(self, model_path: Optional[str] = None):
        """Load model weights once into memory."""
        start = time.perf_counter()
        
        # Check if an ONNX model file exists on disk
        target_path = model_path or os.getenv("VISION_MODEL_PATH", "models/vision_model.onnx")
        if os.path.exists(target_path):
            try:
                import onnxruntime as ort
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.session = ort.InferenceSession(target_path, opts, providers=["CPUExecutionProvider"])
                self.framework = "ONNX Runtime (CPUExecutionProvider)"
                logger.info(f"Loaded ONNX neural network from {target_path}")
            except Exception as e:
                logger.warning(f"Could not load ONNX model at {target_path}: {e}. Falling back to Vision Feature Pipeline.")
                self.session = None
        else:
            # Calibrated Vision Diagnostic Pipeline
            self.session = None
            self.framework = "EcoPulse Vision Diagnostic Pipeline (NumPy + PIL Image Analysis)"
            logger.info("Using embedded lightweight Vision Diagnostic Engine (No external weight download required).")

        self.load_duration_ms = round((time.perf_counter() - start) * 1000, 2)
        self.is_loaded = True
        logger.info(f"Model loader initialized in {self.load_duration_ms}ms (version={self.model_version})")

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "framework": self.framework,
            "license": self.license,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "load_duration_ms": self.load_duration_ms
        }


model_loader = VisionModelLoader.get_instance()

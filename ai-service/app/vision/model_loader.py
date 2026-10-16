"""
Vision Model Loader Singleton.
Loads neural weights once at application startup.
Supports ONNX Runtime models and feature-calibrated vision analyzers.
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import numpy as np
from PIL import Image

logger = logging.getLogger("econexus.vision.loader")

class VisionModelLoader:
    """Manages lifecycle of Computer Vision model sessions."""
    _instance: Optional['VisionModelLoader'] = None

    def __init__(self):
        self.session = None
        self.input_name = None
        self.output_name = None
        self.classes: List[str] = []
        self.model_name = "MobileNetV2-ONNX (ImageNet) + EcoPulse Vision Pipeline"
        self.model_version = "2.4.0"
        self.framework = "ONNX Runtime (CPUExecutionProvider)"
        self.license = "Apache-2.0"
        self.device = "CPU (Optimized SIMD)"
        self.is_loaded = False
        self.load_duration_ms: float = 0.0

    @classmethod
    def get_instance(cls) -> 'VisionModelLoader':
        if cls._instance is None:
            cls._instance = VisionModelLoader()
        return cls._instance

    def _resolve_model_path(self, model_path: Optional[str] = None) -> Optional[Path]:
        """Resolves target model path across multiple candidate directories."""
        candidates = []
        if model_path:
            candidates.append(Path(model_path))
        env_path = os.getenv("VISION_MODEL_PATH")
        if env_path:
            candidates.append(Path(env_path))

        base_dir = Path(__file__).resolve().parent.parent.parent # ai-service
        candidates.extend([
            base_dir / "models" / "mobilenetv2-7.onnx",
            base_dir / "models" / "vision_model.onnx",
            Path("models/mobilenetv2-7.onnx"),
            Path("ai-service/models/mobilenetv2-7.onnx")
        ])

        for c in candidates:
            if c.exists():
                return c.resolve()
        return None

    def _resolve_labels_path(self) -> Optional[Path]:
        base_dir = Path(__file__).resolve().parent.parent.parent
        candidates = [
            base_dir / "models" / "imagenet_classes.txt",
            Path("models/imagenet_classes.txt"),
            Path("ai-service/models/imagenet_classes.txt")
        ]
        for c in candidates:
            if c.exists():
                return c.resolve()
        return None

    def load_model(self, model_path: Optional[str] = None):
        """Load model weights and labels once into memory."""
        start = time.perf_counter()
        
        # Load ImageNet labels if present
        labels_file = self._resolve_labels_path()
        if labels_file and labels_file.exists():
            try:
                with open(labels_file, "r", encoding="utf-8") as f:
                    self.classes = [line.strip() for line in f if line.strip()]
                logger.info(f"Loaded {len(self.classes)} class labels from {labels_file.name}")
            except Exception as e:
                logger.warning(f"Could not load labels file: {e}")
                self.classes = []

        # Check if an ONNX model file exists on disk
        resolved_model = self._resolve_model_path(model_path)
        if resolved_model and resolved_model.exists():
            try:
                import onnxruntime as ort
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.session = ort.InferenceSession(str(resolved_model), opts, providers=["CPUExecutionProvider"])
                self.input_name = self.session.get_inputs()[0].name
                self.output_name = self.session.get_outputs()[0].name
                self.framework = "ONNX Runtime (CPUExecutionProvider)"
                self.model_name = f"MobileNetV2-ONNX ({resolved_model.name})"
                logger.info(f"Loaded ONNX neural network from {resolved_model}")
            except Exception as e:
                logger.warning(f"Could not load ONNX model at {resolved_model}: {e}. Falling back to Vision Feature Pipeline.")
                self.session = None
                self.framework = "EcoPulse Vision Diagnostic Pipeline (NumPy + PIL Image Analysis)"
        else:
            self.session = None
            self.framework = "EcoPulse Vision Diagnostic Pipeline (NumPy + PIL Image Analysis)"
            logger.info("Using embedded Vision Diagnostic Pipeline.")

        self.load_duration_ms = round((time.perf_counter() - start) * 1000, 2)
        self.is_loaded = True
        logger.info(f"Model loader initialized in {self.load_duration_ms}ms (version={self.model_version})")

    def classify_image(self, pil_image: Image.Image, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Runs neural forward pass on PIL image using MobileNetV2 ONNX session.
        Returns sorted list of (class_label, probability).
        """
        if not self.session or not self.classes:
            return []
        try:
            # Resize and convert to standard ImageNet input
            rgb = pil_image.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
            arr = np.array(rgb).astype(np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            norm = (arr - mean) / std
            tensor = np.transpose(norm, (2, 0, 1))[np.newaxis, :, :, :] # Shape: [1, 3, 224, 224]

            logits = self.session.run([self.output_name], {self.input_name: tensor})[0][0]
            # Softmax
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)

            top_indices = np.argsort(probs)[::-1][:top_k]
            results = []
            for idx in top_indices:
                if idx < len(self.classes):
                    results.append((self.classes[idx], float(probs[idx])))
            return results
        except Exception as e:
            logger.error(f"ONNX classification error: {e}")
            return []

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "framework": self.framework,
            "license": self.license,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "load_duration_ms": self.load_duration_ms,
            "has_onnx_session": self.session is not None,
            "num_classes": len(self.classes)
        }

model_loader = VisionModelLoader.get_instance()

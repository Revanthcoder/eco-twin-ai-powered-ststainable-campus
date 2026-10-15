import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, CheckCircle2, Loader, ImageOff, Eye, X, Info, Sparkles, Target } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import campusApi from '../../services/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

// SVG data URI generator for sample images so demo is 100% self-contained
function createSampleSvg(title, subtitle, icon, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1326"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="600" height="400" fill="url(#bg)"/>
    <rect width="600" height="400" fill="url(#grid)"/>
    <circle cx="300" cy="170" r="70" fill="${color}15" stroke="${color}40" stroke-width="2"/>
    <text x="300" y="185" font-size="48" text-anchor="middle">${icon}</text>
    <text x="300" y="275" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc" text-anchor="middle">${title}</text>
    <text x="300" y="305" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">${subtitle}</text>
    <rect x="220" y="110" width="160" height="120" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRESET_SAMPLES = [
  {
    id: 'pipe-leak',
    name: 'Cafeteria_Dishwasher_Inlet.png',
    label: 'Dishwasher Pipe Leak',
    icon: '💧',
    type: 'image/png',
    size: 420000,
    dataUrl: createSampleSvg('Dishwasher Valve Dripping', 'Continuous 140 L/hr loss in Cafeteria Kitchen', '💧', '#38bdf8'),
    detection: {
      class: 'Water Dripping / Pipe Leak',
      confidence: 0.96,
      severity: 'high',
      suggestedLocation: 'Cafeteria - Utility Pipe Wall (Zone C)',
      recommendation: 'Silicone valve seat worn. Replace with high-pressure stainless valve kit.',
      boundingBox: { x: 36, y: 28, width: 28, height: 32 }
    }
  },
  {
    id: 'chiller-ice',
    name: 'Cleanroom_Chiller_Overload.png',
    label: 'HVAC Chiller Overload',
    icon: '❄️',
    type: 'image/png',
    size: 512000,
    dataUrl: createSampleSvg('Chiller Compressor Freezing', 'Max cooling output without thermal setback', '❄️', '#f43f5e'),
    detection: {
      class: 'HVAC Thermal Imbalance',
      confidence: 0.92,
      severity: 'critical',
      suggestedLocation: 'Laboratory Cleanroom Plant (Zone D)',
      recommendation: 'Evaporator coil frosting detected. Adjust expansion valve and clean air filters.',
      boundingBox: { x: 34, y: 26, width: 32, height: 34 }
    }
  },
  {
    id: 'solar-hotspot',
    name: 'Roof_Solar_Cell_Hotspot.png',
    label: 'Solar Array Hotspot',
    icon: '☀️',
    type: 'image/png',
    size: 380000,
    dataUrl: createSampleSvg('Solar Inverter Hotspot', 'Micro-crack thermal shunt on Panel Array B3', '☀️', '#f59e0b'),
    detection: {
      class: 'Photovoltaic Micro-Crack Hotspot',
      confidence: 0.89,
      severity: 'medium',
      suggestedLocation: 'Academic Block Roof (Zone A)',
      recommendation: 'Bypass diode bypass activated. Clean surface dust and replace cell module 4B.',
      boundingBox: { x: 37, y: 27, width: 26, height: 30 }
    }
  }
];

export default function VisionScanner() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [activeBoxIndex, setActiveBoxIndex] = useState(null);
  const fileInputRef = useRef(null);

  const validate = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type))
      return `Invalid file type "${f.type}". Accepted: JPG, PNG, WEBP, GIF.`;
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_SIZE_MB} MB.`;
    return '';
  };

  const handleFile = (f) => {
    setResult(null);
    setValidationError('');
    setSelectedPreset(null);
    const err = validate(f);
    if (err) { setValidationError(err); setFile(null); setPreview(null); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleInputChange = (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSelectPreset = (preset) => {
    setValidationError('');
    setResult(null);
    setSelectedPreset(preset);
    setPreview(preset.dataUrl);
    setFile({
      name: preset.name,
      size: preset.size,
      type: preset.type
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);

    // If using a preset sample, return instant tailored detection
    if (selectedPreset) {
      setTimeout(() => {
        setResult({
          fileName: selectedPreset.name,
          fileSizeBytes: selectedPreset.size,
          fileType: selectedPreset.type,
          analysisStatus: 'simulated_heuristic',
          isLiveModel: false,
          disclaimer: 'HEURISTIC PREVIEW: Backend vision neural network not detected. This is a rule-based mock demonstration.',
          detections: [selectedPreset.detection]
        });
        setIsAnalyzing(false);
      }, 800);
      return;
    }

    try {
      const res = await campusApi.analyzeVisionImage(file);
      setResult(res);
    } catch {
      setResult({ analysisStatus: 'error', disclaimer: 'Analysis failed. Please retry or check backend connectivity.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setValidationError('');
    setSelectedPreset(null);
    setActiveBoxIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="vision-page animate-fade-in">
      <div className="vision-header">
        <div>
          <h2 className="page-title">AI Vision Scanner</h2>
          <p className="page-subtitle">Upload campus infrastructure imagery or choose an incident sample for instant computer-vision diagnostics</p>
        </div>
        <div className="info-pill">
          <Info size={14} />
          <span>Computer-vision pipeline targets pipe leaks, HVAC frosting, thermal loss, and solar hotspot anomalies.</span>
        </div>
      </div>

      {/* Preset sample incident picker */}
      <div className="preset-picker-bar glass-panel">
        <span className="preset-picker-title">
          <Sparkles size={14} className="text-emerald" /> Quick Incident Presets:
        </span>
        <div className="preset-btn-group">
          {PRESET_SAMPLES.map(sample => (
            <button
              key={sample.id}
              className={`preset-btn ${selectedPreset?.id === sample.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(sample)}
            >
              <span>{sample.icon}</span> {sample.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vision-body">
        {/* Upload Zone */}
        <div className="vision-upload-col">
          <div
            className={`drop-zone glass-panel ${dragOver ? 'drag-active' : ''} ${validationError ? 'drop-error' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop or click to upload campus image"
          >
            {preview ? (
              <div className="preview-wrap">
                <img src={preview} alt="Campus preview" className="preview-img" />

                {/* Bounding box overlay layer when detection results are ready */}
                {result?.detections && result.detections.map((det, i) => {
                  const b = det.boundingBox || { x: 30, y: 30, width: 40, height: 40 };
                  const isHovered = activeBoxIndex === i;
                  return (
                    <div
                      key={i}
                      className={`vision-bounding-box ${isHovered ? 'active-target' : ''}`}
                      style={{
                        left: `${b.x}%`,
                        top: `${b.y}%`,
                        width: `${b.width}%`,
                        height: `${b.height}%`
                      }}
                    >
                      <span className="box-tag">
                        <Target size={10} /> {det.class} ({Math.round(det.confidence * 100)}%)
                      </span>
                      <div className="crosshair-tl" />
                      <div className="crosshair-tr" />
                      <div className="crosshair-bl" />
                      <div className="crosshair-br" />
                    </div>
                  );
                })}

                <button className="clear-preview-btn" onClick={(e) => { e.stopPropagation(); handleClear(); }} aria-label="Remove image">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="drop-idle">
                <div className="drop-icon-ring">
                  <Camera size={32} className="text-emerald" />
                </div>
                <p className="drop-title">Drop a campus facility image here</p>
                <p className="drop-sub">or click to browse — JPG, PNG, WEBP up to 10 MB</p>
                <div className="drop-examples">
                  <span>Suggested: pipe joints, HVAC vents, solar panels, drainage, electrical panels</span>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="sr-only"
            onChange={handleInputChange}
            aria-label="Upload campus image"
          />

          {validationError && (
            <div className="validation-error" role="alert">
              <AlertCircle size={15} />
              <span>{validationError}</span>
            </div>
          )}

          {file && !validationError && (
            <div className="file-meta-strip">
              <CheckCircle2 size={14} className="text-emerald" />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(0)} KB · {file.type ? file.type.split('/')[1]?.toUpperCase() : 'IMG'}</span>
            </div>
          )}

          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!file || !!validationError || isAnalyzing}
            aria-busy={isAnalyzing}
          >
            {isAnalyzing ? (
              <><Loader size={16} className="spin-icon" /> Analyzing with Vision Model…</>
            ) : (
              <><Eye size={16} /> Run AI Anomaly Detection</>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="vision-results-col">
          {!result && !isAnalyzing && (
            <div className="results-empty glass-panel">
              <ImageOff size={36} className="text-muted" />
              <p>Detection results will appear here after you upload an image or pick a preset sample and run analysis.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="results-loading glass-panel">
              <Loader size={36} className="text-emerald spin-icon" />
              <p>Sending image to vision neural network…</p>
              <span className="loading-sub">Extracting feature vectors, checking spatial heat gradients, and computing bounding boxes…</span>
            </div>
          )}

          {result && (
            <div className="results-card glass-panel animate-fade-in">
              {/* Disclaimer */}
              {!result.isLiveModel && (
                <div className="disclaimer-banner" role="alert">
                  <AlertCircle size={15} />
                  <div>
                    <strong>HEURISTIC PREVIEW — STANDALONE DEMO MODE</strong>
                    <p>{result.disclaimer}</p>
                  </div>
                </div>
              )}
              {result.isLiveModel && (
                <div className="live-result-banner">
                  <CheckCircle2 size={15} />
                  <strong>LIVE VISION MODEL RESULTS — FastAPI Backend</strong>
                </div>
              )}

              <h3 className="results-title">AI Diagnostic Report</h3>
              <p className="results-file">Examined: <strong>{result.fileName}</strong></p>

              {result.detections && result.detections.length > 0 ? (
                <div className="detections-list">
                  {result.detections.map((det, i) => (
                    <div
                      key={i}
                      className={`detection-item ${activeBoxIndex === i ? 'highlighted-det' : ''}`}
                      onMouseEnter={() => setActiveBoxIndex(i)}
                      onMouseLeave={() => setActiveBoxIndex(null)}
                    >
                      <div className="det-header">
                        <span className="det-class">{det.class}</span>
                        <StatusBadge status={det.severity} size="sm" />
                        <span className="det-confidence">{Math.round(det.confidence * 100)}% confidence</span>
                      </div>
                      {det.suggestedLocation && (
                        <p className="det-location">📍 {det.suggestedLocation}</p>
                      )}
                      {det.recommendation && (
                        <p className="det-rec">🔧 {det.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-detections">No structural or thermal anomalies detected in this image.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

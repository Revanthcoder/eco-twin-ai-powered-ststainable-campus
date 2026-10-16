import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, AlertCircle, CheckCircle2, Loader, ImageOff, Eye, X, Info,
  Sparkles, Target, Sliders, MapPin, ShieldAlert, FileText, Activity
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import campusApi from '../../services/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

const CAMPUS_LOCATIONS = [
  { value: '', label: 'Location not provided (Default)' },
  { value: 'Campus Cafeteria - Kitchen (Zone C)', label: 'Campus Cafeteria - Kitchen (Zone C)' },
  { value: 'Academic Block - Utility Loop (Zone A)', label: 'Academic Block - Utility Loop (Zone A)' },
  { value: 'Library - Facilities Mechanical Room (Zone B)', label: 'Library - Facilities Mechanical Room (Zone B)' },
  { value: 'Laboratory Cleanroom - Plant (Zone D)', label: 'Laboratory Cleanroom - Plant (Zone D)' },
  { value: 'Water Tank - Distribution Header (Zone E)', label: 'Water Tank - Distribution Header (Zone E)' },
  { value: 'Roof Solar Array - South Field', label: 'Roof Solar Array - South Field' },
];

/**
 * Generates an authentic PNG image File via an in-memory Canvas.
 * Ensures actual binary image bytes (PNG) are delivered to the vision backend.
 */
function createSyntheticPngFile(name, drawFunction, width = 480, height = 360) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFunction(ctx, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], name, { type: 'image/png' });
      const previewUrl = URL.createObjectURL(blob);
      resolve({ file, previewUrl });
    }, 'image/png');
  });
}

// Preset incident definitions with canvas painters that produce genuine physical pixel features
const PRESET_DEFINITIONS = [
  {
    id: 'pipe-leak',
    name: 'Pipe_Moisture_Leak_Sample.png',
    label: 'Plumbing Pipe Water Leak',
    icon: '💧',
    draw: (ctx, w, h) => {
      // Wall background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      // Gray metallic pipe running horizontally
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, h * 0.35, w, h * 0.22);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, h * 0.37, w, h * 0.05); // highlight
      // Pipe flange/coupling in center
      ctx.fillStyle = '#475569';
      ctx.fillRect(w * 0.38, h * 0.30, w * 0.15, h * 0.32);
      // Dripping droplets and puddle with high blue channel
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(w * 0.45, h * 0.58, 12, 0, Math.PI * 2);
      ctx.fill();
      // Wet puddle on bottom wall / floor
      const grad = ctx.createRadialGradient(w * 0.46, h * 0.78, 5, w * 0.46, h * 0.78, 90);
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(0.7, '#0ea5e9');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.78, 110, 45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'clean-infrastructure',
    name: 'Normal_Dry_Conduit_Baseline.png',
    label: 'Nominal Dry Infrastructure',
    icon: '🛡️',
    draw: (ctx, w, h) => {
      // Clean dry masonry wall
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, w, h);
      // Clean dry conduit / pipe with uniform lighting
      ctx.fillStyle = '#64748b';
      ctx.fillRect(w * 0.25, 0, w * 0.18, h);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(w * 0.27, 0, w * 0.04, h);
      // Dry floor boundary
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, h * 0.85, w, h * 0.15);
    }
  },
  {
    id: 'cafeteria-clean',
    name: 'Campus_Cafeteria_Dining_Clean.png',
    label: 'Cafeteria Dining Hall (Clean)',
    icon: '🍽️',
    draw: (ctx, w, h) => {
      // Warm walls
      ctx.fillStyle = '#b4a08c';
      ctx.fillRect(0, 0, w, h);
      // Floor (clean tiles)
      ctx.fillStyle = '#d2cdc3';
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
      // Clean dining tables
      ctx.fillStyle = '#f0f0f5';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.fillRect(w * 0.1, h * 0.55, w * 0.35, h * 0.22);
      ctx.strokeRect(w * 0.1, h * 0.55, w * 0.35, h * 0.22);
      ctx.fillRect(w * 0.55, h * 0.55, w * 0.35, h * 0.22);
      ctx.strokeRect(w * 0.55, h * 0.55, w * 0.35, h * 0.22);
      // Clean food trays
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(w * 0.16, h * 0.59, w * 0.12, h * 0.08);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.61, h * 0.59, w * 0.12, h * 0.08);
      // Clean lighting panels
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w * 0.15, h * 0.1, w * 0.25, h * 0.2);
      ctx.fillRect(w * 0.6, h * 0.1, w * 0.25, h * 0.2);
    }
  },
  {
    id: 'everyday-object',
    name: 'Everyday_Coffee_Mug.png',
    label: 'Unrelated Everyday Object',
    icon: '☕',
    draw: (ctx, w, h) => {
      // Wooden desk background
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, w, h);
      // Coffee mug body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(w * 0.35, h * 0.28, w * 0.30, h * 0.42, 16);
      ctx.fill();
      // Mug handle
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(w * 0.68, h * 0.48, 35, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Dark coffee inside
      ctx.fillStyle = '#3b1c09';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.32, w * 0.12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'waste-overflow',
    name: 'Waste_Bin_Overflow_Station.png',
    label: 'Waste Station Overflow',
    icon: '♻️',
    draw: (ctx, w, h) => {
      // Ground
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      // Recycling Bin body
      ctx.fillStyle = '#059669';
      ctx.fillRect(w * 0.25, h * 0.45, w * 0.50, h * 0.50);
      // High-clutter protruding materials on top
      for (let i = 0; i < 40; i++) {
        const x = w * 0.22 + (Math.random() * w * 0.55);
        const y = h * 0.12 + (Math.random() * h * 0.35);
        ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : (i % 3 === 0 ? '#ef4444' : '#f1f5f9');
        ctx.fillRect(x, y, 22 + (Math.random() * 20), 18 + (Math.random() * 25));
      }
    }
  },
  {
    id: 'solar-soiling',
    name: 'Rooftop_Solar_Panel_Surface.png',
    label: 'Solar Array Surface',
    icon: '☀️',
    draw: (ctx, w, h) => {
      // Dark frame
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      // Blue silicon photovoltaic cells with grid lines
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      for (let x = 0.16; x < 0.90; x += 0.12) {
        ctx.beginPath();
        ctx.moveTo(w * x, h * 0.08);
        ctx.lineTo(w * x, h * 0.92);
        ctx.stroke();
      }
      for (let y = 0.20; y < 0.90; y += 0.15) {
        ctx.beginPath();
        ctx.moveTo(w * 0.08, h * y);
        ctx.lineTo(w * 0.92, h * y);
        ctx.stroke();
      }
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
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [activeBoxIndex, setActiveBoxIndex] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.45);
  const [serviceStatus, setServiceStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const fileInputRef = useRef(null);

  // Check AI service connectivity on mount
  useEffect(() => {
    let isMounted = true;
    campusApi.checkAiServiceHealth().then((health) => {
      if (isMounted) {
        setServiceStatus(health.online ? 'online' : 'offline');
      }
    }).catch(() => {
      if (isMounted) setServiceStatus('offline');
    });
    return () => { isMounted = false; };
  }, []);

  const validate = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type))
      return `Invalid file type "${f.type}". Accepted: JPG, PNG, WEBP, GIF.`;
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_SIZE_MB} MB.`;
    return '';
  };

  const handleFile = (f) => {
    // Clear previous report immediately to prevent stale results
    setResult(null);
    setValidationError('');
    setSelectedPresetId(null);

    const err = validate(f);
    if (err) {
      setValidationError(err);
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleInputChange = (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
    // Reset file input value so selecting the same file again triggers onChange
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSelectPreset = async (presetDef) => {
    // Clear previous report immediately
    setValidationError('');
    setResult(null);
    setSelectedPresetId(presetDef.id);

    try {
      // Synthesize an actual PNG File with real pixel bytes
      const { file: synthFile, previewUrl } = await createSyntheticPngFile(presetDef.name, presetDef.draw);
      setFile(synthFile);
      setPreview(previewUrl);
    } catch (err) {
      setValidationError('Failed to generate sample preset image bytes.');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null); // Clear previous results while analyzing

    try {
      // Send actual image bytes, location, and threshold to the live AI service
      const res = await campusApi.analyzeVisionImage(file, selectedLocation, confidenceThreshold);
      setResult(res);
      if (res.analysisStatus === 'offline') {
        setServiceStatus('offline');
      } else {
        setServiceStatus('online');
      }
    } catch (err) {
      setResult({
        analysisStatus: 'offline',
        isLiveModel: false,
        error: 'Inference Connection Failure',
        message: err.message || 'Unable to communicate with the vision backend.',
        detections: []
      });
      setServiceStatus('offline');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setValidationError('');
    setSelectedPresetId(null);
    setActiveBoxIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="vision-page animate-fade-in">
      <div className="vision-header">
        <div>
          <h2 className="page-title">AI Vision Scanner</h2>
          <p className="page-subtitle">
            Upload campus infrastructure imagery or choose an incident test sample for authentic neural computer-vision diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`status-indicator-pill ${serviceStatus === 'online' ? 'status-online' : 'status-offline'}`}>
            <Activity size={13} />
            <span>
              {serviceStatus === 'online'
                ? 'AI Engine Online (Port 8001 / ONNX MobileNetV2)'
                : 'AI Engine Offline (Port 8001)'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Incident Presets */}
      <div className="preset-picker-bar glass-panel">
        <span className="preset-picker-title">
          <Sparkles size={14} className="text-emerald" /> Quick Test Samples (Generates Real PNG Bytes):
        </span>
        <div className="preset-btn-group">
          {PRESET_DEFINITIONS.map((sample) => (
            <button
              key={sample.id}
              className={`preset-btn ${selectedPresetId === sample.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(sample)}
              type="button"
            >
              <span>{sample.icon}</span> {sample.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vision-body">
        {/* Upload & Configuration Column */}
        <div className="vision-upload-col">
          {/* Location & Threshold Configuration */}
          <div className="glass-panel p-3 mb-2 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="location-select" className="text-xs font-semibold text-muted flex items-center gap-1">
                <MapPin size={12} className="text-emerald" /> Assigned Infrastructure Location:
              </label>
              <select
                id="location-select"
                className="location-dropdown"
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setResult(null); // Clear previous results when location context changes
                }}
              >
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted flex items-center gap-1 font-semibold">
                  <Sliders size={12} className="text-emerald" /> Confidence Threshold:
                </span>
                <span className="font-mono text-emerald font-bold">
                  {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>
              <input
                id="confidence-slider"
                type="range"
                min="0.30"
                max="0.90"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="accent-emerald w-full cursor-pointer"
              />
              <span className="text-xs text-muted" style={{ fontSize: '0.72rem' }}>
                Predictions below this score are flagged for human review rather than confirmed.
              </span>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            className={`drop-zone glass-panel ${dragOver ? 'drag-active' : ''} ${validationError ? 'drop-error' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Drop or click to upload campus image"
          >
            {preview ? (
              <div className="preview-wrap" onClick={(e) => e.stopPropagation()}>
                <img src={preview} alt="Campus inspection target" className="preview-img" />

                {/* Bounding Box Overlay: Only renders when valid numeric coordinates exist */}
                {result?.detections && result.detections.map((det, i) => {
                  const b = det.boundingBox;
                  if (!b || typeof b.x !== 'number' || typeof b.width !== 'number' || b.width <= 0) {
                    return null;
                  }
                  const isHovered = activeBoxIndex === i;
                  return (
                    <div
                      key={i}
                      className={`vision-bounding-box ${isHovered ? 'active-target' : ''}`}
                      style={{
                        left: `${Math.max(0, Math.min(95, b.x))}%`,
                        top: `${Math.max(0, Math.min(95, b.y))}%`,
                        width: `${Math.max(2, Math.min(100 - b.x, b.width))}%`,
                        height: `${Math.max(2, Math.min(100 - b.y, b.height))}%`
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

                <div className="preview-actions">
                  <button
                    className="change-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    aria-label="Change current image"
                    type="button"
                  >
                    <Upload size={13} /> Change Image
                  </button>
                  <button
                    className="clear-preview-btn"
                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                    aria-label="Remove current image"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="drop-idle">
                <div className="drop-icon-ring">
                  <Camera size={32} className="text-emerald" />
                </div>
                <p className="drop-title">Drop a campus facility image here</p>
                <p className="drop-sub">or click anywhere in this area to browse — JPG, PNG, WEBP up to 10 MB</p>
                <button
                  type="button"
                  className="btn-upload-browse"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Upload size={16} /> Choose Image to Inspect
                </button>
                <div className="drop-examples">
                  <span>Supported diagnostics: pipe moisture & pooling, waste overflows, nominal dry infrastructure</span>
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
              <span className="file-size">
                {(file.size / 1024).toFixed(0)} KB · {file.type ? file.type.split('/')[1]?.toUpperCase() : 'PNG'}
              </span>
            </div>
          )}

          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!file || !!validationError || isAnalyzing}
            aria-busy={isAnalyzing}
            type="button"
          >
            {isAnalyzing ? (
              <><Loader size={16} className="spin-icon" /> Running Neural Vision Diagnostics…</>
            ) : (
              <><Eye size={16} /> Run AI Anomaly Detection</>
            )}
          </button>
        </div>

        {/* Results Column */}
        <div className="vision-results-col">
          {!result && !isAnalyzing && (
            <div className="results-empty glass-panel">
              <ImageOff size={36} className="text-muted" />
              <p>Upload an infrastructure image or select a test sample, then click <strong>Run AI Anomaly Detection</strong>.</p>
              <p className="text-xs text-muted">
                Each upload transmits actual image bytes to the backend inference engine.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="results-loading glass-panel">
              <Loader size={36} className="text-emerald spin-icon" />
              <p>Transmitting image bytes to AI Vision Service…</p>
              <span className="loading-sub">
                Executing MobileNetV2 neural forward pass, computing spatial reflection gradients, and evaluating anomaly rules…
              </span>
            </div>
          )}

          {result && (
            <div className="results-card glass-panel animate-fade-in">
              {/* Service Offline Warning */}
              {result.analysisStatus === 'offline' && (
                <div className="disclaimer-banner" role="alert" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }}>
                  <AlertCircle size={18} className="text-red-400" />
                  <div>
                    <strong className="text-red-400">AI VISION SERVICE OFFLINE (PORT 8001)</strong>
                    <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                      {result.message || 'The Python AI Vision Microservice on port 8001 could not be reached.'}
                    </p>
                    <p style={{ fontSize: '0.78rem', marginTop: '6px', color: '#cbd5e1' }}>
                      Command to start: <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald">npm run ai-service</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Service Live Banner */}
              {result.analysisStatus !== 'offline' && result.isLiveModel && (
                <div className="live-result-banner">
                  <CheckCircle2 size={15} />
                  <span>
                    LIVE INFERENCE: {result.modelName || 'MobileNetV2-ONNX + Calibrated Anomaly Engine'} ({result.inferenceTimeMs || 0}ms)
                  </span>
                </div>
              )}

              {/* Header Info */}
              <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                <div>
                  <h3 className="results-title">AI Diagnostic Report</h3>
                  <p className="results-file">Inspected Asset: <strong>{result.fileName}</strong></p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted block">Location Reference:</span>
                  <span className="text-xs font-semibold text-emerald">
                    📍 {result.locationAssigned || selectedLocation || 'Location not provided'}
                  </span>
                </div>
              </div>

              {/* Detection Items */}
              {result.detections && result.detections.length > 0 ? (
                <div className="detections-list">
                  {result.detections.map((det, i) => (
                    <div
                      key={i}
                      className={`detection-item ${activeBoxIndex === i ? 'highlighted-det' : ''} ${det.isUncertain ? 'border-amber-500' : ''}`}
                      onMouseEnter={() => setActiveBoxIndex(i)}
                      onMouseLeave={() => setActiveBoxIndex(null)}
                    >
                      <div className="det-header">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="det-class">{det.class}</span>
                          {det.category && (
                            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                              {det.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={det.severity} size="sm" />
                          <span className="det-confidence">{Math.round(det.confidence * 100)}% score</span>
                        </div>
                      </div>

                      {/* Observed Evidence */}
                      {det.evidence && (
                        <div className="det-evidence mt-2 p-2 bg-slate-900/60 rounded text-xs border border-slate-800">
                          <strong className="text-slate-400 block mb-1 flex items-center gap-1">
                            <FileText size={11} className="text-emerald" /> Observed Visual Evidence:
                          </strong>
                          <span className="text-slate-300">{det.evidence}</span>
                        </div>
                      )}

                      {/* Confidence Meaning & Severity Rule */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs text-muted">
                        {det.confidenceMeaning && (
                          <div className="p-1.5 bg-slate-800/40 rounded">
                            <strong className="text-slate-400 block" style={{ fontSize: '0.72rem' }}>Confidence Interpretation:</strong>
                            <span style={{ fontSize: '0.75rem' }}>{det.confidenceMeaning}</span>
                          </div>
                        )}
                        {det.severityRule && (
                          <div className="p-1.5 bg-slate-800/40 rounded">
                            <strong className="text-slate-400 block" style={{ fontSize: '0.72rem' }}>Severity Assignment Rule:</strong>
                            <span style={{ fontSize: '0.75rem' }}>{det.severityRule}</span>
                          </div>
                        )}
                      </div>

                      {/* Human Review Banner if uncertain */}
                      {det.isUncertain && (
                        <div className="flex items-center gap-2 p-2 mt-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-xs">
                          <ShieldAlert size={14} />
                          <span>Flagged for Human Review: Score is below confidence threshold ({Math.round(confidenceThreshold * 100)}%).</span>
                        </div>
                      )}

                      {/* Location & Recommendation */}
                      <div className="mt-2 flex flex-col gap-1 text-xs">
                        <p className="det-location">
                          📍 {det.suggestedLocation || 'Location not provided'}
                        </p>
                        {det.recommendation && (
                          <p className="det-rec">
                            🔧 {det.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-900/50 rounded text-center text-sm text-slate-400">
                  {result.analysisStatus === 'offline'
                    ? 'No results available: AI service is currently offline.'
                    : 'No anomalous defects or supported targets detected in this image.'}
                </div>
              )}

              {/* Limitations & Disclaimers */}
              {result.limitations && result.limitations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-muted">
                  <strong className="text-slate-400 block mb-1">Model Limitations & Uncertainty:</strong>
                  <ul className="list-disc list-inside space-y-0.5" style={{ fontSize: '0.74rem' }}>
                    {result.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

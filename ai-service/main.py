"""
EcoNexus AI Microservice Runner.
Launches FastAPI Uvicorn server on port 8001.
Maintains backward compatibility with root package.json: 'python ai-service/main.py'.
"""

import sys
import os
from pathlib import Path

# Ensure ai-service directory is in sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

import uvicorn
from app.config import config

PORT = config.port
HOST = config.host

def run_server():
    print("====================================================")
    print(f"  🤖 EcoNexus AI Intelligence Service (v{config.version})")
    print(f"  🚀 Server URL: http://127.0.0.1:{PORT}")
    print(f"  📡 Health Check: http://127.0.0.1:{PORT}/health")
    print(f"  🔍 Interactive Docs: http://127.0.0.1:{PORT}/docs")
    print(f"  🌐 EcoImpact Workflow: http://127.0.0.1:{PORT}/api/intelligence/analyze")
    print("====================================================")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False, log_level="info")

if __name__ == "__main__":
    run_server()

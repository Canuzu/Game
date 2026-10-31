#!/bin/bash
# Komplett: Stimme + Timing + Rendern.  Aufruf: engine/make.sh videos/002-rabatt
cd "$(dirname "$0")/.." && python3 engine/build.py "$1" 2>&1 | grep -v -i warn | tail -2 && node engine/render.mjs "$1" 2>&1 | tail -1

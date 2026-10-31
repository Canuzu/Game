#!/bin/bash
# Rendert die übergebenen Videos nacheinander: engine/queue.sh 005-plusminus 007-tempo
cd "$(dirname "$0")/.." && for v in "$@"; do node engine/render.mjs videos/$v 2>&1 | tail -1; done

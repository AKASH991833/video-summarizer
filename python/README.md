# Python version (PySceneDetect + faster-whisper)

The Pages demo is a capable browser approximation. This folder is the proper
pipeline: real scene detection, real Whisper transcription, real keyframes,
and an extractive overview (sentences picked from the transcript — never an
invented "AI summary").

```bash
pip install -r requirements.txt
python summarize.py input.mp4 --out summary.json --frames-dir frames/
```

- Scene detection: PySceneDetect `ContentDetector`
- Transcription: faster-whisper (CTranslate2), CPU int8, `tiny`/`base`/`small`
- Keyframes: OpenCV frame grabs at each scene midpoint
- Everything local; no API keys, no uploads.

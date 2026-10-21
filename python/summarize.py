#!/usr/bin/env python3
"""Video summarizer — proper Python version (PySceneDetect + faster-whisper).

The browser demo does what a browser can: canvas-based shot detection and
Web Speech transcription. This pipeline does it properly: real scene
detection, real speech-to-text, keyframe extraction.

Usage:
    pip install -r requirements.txt
    python summarize.py input.mp4 --out summary.json --frames-dir frames/

Outputs summary.json: {duration, scenes: [{start,end,keyframe}], transcript: [{start,end,text}], overview}
"""
import argparse, json, os

def detect_scenes(video_path):
    from scenedetect import open_video, SceneManager
    from scenedetect.detectors import ContentDetector
    video = open_video(video_path)
    manager = SceneManager()
    manager.add_detector(ContentDetector(threshold=27.0))
    manager.detect_scenes(video, show_progress=False)
    scenes = manager.get_scene_list()
    out = [{"start": s.get_seconds(), "end": e.get_seconds()} for s, e in scenes]
    if not out:
        dur = video.duration.get_seconds()
        out = [{"start": 0.0, "end": dur}]
    return out

def transcribe(video_path, model_size="base"):
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(video_path, beam_size=5)
    return [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
            for s in segments], info.language

def extract_frames(video_path, scenes, frames_dir):
    import cv2
    os.makedirs(frames_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    for i, sc in enumerate(scenes):
        mid = (sc["start"] + sc["end"]) / 2
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(mid * fps))
        ok, frame = cap.read()
        if ok:
            path = os.path.join(frames_dir, f"scene-{i+1:03d}.jpg")
            cv2.imwrite(path, frame)
            sc["keyframe"] = path
        sc["start"] = round(sc["start"], 2)
        sc["end"] = round(sc["end"], 2)
    cap.release()
    return scenes

def overview(transcript, max_sent=8):
    # frequency-based extractive summary (honest, no abstractive claims)
    import re
    from collections import Counter
    text = " ".join(t["text"] for t in transcript)
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 25]
    if not sents:
        return ""
    stop = set("the a an and or but of to in on for with is are was were be been it this that these those i you he she we they".split())
    freq = Counter(w for w in re.findall(r"[a-z']+", text.lower()) if w not in stop and len(w) > 3)
    scored = sorted(sents, key=lambda s: -sum(freq.get(w, 0) for w in re.findall(r"[a-z']+", s.lower())) / (1 + len(s.split())))
    keep = sorted(scored[:max_sent], key=lambda s: text.find(s))
    return " ".join(keep)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", default="summary.json")
    ap.add_argument("--frames-dir", default="frames")
    ap.add_argument("--whisper", default="base", choices=["tiny", "base", "small"])
    args = ap.parse_args()

    print("1/3 scene detection…")
    scenes = detect_scenes(args.video)
    print(f"   {len(scenes)} scenes")
    print("2/3 transcription…")
    transcript, lang = transcribe(args.video, args.whisper)
    print(f"   {len(transcript)} segments, language={lang}")
    print("3/3 keyframes…")
    scenes = extract_frames(args.video, scenes, args.frames_dir)
    result = {
        "video": args.video,
        "language": lang,
        "scenes": scenes,
        "transcript": transcript,
        "overview": overview(transcript),
        "note": "Overview is extractive (sentences chosen from the transcript), not an abstractive AI summary.",
    }
    with open(args.out, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Wrote {args.out}")

if __name__ == "__main__":
    main()

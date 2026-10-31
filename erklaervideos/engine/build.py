#!/usr/bin/env python3
"""Baut aus script.json: Sprecherstimme (Edge-Neural, lokal), Wort-Timing, Sounds, spec.json, audio.wav.
Aufruf: python3 build.py videos/001-pizza"""
import asyncio, json, os, ssl, subprocess, sys, wave, re
import numpy as np

SR = 44100
vdir = sys.argv[1]
S = json.load(open(f"{vdir}/script.json"))
work = f"{vdir}/work"; os.makedirs(work, exist_ok=True)

def run(*a): subprocess.run(a, check=True, capture_output=True)
def dur(p): return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout)
def load(p, sr=SR):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar",str(sr),"-"],capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def load16(p): return load(p, 16000)

# ---------- 1. Stimme ----------
def plain(t): return re.sub(r"\*(?:[aby]:)?(.+?)\*", r"\1", t)
async def tts_all():
    import edge_tts, edge_tts.communicate as c
    c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
    for b in S["beats"]:
        mp3 = f"{work}/{b['id']}.mp3"
        if os.path.exists(mp3) and os.path.getsize(mp3) > 1000 and not os.environ.get("REDO"): continue
        for attempt in range(4):
            try:
                await edge_tts.Communicate(plain(b["text"]), b.get("voice", S["voice"]), rate=b.get("rate", S.get("rate","+0%")),
                                           pitch=b.get("pitch", S.get("pitch","+0Hz")), proxy=os.environ.get("HTTPS_PROXY")).save(mp3)
                break
            except Exception as e:
                if attempt == 3: raise
                await asyncio.sleep(2 ** attempt)
asyncio.run(tts_all())

# ---------- 2. Clips trimmen, Timeline ----------
clips = {}
t = S.get("lead", 0.05)
for b in S["beats"]:
    wav = f"{work}/{b['id']}.wav"
    run("ffmpeg","-y","-i",f"{work}/{b['id']}.mp3","-af",
        "silenceremove=1:0:-42dB,areverse,silenceremove=1:0:-42dB,areverse","-ar",str(SR),"-ac","1",wav)
    clips[b["id"]] = load(wav)
    d = len(clips[b["id"]]) / SR
    b["t0"], b["t1"] = round(t, 3), round(t + d, 3)
    t = b["t1"] + b.get("pause", S.get("gap", 0.14))
total = round(t + S.get("tail", 0.9), 3)

# ---------- 3. Wort-Timing (Whisper je Beat, sonst proportional) ----------
from faster_whisper import WhisperModel
wm = WhisperModel("small", compute_type="int8")
for b in S["beats"]:
    words = []
    for m in re.finditer(r"\*(?:([aby]):)?(.+?)\*|([^\s*]+)", b["text"]):
        if m.group(2):
            for w in m.group(2).split(): words.append({"w": w, "key": m.group(1) or "y"})
        elif m.start() > 0 and not b["text"][m.start()-1].isspace() and words:
            words[-1]["w"] += m.group(3)      # Satzzeichen direkt hinter markiertem Wort anhängen
        else: words.append({"w": m.group(3), "key": None})
    d = b["t1"] - b["t0"]
    est = None
    try:
        segs, _ = wm.transcribe(load16(f"{work}/{b['id']}.wav"),
                                language="de", word_timestamps=True)
        ws = [w for s in segs for w in s.words]
        if len(ws) == len(words): est = [(w.start, w.end) for w in ws]
    except Exception as e:
        print("whisper fallback", b["id"], str(e)[:80])
    if est is None:
        wt = np.array([len(re.sub(r"\W", "", x["w"])) + 2 + (3 if re.search(r"[.,?!:]$", x["w"]) else 0) for x in words], float)
        edges = np.concatenate([[0], np.cumsum(wt) / wt.sum() * d])
        est = [(edges[i], edges[i+1]) for i in range(len(words))]
    for x, (a, z) in zip(words, est):
        x["t0"], x["t1"] = round(b["t0"] + a, 3), round(b["t0"] + z, 3)
    b["words"] = words
    print(f"{b['id']:7s} {b['t0']:6.2f}-{b['t1']:6.2f}  {'whisper' if len(words)==len(est) and est else ''}")

# ---------- 4. Sounds ----------
def env(n, a=0.004, k=9): 
    x = np.arange(n) / SR; return np.minimum(x / a, 1) * np.exp(-k * x)
def pop():
    n = int(.12*SR); x = np.arange(n)/SR; f = 520 + 700*np.exp(-x*40)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * env(n, .002, 28) * .55
def tick():
    n = int(.03*SR); x = np.arange(n)/SR
    return np.sin(2*np.pi*2400*x) * env(n, .0005, 140) * .22
def whoosh():
    n = int(.45*SR); rng = np.random.default_rng(3); nz = rng.standard_normal(n)
    k = np.exp(-((np.arange(n)-n*.45)/(n*.22))**2)
    # simple lowpass sweep via moving average of varying length
    out = np.convolve(nz, np.ones(24)/24, "same") * k
    return out / (np.abs(out).max()+1e-9) * .30
def ding():
    n = int(.9*SR); x = np.arange(n)/SR
    return (np.sin(2*np.pi*1318.5*x) + .5*np.sin(2*np.pi*1975.5*x)) * env(n, .003, 5.5) * .30
def riser():
    n = int(.55*SR); x = np.arange(n)/SR; f = 300 + 1500*(x/.55)**2
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.minimum(x/.15, 1) * np.minimum((.55-x)/.05, 1) * .22
SFX = {"pop": pop(), "tick": tick(), "whoosh": whoosh(), "ding": ding(), "riser": riser()}

N = int(total * SR) + SR
voice = np.zeros(N, np.float32); fx = np.zeros(N, np.float32)
def put(buf, x, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(x)); buf[i:j] += x[: j - i] * g
for b in S["beats"]:
    put(voice, clips[b["id"]], b["t0"])
    for name, off in b.get("sfx", []): put(fx, SFX[name], b["t0"] + off)
    if b.get("ticks"):
        i = S["beats"].index(b); end = (S["beats"][i+1]["t0"] if i+1 < len(S["beats"]) else total) - .35
        tt = b["t0"] + .1
        while tt < end: put(fx, SFX["tick"], tt); tt += .075

# leises Musikbett: Pad + Pluck-Arpeggio (Am - F - C - G), ~96 bpm
bed = np.zeros(N, np.float32)
chords = [(220.00,261.63,329.63),(174.61,220.00,261.63),(261.63,329.63,392.00),(196.00,246.94,293.66)]
beat = 60/96
x_all = np.arange(N)/SR
for i in range(int(total/(beat*4))+2):
    t0 = i*beat*4; ch = chords[i % 4]
    i0 = int(t0*SR); i1 = min(N, i0+int(beat*4*SR)+int(.4*SR))
    if i0 >= N: break
    xx = x_all[i0:i1]-t0
    w = np.minimum(xx/.6,1)*np.minimum((beat*4+.4-xx)/.6,1)
    bed[i0:i1] += sum(np.sin(2*np.pi*f*xx) for f in ch).astype(np.float32) * w * .035
    for k in range(8):
        tn = t0 + k*beat/2; f = ch[[0,1,2,1,2,1,0,1][k]] * 2
        j0 = int(tn*SR)
        if j0 >= N: break
        n = int(.5*SR); xs = np.arange(min(n, N-j0))/SR
        bed[j0:j0+len(xs)] += (np.sin(2*np.pi*f*xs)+.3*np.sin(4*np.pi*f*xs)) * np.exp(-xs*7) * .05
fade = np.minimum(x_all/1.5,1)*np.minimum(np.maximum(total-x_all,0)/1.5,1)
bed *= fade.astype(np.float32)
# Ducking: Bett leiser unter Sprache
vm = np.convolve(np.abs(voice), np.ones(2205)/2205, "same")
duck = 1 - .5*np.clip(vm*12, 0, 1)
mix = voice*1.0 + fx*.9 + bed*duck
mix = np.tanh(mix*1.1) / 1.1
with wave.open(f"{work}/audio_raw.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
run("ffmpeg","-y","-i",f"{work}/audio_raw.wav","-af","loudnorm=I=-15:TP=-1.5:LRA=9",f"{work}/audio.wav")

S["duration"] = total; S["fps"] = 30
json.dump(S, open(f"{work}/spec.json", "w"), ensure_ascii=False, indent=1)
print("fertig, Dauer", total, "s")

from pathlib import Path
import wave, subprocess
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'demo-video'
DESKTOP = OUT / 'real-system' / 'desktop'
MOBILE = OUT / 'real-system' / 'mobile'
WORK = OUT / 'real-system' / 'normalized'
WORK.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720

# Curated order: system strength first, then operations, map, customer.
ORDER_60 = [
    'desktop/03-system-health-notifications-errors-whatsapp.png',
    'desktop/05-order-journey-instapay.png',
    'desktop/08-accounting-cash.png',
    'desktop/09-ledger-journals.png',
    'desktop/10-live-map-route.png',
    'desktop/14-station-ironing.png',
    'desktop/13-station-drying-assembly.png',
    'desktop/16-station-qc.png',
    'mobile/03-mobile-customer-portal.png',
    'mobile/04-mobile-track-order.png',
]

ORDER_3 = [
    'desktop/01-dashboard-after-login.png',
    'desktop/02-daily-operations.png',
    'desktop/03-system-health-notifications-errors-whatsapp.png',
    'desktop/19-notification-popover.png',
    'desktop/04-orders-list.png',
    'desktop/05-order-journey-instapay.png',
    'desktop/06-order-reclean-journey.png',
    'desktop/07-finance.png',
    'desktop/08-accounting-cash.png',
    'desktop/09-ledger-journals.png',
    'desktop/11-station-reception.png',
    'desktop/12-station-cleaning.png',
    'desktop/13-station-drying-assembly.png',
    'desktop/14-station-ironing.png',
    'desktop/15-station-packing.png',
    'desktop/16-station-qc.png',
    'desktop/10-live-map-route.png',
    'desktop/17-driver.png',
    'desktop/18-help-center.png',
    'mobile/02-mobile-tenant-entry.png',
    'mobile/03-mobile-customer-portal.png',
    'mobile/04-mobile-track-order.png',
]

ORDER_10 = ORDER_3 + [
    'desktop/03-system-health-notifications-errors-whatsapp.png',
    'desktop/05-order-journey-instapay.png',
    'desktop/10-live-map-route.png',
    'desktop/08-accounting-cash.png',
]


def cover_resize(img, size):
    iw, ih = img.size
    sw, sh = size
    scale = max(sw / iw, sh / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - sw) // 2
    top = (nh - sh) // 2
    return resized.crop((left, top, left + sw, top + sh))


def contain_resize(img, max_size):
    iw, ih = img.size
    mw, mh = max_size
    scale = min(mw / iw, mh / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    return img.resize((nw, nh), Image.Resampling.LANCZOS)


def normalize(src, idx):
    img = Image.open(src).convert('RGB')
    bg = cover_resize(img, (W, H)).filter(ImageFilter.GaussianBlur(18))
    # dark overlay so actual screenshot stands out
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 92))
    bg = Image.alpha_composite(bg.convert('RGBA'), overlay)

    # Desktop: crop/contain large, Mobile: keep phone screenshot as tall centered.
    if img.height > img.width:
        fg = contain_resize(img, (460, 660))
    else:
        fg = contain_resize(img, (1180, 660))
    x = (W - fg.width) // 2
    y = (H - fg.height) // 2

    # shadow/card
    canvas = bg.copy()
    shadow = Image.new('RGBA', (fg.width + 34, fg.height + 34), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((17, 17, fg.width + 17, fg.height + 17), radius=28, fill=(0,0,0,120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    canvas.alpha_composite(shadow, (x - 17, y - 17))
    border = Image.new('RGBA', (fg.width + 8, fg.height + 8), (0,0,0,0))
    bd = ImageDraw.Draw(border)
    bd.rounded_rectangle((0,0,fg.width+7,fg.height+7), radius=24, fill=(255,255,255,38), outline=(255,255,255,80), width=2)
    canvas.alpha_composite(border, (x-4, y-4))
    canvas.alpha_composite(fg.convert('RGBA'), (x, y))

    out = WORK / f'frame-{idx:03d}.png'
    canvas.convert('RGB').save(out, quality=95)
    return out


def synth_beatbox_wav(path, duration, bpm=98, sr=44100):
    n = int(duration*sr)
    audio = np.zeros(n, dtype=np.float32)
    beat = 60/bpm
    rng = np.random.default_rng(123)
    def add_kick(t, amp=0.62):
        start=int(t*sr); L=int(0.15*sr)
        if start+L>n: return
        tt=np.arange(L)/sr
        freq=90*np.exp(-tt*18)+42
        wave=np.sin(2*np.pi*np.cumsum(freq)/sr)*np.exp(-tt*18)
        audio[start:start+L]+=amp*wave
    def add_snare(t, amp=0.28):
        start=int(t*sr); L=int(0.10*sr)
        if start+L>n: return
        tt=np.arange(L)/sr
        noise=rng.normal(0,1,L).astype(np.float32)
        tone=np.sin(2*np.pi*190*tt)*0.22
        audio[start:start+L]+=amp*(noise*0.75+tone)*np.exp(-tt*26)
    def add_hat(t, amp=0.10):
        start=int(t*sr); L=int(0.035*sr)
        if start+L>n: return
        tt=np.arange(L)/sr
        noise=rng.normal(0,1,L).astype(np.float32)
        hp=np.concatenate([[0], np.diff(noise)])
        audio[start:start+L]+=amp*hp*np.exp(-tt*90)
    def add_pop(t, amp=0.10):
        start=int(t*sr); L=int(0.035*sr)
        if start+L>n: return
        tt=np.arange(L)/sr
        audio[start:start+L]+=amp*np.sin(2*np.pi*900*tt)*np.exp(-tt*120)
    bars=int(duration/(4*beat))+2
    for bar in range(bars):
        base=bar*4*beat
        add_kick(base)
        add_hat(base+0.5*beat)
        add_snare(base+beat)
        add_hat(base+1.5*beat)
        add_kick(base+2*beat, 0.50)
        add_pop(base+2.5*beat)
        add_snare(base+3*beat)
        add_hat(base+3.5*beat)
        add_hat(base+0.25*beat,0.055)
        add_hat(base+2.25*beat,0.055)
    audio=np.tanh(audio*1.55)
    fade=int(1.2*sr)
    audio[:fade]*=np.linspace(0,1,fade)
    audio[-fade:]*=np.linspace(1,0,fade)
    pcm=(audio*32767).astype(np.int16)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


def make_video(name, order, duration):
    frames=[]
    for i, rel in enumerate(order, 1):
        src = OUT / 'real-system' / rel
        if src.exists():
            frames.append(normalize(src, i))
        else:
            print('missing', src)
    if not frames:
        raise SystemExit('no frames')
    per = duration / len(frames)
    concat = OUT / f'{name}.concat.txt'
    wav = OUT / f'{name}.beatbox.wav'
    mp4 = OUT / f'{name}.mp4'
    with concat.open('w') as f:
        for frame in frames:
            f.write(f"file '{frame.resolve()}'\n")
            f.write(f"duration {per:.4f}\n")
        f.write(f"file '{frames[-1].resolve()}'\n")
    synth_beatbox_wav(wav, duration)
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ffmpeg,'-y','-f','concat','-safe','0','-i',str(concat),'-i',str(wav),'-vf','format=yuv420p','-r','24','-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-b:a','128k','-shortest',str(mp4)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    concat.unlink(missing_ok=True); wav.unlink(missing_ok=True)
    print(mp4, round(mp4.stat().st_size/1024/1024,2), 'MB')

make_video('mjrh-real-system-60s-beatbox', ORDER_60, 60)
make_video('mjrh-real-system-3min-beatbox', ORDER_3, 180)
make_video('mjrh-real-system-10min-beatbox', ORDER_10, 600)

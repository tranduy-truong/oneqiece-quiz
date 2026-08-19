/**
 * Game Sound Effects (SFX) Engine
 * Zero-latency Web Audio API synthesizer for tactile realtime quiz audio feedback.
 */

class SoundFxEngine {
    constructor() {
        this.audioCtx = null;
        this.volume = parseFloat(localStorage.getItem('app_sfx_volume') ?? 0.7);
        this.isMuted = localStorage.getItem('app_sfx_muted') === 'true';
    }

    initContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, parseFloat(val)));
        localStorage.setItem('app_sfx_volume', this.volume);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('app_sfx_muted', this.isMuted);
        return this.isMuted;
    }

    getMasterGain(time = 0.05) {
        if (this.isMuted || this.volume <= 0) return null;
        this.initContext();
        if (!this.audioCtx) return null;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        gainNode.connect(this.audioCtx.destination);
        return gainNode;
    }

    /**
     * Âm thanh Trả lời Đúng (Correct Chime & Sword Zing)
     */
    playCorrect() {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        // Chords: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz) -> E6 (1318Hz)
        const notes = [659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);

            gain.gain.setValueAtTime(0, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.35, now + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.45);

            osc.connect(gain);
            gain.connect(master);

            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.5);
        });
    }

    /**
     * Âm thanh Trả lời Sai (Wrong Buzz)
     */
    playWrong() {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.35);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.45);
    }

    /**
     * Âm thanh Tíc-Tắc Đếm Ngược (Tick Tock)
     */
    playTick() {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    /**
     * Âm thanh Đếm Ngược Khởi Động (3.. 2.. 1.. GO!)
     */
    playCountdown(num) {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const isGo = num <= 0 || String(num).toUpperCase() === 'GO';
        const freq = isGo ? 1046.50 : (num === 1 ? 784 : (num === 2 ? 659 : 523));

        osc.type = isGo ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + (isGo ? 0.65 : 0.3));
    }

    /**
     * Âm thanh Chuỗi Đúng Combo Streak (On Fire)
     */
    playStreak() {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        freqs.forEach((f, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.04);

            gain.gain.setValueAtTime(0, now + i * 0.04);
            gain.gain.linearRampToValueAtTime(0.25, now + i * 0.04 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.35);

            osc.connect(gain);
            gain.connect(master);

            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.4);
        });
    }

    /**
     * Âm thanh Kèn Vinh Quang Podium (Victory Fanfare)
     */
    playVictory() {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        // Fanfare motif: C4 -> C4 -> C4 -> G4 -> E4 -> G4 -> C5
        const melody = [
            { f: 523.25, d: 0.15, gap: 0.0 },
            { f: 523.25, d: 0.15, gap: 0.18 },
            { f: 523.25, d: 0.15, gap: 0.36 },
            { f: 659.25, d: 0.25, gap: 0.54 },
            { f: 783.99, d: 0.25, gap: 0.82 },
            { f: 1046.50, d: 0.65, gap: 1.10 }
        ];

        melody.forEach(item => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(item.f, now + item.gap);

            gain.gain.setValueAtTime(0, now + item.gap);
            gain.gain.linearRampToValueAtTime(0.35, now + item.gap + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + item.gap + item.d);

            osc.connect(gain);
            gain.connect(master);

            osc.start(now + item.gap);
            osc.stop(now + item.gap + item.d + 0.05);
        });
    }

    /**
     * Âm thanh Click nhẹ tương tác
     */
    playClick() {
        const master = this.getMasterGain();
        if (!master) return;
        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.05);
    }
}

// Global Singleton Instance
window.SoundFX = new SoundFxEngine();

// Unlock AudioContext on first user interaction
document.addEventListener('click', () => {
    if (window.SoundFX) window.SoundFX.initContext();
}, { once: true });
document.addEventListener('touchstart', () => {
    if (window.SoundFX) window.SoundFX.initContext();
}, { once: true });

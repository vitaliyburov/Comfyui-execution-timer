import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * ComfyUI Web Extension for Live Execution Timer Widget & Binary Bell Chime Player
 * - Auto-resets timer on Queue Prompt
 * - Live updates timer widget at 60fps during render
 * - Plays synthesized bell sound chime from binary melody string on completion
 */

app.registerExtension({
    name: "ComfyUI.ExecutionTimer",

    async setup() {
        let audioCtx = null;

        // Auto-unlock Web Audio API on any user interaction inside ComfyUI
        const unlockAudio = () => {
            try {
                if (!audioCtx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) audioCtx = new AudioCtx();
                }
                if (audioCtx && audioCtx.state === "suspended") {
                    audioCtx.resume().catch(() => {});
                }
            } catch (e) {
                console.warn("[Timer] Audio context unlock error:", e);
            }
            return audioCtx;
        };

        // Attach global user gesture listeners
        window.addEventListener("pointerdown", unlockAudio, { passive: true });
        window.addEventListener("click", unlockAudio, { passive: true });
        window.addEventListener("keydown", unlockAudio, { passive: true });

        // Bell pitch scale frequencies
        const BELL_SCALE = [
            523.25, 587.33, 659.25, 698.46, 783.99,
            880.00, 987.77, 1046.50, 1174.66, 1318.51,
            1396.91, 1567.98, 1760.00, 1975.53, 2093.00
        ];

        // Synthesize single metallic bell note with rich harmonic partials
        function playBellNote(freq, startTime, duration = 1.6) {
            const ctx = unlockAudio();
            if (!ctx) return;

            const partials = [
                { freqRatio: 1.0, gainFactor: 0.45, decayFactor: 1.0 },
                { freqRatio: 2.0, gainFactor: 0.25, decayFactor: 0.85 },
                { freqRatio: 2.76, gainFactor: 0.30, decayFactor: 0.70 },
                { freqRatio: 5.40, gainFactor: 0.18, decayFactor: 0.45 },
            ];

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.85, startTime);

            partials.forEach((p) => {
                const osc = ctx.createOscillator();
                const pGain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq * p.freqRatio, startTime);

                const attack = 0.003;
                const decay = duration * p.decayFactor;

                pGain.gain.setValueAtTime(0.0001, startTime);
                pGain.gain.linearRampToValueAtTime(p.gainFactor, startTime + attack);
                pGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

                osc.connect(pGain);
                pGain.connect(masterGain);

                osc.start(startTime);
                osc.stop(startTime + decay + 0.1);
            });

            masterGain.connect(ctx.destination);
        }

        // Play bell chime melody from binary string
        function triggerBellSound(binaryText) {
            try {
                const ctx = unlockAudio();
                if (!ctx) return;

                if (ctx.state === "suspended") {
                    ctx.resume().then(() => playMelodyInternal(ctx, binaryText)).catch(() => playMelodyInternal(ctx, binaryText));
                    return;
                }
                playMelodyInternal(ctx, binaryText);
            } catch (e) {
                console.warn("[Timer] Chime audio error:", e);
            }
        }

        function playMelodyInternal(ctx, binaryText) {
            const raw = binaryText || "01000010 01000101 01001100 01001100";
            const clean = raw.replace(/[^01\s]/g, "").trim();
            let tokens = clean.split(/\s+/).filter(Boolean);

            if (tokens.length === 0) {
                const flat = clean.replace(/\s+/g, "");
                tokens = [];
                for (let i = 0; i < flat.length; i += 8) {
                    tokens.push(flat.substring(i, i + 8));
                }
            }

            let byteVals = tokens.map((t) => parseInt(t.padEnd(8, "0").slice(0, 8), 2)).filter((v) => !isNaN(v));
            if (byteVals.length === 0) byteVals = [66, 69, 76, 76]; // BELL

            let now = ctx.currentTime + 0.02;
            const step = 0.18;

            byteVals.forEach((val) => {
                const freq = BELL_SCALE[val % BELL_SCALE.length] * ((val & 1) ? 1.0 : 1.25);
                playBellNote(freq, now, 1.5);
                now += step;
            });

            // Final resonating chime
            const finaleFreq = BELL_SCALE[(byteVals[byteVals.length - 1] + 3) % BELL_SCALE.length] * 1.5;
            playBellNote(finaleFreq, now + 0.05, 2.2);

            console.log("[⏱️ Execution Timer] Played render finish chime sound!");
        }

        const pad = (n) => String(n).padStart(2, "0");

        function formatTime(ms) {
            const totalSec = Math.floor(ms / 1000);
            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;
            return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
        }

        // Listen for backend websocket execution_timer_complete event
        api.addEventListener("execution_timer_complete", (e) => {
            const data = e.detail || {};
            if (data.sound_on_finish !== false) {
                triggerBellSound(data.binary_melody_text);
            }
        });

        // Event listener: Queue Execution Started
        api.addEventListener("execution_start", () => {
            unlockAudio();
            const timerNodes = app.graph.findNodesByType("ExecutionTimerNode");
            for (const node of timerNodes) {
                if (node.timerInterval) clearInterval(node.timerInterval);

                node.timerState = "running";
                node.startTime = performance.now();
                node.timerText = "00:00:00";

                node.timerInterval = setInterval(() => {
                    const elapsed = performance.now() - node.startTime;
                    node.timerText = formatTime(elapsed);
                    app.graph.setDirtyCanvas(true, true);
                }, 33);
            }
        });

        // Halt execution timers on render end
        const stopTimers = () => {
            const timerNodes = app.graph.findNodesByType("ExecutionTimerNode");
            for (const node of timerNodes) {
                if (node.timerState === "running") {
                    if (node.timerInterval) clearInterval(node.timerInterval);
                    node.timerState = "stopped";
                    app.graph.setDirtyCanvas(true, true);

                    // Check widget values for fallback sound trigger
                    const soundWidget = node.widgets?.find(w => w.name === "sound_on_finish");
                    const melodyWidget = node.widgets?.find(w => w.name === "binary_melody_text");
                    if (soundWidget && soundWidget.value !== false) {
                        triggerBellSound(melodyWidget ? melodyWidget.value : null);
                    }
                }
            }
        };

        api.addEventListener("execution_success", stopTimers);
        api.addEventListener("execution_error", stopTimers);
        api.addEventListener("executed", stopTimers);
        api.addEventListener("status", (e) => {
            if (e.detail && e.detail.exec_info && e.detail.exec_info.queue_remaining === 0) {
                stopTimers();
            }
        });
    },

    async nodeCreated(node) {
        if (node.comfyClass === "ExecutionTimerNode") {
            node.timerState = "idle";
            node.timerText = "00:00:00";
            node.startTime = 0;

            node.addCustomWidget({
                name: "timer_display",
                type: "custom",
                value: "00:00:00",
                draw(ctx, node, width, y, height) {
                    ctx.save();
                    
                    // Display Container Box
                    ctx.fillStyle = "#090d16";
                    ctx.strokeStyle = node.timerState === "running" ? "#22c55e" : "#3b82f6";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(12, y + 4, width - 24, 46, 8);
                    ctx.fill();
                    ctx.stroke();

                    // Status Dot Indicator
                    ctx.fillStyle = node.timerState === "running" ? "#22c55e" : "#64748b";
                    ctx.beginPath();
                    ctx.arc(28, y + 27, 4, 0, Math.PI * 2);
                    ctx.fill();

                    // Digital Clock Text
                    ctx.fillStyle = node.timerState === "running" ? "#4ade80" : "#60a5fa";
                    ctx.font = "bold 20px monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(node.timerText || "00:00:00", width / 2 + 8, y + 27);
                    
                    ctx.restore();
                },
                computeSize() {
                    return [230, 56];
                }
            });
        }
    }
});

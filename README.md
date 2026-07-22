# ComfyUI Execution Timer Custom Node ⏱️🔔

A high-precision execution timer node with binary melody bell sound notifications for ComfyUI workflows.

https://github.com/vitaliyburov/Comfyui-execution-timer/Capture_Timer.PNG

## Features
- **Live Canvas Timer**: Starts automatically from `00:00:00` on Queue Prompt execution, displaying real-time execution duration.
- **Binary Melody Bell Chime**: Plays a metallic bell sound chime when render finishes, synthesized directly from a binary text string (e.g., ASCII binary for `BELL`).
- **Universal Passthrough (`*`)**: Connect any image, model, or tensor pipe to track execution timing without breaking pipeline connections.
- **WebSocket Sync**: Communicates execution metrics seamlessly between Python server backend and JavaScript web extension.

## 🚀 Installation

1. Open your ComfyUI `custom_nodes` directory:
   ```bash
   cd ComfyUI/custom_nodes/
   mkdir comfyui-execution-timer
   cd comfyui-execution-timer
   mkdir js
   ```

2. Place generated code files:
   - `__init__.py` -> `custom_nodes/comfyui-execution-timer/__init__.py`
   - `execution_timer.py` -> `custom_nodes/comfyui-execution-timer/execution_timer.py`
   - `execution_timer.js` -> `custom_nodes/comfyui-execution-timer/js/execution_timer.js`

3. Restart ComfyUI!
   Search for `Execution Timer` or find it under `utils/timing`.

import time
from server import PromptServer

class ExecutionTimerNode:
    """
    ComfyUI Pipeline Execution Timer Node
    - Resets counter to 00:00:00 when execution starts
    - Counts up live during pipeline execution
    - Stops automatically when render completes
    - Plays synthesized bell sound chime from binary melody text when finish signal is received
    - Accepts ANY input type (*) to detect pipeline execution state
    """

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "display_format": (
                    ["00:00:00", "00:00:00.00", "00:00:00.000", "SECONDS"],
                    {"default": "00:00:00"}
                ),
                "reset_on_queue": ("BOOLEAN", {"default": True}),
                "sound_on_finish": ("BOOLEAN", {"default": True}),
                "binary_melody_text": ("STRING", {
                    "default": "01000010 01000101 01001100 01001100",
                    "multiline": False,
                    "tooltip": "Binary text string defining the end-of-render bell melody (e.g. ASCII binary for 'BELL')"
                }),
            },
            "optional": {
                "passthrough_input": ("*", {
                    "tooltip": "Connect ANY signal, latent, image, or model output to detect when pipeline execution reaches this point."
                }),
            },
        }

    RETURN_TYPES = ("*", "STRING", "FLOAT", "INT")
    RETURN_NAMES = ("passthrough", "formatted_time", "elapsed_seconds", "elapsed_ms")
    FUNCTION = "execute_timer"
    CATEGORY = "utils/timing"
    OUTPUT_NODE = True

    def execute_timer(
        self,
        display_format="00:00:00",
        reset_on_queue=True,
        sound_on_finish=True,
        binary_melody_text="01000010 01000101 01001100 01001100",
        passthrough_input=None
    ):
        start_time = getattr(self, "_start_time", time.time())
        end_time = time.time()
        elapsed_sec = end_time - start_time
        elapsed_ms = int(elapsed_sec * 1000)

        hours = int(elapsed_sec // 3600)
        minutes = int((elapsed_sec % 3600) // 60)
        seconds = int(elapsed_sec % 60)
        ms_part = int((elapsed_sec % 1) * 1000)

        if display_format == "00:00:00":
            formatted = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        elif display_format == "00:00:00.00":
            formatted = f"{hours:02d}:{minutes:02d}:{seconds:02d}.{int(ms_part/10):02d}"
        elif display_format == "00:00:00.000":
            formatted = f"{hours:02d}:{minutes:02d}:{seconds:02d}.{ms_part:03d}"
        else:
            formatted = f"{elapsed_sec:.2f}s"

        # Broadcast completion message & audio chime trigger to ComfyUI web extension
        try:
            PromptServer.instance.send_sync("execution_timer_complete", {
                "elapsed_sec": elapsed_sec,
                "elapsed_ms": elapsed_ms,
                "formatted": formatted,
                "sound_on_finish": sound_on_finish,
                "binary_melody_text": binary_melody_text
            })
            print(f"[⏱️ Execution Timer] Chime trigger broadcasted to ComfyUI web interface.")
        except Exception as e:
            print(f"[⏱️ Execution Timer] Websocket broadcast warning: {e}")

        print(f"[⏱️ Execution Timer] Rendering completed in {formatted}")
        return (passthrough_input, formatted, elapsed_sec, elapsed_ms)

# Node registration mappings
NODE_CLASS_MAPPINGS = {
    "ExecutionTimerNode": ExecutionTimerNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ExecutionTimerNode": "⏱️ Execution Timer (Pipeline Timer)"
}

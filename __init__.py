from .execution_timer import ExecutionTimerNode

NODE_CLASS_MAPPINGS = {
    "ExecutionTimerNode": ExecutionTimerNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ExecutionTimerNode": "⏱️ Execution Timer"
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

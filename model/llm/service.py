"""
LLM service for text generation and chat responses.
"""

class LLMService:
    """Service for LLM-based text generation."""

    def __init__(self):
        print("LLMService initialized (mock)")

    async def generate_response(self, prompt: str, context: str = ""):
        """Generate a response using the LLM."""
        return f"Mock LLM response to: {prompt}"

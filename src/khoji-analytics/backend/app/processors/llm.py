##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

# app/processors/llm.py
from json_repair import repair_json
from typing import Any, Dict
from app.core.errors import AIRequestFailed


# tests missing
def extract_reply_json(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    response looks like:
      {
        "totalTokenCount": ...,
        "outputTokenCount": ...,
        "inputTokenCount": ...,
        "reply": "<JSON string>"
      }
    We parse 'reply' (string) into a dict and return it.
    """
    raw = response.get("reply", "")

    if not isinstance(raw, str) or not raw.strip():
        raise AIRequestFailed(501, 'Empty or invalid AI reply')

    try:
        # we should be generic here, as its used from different metrics

        # repair_json scans the string, finds the object, fixes errors, 
        # and returns a Python dict. 
        parsed_dict = repair_json(raw, return_objects=True)

        # If it returns a list (JSON array)
        if isinstance(parsed_dict, list):
            # if this is specific to particular metric, we should write
            # a seperate function that can call this and then can have additional checks
            raise AIRequestFailed(502, f"LLM returned a list, but expected a dictionary. Got: {parsed_dict}")
            # should we return the whole payload when raising error or can simply print/write to log
            # and raise errors in some traceable way, 501, 502, ...

        return parsed_dict

    except Exception as e:
        print(f"Failed to repair/parse JSON: {e}")
        raise AIRequestFailed(509, 'AI reply contained unreadable JSON')
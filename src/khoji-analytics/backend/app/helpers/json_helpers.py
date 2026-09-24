##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

import decimal

def orjson_default(obj):
    """Default handler for orjson to serialize decimal types"""
    if isinstance(obj, decimal.Decimal):
        return float(obj) # Convert to float for proper JSON serialization while maintaining numeric type
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
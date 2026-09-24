##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Configuration settings for the application.
Centralizes all configuration in one place for easy management.
"""

import os

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'khoji-admin'),
    'user': os.getenv('DB_USER', 'khoji-admin'),
    'password': os.getenv('DB_PASSWORD', 'khoji'),
    'port': int(os.getenv('DB_PORT', 5435))
}

# Application settings
APP_CONFIG = {
    'schema_name': 'kss',
    'pagination_size': 50
}
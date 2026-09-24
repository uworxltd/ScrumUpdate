##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Celery application initialization and configuration.
This module handles the core Celery app setup and configuration loading.
"""

import os
from celery import Celery

# Windows compatibility fix
if os.name == 'nt':
    os.environ.setdefault('FORKED_BY_MULTIPROCESSING', '1')

# =============================================================================
# CELERY APP INITIALIZATION
# =============================================================================

# Create Celery app instance
app = Celery('jira_sync')

# Load configuration from celeryconfig.py
app.config_from_object('celeryconfig')
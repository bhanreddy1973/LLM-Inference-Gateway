"""Test configuration — add gateway root to sys.path."""

import sys
from pathlib import Path

# Add gateway directory to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

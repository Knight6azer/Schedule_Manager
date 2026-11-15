"""
WSGI entrypoint for web servers and serverless platforms (Vercel, Gunicorn).
"""
import os
from run import app as flask_app

app = flask_app
application = flask_app

__all__ = ['app', 'application']

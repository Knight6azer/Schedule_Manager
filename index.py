"""
Default serverless function entrypoint for Vercel.
"""
from run import app as flask_app

app = flask_app
application = flask_app

__all__ = ['app', 'application']

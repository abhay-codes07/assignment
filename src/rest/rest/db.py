import os

from pymongo import MongoClient

MONGO_URI = 'mongodb://{}:{}'.format(os.environ['MONGO_HOST'], os.environ['MONGO_PORT'])

# One client for the process; pymongo handles pooling internally.
# The short timeout makes requests fail fast when Mongo is unreachable
# instead of hanging for the default 30s.
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client['test_db']

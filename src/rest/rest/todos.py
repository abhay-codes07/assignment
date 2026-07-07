from datetime import datetime, timezone

from .db import db


class TodoRepository:
    """Mongo-backed storage for todos. Keeps pymongo details out of the views."""

    def __init__(self, database=db):
        self._todos = database['todos']

    def list(self):
        return [self._serialize(doc) for doc in self._todos.find().sort('created_at', -1)]

    def create(self, description):
        doc = {
            'description': description,
            'created_at': datetime.now(timezone.utc),
        }
        doc['_id'] = self._todos.insert_one(doc).inserted_id
        return self._serialize(doc)

    @staticmethod
    def _serialize(doc):
        created = doc['created_at']
        if created.tzinfo is None:
            # pymongo hands back naive UTC datetimes; make the offset explicit
            # so clients don't misread the timestamp as local time
            created = created.replace(tzinfo=timezone.utc)
        return {
            'id': str(doc['_id']),
            'description': doc['description'],
            'created_at': created.isoformat(),
        }

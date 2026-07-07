import logging

from pymongo.errors import PyMongoError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .todos import TodoRepository

logger = logging.getLogger(__name__)

todos = TodoRepository()


class TodoListView(APIView):

    def get(self, request):
        try:
            return Response(todos.list())
        except PyMongoError:
            logger.exception('Failed to fetch todos')
            return self._db_error()

    def post(self, request):
        description = request.data.get('description')
        if not isinstance(description, str) or not description.strip():
            return Response(
                {'error': 'description is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            todo = todos.create(description.strip())
        except PyMongoError:
            logger.exception('Failed to create todo')
            return self._db_error()

        return Response(todo, status=status.HTTP_201_CREATED)

    @staticmethod
    def _db_error():
        return Response(
            {'error': 'Database is unavailable, try again shortly'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

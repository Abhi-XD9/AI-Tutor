from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def get_user_from_token(token):

    try:
        jwt_authentication = JWTAuthentication()

        validated_token = jwt_authentication.get_validated_token(
            token
        )

        user = jwt_authentication.get_user(
            validated_token
        )

        return user

    except Exception as e:

        print("JWT AUTHENTICATION ERROR:", e)

        return AnonymousUser()


class JWTAuthMiddleware:

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):

        query_string = scope.get(
            "query_string",
            b""
        ).decode()

        query_params = parse_qs(query_string)

        token = query_params.get(
            "token",
            [None]
        )[0]

        print("WEBSOCKET TOKEN FOUND:", bool(token))

        if token:

            scope["user"] = await get_user_from_token(
                token
            )

            print(
                "WEBSOCKET USER:",
                scope["user"]
            )

        else:

            scope["user"] = AnonymousUser()

            print("NO WEBSOCKET TOKEN")

        return await self.app(
            scope,
            receive,
            send
        )
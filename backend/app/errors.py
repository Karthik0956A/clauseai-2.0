"""Application errors returned to clients without stack traces."""


class AppError(Exception):
    status_code = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ConfigurationError(AppError):
    status_code = 503


class ValidationFailed(AppError):
    status_code = 400


class NotFoundError(AppError):
    status_code = 404


class ForbiddenError(AppError):
    status_code = 403


class ExternalServiceError(AppError):
    status_code = 502

package com.askrepo.backend.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler({ NotFoundException.class, UnauthorizedException.class, BadRequestException.class,
            ConflictException.class })
    public ResponseEntity<?> handleException(RuntimeException ex, WebRequest request) {
        HttpStatus status;
        if (ex instanceof NotFoundException) {
            status = HttpStatus.NOT_FOUND;
        } else if (ex instanceof UnauthorizedException) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (ex instanceof BadRequestException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof ConflictException) {
            status = HttpStatus.CONFLICT;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        String message = ex.getMessage() != null ? ex.getMessage() : status.getReasonPhrase();
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}

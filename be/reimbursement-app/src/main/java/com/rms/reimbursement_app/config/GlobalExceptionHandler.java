// src/main/java/com/rms/reimbursement_app/config/GlobalExceptionHandler.java
package com.rms.reimbursement_app.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // pass through ResponseStatusException with its status + reason
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handleRse(ResponseStatusException ex) {
        String body = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArg(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    // keep a generic fallback, but only for truly unexpected errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGeneric(Exception ex) {
        // TODO: log stack trace with a logger
        return ResponseEntity.internalServerError()
                .body("Unexpected error: " + ex.getMessage());
    }
}

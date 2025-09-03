// src/main/java/com/rms/reimbursement_app/controller/ReceiptController.java
package com.rms.reimbursement_app.controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.PathVariable;
@RestController
@RequestMapping("/api/claims")
public class ReceiptController {

    // if you already have GET /{id}/receipt implemented, add:
    @RequestMapping(value = "/api/claims/{id}/receipt/exists", method = RequestMethod.HEAD)
    public ResponseEntity<Void> headReceipt(@PathVariable Long id) {
        // Replace with real existence check
        boolean exists = /* storage check for claim id */ false;
        return exists ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}

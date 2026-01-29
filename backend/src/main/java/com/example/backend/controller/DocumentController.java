package com.example.backend.controller;

import com.example.backend.model.Document;
import com.example.backend.service.S3Service;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final S3Service s3Service;

    // Hardcoded documents for learning purposes.
    // In a real app, this would be a Database table.
    private static final List<Document> VAULT_DOCS = List.of(
            new Document("doc-001", "Q4 Financial Report", "Finance", "ADMIN", "q4-financial.pdf"),
            new Document("doc-002", "Employee Handbook", "HR", "USER", "employee-handbook.pdf"),
            new Document("doc-003", "Annual Audit Report", "Finance", "ADMIN", "annual-audit.pdf"),
            new Document("doc-004", "Onboarding Guide", "HR", "USER", "onboarding-guide.pdf"));

    public DocumentController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    /**
     * Endpoint to get exactly ONE specific document link.
     * Before generating the AWS S3 URL, we check the user's role from their JWT.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDocumentLink(@PathVariable String id, Authentication authentication) {
        // Find the requested document
        Document requestedDoc = VAULT_DOCS.stream()
                .filter(d -> d.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (requestedDoc == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Document not found"));
        }

        // Get the user's role from the JWT (Spring Security already validated the
        // token!)
        boolean hasAdminRole = hasRole(authentication, "ADMIN");
        boolean hasUserRole = hasRole(authentication, "USER");

        // RBAC Logic:
        // ADMIN can download anything.
        // USER can only download documents marked for USER.
        boolean isAuthorized = false;

        if (hasAdminRole) {
            isAuthorized = true;
        } else if (hasUserRole && requestedDoc.getRequiredRole().equals("USER")) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You do not have the required role to download this file."));
        }

        // The user is authorized! So we ask S3 for a temporary direct-download link
        String preSignedUrl = s3Service.generatePreSignedUrl(requestedDoc.getObjectKey());

        // We return the URL to the frontend.
        return ResponseEntity.ok(Map.of("url", preSignedUrl));
    }

    private boolean hasRole(Authentication authentication, String targetRole) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals(targetRole)) {
                return true;
            }
        }
        return false;
    }
}

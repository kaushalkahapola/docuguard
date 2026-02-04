package com.example.backend.controller;

import com.example.backend.model.Document;
import com.example.backend.repository.DocumentRepository;
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
    private final DocumentRepository documentRepository;

    public DocumentController(S3Service s3Service, DocumentRepository documentRepository) {
        this.s3Service = s3Service;
        this.documentRepository = documentRepository;
    }

    /**
     * Endpoint to list all documents available to the logged-in user based on their
     * role.
     */
    @GetMapping
    public ResponseEntity<List<Document>> getAllDocuments(Authentication authentication) {
        List<Document> allDocs = documentRepository.findAll();

        boolean hasAdminRole = hasRole(authentication, "ADMIN");
        boolean hasUserRole = hasRole(authentication, "USER");

        if (hasAdminRole) {
            return ResponseEntity.ok(allDocs);
        } else if (hasUserRole) {
            List<Document> userDocs = allDocs.stream()
                    .filter(d -> "USER".equals(d.getRequiredRole()))
                    .toList();
            return ResponseEntity.ok(userDocs);
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    /**
     * Endpoint for ADMINs to request an S3 Pre-Signed PUT URL to upload a new
     * document securely.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> getUploadUrl(@RequestBody Map<String, String> body, Authentication authentication) {
        if (!hasRole(authentication, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only ADMIN users can upload documents."));
        }

        String fileName = body.get("fileName");
        String contentType = body.get("contentType");
        String role = body.getOrDefault("role", "USER");

        if (fileName == null || contentType == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "fileName and contentType are required"));
        }

        // Generate the S3 Key (path) where it will be saved. We use the role as a
        // folder.
        // E.g., "ADMIN/secret-file.pdf" or "USER/employee-handbook.pdf"
        String objectKey = role + "/" + fileName;

        // Ask the S3 Service to mint a PUT url
        String preSignedPutUrl = s3Service.generatePreSignedPutUrl(objectKey, contentType);

        return ResponseEntity.ok(Map.of(
                "uploadUrl", preSignedPutUrl,
                "objectKey", objectKey));
    }

    /**
     * Endpoint to get exactly ONE specific document link.
     * Before generating the AWS S3 URL, we check the user's role from their JWT.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDocumentLink(@PathVariable String id, Authentication authentication) {
        // Find the requested document from Database
        Document requestedDoc = documentRepository.findById(id).orElse(null);

        if (requestedDoc == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Document not found"));
        }

        // Get the user's role from the JWT
        boolean hasAdminRole = hasRole(authentication, "ADMIN");
        boolean hasUserRole = hasRole(authentication, "USER");

        // RBAC Logic
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

        // Generate S3 URL
        String preSignedUrl = s3Service.generatePreSignedUrl(requestedDoc.getObjectKey());

        // Return URL to frontend
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

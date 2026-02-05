package com.example.backend.controller;

import com.example.backend.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body, Authentication authentication) {
        if (!hasRole(authentication, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only ADMIN users can create new accounts."));
        }

        String email = body.get("email");
        String role = body.getOrDefault("role", "USER");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        try {
            adminService.createUser(email, role.toUpperCase());
            return ResponseEntity.ok(Map.of(
                    "message", "User created successfully! AWS will send them an email with a temporary password.",
                    "email", email,
                    "role", role));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean hasRole(Authentication authentication, String requiredRole) {
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            String role = jwtToken.getTokenAttributes().getOrDefault("custom:role", "").toString();
            return requiredRole.equals(role);
        }
        return false;
    }
}

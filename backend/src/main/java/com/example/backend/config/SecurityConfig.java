package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security Configuration
 *
 * This class configures our application as an OAuth2 Resource Server.
 * It tells Spring Security to:
 * 1. Require a valid JWT Bearer token on all protected API routes.
 * 2. Automatically validate the JWT signature by fetching public keys
 * from our Cognito User Pool's JWKS endpoint. This is configured via
 * the `spring.security.oauth2.resourceserver.jwt.issuer-uri` property.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF because we are a stateless REST API (JWT-based)
                .csrf(csrf -> csrf.disable())
                // Allow CORS from our Next.js frontend
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Make the API stateless - no sessions stored on the server
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints (add more if needed)
                        .requestMatchers("/actuator/health").permitAll()
                        // All other API endpoints require a valid JWT
                        .anyRequest().authenticated())
                // This is the key line: treat this app as an OAuth2 Resource Server
                // Spring will validate incoming JWTs against the Cognito JWKS endpoint
                // automatically
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    /**
     * Maps Cognito's custom:role claim to Spring Security authorities.
     * This allows us to use @PreAuthorize("hasAuthority('ADMIN')") in controllers.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        // Tell Spring to read the roles from the "custom:role" claim in the Cognito JWT
        grantedAuthoritiesConverter.setAuthoritiesClaimName("custom:role");
        // No prefix (Spring adds "ROLE_" by default, but we want clean role names)
        grantedAuthoritiesConverter.setAuthorityPrefix("");

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return jwtAuthenticationConverter;
    }

    /**
     * CORS config to allow our Next.js frontend (localhost:3000) to call this API.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

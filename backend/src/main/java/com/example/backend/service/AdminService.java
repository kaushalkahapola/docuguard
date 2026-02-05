package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminCreateUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;

@Service
public class AdminService {

    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    private final CognitoIdentityProviderClient cognitoClient;

    @Value("${app.cognito.user-pool-id}")
    private String userPoolId;

    public AdminService(CognitoIdentityProviderClient cognitoClient) {
        this.cognitoClient = cognitoClient;
    }

    /**
     * Programmatically creates a new user in the AWS Cognito User Pool and assigns
     * a role.
     * AWS Cognito will automatically email the new user a temporary password.
     */
    public void createUser(String email, String role) {
        logger.info("Admin creating new user {} with role {}", email, role);

        AttributeType emailAttr = AttributeType.builder()
                .name("email")
                .value(email)
                .build();

        AttributeType roleAttr = AttributeType.builder()
                .name("custom:role")
                .value(role)
                .build();

        AdminCreateUserRequest request = AdminCreateUserRequest.builder()
                .userPoolId(userPoolId)
                .username(email)
                .userAttributes(emailAttr, roleAttr)
                .desiredDeliveryMediumsWithStrings("EMAIL")
                .build();

        cognitoClient.adminCreateUser(request);

        logger.info("Successfully created user {} in Cognito!", email);
    }
}

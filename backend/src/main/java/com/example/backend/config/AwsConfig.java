package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;

@Configuration
public class AwsConfig {

    @Value("${spring.cloud.aws.credentials.access-key:}")
    private String accessKey;

    @Value("${spring.cloud.aws.credentials.secret-key:}")
    private String secretKey;

    @Value("${spring.cloud.aws.region.static:ap-south-1}")
    private String regionString;

    @Bean
    public AwsCredentialsProvider awsCredentialsProvider() {
        if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
            return StaticCredentialsProvider.create(credentials);
        }

        // Fallback to the AWS SDK default provider chain (env vars, profile, IAM role)
        return DefaultCredentialsProvider.create();
    }

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(regionString))
                .credentialsProvider(awsCredentialsProvider())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .region(Region.of(regionString))
                .credentialsProvider(awsCredentialsProvider())
                .build();
    }

    @Bean
    public CognitoIdentityProviderClient cognitoIdentityProviderClient() {
        return CognitoIdentityProviderClient.builder()
                .region(Region.of(regionString))
                .credentialsProvider(awsCredentialsProvider())
                .build();
    }
}

package com.example.backend.service;

import com.example.backend.model.Document;
import com.example.backend.repository.DocumentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awspring.cloud.sqs.annotation.SqsListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Service
public class SqsEventProcessor {

    private static final Logger logger = LoggerFactory.getLogger(SqsEventProcessor.class);
    private final ObjectMapper objectMapper;
    private final DocumentRepository documentRepository;

    public SqsEventProcessor(ObjectMapper objectMapper, DocumentRepository documentRepository) {
        this.objectMapper = objectMapper;
        this.documentRepository = documentRepository;
    }

    /**
     * This method runs asynchronously in the background. It constantly polls the
     * specified SQS queue. When S3 fires an ObjectCreated event, it lands in the
     * queue,
     * and this method immediately picks it up.
     */
    @SqsListener("${app.sqs.event-queue-name}")
    public void processS3Event(String message) {
        logger.info("==================================================");
        logger.info("SQS EVENT RECEIVED! New Document Uploaded to Vault");
        logger.info("Message Payload: {}", message);

        try {
            JsonNode rootNode = objectMapper.readTree(message);

            // S3 event payloads might be wrapped depending on how the queue is configured,
            // but the standard S3 notification looks like this:
            if (rootNode.has("Records")) {
                for (JsonNode record : rootNode.get("Records")) {
                    String eventName = record.path("eventName").asText();

                    if (eventName.startsWith("ObjectCreated:")) {
                        String bucketName = record.path("s3").path("bucket").path("name").asText();
                        String objectKey = record.path("s3").path("object").path("key").asText();

                        // AWS URL encodes the object key (e.g., spaces become +)
                        String decodedKey = URLDecoder.decode(objectKey, StandardCharsets.UTF_8);

                        logger.info("Parsed Upload: Bucket={}, Key={}", bucketName, decodedKey);

                        // Extract nice name and role from the file name.
                        // Example: "HR/employee-handbook.pdf" or just "q4-financial.pdf"
                        // For simplicity, we'll extract the name without extension and default to USER
                        String docName = extractNameFromKey(decodedKey);
                        String category = "General";
                        String requiredRole = "USER";

                        // The frontend upload endpoint places the file in a folder matching the target
                        // role
                        if (decodedKey.startsWith("ADMIN/")) {
                            requiredRole = "ADMIN";
                            category = "Restricted";
                        } else if (decodedKey.startsWith("USER/")) {
                            requiredRole = "USER";
                            category = "General";
                        }

                        // Save the newly uploaded document metadata to the H2 database
                        Document newDoc = new Document(docName, category, requiredRole, decodedKey);
                        documentRepository.save(newDoc);
                        logger.info("Successfully Saved Document Metadata to H2 Database! ID: {}", newDoc.getId());
                    }
                }
            }

        } catch (JsonProcessingException e) {
            logger.error("Failed to parse SQS message JSON", e);
        }

        logger.info("==================================================");
    }

    private String extractNameFromKey(String key) {
        // "folder/subfolder/file.pdf" -> "file.pdf"
        String filename = key.substring(key.lastIndexOf("/") + 1);
        // remove extension
        int dotIndex = filename.lastIndexOf(".");
        if (dotIndex > 0) {
            filename = filename.substring(0, dotIndex);
        }
        // convert dashes/underscores to spaces and capitalize
        return filename.replace("-", " ").replace("_", " ").toUpperCase();
    }
}

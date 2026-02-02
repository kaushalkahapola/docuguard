package com.example.backend.service;

import io.awspring.cloud.sqs.annotation.SqsListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SqsEventProcessor {

    private static final Logger logger = LoggerFactory.getLogger(SqsEventProcessor.class);

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
        logger.info("==================================================");

        // In a real application, you would parse the JSON message here (e.g. using
        // Jackson ObjectMapper)
        // to extract the S3 Bucket Name and Object Key, and then perhaps save a record
        // to a database
        // so the frontend knows the file exists.
    }
}

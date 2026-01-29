package com.example.backend.model;

public class Document {
    private String id;
    private String name;
    private String category;
    private String requiredRole;
    private String objectKey;

    public Document(String id, String name, String category, String requiredRole, String objectKey) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.requiredRole = requiredRole;
        this.objectKey = objectKey;
    }

    // Getters
    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getRequiredRole() {
        return requiredRole;
    }

    public String getObjectKey() {
        return objectKey;
    }
}

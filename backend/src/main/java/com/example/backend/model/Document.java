package com.example.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "documents")
public class Document {

    @Id
    private String id;
    private String name;
    private String category;
    private String requiredRole;
    private String objectKey;

    // JPA requires a no-args constructor
    public Document() {
    }

    public Document(String name, String category, String requiredRole, String objectKey) {
        this.id = UUID.randomUUID().toString();
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

    // Setters
    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public void setRequiredRole(String requiredRole) {
        this.requiredRole = requiredRole;
    }

    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }
}

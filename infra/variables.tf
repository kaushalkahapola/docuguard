variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "docuguard"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "Optional VPC ID. Leave empty to use default VPC."
  type        = string
  default     = ""
}

variable "allowed_cors_origins" {
  description = "Allowed CORS origins for S3 pre-signed upload/download"
  type        = list(string)
}

variable "s3_force_destroy" {
  description = "Whether to allow force-destroy of S3 bucket"
  type        = bool
  default     = false
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "MySQL engine version for RDS"
  type        = string
  default     = "8.0"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Initial DB name"
  type        = string
  default     = "docuguard"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
}

variable "db_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to MySQL"
  type        = list(string)
}

variable "db_publicly_accessible" {
  description = "Whether RDS is publicly accessible"
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  description = "Whether to skip final snapshot on deletion"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Enable RDS deletion protection"
  type        = bool
  default     = true
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "aws_region" {
  description = "AWS region for Terraform state resources"
  type        = string
}

variable "tf_state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform remote state"
  type        = string
}

variable "tf_lock_table_name" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
}

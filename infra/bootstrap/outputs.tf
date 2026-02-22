output "tf_state_bucket_name" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.tf_state.bucket
}

output "tf_lock_table_name" {
  description = "DynamoDB lock table name"
  value       = aws_dynamodb_table.tf_lock.name
}

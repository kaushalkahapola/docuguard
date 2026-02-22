output "aws_region" {
  description = "AWS region used by this stack"
  value       = var.aws_region
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.docuguard.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.docuguard_web.id
}

output "cognito_issuer_uri" {
  description = "Issuer URI for Spring OAuth2 resource server"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.docuguard.id}"
}

output "s3_bucket_name" {
  description = "Private S3 bucket name for document vault"
  value       = aws_s3_bucket.vault.bucket
}

output "sqs_queue_name" {
  description = "SQS queue name receiving S3 ObjectCreated events"
  value       = aws_sqs_queue.upload_events.name
}

output "sqs_queue_url" {
  description = "SQS queue URL"
  value       = aws_sqs_queue.upload_events.id
}

output "sqs_queue_arn" {
  description = "SQS queue ARN"
  value       = aws_sqs_queue.upload_events.arn
}

output "rds_endpoint" {
  description = "RDS endpoint (host:port)"
  value       = aws_db_instance.docuguard.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.docuguard.db_name
}

output "backend_runtime_role_arn" {
  description = "IAM role ARN for backend runtime (EC2/ECS)"
  value       = aws_iam_role.backend_runtime.arn
}

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix       = "${var.project_name}-${var.environment}"
  cognito_domain    = replace(lower("${local.name_prefix}-auth"), "_", "-")
  bucket_base_name  = replace(lower("${local.name_prefix}-vault"), "_", "-")
  db_name_sanitized = replace(lower(var.db_name), "-", "_")
}

resource "random_string" "bucket_suffix" {
  length  = 6
  lower   = true
  upper   = false
  numeric = true
  special = false
}

data "aws_vpc" "selected" {
  id = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default.id
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "selected" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

resource "aws_cognito_user_pool" "docuguard" {
  name = "${local.name_prefix}-user-pool"

  username_attributes = ["email"]

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  schema {
    attribute_data_type      = "String"
    name                     = "role"
    mutable                  = true
    required                 = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 4
      max_length = 10
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

resource "aws_cognito_user_pool_client" "docuguard_web" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.docuguard.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
  supported_identity_providers  = ["COGNITO"]
}

resource "aws_s3_bucket" "vault" {
  bucket        = "${local.bucket_base_name}-${random_string.bucket_suffix.result}"
  force_destroy = var.s3_force_destroy
}

resource "aws_s3_bucket_versioning" "vault" {
  bucket = aws_s3_bucket.vault.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "vault" {
  bucket = aws_s3_bucket.vault.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "vault" {
  bucket = aws_s3_bucket.vault.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "vault" {
  bucket = aws_s3_bucket.vault.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = var.allowed_cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_sqs_queue" "upload_events" {
  name                       = "${local.name_prefix}-upload-events"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
}

data "aws_iam_policy_document" "sqs_allow_s3" {
  statement {
    sid    = "AllowS3BucketNotifications"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.upload_events.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_s3_bucket.vault.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "upload_events" {
  queue_url = aws_sqs_queue.upload_events.id
  policy    = data.aws_iam_policy_document.sqs_allow_s3.json
}

resource "aws_s3_bucket_notification" "vault_events" {
  bucket = aws_s3_bucket.vault.id

  queue {
    queue_arn = aws_sqs_queue.upload_events.arn
    events    = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_sqs_queue_policy.upload_events]
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "RDS access for DocuGuard"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    description = "MySQL"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = var.db_allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "docuguard" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = data.aws_subnets.selected.ids
}

resource "aws_db_instance" "docuguard" {
  identifier             = "${local.name_prefix}-db"
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp3"
  engine                 = "mysql"
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  db_name                = local.db_name_sanitized
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.docuguard.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = var.db_skip_final_snapshot
  publicly_accessible = var.db_publicly_accessible
  apply_immediately   = true
  deletion_protection = var.db_deletion_protection
  multi_az            = var.db_multi_az
}

data "aws_iam_policy_document" "backend_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "backend_runtime" {
  name               = "${local.name_prefix}-backend-runtime-role"
  assume_role_policy = data.aws_iam_policy_document.backend_assume_role.json
}

data "aws_iam_policy_document" "backend_runtime" {
  statement {
    sid    = "S3VaultAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.vault.arn,
      "${aws_s3_bucket.vault.arn}/*"
    ]
  }

  statement {
    sid    = "SQSConsumerAccess"
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl"
    ]
    resources = [aws_sqs_queue.upload_events.arn]
  }

  statement {
    sid    = "CognitoAdminCreateUser"
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser"
    ]
    resources = [aws_cognito_user_pool.docuguard.arn]
  }
}

resource "aws_iam_policy" "backend_runtime" {
  name   = "${local.name_prefix}-backend-runtime-policy"
  policy = data.aws_iam_policy_document.backend_runtime.json
}

resource "aws_iam_role_policy_attachment" "backend_runtime" {
  role       = aws_iam_role.backend_runtime.name
  policy_arn = aws_iam_policy.backend_runtime.arn
}

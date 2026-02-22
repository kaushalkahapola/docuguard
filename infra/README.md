# Terraform Infrastructure (Phase 1 + Phase 2)

This folder provisions all AWS infrastructure for DocuGuard using Terraform.

- **Phase 1**: Bootstrap (remote state via S3 + DynamoDB lock table) — run once per AWS account
- **Phase 2**: Main stack (Cognito, S3, SQS, RDS, IAM)

## Structure

```
infra/
├── bootstrap/              # One-time setup for remote state
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── main.tf                 # Core DocuGuard resources
├── variables.tf            # Variable definitions
├── outputs.tf              # Output values for app config
├── versions.tf             # Provider version constraints
├── terraform.tfvars.example
├── backend.hcl.example
└── README.md              # This file
```

## Prerequisites

- Terraform >= 1.5
- AWS credentials configured:
  ```bash
  export AWS_ACCESS_KEY_ID="..."
  export AWS_SECRET_ACCESS_KEY="..."
  export AWS_REGION="ap-south-1"
  ```
  Or use AWS CLI profile: `export AWS_PROFILE=your-profile`

## Setup Steps

### 1. Bootstrap Remote State (one time)

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with a globally unique bucket name
# (replace <unique-suffix> with something random like your-org-uuid)
nano terraform.tfvars

terraform init
terraform apply
```

Terraform will output:
- `tf_state_bucket_name` - save this for step 2
- `tf_lock_table_name` - save this for step 2

### 2. Deploy Main Stack

```bash
cd ../  # back to infra/

# Create local config files from examples
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl

# Edit both files with your values
nano terraform.tfvars      # Set DB password, CORS origins, VPC ID, etc.
nano backend.hcl           # Use the bucket/table names from bootstrap step

# Initialize with remote backend
terraform init -backend-config=backend.hcl -reconfigure

# Plan and apply
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

### 3. Wire Outputs into Application

After `terraform apply`, capture the outputs needed for your app:

```bash
terraform output
```

Expected outputs:
- `cognito_user_pool_id` → Backend env `COGNITO_USER_POOL_ID`, Frontend env `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `cognito_user_pool_client_id` → Backend env `COGNITO_CLIENT_ID`, Frontend env `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `cognito_issuer_uri` → Backend env `COGNITO_ISSUER_URI`
- `s3_bucket_name` → Backend env `S3_BUCKET_NAME`
- `sqs_queue_name` → Backend env `SQS_EVENT_QUEUE_NAME`
- `rds_endpoint` → Build `DB_URL` as `jdbc:mysql://<endpoint>/docuguard?createDatabaseIfNotExist=true`

Update your [backend/.env.local](../backend/.env.local) and [frontend/.env.local](../frontend/.env.local) with these values, then restart your apps.

## Destroying Infrastructure

To tear down all resources (useful for dev cleanup):

```bash
terraform destroy -var-file=terraform.tfvars
```

**Note**: If `db_deletion_protection = true`, Terraform will fail. Edit `terraform.tfvars` to set it to `false` first.

## Key AWS Resources

| Resource | Purpose |
|----------|---------|
| Cognito User Pool | User authentication & role storage |
| Cognito App Client | Frontend auth endpoint |
| S3 Bucket (vault) | Private document storage with CORS |
| SQS Queue | S3 upload event notifications |
| RDS MySQL | Document metadata database |
| Security Group | Restrict DB access by IP |
| IAM Role & Policy | Backend permissions for S3/SQS/Cognito |

## Pro Tips

- **First deploy**: Expect Terraform to take 10–15 minutes due to RDS provisioning
- **State file**: Never delete `.terraform/` locally; it contains critical metadata
- **Debugging**: Use `terraform refresh` to sync local state with AWS reality
- **Cost tracking**: S3/SQS are cheap; watch RDS and data transfer costs in prod
- **Scaling**: Adjust `db_instance_class` and `db_multi_az` for production readiness

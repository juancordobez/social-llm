# 🏗️ Infrastructure - Social Mimic

Infraestructura como código (IaC) usando **Terraform** para **Google Cloud Platform**.

## Recursos Creados

| Recurso | Descripción |
|---------|-------------|
| **Cloud Run** | Servicio serverless para la API |
| **Artifact Registry** | Registro de imágenes Docker |
| **Secret Manager** | Gestión de secretos |
| **Service Accounts** | Cuentas de servicio para Cloud Run y GitHub Actions |
| **Workload Identity** | Autenticación sin llaves para GitHub Actions |

## Requisitos

- [Terraform](https://terraform.io) >= 1.5.0
- [gcloud CLI](https://cloud.google.com/sdk)
- Cuenta de GCP con billing habilitado

## Quick Start

### 1. Configurar GCP

```bash
# Login
gcloud auth login
gcloud auth application-default login

# Configurar proyecto
gcloud config set project YOUR_PROJECT_ID
```

### 2. Editar Variables

```bash
# Copiar y editar variables
cp environments/staging.tfvars.example environments/staging.tfvars
vim environments/staging.tfvars
```

### 3. Desplegar

```bash
# Inicializar
terraform init

# Ver plan
terraform plan -var-file=environments/staging.tfvars

# Aplicar
terraform apply -var-file=environments/staging.tfvars
```

### 4. Configurar Secrets

```bash
# Después de terraform apply, agregar valores de secrets
echo -n "YOUR_GROQ_API_KEY" | gcloud secrets versions add groq-api-key --data-file=-
echo -n "https://xxx.supabase.co" | gcloud secrets versions add supabase-url --data-file=-
echo -n "eyJxxx" | gcloud secrets versions add supabase-anon-key --data-file=-
```

### 5. Ver Outputs

```bash
terraform output

# Output para GitHub Secrets
terraform output github_secrets_config
```

## Estructura

```
terraform/
├── main.tf                 # Recursos principales
├── variables.tf            # Definición de variables
├── outputs.tf              # Outputs
├── .gitignore              # Ignorar archivos sensibles
└── environments/
    ├── staging.tfvars      # Variables para staging
    └── production.tfvars   # Variables para producción
```

## Comandos Útiles

```bash
# Formatear código
terraform fmt -recursive

# Validar configuración
terraform validate

# Ver estado actual
terraform show

# Destruir infraestructura (⚠️ cuidado!)
terraform destroy -var-file=environments/staging.tfvars
```

## Costos

| Recurso | Free Tier | Después |
|---------|-----------|---------|
| Cloud Run | 2M requests/mes | ~$0.40/M |
| Artifact Registry | 0.5GB | ~$0.10/GB |
| Secret Manager | 6 secrets | ~$0.06/secret |

**Estimado:** ~$5-10/mes para bajo tráfico

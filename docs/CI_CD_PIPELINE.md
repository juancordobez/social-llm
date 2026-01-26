# 🚀 CI/CD Pipeline - Social Mimic

## Resumen

Pipeline automatizado usando **GitHub Actions** + **Terraform** + **Google Cloud Platform**.

## Arquitectura

```
                        ┌─────────────────────────────────────┐
                        │           GitHub Repository          │
                        └─────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
       ┌──────────┐             ┌──────────┐             ┌──────────┐
       │   dev    │             │   stg    │             │   main   │
       │  branch  │             │  branch  │             │  branch  │
       └──────────┘             └──────────┘             └──────────┘
              │                         │                         │
              ▼                         ▼                         ▼
       ┌──────────┐             ┌──────────┐             ┌──────────┐
       │    CI    │             │ CI + CD  │             │ CI + CD  │
       │  Tests   │             │ Staging  │             │Production│
       └──────────┘             └──────────┘             └──────────┘
                                        │                         │
                                        ▼                         ▼
                               ┌────────────────┐       ┌────────────────┐
                               │  Cloud Run     │       │  Cloud Run     │
                               │  (Staging)     │       │  (Production)  │
                               └────────────────┘       └────────────────┘
```

## Workflows

### 1. CI - Tests & Lint (`ci.yml`)
**Trigger:** Push/PR a cualquier rama

- ✅ Linting con ESLint
- ✅ Tests unitarios (backend)
- ✅ Tests del brain
- ✅ Coverage report

### 2. CD - Staging (`cd-staging.yml`)
**Trigger:** Push a `stg`

- 🐳 Build Docker image
- 📤 Push a Artifact Registry
- 🚀 Deploy a Cloud Run (staging)

### 3. CD - Production (`cd-production.yml`)
**Trigger:** Push a `main`

- 🧪 Pre-deploy tests
- 🐳 Build Docker image
- 📤 Push a Artifact Registry
- 🚀 Deploy a Cloud Run (production)
- 🏷️ Create release tag

## Configuración Inicial

### 1. Configurar GCP

```bash
# Autenticarse
gcloud auth login

# Crear proyecto (si no existe)
gcloud projects create YOUR_PROJECT_ID

# Configurar proyecto
gcloud config set project YOUR_PROJECT_ID

# Habilitar billing
gcloud beta billing projects link YOUR_PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 2. Desplegar Infraestructura con Terraform

```bash
cd infrastructure/terraform

# Inicializar Terraform
terraform init

# Ver plan (staging)
terraform plan -var-file=environments/staging.tfvars

# Aplicar (staging)
terraform apply -var-file=environments/staging.tfvars

# Para producción
terraform apply -var-file=environments/production.tfvars
```

### 3. Configurar GitHub Secrets

Después de ejecutar Terraform, configura estos secrets en GitHub:

| Secret | Descripción | Obtener de |
|--------|-------------|------------|
| `GCP_PROJECT_ID` | ID del proyecto GCP | `terraform output` |
| `GCP_SERVICE_ACCOUNT` | Email de SA para deploys | `terraform output` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Provider para auth | `terraform output` |
| `GROQ_API_KEY` | API key de Groq | console.groq.com |

```bash
# Ver outputs de Terraform
terraform output github_secrets_config
```

### 4. Configurar Secrets en GCP

```bash
# Agregar valor del secret GROQ_API_KEY
echo -n "YOUR_GROQ_API_KEY" | gcloud secrets versions add groq-api-key --data-file=-

# Agregar Supabase URL
echo -n "https://xxx.supabase.co" | gcloud secrets versions add supabase-url --data-file=-

# Agregar Supabase Anon Key
echo -n "eyJxxxx" | gcloud secrets versions add supabase-anon-key --data-file=-
```

### 5. Crear Environments en GitHub

1. Ve a **Settings > Environments** en el repositorio
2. Crear environment `staging`
3. Crear environment `production`
   - Agregar **Required reviewers** (opcional pero recomendado)

## Flujo de Trabajo Recomendado

```bash
# 1. Desarrollo local
git checkout dev
# ... hacer cambios ...
git commit -m "feat: nueva funcionalidad"
git push origin dev
# → CI ejecuta tests

# 2. Merge a staging
git checkout stg
git merge dev
git push origin stg
# → CI + CD despliega a staging

# 3. Probar en staging
curl https://social-mimic-api-staging-xxx.run.app/health

# 4. Merge a producción
git checkout main
git merge stg
git push origin main
# → CI + CD despliega a producción
```

## Estructura de Archivos

```
.github/
├── workflows/
│   ├── ci.yml              # Tests y lint
│   ├── cd-staging.yml      # Deploy a staging
│   └── cd-production.yml   # Deploy a producción
│
infrastructure/
└── terraform/
    ├── main.tf             # Recursos principales
    ├── variables.tf        # Variables
    ├── outputs.tf          # Outputs
    └── environments/
        ├── staging.tfvars  # Variables staging
        └── production.tfvars # Variables producción
│
backend/
├── Dockerfile              # Build de la imagen
└── .dockerignore           # Archivos a ignorar
```

## Costos Estimados (GCP)

| Servicio | Uso | Costo Estimado |
|----------|-----|----------------|
| **Cloud Run** | ~100K requests/mes | ~$5/mes |
| **Artifact Registry** | ~5GB storage | ~$0.50/mes |
| **Secret Manager** | 3 secrets | ~$0.03/mes |
| **Total** | | **~$6/mes** |

*Con Free Tier de GCP, el primer año puede ser $0*

## Troubleshooting

### Error: Permission denied
```bash
# Verificar permisos del SA
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-deploy*"
```

### Error: Image not found
```bash
# Verificar que la imagen existe
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/YOUR_PROJECT/social-mimic
```

### Error: Secret not found
```bash
# Listar secretos
gcloud secrets list

# Verificar versiones
gcloud secrets versions list groq-api-key
```

## Monitoreo

- **Cloud Run Console:** https://console.cloud.google.com/run
- **Logs:** https://console.cloud.google.com/logs
- **GitHub Actions:** https://github.com/juancordobez/social-llm/actions

## Próximos Pasos (Sprint 02)

- [ ] Agregar Cloud Monitoring alertas
- [ ] Configurar Cloud Armor (WAF)
- [ ] Implementar canary deployments
- [ ] Agregar smoke tests post-deploy

# JWT_SECRET management (production)

## Requirements

- `JWT_SECRET` must be **absent from Git** (source, `.env` committed files, compose files).
- **Different secret per environment** (development / staging / production).
- **Production secret must come from the deployment platform** (Docker/cloud secrets, CI/CD environment, Vault, Kubernetes Secrets, etc.), never from a committed `.env`.
- The same secret must never be printed to logs. Logging and startup diagnostics only print the variable **name**, never its value.

## Production startup gate

When `NODE_ENV=production`, `src/utils/productionConfigValidator.js` refuses to boot when `JWT_SECRET` is:

- missing;
- shorter than **64 characters**;
- a known default/development/placeholder value (e.g. `change_me…`, `ms_secure_jwt_secret…`);
- a repetitive low-entropy string.

Development/staging keep their existing lenient behavior.

## Generating a 64+ character secret

Node.js (any platform):

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

OpenSSL (Linux/macOS/WSL):

```
openssl rand -base64 48
```

Verify strength before deploying:

```
node -e "const s=process.env.JWT_SECRET;if(!s||s.length<64)throw Error('too short');console.log('length',s.length)"
```

## Injection (Docker Compose example)

`docker-compose.prod.yml` requires interpolation so the container **cannot start** without an injected secret:

```yaml
environment:
  JWT_SECRET: ${JWT_SECRET:?JWT_SECRET_IS_REQUIRED_IN_PRODUCTION_INJECT_FROM_PLATFORM_SECRETS}
```

Run with the secret provided by the platform, e.g.:

```
export JWT_SECRET=<generated value>   # from a secret manager, never pasted here
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Rotation

Rotation is a manual, deliberate operation: generate a new secret, deploy it, then invalidate old tokens per your session policy. B4 does **not** perform automatic rotation and does **not** invalidate existing tokens.
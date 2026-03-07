# GrandviewOS — Integrations & Secrets Management System

*Architecture Specification v1.0 — March 2026*

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GrandviewOS UI                        │
│  ┌──────────┐ ┌──────────┐ ┌─────┐ ┌─────┐ ┌────────┐ │
│  │ Secrets   │ │Integra-  │ │ MCP │ │ LLM │ │ Agent  │ │
│  │ Manager   │ │tions     │ │Srvrs│ │Provs│ │ Perms  │ │
│  └─────┬─────┘ └─────┬────┘ └──┬──┘ └──┬──┘ └───┬────┘ │
└────────┼──────────────┼────────┼───────┼────────┼───────┘
         │              │        │       │        │
    ┌────▼──────────────▼────────▼───────▼────────▼───────┐
    │                  REST API Layer                       │
    │  /api/secrets  /api/integrations  /api/mcp-servers   │
    │  /api/llm-providers  /api/agent-permissions          │
    └────┬──────────────┬────────┬───────┬────────┬───────┘
         │              │        │       │        │
    ┌────▼────┐   ┌─────▼────┐  │  ┌────▼────┐   │
    │ Secrets │   │Integration│  │  │  LLM    │   │
    │  Vault  │   │ Registry  │  │  │Provider │   │
    │(encrypt)│   │           │  │  │Registry │   │
    └─────────┘   └──────────┘  │  └─────────┘   │
                           ┌────▼────┐      ┌─────▼─────┐
                           │  MCP    │      │  Agent    │
                           │Connector│      │Permission │
                           │         │      │  Engine   │
                           └─────────┘      └───────────┘
```

### Component Interactions
- **Secrets Vault** stores encrypted credentials; all other components reference secrets by ID
- **Integration Registry** defines available integrations and maps them to required secrets
- **Tool Router** resolves agent tool requests → integration → secrets → execution
- **Agent Permissions** gates which agents can access which integrations/tools/models
- **MCP Connector** discovers and proxies tools from external MCP servers
- **LLM Provider Registry** manages API keys and model availability per provider

---

## 2. Secret Management

### Storage
- **Location:** `~/.grandviewos/vault/secrets.json`
- **Encryption:** AES-256-GCM per secret value
- **Key Derivation:** PBKDF2 (SHA-512, 100,000 iterations, 32-byte salt) from operator master password
- **Fallback:** If no master password set, auto-generate 256-bit key → `~/.grandviewos/vault/master.key` (chmod 600)

### Secret Schema
```json
{
  "id": "sec_abc123",
  "name": "GitHub Token",
  "type": "api_key",           // api_key | ssh_key | oauth_token | env_var | certificate
  "encrypted_value": "base64...",
  "iv": "base64...",
  "tag": "base64...",
  "created_at": "2026-03-07T00:00:00Z",
  "updated_at": "2026-03-07T00:00:00Z",
  "last_rotated": "2026-03-07T00:00:00Z",
  "metadata": { "hint": "ghp_...XXXX" }
}
```

### Rotation Strategy
- Secrets track `last_rotated` timestamp
- UI shows age warnings (>90 days = yellow, >180 days = red)
- Rotate action: replace encrypted value, update timestamp, preserve ID

### Access Rules
- Secret values NEVER returned in API responses (only masked hint: last 4 chars)
- Decryption happens server-side only at point of use (tool execution)
- Audit log for every secret access

---

## 3. Integration Registry

### Integration Definition
```json
{
  "id": "int_github",
  "type": "github",
  "name": "GitHub",
  "icon": "🐙",
  "auth_method": "bearer_token",
  "required_secrets": ["github_token"],
  "optional_secrets": ["github_webhook_secret"],
  "exposed_tools": ["github.create_issue", "github.list_repos", "github.create_pr"],
  "config": { "org": "grandview-ai", "default_branch": "main" },
  "status": "connected",
  "last_used": "2026-03-07T00:00:00Z"
}
```

### Built-in Integrations
| ID | Type | Auth | Tools |
|----|------|------|-------|
| github | API | Bearer token | repos, issues, PRs, actions |
| slack | API | OAuth/Bot token | send, channels, threads |
| telegram | API | Bot token | send, receive, webhooks |
| aws | API | Access key + secret | S3, Lambda, EC2 |
| postgres | DB | Connection string | query, schema |
| stripe | API | API key | charges, subscriptions |
| openai | LLM | API key | chat, embeddings |
| anthropic | LLM | API key | messages |
| google | LLM | API key | gemini |
| custom_webhook | Webhook | Various | user-defined |

---

## 4. Tool Execution Framework

### Flow
1. Agent requests tool (e.g., `github.create_issue`)
2. **Permission check:** Agent has `github.*` or `github.create_issue` in allowed_tools
3. **Integration lookup:** Find integration with matching tool
4. **Secret resolution:** Decrypt required secrets from vault
5. **Execution:** Call integration API with credentials
6. **Audit:** Log tool call (agent, tool, timestamp, success/fail)
7. **Rate limiting:** Per-integration, per-agent limits

### Rate Limiting
- Default: 60 requests/minute per integration per agent
- Configurable per integration
- Burst allowance: 2x for 10-second windows

---

## 5. MCP Server Support

### Configuration
```json
{
  "id": "mcp_local",
  "name": "Local Dev Server",
  "url": "http://localhost:3001",
  "auth_type": "bearer",       // none | bearer | api_key
  "credential_secret_id": "sec_mcp_token",
  "status": "online",
  "tools": [],                  // populated via discovery
  "connected_agents": ["muddy", "elon"]
}
```

### Tool Discovery
- `GET /api/mcp-servers/:id/tools` triggers MCP `tools/list` call
- Tools cached with TTL (5 minutes)
- Each tool mapped to `mcp.<server_name>.<tool_name>` namespace

---

## 6. LLM Provider Configuration

### Provider Schema
```json
{
  "id": "llm_anthropic",
  "provider": "anthropic",
  "name": "Anthropic",
  "api_key_secret_id": "sec_anthropic_key",
  "base_url": "https://api.anthropic.com",
  "status": "active",
  "models": [
    { "id": "claude-opus-4-6", "name": "Claude Opus 4.6", "enabled": true, "is_default": true },
    { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "enabled": true }
  ]
}
```

### Failover
- Default model per provider
- Global failsafe model (cross-provider)
- Automatic retry on 429/5xx with exponential backoff

---

## 7. Agent Permissions

### Permission Schema
```json
{
  "agent_id": "muddy",
  "allowed_integrations": ["github", "slack", "anthropic"],
  "allowed_tools": ["github.*", "slack.send", "anthropic.messages"],
  "allowed_models": ["claude-opus-4-6", "claude-sonnet-4-6"],
  "deny_tools": [],
  "rate_limits": { "github": 120 }
}
```

### Wildcard Resolution
- `*` → all
- `github.*` → all tools under github integration
- `anthropic.messages` → specific tool only
- Deny overrides allow

---

## 8. Security Architecture

### Threat Model

| Threat | Safeguard |
|--------|-----------|
| Prompt injection stealing secrets | Secrets never in prompts; decrypted only at execution layer |
| Malicious tools | Tool allowlist per agent; no arbitrary code execution |
| Credential leakage in logs | Values masked in all API responses; audit log omits values |
| Workspace escape | Path validation; tools sandboxed to integration scope |
| Tool privilege escalation | Per-agent permission matrix; deny overrides allow |
| MCP server compromise | Auth required; tool results sanitized; timeout enforcement |
| Master key theft | File permissions (600); PBKDF2 key derivation; no key in API |

### Defense in Depth
1. **Encryption at rest** — AES-256-GCM for all secret values
2. **Minimal exposure** — Secrets decrypted only during tool execution, immediately discarded
3. **Audit trail** — Every secret access, tool call, and permission change logged
4. **Input validation** — All IDs, names, and values validated before storage
5. **Rate limiting** — Per-agent, per-integration, per-endpoint

---

## 9. Risk Analysis

### Known Limitations (MVP)
1. **Single-node encryption** — Master key on same filesystem as encrypted data; physical access = compromise
2. **No HSM/KMS** — Production should use AWS KMS, HashiCorp Vault, or similar
3. **JSON file storage** — No ACID guarantees; concurrent writes could corrupt
4. **No OAuth flow** — Integrations requiring OAuth must have tokens manually provided
5. **MCP trust** — MCP servers are trusted once configured; no per-tool sandboxing

### Mitigations
1. File permissions (600) + operator responsibility for host security
2. Architecture supports pluggable backends; KMS adapter planned
3. File-level locking for writes; acceptable for single-operator MVP
4. OAuth flow planned for v2
5. MCP tool results validated against expected schema; timeout enforcement

---

## Data Storage Layout

```
~/.grandviewos/
├── vault/
│   ├── master.key          # Auto-generated encryption key (chmod 600)
│   └── secrets.json        # Encrypted secrets
├── integrations.json       # Integration configurations
├── mcp-servers.json        # MCP server configs
├── llm-providers.json      # LLM provider configs
├── agent-permissions.json  # Per-agent permission matrix
└── config.json             # Existing GrandviewOS config
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/secrets | List secrets (masked) |
| POST | /api/secrets | Create secret |
| PATCH | /api/secrets/:id | Update secret |
| DELETE | /api/secrets/:id | Delete secret |
| GET | /api/integrations | List integrations |
| POST | /api/integrations | Add integration |
| PATCH | /api/integrations/:id | Update integration |
| DELETE | /api/integrations/:id | Remove integration |
| POST | /api/integrations/:id/test | Test connection |
| GET | /api/mcp-servers | List MCP servers |
| POST | /api/mcp-servers | Add MCP server |
| DELETE | /api/mcp-servers/:id | Remove MCP server |
| GET | /api/mcp-servers/:id/tools | Discover tools |
| GET | /api/llm-providers | List LLM providers |
| POST | /api/llm-providers | Configure provider |
| PATCH | /api/llm-providers/:id | Update provider |
| GET | /api/agent-permissions | List permissions |
| PATCH | /api/agent-permissions/:agent | Update permissions |

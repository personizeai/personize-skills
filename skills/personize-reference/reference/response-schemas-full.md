# Response Schema Reference

| Operation | Response Shape | Key Fields |
|-----------|---------------|------------|
| memorize | ApiResponse | success, data.creditsCharged, data.properties[] |
| smartRecall | ApiResponse\<RecallResponse\> | results[], answer?, query? |
| recall | ApiResponse\<RecallResponse\> | results[], memories[] |
| digest | ApiResponse\<SmartDigestResponse\> | compiledContext, properties, memories[], tokenEstimate |
| batch | ApiResponse | eventId (async tracking) |
| search | ApiResponse\<SearchResponse\> | recordIds[], records?, mainProperties?, totalMatched |
| responses | ResponsesCompletedResult | status, steps[], outputs, usage, metadata |
| guidelines | ApiResponse\<GuidelinesResponse\> | actions[], count, nextToken |
| error | ApiResponse | success:false, error, message |

---

## Common Envelope

Every API response is wrapped in this envelope:

```ts
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

---

## Rate Limit Error

```ts
interface RateLimitError {
  success: false;
  error: 'rate_limit_exceeded';
  message: string;
  limit: number;
  current: number;
  window: 'per_minute' | 'per_month';
  retryAfterSeconds?: number;
}
```

---

## Me Response

```ts
interface MeResponse {
  organization: { id: string };
  user: { id: string };
  key: { id: string; scope: string };
  plan: {
    id: string;
    name: string;
    description: string;
    limits: {
      maxApiCallsPerMonth: number;
      maxApiCallsPerMinute: number;
    };
    features: string[];
  };
}
```

---

## Memorize Response

```ts
// POST /api/v1/memorize returns ApiResponse with:
interface MemorizeResponseData {
  creditsCharged?: number;
  properties?: Array<{
    propertyName: string;
    propertyValue: unknown;
    collectionId: string;
    collectionName?: string;
    confidence?: number;
  }>;
  memories?: Array<{ text: string; id: string }>;
  recordId?: string;
  tier?: 'basic' | 'pro' | 'pro_fast' | 'ultra';
}
```

---

## RecallResponse (smartRecall & recall)

```ts
interface RecallResultItem {
  content?: string;
  memory?: string;
  text?: string;
  createdAt?: string;
  score?: number;
  recordId?: string;
  type?: string;
  email?: string;
  website_url?: string;
  name?: string;
  properties?: Record<string, PropertyValue>;
  metadata?: Record<string, unknown>;
  resolutionState?: 'resolved' | 'provisional' | 'merged';
  knownAliases?: Array<{ kind: string; value: string; strength: 'strong' | 'weak' }>;
}

interface RecallResponse extends Array<RecallResultItem> {
  results?: RecallResultItem[];
  answer?: string;          // present when generate_answer is true
  query?: string;
}
```

---

## SmartDigestResponse

```ts
interface SmartDigestResponse {
  success: boolean;
  recordId?: string;
  type?: string;
  properties: Record<string, string>;
  memories: Array<{ text: string; createdAt?: string }>;
  compiledContext: string;   // ready-to-use markdown for prompt injection
  tokenEstimate: number;
  tokenBudget: number;
}
```

---

## SearchResponse

```ts
interface SearchResponse extends Array<SearchResultItem> {
  recordIds: string[];
  totalMatched: number;
  page: number;
  pageSize: number;
  totalPages: number;
  records?: Record<string, Record<string, {
    value: PropertyValue;
    collectionId: string;
    collectionName?: string;
  }>>;
  mainProperties?: Record<string, Record<string, string>>;
  memories?: Record<string, MemoryItem[]>;
  results?: SearchResultItem[];
  crmKeys?: Record<string, RecordCrmKeys>;
  indexMeta?: Record<string, RecordIndexMeta>;
}

interface SearchResultItem {
  recordId?: string;
  mainProperties?: Record<string, string>;
  record?: Record<string, { value: PropertyValue; collectionId: string }>;
  memories?: MemoryItem[];
  content?: string;
  email?: string;
  website_url?: string;
  name?: string;
}

interface RecordCrmKeys {
  type?: string;
  email?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  postalCode?: string;
  deviceId?: string;
  contentId?: string;
  customKeyName?: string;
  customKeyValue?: string;
}

interface RecordIndexMeta {
  entities?: string[];
  keywords?: string[];
  persons?: string[];
  topics?: string[];
  locations?: string[];
  sources?: string[];
}
```

---

## BatchMemorize Response

```ts
// Returns ApiResponse with eventId for async tracking
interface BatchMemorizeResponseData {
  eventId: string;         // track via GET /api/v1/events/{eventId}
  memorized?: number;
  queued?: number;
}
```

---

## GuidelinesResponse

```ts
interface GuidelinesResponse extends Array<GuidelineListItem> {
  actions: Array<{
    id: string;
    type: string;
    payload: {
      name: string;
      value: string;
      governanceScope?: GovernanceScope;
    };
  }>;
  count: number;
  nextToken?: string;
}

interface GuidelineListItem {
  id: string;
  type: string;
  name: string;
  value: string;
  slug?: string;
  governanceScope?: GovernanceScope;
}

interface GovernanceScope {
  alwaysOn: boolean;
  triggerKeywords: string[];
}
```

---

## SmartGuidelinesResponse

```ts
interface SmartGuidelinesResponse {
  success: boolean;
  mode: 'fast' | 'deep' | 'full';
  creditsCharged?: number;
  analysis?: {
    taskUnderstanding: string;
    qualityDimensions: string[];
    refinedTask: string;
  } | null;
  selection: Array<{
    guidelineId: string;
    name?: string;
    score?: number;
    reason?: string;
    priority?: string;
    content?: string;
    contentLength?: number;
    mode?: string;
    sections?: string[];
  }>;
  supplementary?: SmartGuidelinesSelection[];
  compiledContext: string;
  usage: {
    durationMs: number;
    tokensUsed?: number;
    guidelinesScanned?: number;
    selectedCount?: number;
  };
}
```

---

## SmartUpdateResponse

```ts
interface SmartUpdateResponse {
  status: 'planned' | 'applied' | 'partial';
  creditsUsed: number;
  items: Array<{
    itemId: string;
    action: 'create' | 'update_section' | 'append_section' | 'add_property' | 'update_property';
    target: string;
    targetId?: string;
    sectionHeader?: string;
    reasoning: string;
    detail: string;
    preview: { before?: string; after: string };
    hasConflict: boolean;
    conflictDescription?: string;
    applied: boolean;
  }>;
  summary: string;
  warnings?: string[];
}
```

---

## CollectionsResponse

```ts
interface CollectionsResponse extends Array<CollectionListItem> {
  actions: Array<{
    id: string;
    type: string;
    payload: {
      collectionName: string;
      collectionId: string;
    };
  }>;
  count: number;
  nextToken?: string;
}

interface CollectionPropertyDefinition {
  propertyName: string;
  propertyId?: string;
  systemName?: string;
  type?: 'text' | 'date' | 'options' | 'number' | 'boolean' | 'array';
  options?: string | string[];
  description?: string;
  autoSystem?: boolean;
  update?: boolean;         // true = replaceable, false = append-only
  tags?: string[];
  status?: 'Active' | 'Deleted';
}
```

---

## CollectionHistoryResponse

```ts
interface CollectionHistoryResponse {
  actionId: string;
  mode: 'full' | 'diff';
  history?: Array<Record<string, unknown>>;   // mode=full
  count?: number;
  current?: Record<string, unknown> | null;   // mode=diff: latest snapshot
  versions?: Array<{                          // mode=diff: compact diffs
    timestamp: string;
    historyNote?: string;
    changes: {
      propertiesAdded: Array<{ propertyId: string; systemName: string; propertyName: string }>;
      propertiesRemoved: Array<{ propertyId: string; systemName: string; propertyName: string }>;
      propertiesModified: Array<{
        propertyId: string;
        systemName: string;
        fields: Record<string, { from: unknown; to: unknown }>;
      }>;
      metadataChanges: Record<string, { from: unknown; to: unknown }>;
    };
  }>;
}
```

---

## ResponsesCompletedResult

```ts
interface ResponsesCompletedResult {
  id: string;
  status: 'completed';
  session_id: string;
  output: Array<{
    type: string;
    role: string;
    content: Array<{ type: string; text: string }>;
  }>;
  steps: Array<{
    order: number;
    text: string;
    tool_calls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  }>;
  outputs?: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  metadata: {
    tier: string;
    credits_charged: number;
    byok?: boolean;
    model?: string;
    provider?: string;
  };
}

interface ResponsesRequiresActionResult {
  id: string;
  status: 'requires_action';
  session_id: string;
  required_action: {
    type: 'tool_calls';
    tool_calls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  };
  conversation: any[];
  remaining_steps: StepDefinition[];
  completed_step_count: number;
  conversation_signature: string;
}
```

---

## ChatCompletionResult

```ts
interface ChatCompletionResult {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  session_id?: string;
  metadata?: { tier: string; credits_charged: number; byok?: boolean };
}
```

---

## PromptResponse

```ts
interface PromptResponse {
  success: boolean;
  text: string;
  outputs?: Record<string, unknown>;
  evaluation?: {
    finalScore: number;
    criteriaScores: Array<{ name: string; score: number; maxScore: number; reason: string }>;
    explanation: string;
  };
  metadata?: {
    model: string;
    provider: string;
    tier?: 'basic' | 'pro' | 'ultra';
    creditsCharged?: number;
    byok?: boolean;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    toolCalls?: Array<{ toolName: string; args?: Record<string, unknown> }>;
    toolResults?: Array<{ toolName: string; result: unknown }>;
    stepsExecuted?: number;
    instructionsExecuted?: number;
  };
  steps?: Array<{
    instructionIndex: number;
    prompt: string;
    text: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    toolCalls?: Array<{ toolName: string; args?: Record<string, unknown> }>;
    stepsExecuted: number;
  }>;
}
```

---

## Prompt SSE Events

```ts
type PromptSSEEvent =
  | { type: 'text'; chunk: string }
  | { type: 'output'; name: string; data: unknown }
  | { type: 'step_complete'; instructionIndex: number; text: string; toolCalls: Array<{ toolName: string }> }
  | { type: 'done'; outputs?: Record<string, unknown>; evaluation?: unknown; metadata?: unknown }
  | { type: 'error'; message: string };
```

---

## Memory CRUD Responses

### UpdateResult
```ts
interface UpdateResult {
  success: boolean;
  previousValue?: any;
  newValue: any;
  version?: number;
  stores: {
    snapshot: 'updated' | 'skipped';
    lancedb: 'updated' | 'skipped';
    freeform: 'updated' | 'skipped';
  };
}
```

### BulkUpdateResult
```ts
interface BulkUpdateResult {
  success: boolean;
  results: Array<{
    propertyName: string;
    previousValue?: any;
    newValue: any;
    status: 'updated' | 'failed';
    error?: string;
  }>;
  version?: number;
}
```

### DeletionResult
```ts
interface DeletionResult {
  success: boolean;
  deletedCount?: number;
  hardDeleteAt?: string;    // when the 30-day window expires
}
```

### CancelDeletionResult
```ts
interface CancelDeletionResult {
  success: boolean;
  restoredCounts: {
    snapshot: 'restored' | 'already_gone';
    freeform: 'restored' | 'already_gone';
    lancedb: 'restored' | 'already_gone';
  };
  warning?: string;
}
```

### PropertyHistoryResult
```ts
interface PropertyHistoryResult {
  entries: Array<{
    entryId: string;
    propertyName: string;
    propertyValue: any;
    collectionId: string;
    collectionName?: string;
    updatedBy: string;
    createdAt: string;
    source?: string;
  }>;
  nextToken?: string;
}
```

### FilterByPropertyResult
```ts
interface FilterByPropertyResult {
  records: Array<{
    recordId: string;
    type: string;
    matchedProperties: Record<string, any>;
    lastUpdatedAt?: number;
  }>;
  totalMatched: number;
  nextToken?: string;
}
```

### Key Management Responses
```ts
interface UpdateKeysResponse {
  recordId: string;
  redirectedFrom?: string;
  registered: number;
  conflicts: Array<{ keyName: string; keyValue: string; existingRecordId: string }>;
  rejected?: Array<{ keyName: string; reason: string }>;
}

interface ListKeysResponse {
  recordId: string;
  redirectedFrom?: string;
  keys: Array<{
    kind: string;
    value: string;
    standard: boolean;
    createdAt: string;
    lastSeenAt: string;
  }>;
}

interface DeleteKeysResponse {
  recordId: string;
  deleted: number;
  notFound: number;
  blocked?: Array<{ keyName: string; keyValue: string; reason: string }>;
}
```

---

## Evaluate Response

```ts
interface EvaluateMemorizationResponse {
  success: boolean;
  phases: Array<{
    phase: string;
    model?: string;
    duration?: number;
    extraction?: {
      propertyValues: Array<{
        propertyId: string;
        propertyName: string;
        value: unknown;
        type: string;
        confidence: number;
      }>;
      duration: number;
    };
    metrics?: Record<string, unknown>;
    optimizedCollection?: {
      properties: Array<{
        propertyId: string;
        propertyName: string;
        description?: string;
        type: string;
        wasModified: boolean;
        changeReason?: string;
      }>;
    };
  }>;
  summary: {
    totalDuration: number;
    propertiesOptimized: number;
    propertiesAttempted: number;
  };
}
```

---

## GovernanceAttachment

```ts
interface GovernanceAttachment {
  id: string;
  name: string;
  type: 'script' | 'template' | 'reference' | 'config' | 'data' | 'schema' | 'prompt' | 'image';
  description: string;
  usage: string;
  language?: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  preview?: string;
  sectionHeader?: string;
  uploadedBy: string;
  fetchCount: number;
  lastFetchedAt?: string;
  audit?: {
    status: 'pending' | 'clean' | 'warnings' | 'errors';
    findings: Array<{ severity: 'info' | 'warning' | 'error'; message: string; line?: number }>;
    auditedAt: string;
    model: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

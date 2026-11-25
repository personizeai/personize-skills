# Rollback and Recovery

| Problem | Recovery |
|---------|----------|
| Bad batch save | memory_delete(type:'memory', ids:[...]) (resolve ids first via memory_retrieve), re-save |
| Wrong guideline change | guidelines.history() -> find previous -> guidelines.update with old value |
| Schema broke extraction | collections.history(mode:'diff') -> revert properties -> re-extract |
| Accidental record delete | memory.cancelDeletion() within 30 days |
| Accidental memory delete | memory.cancelDeletion() within 30 days |
| Wrong properties extracted | memory_save shape:"property" to correct, or memory_delete + re-save with better schema |

Always include historyNote on updates: guidelines.update(id, { value, historyNote: "why" })
Soft delete window: 30 days. After that, deletion is permanent.
SDK built-in retry: 3x exponential backoff for 429/5xx -- don't add your own.

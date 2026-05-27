# Confirmation Matrix

| Action | Risk | Behavior |
|--------|------|----------|
| Read, recall, search, list | Low | Act immediately |
| Memorize, update property | Medium | Act, inform user |
| Create guideline/collection | Medium | Act, inform user |
| Bulk update (>10 records) | High | Confirm first |
| Delete memories/record | High | Confirm first |
| Send email, publish content | High | Confirm first |
| Modify compliance guidelines | Critical | Confirm + explain impact |
| Delete collection/guideline | Critical | Confirm + explain impact |
| Org-wide changes | Critical | Confirm + preview count |

Progressive autonomy: --dry-run -> review -> --dry-run=false

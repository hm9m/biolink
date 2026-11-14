# comboss.lol Security Specification

## 1. Data Invariants
1. **Identity & Ownership**: A `Profile` at `/profiles/{profileId}` can only be created when `profileId == request.auth.uid`, `ownerUid == request.auth.uid`, and `request.auth.token.email_verified == true`.
2. **Privilege Isolation**: Users can NEVER self-assign `badges`, `moderationStatus`, `moderationReason`, `suspendedUntil`, or `warningCount` on creation (must be `[]`, `'active'`, `''`, `0`, `0`) or update. Only verified admins (`isAdmin()`) may modify badges or moderation states.
3. **Handle Uniqueness & Immutability Guard**: Handle reservations at `/handles/{handle}` cannot be overwritten by a different user and must match `^[a-z0-9_\\-]{2,24}$` (excluding reserved paths).
4. **PII Isolation**: User email addresses are stored exclusively in `/usersPrivate/{uid}`, readable only by the owner (`uid == request.auth.uid`) or `isBootstrapOwner()`. Public profiles contain zero PII.
5. **Immutable Audit Trail**: `moderationLogs` documents can only be created by verified admins (`moderatorUid == request.auth.uid`) and can never be updated or deleted.
6. **Ban & Suspension Lock**: Banned or actively suspended users cannot mutate their profile fields.

## 2. Dirty Dozen Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Self-Badge Escalation (Create)**: Creating `/profiles/{uid}` with `badges: ['owner', 'staff']`.
2. **Self-Badge Escalation (Update)**: Updating own `/profiles/{uid}` to append `'staff'` to `badges`.
3. **Self-Unban Attack**: Banned user updating `moderationStatus: 'active'` on `/profiles/{uid}`.
4. **Shadow Ghost Field**: Updating `/profiles/{uid}` with extra field `isVerified: true`.
5. **Owner Spoofing**: Creating `/profiles/{victimUid}` while authenticated as attacker.
6. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting any write.
7. **Admin Registry Spoofing**: Non-owner writing `/admins/{attackerUid}` to grant themselves staff access.
8. **Handle Hijacking**: Creating `/handles/comboss` when `/handles/comboss` already exists with another `ownerUid`.
9. **Resource Poisoning (ID)**: Reading or creating `/profiles/` with a 500-character invalid document ID.
10. **Resource Poisoning (Bio)**: Updating `bio` with a 10,000-character string (> 320 maxLength).
11. **PII Read Leak**: Non-owner reading `/usersPrivate/{victimUid}`.
12. **Audit Log Tampering**: Updating or deleting an existing `/moderationLogs/{logId}` document.

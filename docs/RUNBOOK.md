# Incident Response Runbook

This runbook outlines the standard operating procedures (SOPs) for resolving common production incidents with the Null-Secret application. 

If you are a self-hoster running Null-Secret in production, these steps will help you triage and mitigate downtime.

---

## 1. High Memory Usage (OOM Kills)

**Symptom:** The Render dashboard or your Docker container logs show frequent `OOMKilled` events. The API responds with `502 Bad Gateway`.

**Cause:** This usually occurs if a malicious actor attempts to bypass the 15 MB payload limit, or if an extreme number of concurrent uploads spike the Go runtime memory before the Garbage Collector (GC) can run.

**Mitigation:**
1. Check the environment variable `GOMEMLIMIT`. For a 512 MB Render instance, ensure it is set to `GOMEMLIMIT=400MiB` in your environment. This forces the Go GC to trigger aggressively before the container hits the hard OS limit.
2. If the attack persists, temporarily lower the `maxRequestBody` limit in `handlers.go` and redeploy, or block the offending IP address in your reverse proxy (e.g., Cloudflare).

---

## 2. Firebase Quota Exhaustion

**Symptom:** Users can create anonymous secrets, but signed-in users receive `SECURITY_CHECK_FAILED` or `INFRASTRUCTURE_ERROR` toasts.

**Cause:** You have exhausted the free tier limits of Firebase Authentication or Cloud Firestore reads/writes. 

**Mitigation:**
1. Log into the [Firebase Console](https://console.firebase.google.com).
2. Check the "Usage" tab under Firestore Database.
3. If you have hit the 50,000 daily read limit, you must either upgrade to the Blaze (Pay-as-you-go) plan or wait until the quota resets at midnight Pacific Time.
4. *Note: Null-Secret is designed to gracefully degrade. If Firebase is offline, anonymous secret creation still functions perfectly.*

---

## 3. SQLite Database Corruption

**Symptom:** The Go backend panics on startup, or the `/api/v1/healthz` endpoint returns `"storage": "unhealthy"`. Error logs contain `database disk image is malformed`.

**Cause:** Hard crashes, sudden power loss to the disk, or Docker volume misconfigurations can corrupt the SQLite `sqlite.db` file.

**Mitigation:**
1. **Zero-Knowledge Principle:** Because the database only contains ephemeral ciphertext, there is no permanent data loss. 
2. SSH into your container or deployment environment.
3. Delete the `sqlite.db` file. 
   ```bash
   rm /var/data/sqlite.db
   ```
4. Restart the service. The backend will automatically recreate a fresh, empty SQLite database and resume normal operations. All previously stored unread secrets will be lost.

---

## 4. Key Leakage (Compromised Master Key)

**Symptom:** The `MASTER_KEY` environment variable used by the backend is accidentally committed to source control or exposed in server logs.

**Cause:** Misconfiguration of environment variables.

**Mitigation:**
1. Immediately shut down the Go backend to prevent any further writes.
2. Generate a new master key: `openssl rand -hex 32`
3. Update the `MASTER_KEY` in your environment variables.
4. **Important:** Changing the `MASTER_KEY` renders all currently stored secrets unreadable (they were AES-encrypted at rest using the old key). You must delete the `sqlite.db` file (see Section 3) to prevent the server from attempting to read orphaned ciphertext.
5. Restart the server.

---

## 5. Domain Name Blacklisting (Phishing Abuse)

**Symptom:** Browsers show a red "Deceptive site ahead" warning when visiting your frontend.

**Cause:** Because Null-Secret allows anonymous uploads, malicious actors may abuse your instance to host malware links or phishing payloads.

**Mitigation:**
1. Register your domain with [Google Search Console](https://search.google.com/search-console).
2. Review the specific URLs flagged as deceptive.
3. Use the Super Admin Key to hit the `DELETE /api/v1/secret/{id}` endpoint and purge the malicious content.
4. Request a review through the Search Console.
5. If abuse is systemic, consider disabling anonymous uploads by modifying the React frontend to enforce Firebase Authentication before allowing the `Create Secret` flow.

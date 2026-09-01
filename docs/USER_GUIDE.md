# User Guide

Null-Secret lets you send sensitive text or files. Your browser encrypts the data before it goes to our servers, meaning we cannot read what you send.

## Sending a Secret

1. Open the homepage.
2. Type your message into the text box.
3. If you want to send files, drag them into the upload area or click to select them. The total size must be under 30 MB. If you select multiple files, your browser will zip them automatically.
4. Select an expiration time (e.g., 1 hour, 24 hours, or 7 days).
5. Select a view limit (1, 2, or 5 views). The secret deletes itself forever once this limit is reached.
6. (Optional) Type a password. The recipient will need this password to open the secret.
7. Click **Create Secret**.

## Sharing the Link

After creation, the application gives you two links.

### 1. The Recipient Link
This is the link you send to the person receiving the secret. It looks like `https://null-secret.app/v/ID#KEY`.
The characters after the `#` symbol act as the decryption key. Do not remove them, or the recipient will not be able to read the message.

### 2. The Admin Link
This link looks like `https://null-secret.app/admin/ID#ADMIN_KEY`.
Do not share this link. It allows you to view the status of your secret.

## Managing Your Secret

Open your **Admin Link** to view the Admin Dashboard. Here you can:
- See if the secret is still active.
- See how many times the secret has been viewed.
- See the exact time the secret will expire.
- Click **Delete now** to permanently erase the secret from our servers before the recipient opens it.

## Accounts and Quotas

You do not need an account to create a secret. If you use the service without an account, your browser tracks your daily usage. You are limited to 10 secrets per day.

If you create a free account, you can see a history of the secrets you have generated. Your account only stores the unique ID of the secrets, not the actual contents or the decryption keys. We cannot use your account to read your messages.

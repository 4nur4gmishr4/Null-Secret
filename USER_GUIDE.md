# Null-Secret User Guide

## What is Null-Secret?

Null-Secret is a secure way to share private information that self-destructs after being read. Think of it like a digital message that burns itself after the recipient sees it.

## What can you share?

- Passwords
- API keys
- Private notes
- Confidential files (up to 6 MB)
- Any sensitive information you don't want stored permanently

## How it works

### For the sender

1. Go to the app and click "Create Secret"
2. Type your message or attach files
3. Set how long the link should work (expiry time)
4. Set how many times it can be opened (view limit)
5. Optionally add a password for extra security
6. Click create and share the generated link

### For the recipient

1. Click the link you received
2. If there's a password, enter it
3. Read the message or download the files
4. The message disappears automatically

## Key Features

### No account required
You can use the entire service without signing up. Just create a secret and share the link.

### Self-destructing messages
Messages disappear after:
- Being read the number of times you set (default: once)
- Reaching the expiry time you set
- The sender manually deleting them

### End-to-end encryption
Your message is encrypted in your browser before it leaves your device. The server only sees encrypted data, never your actual message.

### Optional password protection
Add an extra layer of security by requiring a password to open the secret.

### File attachments
Send files up to 6 MB. Multiple files are automatically zipped together.

## Security Explained Simply

### Your privacy is protected by math, not trust

**The key never leaves your device**
- The decryption key is part of the link after the # symbol
- Browsers are designed to never send this part to servers
- Even if someone hacked our server, they couldn't read your messages

**We don't store your actual content**
- We only store encrypted data (scrambled text)
- Without the key, the encrypted data is useless
- Our database deletes expired messages automatically

**We don't track you**
- No IP addresses stored
- No tracking cookies
- No analytics
- Your secret is just a random ID and timestamp in our system

## Optional Account Features

Creating an account (free) adds:

### Daily quota
- Up to 30 secrets per day
- Helps prevent abuse

### History tracking
- See all secrets you've created
- View when they were created
- Export your history as CSV

### Security settings
- Auto-logout timer
- Device session management
- Account deletion option

## Common Use Cases

### Sharing passwords
"I need to share my WiFi password with a guest"
- Create a secret with the password
- Set view limit to 1
- Share the link
- After they connect, the password is gone

### Sending confidential documents
"I need to send this contract to a client"
- Upload the document
- Set expiry to 24 hours
- Set view limit to 1
- Send the link
- The document is deleted after they view it

### Temporary access codes
"I need to give someone a temporary access code"
- Create a secret with the code
- Set expiry to 1 hour
- Set view limit to 1
- Share the link
- The code is useless after an hour

### Emergency contact info
"I need to share emergency information securely"
- Create a secret with the information
- Set a longer expiry (e.g., 7 days)
- Set view limit to 1
- Share with trusted person
- Delete it manually when no longer needed

## Tips for Maximum Security

1. **Use strong passwords** if you add password protection
2. **Set appropriate view limits** - 1 is best for sensitive information
3. **Set reasonable expiry times** - shorter is more secure
4. **Share links securely** - use encrypted messaging apps to share the link
5. **Delete secrets early** - use the admin link to delete when no longer needed
6. **Don't reuse links** - each secret should be unique

## What happens if...

### The recipient loses the link?
The message is inaccessible and will eventually be deleted. This is a security feature.

### Someone else finds the link?
They can only open it if:
- The view limit hasn't been reached
- The expiry time hasn't passed
- They have the password (if you set one)

### You need to delete a secret early?
Use the admin link provided when you created the secret to delete it immediately.

### The server is hacked?
Attackers would only find encrypted data. Without the decryption keys (which are in the URL fragments, never sent to the server), the data is useless.

## Troubleshooting

### "Encryption needs a secure connection"
This means you're not using HTTPS. Make sure you're accessing the site via https://

### Link doesn't work
- Check if the expiry time has passed
- Check if the view limit has been reached
- Verify you included the entire link (everything after the # is important)

### Can't open a secret
- Make sure you have the correct password
- Check that the link hasn't expired
- Try copying the link again (sometimes parts get missed)

## Getting Help

For technical issues or questions, visit:
- GitHub Issues: https://github.com/4nur4gmishr4/Null-Secret/issues
- Privacy Policy: Available in-app at /privacy

## Remember

- Your messages are encrypted before they leave your device
- The server never sees your actual content
- Messages self-destruct automatically
- No account required for basic use
- Optional account adds history and security settings

Stay secure with Null-Secret.

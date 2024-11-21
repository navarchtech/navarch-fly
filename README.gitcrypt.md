# Granting Access to a `git-crypt` Encrypted Repository

This guide explains how to securely grant another user access to a `git-crypt` encrypted repository.

---

## TL;DR (Quick Commands)

### For the User Requesting Access (Person B)

```bash
# Generate GPG key pair
gpg --full-generate-key

# Export and share public key
gpg --export --armor <your-email@example.com> > your-public-key.asc
```

### For the Repository Admin (Person A)

```bash
# Import the public key of the user requesting access
gpg --import their-public-key.asc

# Add the user to git-crypt
git-crypt add-gpg-user their-email@example.com

# Commit and push changes
git add .
git commit -m "Grant access to their-email@example.com"
git push
```

### For the New User (Person B)

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Unlock with your private key
git-crypt unlock
```

---

## Detailed Steps

### 1. User Requesting Access (Person B)

Person B generates their GPG key pair and shares their public key with the repository admin.

```bash
# Generate GPG key pair
gpg --full-generate-key
```

#### Choose these options during setup:

- **Key type:** RSA and RSA
- **Key size:** 4096 bits
- **Key validity:** 0 (does not expire)
- **Email address:** Enter your email (e.g., `b@gmail.com`)
- **Passphrase:** Set a secure passphrase.

Export the public key:

```bash
gpg --export --armor b@gmail.com > b-public-key.asc
```

Send the `b-public-key.asc` file to Person A.

---

### 2. Repository Admin (Person A)

Person A adds Person B's public key to the repository.

1. **Import the public key:**

   ```bash
   gpg --import b-public-key.asc
   ```

2. **Grant access using `git-crypt`:**

   ```bash
   git-crypt add-gpg-user b@gmail.com
   ```

3. **Commit and push changes:**

   ```bash
   git add .
   git commit -m "Grant access to b@gmail.com"
   git push
   ```

---

### 3. User Unlocking the Repository (Person B)

Once Person B has been added, they can access the repository.

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Unlock the repository:

   ```bash
   git-crypt unlock
   ```

This will use Person B's private key to decrypt the files.

---

## Key Points

- **Private/Public Key Responsibilities:**
  - The user requesting access (Person B) generates their own key pair.
  - Only the public key is shared with the repository admin (Person A).

- **Security of Private Key:**
  - The private key should never be shared. It is used locally to unlock the encrypted files.

- **Revocation:**
  - Access can be revoked by removing the public key from `git-crypt` and re-encrypting the repository.

---

Include this guide in your repository to simplify the onboarding process for users requesting access!
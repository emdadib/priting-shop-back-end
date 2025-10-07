# PostgreSQL Setup Guide

## The Issue
PostgreSQL is running but authentication is failing with the `postgres` user.

## Solutions

### Option 1: Remember Your Password
If you remember the password you set during PostgreSQL installation, update the `.env` file:
```bash
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/printing_shop"
```

### Option 2: Reset PostgreSQL Password (Windows)

1. **Stop PostgreSQL Service**
   - Open Services (search "services" in Start menu)
   - Find "postgresql-x64-16" (or similar)
   - Right-click → Stop

2. **Start PostgreSQL in Single User Mode**
   - Open Command Prompt as Administrator
   - Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\16\bin\`)
   - Run: `postgres --single -D "C:\Program Files\PostgreSQL\16\data" postgres`

3. **Reset Password**
   - In the single-user mode, type:
   ```sql
   ALTER USER postgres PASSWORD 'newpassword';
   ```
   - Press Ctrl+C to exit

4. **Restart PostgreSQL Service**
   - Go back to Services
   - Start the PostgreSQL service

5. **Update .env file**
   ```bash
   DATABASE_URL="postgresql://postgres:newpassword@localhost:5432/printing_shop"
   ```

### Option 3: Use pgAdmin (if installed)
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "postgres" user → Properties
4. Go to Definition tab
5. Set a new password
6. Update your `.env` file

### Option 4: Check PostgreSQL Configuration
The issue might be with `pg_hba.conf` file. Look for it in your PostgreSQL data directory and ensure it has:
```
# "local" is for Unix domain socket connections only
local   all             all                                     trust
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
```

## After Fixing Authentication

Once you have the correct password, run:
```bash
node scripts/setup-admin.js
```

This will:
1. Create the database schema
2. Create an admin user with email: admin@printingshop.com and password: 4848
3. Create sample categories and products

## Test Your Connection
Run this to test if the connection works:
```bash
node scripts/test-db-connection.js
```
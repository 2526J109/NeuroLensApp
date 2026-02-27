import sqlite3

# Connect to database
conn = sqlite3.connect('neurolens.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("=" * 60)
print("DATABASE TABLES:")
print("=" * 60)
for table in tables:
    print(f"  ✓ {table[0]}")

# Check users table
print("\n" + "=" * 60)
print("USERS TABLE:")
print("=" * 60)

cursor.execute("SELECT COUNT(*) FROM users")
count = cursor.fetchone()[0]
print(f"Total users registered: {count}")

if count > 0:
    print("\nRecent registrations:")
    cursor.execute("SELECT id, firebase_uid, email, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 5")
    users = cursor.fetchall()
    
    for user in users:
        print(f"\n  → User ID: {user[0]}")
        print(f"    Email: {user[1]}")
        print(f"    Name: {user[3]}")
        print(f"    Firebase UID: {user[2][:20]}...")
        print(f"    Created: {user[4]}")
else:
    print("\n⚠️  No users found in database yet.")
    print("This might mean:")
    print("  1. Registration is creating Firebase users but not saving to backend DB")
    print("  2. Backend registration endpoint might not be called")
    print("  3. There might be an error during backend registration")

conn.close()

print("\n" + "=" * 60)

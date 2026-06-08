import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/cyberrange")
    try:
        print("=== DATABASE TABLES SUMMARY ===\n")
        
        # 1. Users
        users = await conn.fetch("SELECT id, email, role, is_active FROM users ORDER BY created_at ASC")
        print(f"--- USERS ({len(users)}) ---")
        for u in users:
            print(dict(u))
        print()
        
        # 2. Content Items (Labs)
        labs = await conn.fetch("SELECT id, type, title, difficulty, is_active, visibility, metadata->>'slug' AS slug FROM content_items")
        print(f"--- LAB CATALOG / CONTENT ITEMS ({len(labs)}) ---")
        for l in labs:
            print(dict(l))
        print()
        
        # 3. Product Prices
        prices = await conn.fetch("SELECT content_id, amount_minor, currency, is_active FROM product_prices")
        print(f"--- PRODUCT PRICES ({len(prices)}) ---")
        for p in prices:
            print(dict(p))
        print()

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check())

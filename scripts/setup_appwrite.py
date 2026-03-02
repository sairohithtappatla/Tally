import requests
import json
import time

# Configuration
ENDPOINT = "https://sgp.cloud.appwrite.io/v1"
PROJECT_ID = "69a3da61001f3966cf7a"
API_KEY = "standard_6c13b0a98a6d27b08670db8a8543a5a47eeb475f332764a3ffd4329e96e6c49200fd30f468af15006ef69c23ec2b0ae4674ce84d77c21f00098f07a9ebbdcd2c5d15297ed9e2088be6e0f418b38b3bc902876ecf80fd63ff923c397ed3cbbe312e94bc73fbe2b448cd8116463b4091dbed8b787e36b176f77b2bda4c69403d6d"

headers = {
    "X-Appwrite-Project": PROJECT_ID,
    "X-Appwrite-Key": API_KEY,
    "Content-Type": "application/json"
}

def request(method, path, payload=None):
    url = f"{ENDPOINT}{path}"
    if method == "POST":
        resp = requests.post(url, headers=headers, json=payload)
    elif method == "GET":
        resp = requests.get(url, headers=headers)
    
    if resp.status_code in [200, 201, 202]:
        return resp.json()
    elif resp.status_code == 409:
        return {"error": "already_exists"}
    else:
        print(f"Error {resp.status_code} on {path}: {resp.text}")
        return None

def main():
    db_id = "Tally"
    request("POST", "/databases", {"databaseId": db_id, "name": "Tally"})

    # 1. ACCOUNTS (Cards)
    print("\nSetting up ACCOUNTS...")
    request("POST", f"/databases/{db_id}/collections", {
        "collectionId": "accounts",
        "name": "Accounts",
        "permissions": ['read("users")', 'create("users")', 'update("users")', 'delete("users")'],
        "documentSecurity": True
    })
    acc_attrs = [
        ("string", {"key": "userId", "size": 36, "required": True}),
        ("string", {"key": "name", "size": 64, "required": True}), # e.g. "Work Card", "Savings Bank"
        ("string", {"key": "type", "size": 16, "required": True}), # spending, savings
        ("integer", {"key": "balance", "required": False, "default": 0}),
        ("string", {"key": "last4", "size": 4, "required": False})
    ]
    for t_name, p in acc_attrs:
        request("POST", f"/databases/{db_id}/collections/accounts/attributes/{t_name}", p)
        time.sleep(0.5)
    
    # 2. PROFILES (Settings & Aggregates)
    print("\nSetting up PROFILES...")
    request("POST", f"/databases/{db_id}/collections", {
        "collectionId": "profiles",
        "name": "Profiles",
        "permissions": ['read("users")', 'create("users")', 'update("users")', 'delete("users")'],
        "documentSecurity": True
    })
    prof_attrs = [
        ("string", {"key": "userId", "size": 36, "required": True}),
        ("string", {"key": "fcmToken", "size": 512, "required": False}),
        ("integer", {"key": "monthlyLimit", "required": False, "default": 0}),
        ("integer", {"key": "monthlySpentTotal", "required": False, "default": 0}),
        ("integer", {"key": "lastAlertSent", "required": False, "default": 0}),
        ("string", {"key": "timezone", "size": 64, "required": False, "default": "UTC"})
    ]
    for t_name, p in prof_attrs:
        request("POST", f"/databases/{db_id}/collections/profiles/attributes/{t_name}", p)
        time.sleep(0.5)

    # 3. TRANSACTIONS
    print("\nSetting up TRANSACTIONS...")
    request("POST", f"/databases/{db_id}/collections", {
        "collectionId": "transactions",
        "name": "Transactions",
        "permissions": ['read("users")', 'create("users")', 'update("users")', 'delete("users")'],
        "documentSecurity": True
    })
    trans_attrs = [
        ("string", {"key": "userId", "size": 36, "required": True}),
        ("string", {"key": "type", "size": 16, "required": True}), # income, expense, transfer
        ("integer", {"key": "amount", "required": True}),
        ("string", {"key": "fromAccountId", "size": 36, "required": False}), # References accounts.$id
        ("string", {"key": "toAccountId", "size": 36, "required": False}),   # References accounts.$id
        ("string", {"key": "category", "size": 32, "required": False}),
        ("datetime", {"key": "timestamp", "required": True}),
        ("string", {"key": "description", "size": 256, "required": False})
    ]
    for t_name, p in trans_attrs:
        request("POST", f"/databases/{db_id}/collections/transactions/attributes/{t_name}", p)
        time.sleep(0.5)

    print("\nWaiting for all attributes to process...")
    time.sleep(10)

    # Indexes
    request("POST", f"/databases/{db_id}/collections/accounts/indexes", {"key": "idx_userId", "type": "key", "attributes": ["userId"]})
    request("POST", f"/databases/{db_id}/collections/profiles/indexes", {"key": "unique_userId", "type": "unique", "attributes": ["userId"]})
    request("POST", f"/databases/{db_id}/collections/transactions/indexes", {"key": "idx_userId_timestamp", "type": "key", "attributes": ["userId", "timestamp"], "orders": ["ASC", "DESC"]})
    
    print("\nSetup Complete for database 'Tally'.")

if __name__ == "__main__":
    main()

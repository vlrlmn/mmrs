# Radish Client

The `RadishClient` class provides an interface for interacting with a remote cache server. It supports connecting to the server, storing, retrieving, and deleting data.

## Usage

### 1. Creating an Instance
To create an instance of the `RadishClient`:
```typescript
import RadishClient from './RadishClient';

const client = new RadishClient({
    host: 'localhost',
    port: 5100,
    onConnect: () => console.log('Connected to Radish server'),
});
```
- `host`: The server's hostname or IP address.
- `port`: The server's port number.
- `onConnect`: (Optional) A callback function triggered upon successful connection.

### 2. Saving to Cache
To save a value to the cache:
```typescript
await client.set(key, value, expire);
```
- `key`: A unique identifier for the cached item.
- `value`: The data to be stored in the cache.
- `expire`: (Optional) Expiration time in seconds.

### 3. Getting from Cache
To retrieve a value from the cache:
```typescript
const response = await client.get(key);
const value = response.data;
```
- `key`: The unique identifier of the cached item.

### 4. Deleting from Cache
To delete a value from the cache:
```typescript
await client.delete(key);
```
- `key`: The unique identifier of the cached item to be removed.

### 5. Closing the Connection
To close the connection to the server:
```typescript
client.close();
```

### Example
```typescript
import RadishClient from './RadishClient';

const client = new RadishClient({
    host: '127.0.0.1',
    port: 6379,
    onConnect: () => console.log('Connected to Radish server'),
});

(async () => {
    // Save to cache
    await client.set('user_1', JSON.stringify({ name: 'Alice', age: 25 }), 3600);

    // Get from cache
    const response = await client.get('user_1');
    const user = JSON.parse(response.data);
    console.log(user); // Output: { name: 'Alice', age: 25 }

    // Delete from cache
    await client.delete('user_1');

    // Close the connection
    client.close();
})();
```
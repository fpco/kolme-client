# Kolme client

This is a library you can use to interact with kolme-powered applications. Things you can do:

## Broadcast to your kolme app

```TypeScript
import { KolmeClient } from 'kolme-client'

const client = new KolmeClient('https://yourkolme.app');

const privateKey = client.generatePrivateKey();

const block = await client.broadcast(privateKey, [{
  YourAppMessage: {
    YourAppPayload: {}
  }
}]);
```

## Store the private key

We do not assume whether or how you want to store the private key, but in case you do want to store it, you probably also want to encrypt it. For that we provide an `encrypt` and `decrypt` functions that can get you started. They use the standard browser's crypto API and the `PBKDF2` algorithm. What we do not provide is an encryption key. You will have to figure that one out yourself.

Here's an example of storing the private key as a hex string in localstorage:

```TypeScript
import { encrypt, decrypt } from 'kolme-client/crypto'
import { KolmeClient } from 'kolme-client'

const client = new KolmeClient('https://yourkolme.app');

const generateAndStorePrivateKey = async (encryptionKey: string) => {
  const privateKey = client.generatePrivateKey();
  const encryptedPrivateKey = await encrypt({
    message: Buffer.from(privateKey).toString('hex'), 
    key: encryptionKey 
  });

  localStorage.setItem('your_key', encryptedPrivateKey)
}

const getPrivateKey = async (encryptionKey: string) => {
  const encryptedPrivateKey = localStorage.getItem('your_key');

  const privateKey = await decrypt({
    encryptedMessage: encryptedPrivateKey, 
    key: encryptionKey
  });

  return Buffer.from(privateKey, 'hex')
}

// You need to figure out how to get and secure this
const encryptionKey = '123456789';

await generateAndStorePrivateKey(encryptionKey);
const privateKey = await getPrivateKey(encryptionKey);

const block = await client.broadcast(privateKey, [{
  YourAppMessage: {
    YourAppPayload: {}
  }
}]);
```

## Listen to notifications on the kolme's websocket endpoint

```TypeScript
import { KolmeClient } from 'kolme-client'

const client = new KolmeClient('https://yourkolme.app');

client.subscribeToNotifications(
  (message) => {  
    // Do something interesting with the message
  },
  (socketState) => {  
    // Get updates about the socket state - may be useful for React re-rendering for example
  }
);

// Stop listening after a minute
setTimeout(
  () => {
    client.unsubscribeFromNotifications()
  },
  60 * 1000
);
```

## Talking to the http API directly

You can always talk to the HTTP API directly if you want to.

```TypeScript
import { getNextNonce } from 'kolme-client/HttpApi'

const publicKey = 'YOUR_PUBLIC_KEY';
const apiBase = "https://yourkolme.app"

const nextNonce = await getNextNonce(apiBase, publicKey);
```

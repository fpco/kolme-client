# Kolme client

This is a library you can use to interact with kolme-powered applications. Things you can do:

## Broadcast to your kolme app

```TypeScript
import { KolmeClient } from 'kolme-client'

const client = new KolmeClient('https://yourkolme.app')

const privateKey = client.generatePrivateKey()

const block = await client.broadcast(privateKey, [{
  YourAppMessage: {
    YourAppPayload: {}
  }
}])
```

## Listen to notifications on the kolme's websocket endpoint

```TypeScript
import { KolmeClient } from 'kolme-client'

const client = new KolmeClient('https://yourkolme.app')

const client.subscribeToNotifications(
  (message) => {  
    // Do something interesting with the message
  },
  (socketState) => {  
    // Get updates about the socket state - may be useful for React re-rendering for example
  }
)

// Stop listening after a minute
setTimeout(
  () => {
    client.unsubscribeFromNotifications()
  },
  60 * 1000
)
```

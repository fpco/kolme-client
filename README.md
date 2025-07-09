# Kolme client

This is a library you can use to interact with kolme-powered applications. 

Things you can do:

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

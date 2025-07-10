import { digest } from './crypto';
import * as secp from '@noble/secp256k1';
import { Buffer } from 'buffer'
import * as HttpApi from './HttpApi'
import waitFor from './waitFor';

export const NOTIFICATIONS_RETRY_TIMEOUT = 3000

export const generatePrivateKey = () : Uint8Array => {
  return secp.utils.randomPrivateKey()
}

export const getPublicKey = (privateKey: Uint8Array) : Uint8Array => {
  return secp.getPublicKey(privateKey)
}

export const broadcast = async (httpBase: string, signingKey: Uint8Array, messages: unknown[]) : Promise<HttpApi.Block> => {
  const publicKey = secp.getPublicKey(signingKey)
  const publicKeyInHex = Buffer.from(publicKey).toString('hex')

  const nonce = await HttpApi.getNextNonce(httpBase, publicKeyInHex)

  const message = JSON.stringify({
    pubkey: publicKeyInHex,
    nonce,
    created: new Date().toISOString(),
    messages,
  })

  const messageHash = await digest(message)
  const signature = await secp.signAsync(Buffer.from(messageHash).toString('hex'), signingKey)

  const result = await HttpApi.broadcast(
    httpBase,
    { 
      message,
      signature: Buffer.from(signature.toCompactRawBytes()).toString('hex'), 
      recoveryId: signature.recovery 
    }
  )

  return HttpApi.waitForTx(httpBase, result.txhash)
}

export type WebSocketState = 
  | { type: 'subscribed', socket: WebSocket }
  | { type: 'unsubscribed' }

export class KolmeClient {
  httpBase: string
  notificationsSocket: WebSocketState
  lastNotificationsErrorAt: number | undefined
  onNotificationsSocketStateChange: ((state: number) => void) | undefined

  constructor(httpBase: string) {
    this.httpBase = httpBase;
    this.notificationsSocket = { type: 'unsubscribed' };
  }

  generatePrivateKey() {
    return generatePrivateKey()
  }

  getPublicKey(privateKey: Uint8Array) {
    return getPublicKey(privateKey)
  }

  async broadcast(signingKey: Uint8Array, messages: unknown[]) {
    return broadcast(this.httpBase, signingKey, messages)
  }

  onNotificationsSocketOpen() {
    if(this.onNotificationsSocketStateChange && this.notificationsSocket.type === 'subscribed') {
      this.onNotificationsSocketStateChange(this.notificationsSocket.socket.readyState)
    }
  }

  async onNotificationsSocketClosed(onMessage: (message: MessageEvent) => void) : Promise<boolean> {
    switch(this.notificationsSocket.type) {
      case 'subscribed': {
        if(this.onNotificationsSocketStateChange) {
          this.onNotificationsSocketStateChange(this.notificationsSocket.socket.readyState)
        }

        // Make sure we're not re-trying too often
        if(this.lastNotificationsErrorAt) {
          const now = Date.now()
          const diff = now - this.lastNotificationsErrorAt

          if(diff < NOTIFICATIONS_RETRY_TIMEOUT) {
            await waitFor(NOTIFICATIONS_RETRY_TIMEOUT - diff)
          }
        }    

        this.subscribeToNotifications(onMessage)
        return true
      }
      case 'unsubscribed': {
        return false;
      }
    }
  }

  async subscribeToNotifications(onMessage: (message: MessageEvent) => void, onReadyStateChange? : (state: number) => void) : Promise<void> {
    const endpoint = this.httpBase.replace('https', 'wss')

    if(onReadyStateChange) {
      this.onNotificationsSocketStateChange = onReadyStateChange
    }

    return new Promise((resolve, reject) => {
      this.notificationsSocket = {
        type: 'subscribed',
        socket: HttpApi.subscribeToNotifications(endpoint, {
          onMessage,
          onOpen: () => {
            this.onNotificationsSocketOpen()
            resolve()
          },
          onClose: () => {
            this.onNotificationsSocketClosed(onMessage)
          },
          onError: () => {
            this.lastNotificationsErrorAt = Date.now()
            reject()
          },
        })
      }
    })
  }

  unsubscribeFromNotifications(): boolean {
    this.onNotificationsSocketStateChange = undefined
    
    switch(this.notificationsSocket.type) {
      case 'subscribed': {
        this.notificationsSocket.socket.close()
        this.notificationsSocket = { type: 'unsubscribed' }

        return true
      }
      case 'unsubscribed': {
        return false
      }
    }
  }
}

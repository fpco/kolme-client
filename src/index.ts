import { digest } from './crypto';
import * as secp from '@noble/secp256k1';
import { Buffer } from 'buffer'
import * as HttpApi from './HttpApi'

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

export class KolmeClient {
  httpBase: string

  constructor(httpBase: string) {
    this.httpBase = httpBase;
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
}

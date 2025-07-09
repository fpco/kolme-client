import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import waitFor from './waitFor';

const processResponse = async <T>(response: Response, decoder: t.Decoder<unknown, T>) : Promise<t.Validation<T>> => {
  if(!response.ok) {
    throw new Error(`Got response with status ${response.status}`)
  }

  const rawData = await response.json()
  return decoder.decode(rawData)
}

export type BroadcastInputs = {
  signature: string,
  recoveryId: number,
  message: string
}

const broadcastResult = t.type({
  txhash: t.string
})

export type BroadcastResult = t.TypeOf<typeof broadcastResult>

export const broadcast = async (base: string, { message, recoveryId, signature }: BroadcastInputs): Promise<BroadcastResult> => {
  const response = await fetch(`${base}/broadcast`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      signature,
      recovery_id: recoveryId
    }),
  });

  const parsedData = await processResponse(response, broadcastResult)

  if(isRight(parsedData)) {
    return parsedData.right
  } else {
    throw new Error(`${PathReporter.report(parsedData)}`)
  }
}

const nextNonce = t.type({
  next_nonce: t.number,
})

export const getNextNonce = async (base: string, kolmePublicKey: string) : Promise<number> => {
  const response = await fetch(`${base}/get-next-nonce?pubkey=${kolmePublicKey}`);

  const parsedData = await processResponse(response, nextNonce)

  if(isRight(parsedData)) {
    return parsedData.right.next_nonce
  } else {
    throw new Error(`${PathReporter.report(parsedData)}`)
  }
}

function taggedJson<C extends t.Mixed>(inner: C) {
  return new t.Type<
    t.TypeOf<C>, // the decoded output
    string, // the encoded input (we accept a JSON string)
    unknown // overall unknown input
  >(
    `TaggedJson<${inner.name}>`,
    inner.is,
    (u, c) => {
      if (typeof u !== 'string') {
        return t.failure(u, c, 'expected a JSON‐string');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(u);
      } catch (_e) {
        return t.failure(u, c, 'invalid JSON string');
      }
      // now validate the parsed object against `inner`
      return inner.validate(parsed, c);
    },
    // when encoding back out, we simply JSON.stringify
    (a) => JSON.stringify(a),
  );
}

const signedTaggedJson = <C extends t.Mixed>(inner: C) =>
  t.type({
    message: taggedJson(inner),
    signature: t.string,
    recovery_id: t.number,
  });

export const transactionCodec = t.type({
  pubkey: t.string,
  nonce: t.number,
  created: t.string,
  messages: t.array(t.any),
  max_height: t.union([t.number, t.null, t.undefined]),
});

const blockCodec = t.type({
  tx: signedTaggedJson(transactionCodec),
  timestamp: t.string,
  processor: t.string,
  height: t.number,
  parent: t.string,
  framework_state: t.string,
  app_state: t.string,
  logs: t.string,
  loads: t.array(t.type({ request: t.string, response: t.string })),
});

const block = t.type({
  blockhash: t.string,
  txhash: t.string,
  block: signedTaggedJson(blockCodec),
  logs: t.array(t.array(t.string))
})

export type Block = t.TypeOf<typeof block>

export const loadBlock = async (base: string, txHash: string): Promise<Block> => {
  const response = await fetch(`${base}/block-by-tx-hash/${txHash}`);  

  const parsedData = await processResponse(response, block)

  if(isRight(parsedData)) {
    return parsedData.right
  } else {
    throw new Error(`${PathReporter.report(parsedData)}`)
  }
}

export const waitForTx = async(base: string, txHash: string) : Promise<Block> => {
  let attempt = 1
  const before = Date.now()

  while(attempt < 100) {
    try {
      return await loadBlock(base, txHash)
    } catch {
      const nextWaitTime = 1000 + (Math.floor(attempt / 10) * 1000)
      await waitFor(nextWaitTime)      
    }

    attempt += 1
  }

  const after = Date.now()

  throw new Error(`Kolme block with tx ${txHash} did not appear on the side chain after ${(after - before) / 1000} seconds`)
}

export class WithBase {
  base: string;
  
  constructor(base: string) {
    this.base = base;
  }

  async getNextNonce(kolmePublicKey: string): Promise<number> {
    return getNextNonce(this.base, kolmePublicKey)
  }

  async broadcast(inputs: BroadcastInputs): Promise<BroadcastResult> {
    return broadcast(this.base, inputs)
  }

  async loadBlock(txHash: string): Promise<Block> {
    return loadBlock(this.base, txHash)
  }

  async waitForTx(txHash: string): Promise<Block> {
    return waitForTx(this.base, txHash)
  }
}

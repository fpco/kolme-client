export type OpenProps = {
  endpoint: string;
  onOpen: () => void
  onMessage: (message: MessageEvent) => void
  onClose: () => void
}

export const open = ({ endpoint, onOpen, onClose, onMessage } : OpenProps) : WebSocket => {
  const ws = new WebSocket(endpoint);

  ws.onopen = onOpen
  ws.onmessage = onMessage
  ws.onclose = onClose

  return ws
}

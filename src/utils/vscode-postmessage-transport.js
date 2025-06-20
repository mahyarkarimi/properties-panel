import { PostMessageWindowTransport } from '@open-rpc/client-js';

export class VsCodePostMessageTransport extends PostMessageWindowTransport {
  START_LSP_COMMAND = 'lsp-create';
  CLOSE_LSP_COMMAND = 'lsp-close';
  LSP_COMMAND = 'lsp';

  constructor() {
    super();
  }

  messageHandler = (ev) => {
    const { command, payload } = ev.data;
    if (command !== this.LSP_COMMAND) return;
    this.transportRequestManager.resolveResponse(payload);
  };

  async connect() {
    if (window.vscode) {
      window.vscode.postMessage({ command: this.START_LSP_COMMAND });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    window.addEventListener('message', this.messageHandler);
  }

  isNotification(data) {
    return (data.request.id === undefined || data.request.id === null);
  };

  getNotifications(data) {
    if (data instanceof Array) {
      return data.filter((datum) => {
        return this.isNotification(datum.request);
      }).map((batchRequest) => {
        return batchRequest.request;
      });
    }
    if (this.isNotification(data)) {
      return [ data ];
    }
    return [];
  };

  async sendData(data, timeout = 5000) {
    let prom = this.transportRequestManager.addRequest(data, timeout);
    const notifications = this.getNotifications(data);
    if (window.vscode) {
      window.vscode.postMessage({ command: this.LSP_COMMAND, payload: JSON.stringify(this.parseData(data)) });
      this.transportRequestManager.settlePendingRequest(notifications);
    }
    return prom;
  }

  async close() {
    super.close();
    if (window.vscode) {
      window.vscode.postMessage({ command: this.CLOSE_LSP_COMMAND });
    }
    window.removeEventListener('message', this.messageHandler);
  }
}
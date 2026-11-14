import { Page } from '@playwright/test';

export async function installCaptions(page: Page) {
  await page.addInitScript(() => {
    (window as any).__empiyaCaption = (title: string, body = '') => {
      let root = document.getElementById('empiya-walkthrough-caption');
      if (!root) {
        root = document.createElement('div');
        root.id = 'empiya-walkthrough-caption';
        root.setAttribute(
          'style',
          [
            'position:fixed',
            'left:24px',
            'right:24px',
            'bottom:24px',
            'z-index:2147483647',
            'pointer-events:none',
            'font-family:ui-sans-serif,system-ui,sans-serif',
          ].join(';'),
        );
        document.body.appendChild(root);
      }
      root.innerHTML = `
        <div style="
          max-width:720px;
          margin:0 auto;
          background:rgba(15,23,20,0.92);
          color:#fff;
          border-radius:16px;
          padding:16px 20px;
          box-shadow:0 12px 40px rgba(0,0,0,.35);
          border:1px solid rgba(200,245,66,.35);
        ">
          <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#c8f542;font-weight:700;">
            e-Mpiya walkthrough
          </div>
          <div style="margin-top:6px;font-size:20px;font-weight:800;line-height:1.25;">${title}</div>
          ${
            body
              ? `<div style="margin-top:8px;font-size:14px;line-height:1.45;color:rgba(255,255,255,.82);">${body}</div>`
              : ''
          }
        </div>
      `;
    };
  });
}

export async function caption(page: Page, title: string, body = '') {
  await page.evaluate(
    ([t, b]) => (window as any).__empiyaCaption?.(t, b),
    [title, body] as [string, string],
  );
  await page.waitForTimeout(1600);
}

export async function installWalletMock(page: Page, address: string) {
  await page.addInitScript(addr => {
    const checksum = addr;
    const provider = {
      isMetaMask: true,
      selectedAddress: checksum,
      chainId: '0xaa36a7',
      request: async ({ method }: { method: string; params?: unknown[] }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return [checksum];
          case 'eth_chainId':
            return '0xaa36a7';
          case 'net_version':
            return '11155111';
          case 'wallet_switchEthereumChain':
          case 'wallet_addEthereumChain':
            return null;
          case 'eth_getBalance':
            return '0x56bc75e2d63100000';
          case 'personal_sign':
          case 'eth_sign':
            return '0x' + 'ab'.repeat(65);
          default:
            // Let ethers fail soft for sendTransaction etc.
            throw new Error(
              `Walkthrough wallet mock: ${method} not simulated (approve in MetaMask for live trades).`,
            );
        }
      },
      on() {},
      removeListener() {},
    };
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      get: () => provider,
    });
  }, address);
}

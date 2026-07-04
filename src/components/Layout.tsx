import type { FC, PropsWithChildren } from "hono/jsx";

const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
`;

export const Layout: FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} - 欲しいものリスト</title>
      <link rel="stylesheet" href="/style.css" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" href="/icons/icon-192.png" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      <meta name="theme-color" content="#2563eb" />
      <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
    </head>
    <body>
      <header class="app-header">
        <a href="/" class="app-title">
          欲しいものリスト
        </a>
        <nav>
          <a href="/">未購入</a>
          <a href="/purchased">購入済み</a>
          <a href="/budget">予算で選ぶ</a>
          <a href="/items/new">追加</a>
        </nav>
      </header>
      <main>{children}</main>
    </body>
  </html>
);

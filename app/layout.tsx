export const metadata = {
  title: '英単語学習アプリ',
  description: 'AI判定付きの英単語学習Webアプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-800">
        {children}
      </body>
    </html>
  );
}

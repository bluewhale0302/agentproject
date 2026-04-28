import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '게임 플레이 어시스턴트',
  description: '개인 맞춤형 게임 추천과 패치노트 요약을 제공하는 게이머용 AI 어시스턴트',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Sistema de Comissionamento Comercial',
  description: 'Sistema completo de cálculo, controle e repasse de comissões com faixas escalonadas por entrada, valor fixo, versionamento de vigência e fluxo RBAC.',
  openGraph: {
    title: 'Sistema de Comissionamento Comercial',
    description: 'Sistema completo de cálculo, controle e repasse de comissões com faixas escalonadas por entrada, valor fixo, versionamento de vigência e fluxo RBAC.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sistema de Comissionamento Comercial',
    description: 'Sistema completo de cálculo, controle e repasse de comissões com faixas escalonadas por entrada, valor fixo, versionamento de vigência e fluxo RBAC.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

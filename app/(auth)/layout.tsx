export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-glow flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {children}
      <p className="mt-8 text-center text-xs text-white/50">
        Ferramenta desenvolvida pela{" "}
        <a
          href="https://locuscompany.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-light hover:text-white"
        >
          Locus Company
        </a>
      </p>
    </div>
  );
}

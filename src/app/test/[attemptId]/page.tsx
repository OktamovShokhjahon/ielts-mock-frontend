import { TestSession } from "@/components/TestSession";

type Props = { params: Promise<{ attemptId: string }> };

export default async function TestPage({ params }: Props) {
  const { attemptId } = await params;
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="z-40 shrink-0 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-12 items-center justify-center">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            IELTS Mock Exam &mdash; do not refresh or leave this page
          </p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <TestSession attemptId={attemptId} />
      </div>
    </div>
  );
}

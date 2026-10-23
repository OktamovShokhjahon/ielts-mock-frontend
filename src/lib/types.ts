export type QuestionType = "multiple_choice" | "true_false_ng" | "fill_blank" | "matching";

export interface MatchPair {
  left: string;
  /** Present in admin/editor and when grading; omitted in exam payload. */
  right?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  matchingPairs?: MatchPair[];
}

export interface Passage {
  id: string;
  title?: string;
  content: string;
}

export interface ReadingPart {
  id: string;
  title: string;
  passage: string;
  questions: Question[];
}

export interface ListeningPart {
  id: string;
  title: string;
  audioFile: string | null;
  questions: Question[];
}

export interface WritingTask {
  id: string;
  prompt: string;
}

export interface MockSections {
  reading: { parts: ReadingPart[] };
  listening: { parts: ListeningPart[] };
  writing: { tasks: WritingTask[] };
}

export interface MockTest {
  _id: string;
  title: string;
  createdAt: string;
  isActive: boolean;
  status?: "draft" | "active";
  pinCode: string;
  timeLimits: { listeningSec: number; readingSec: number; writingSec: number };
  sections: MockSections;
}

export interface Attempt {
  _id: string;
  mockId: string;
  createdAt: string;
  /** New attempts use `fullName`. Legacy documents may only have `firstName` / `lastName`. */
  participant: { fullName?: string; firstName?: string; lastName?: string };
  answers: {
    listening: Record<string, string>;
    reading: Record<string, string>;
    writing: Record<string, string>;
  };
  scores: { listening: number | null; reading: number | null };
  bandScore: number | null;
  currentSection: "listening" | "reading" | "writing" | "done";
  sectionEndsAt: string | null;
  visibilityBlurCount: number;
  completedAt: string | null;
}

export interface DashboardStats {
  totalMocks: number;
  totalAttempts: number;
  totalParticipants: number;
  averageBand: number | null;
}

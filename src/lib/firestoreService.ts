import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { SavedChatData } from "../types";

export interface SavedExperimentData {
  id: string;
  userId: string;
  title: string;
  simType: string;
  parameters: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SolvedProblemData {
  id: string;
  userId: string;
  problem: string;
  topic?: string;
  level?: string;
  summary: string;
  finalAnswer?: string;
  steps?: Array<{
    stepNumber: number;
    title: string;
    explanation: string;
    latexMath?: string;
    numericalValue?: string;
  }>;
  createdAt: string;
}

export interface QuizAttemptData {
  id: string;
  userId: string;
  level?: string;
  domain?: string;
  topic?: string;
  score: number;
  totalQuestions: number;
  accuracy?: number;
  completedAt: string;
}

// Error Handling conforming to Firebase Skill Guidelines
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Error: ", JSON.stringify(errInfo));
  return errInfo;
}

// Legacy un-namespaced keys that need to be wiped so they never leak data between accounts
const LEGACY_STORAGE_KEYS = [
  "phy64all_saved_experiments",
  "phy64all_solved_problems",
  "phy64all_quiz_attempts",
  "phy64all_saved_chats",
];

export function cleanupLegacySharedStorage(): void {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

// Automatically wipe legacy un-namespaced storage on initialization
cleanupLegacySharedStorage();

export const isLocalUser = (userId: string): boolean =>
  !userId ||
  userId.startsWith("guest_") ||
  userId.startsWith("local_");

/**
 * Derives a strictly user-namespaced localStorage key to guarantee absolute cross-user isolation.
 */
function getUserScopedKey(userId: string, category: "experiments" | "problems" | "quizzes" | "chats"): string {
  const safeId = encodeURIComponent((userId || "anonymous").trim());
  return `phy64all_user_${safeId}_${category}`;
}

function getLocalItems<T extends { userId?: string }>(
  userId: string,
  category: "experiments" | "problems" | "quizzes" | "chats"
): T[] {
  if (!userId) return [];
  try {
    const key = getUserScopedKey(userId, category);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strict ownership verification: only return items explicitly belonging to this userId
    return parsed.filter((item) => !item.userId || item.userId === userId);
  } catch {
    return [];
  }
}

function saveLocalItems<T extends { userId?: string }>(
  userId: string,
  category: "experiments" | "problems" | "quizzes" | "chats",
  items: T[]
): void {
  if (!userId) return;
  try {
    const key = getUserScopedKey(userId, category);
    // Strict ownership filtering before persisting
    const userOnlyItems = items.filter((item) => !item.userId || item.userId === userId);
    localStorage.setItem(key, JSON.stringify(userOnlyItems));
  } catch (e) {
    console.warn("[Storage] Could not write to localStorage:", e);
  }
}

// ==========================================
// 1. Experiments Service
// ==========================================
export async function saveUserExperiment(
  userId: string,
  experiment: Omit<SavedExperimentData, "userId" | "createdAt">
): Promise<SavedExperimentData> {
  const fullData: SavedExperimentData = {
    ...experiment,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always mirror in user-scoped local cache
  const localItems = getLocalItems<SavedExperimentData>(userId, "experiments");
  const existingIdx = localItems.findIndex((i) => i.id === experiment.id);
  if (existingIdx >= 0) {
    localItems[existingIdx] = fullData;
  } else {
    localItems.unshift(fullData);
  }
  saveLocalItems(userId, "experiments", localItems.slice(0, 50));

  if (isLocalUser(userId)) {
    return fullData;
  }

  const path = `users/${userId}/savedExperiments/${experiment.id}`;
  try {
    const docRef = doc(db, "users", userId, "savedExperiments", experiment.id);
    await setDoc(docRef, fullData);
    return fullData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return fullData;
  }
}

export async function getUserExperiments(userId: string): Promise<SavedExperimentData[]> {
  if (!userId) return [];
  const localFallback = getLocalItems<SavedExperimentData>(userId, "experiments");

  if (isLocalUser(userId)) {
    return localFallback;
  }

  const path = `users/${userId}/savedExperiments`;
  try {
    const colRef = collection(db, "users", userId, "savedExperiments");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const cloudItems = snapshot.docs.map((d) => d.data() as SavedExperimentData);

    if (cloudItems.length > 0) {
      saveLocalItems(userId, "experiments", cloudItems);
      return cloudItems;
    }
    return localFallback;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return localFallback;
  }
}

export async function deleteUserExperiment(userId: string, experimentId: string): Promise<void> {
  if (!userId) return;
  const items = getLocalItems<SavedExperimentData>(userId, "experiments");
  saveLocalItems(
    userId,
    "experiments",
    items.filter((i) => i.id !== experimentId)
  );

  if (isLocalUser(userId)) return;

  const path = `users/${userId}/savedExperiments/${experimentId}`;
  try {
    const docRef = doc(db, "users", userId, "savedExperiments", experimentId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==========================================
// 2. Solved Problems Service
// ==========================================
export async function saveUserSolvedProblem(
  userId: string,
  problem: Omit<SolvedProblemData, "userId" | "createdAt">
): Promise<SolvedProblemData> {
  const fullData: SolvedProblemData = {
    ...problem,
    userId,
    createdAt: new Date().toISOString(),
  };

  const localItems = getLocalItems<SolvedProblemData>(userId, "problems");
  const existingIdx = localItems.findIndex((i) => i.id === problem.id);
  if (existingIdx >= 0) {
    localItems[existingIdx] = fullData;
  } else {
    localItems.unshift(fullData);
  }
  saveLocalItems(userId, "problems", localItems.slice(0, 50));

  if (isLocalUser(userId)) {
    return fullData;
  }

  const path = `users/${userId}/solvedProblems/${problem.id}`;
  try {
    const docRef = doc(db, "users", userId, "solvedProblems", problem.id);
    await setDoc(docRef, fullData);
    return fullData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return fullData;
  }
}

export async function getUserSolvedProblems(userId: string): Promise<SolvedProblemData[]> {
  if (!userId) return [];
  const localFallback = getLocalItems<SolvedProblemData>(userId, "problems");

  if (isLocalUser(userId)) {
    return localFallback;
  }

  const path = `users/${userId}/solvedProblems`;
  try {
    const colRef = collection(db, "users", userId, "solvedProblems");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const cloudItems = snapshot.docs.map((d) => d.data() as SolvedProblemData);
    if (cloudItems.length > 0) {
      saveLocalItems(userId, "problems", cloudItems);
      return cloudItems;
    }
    return localFallback;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return localFallback;
  }
}

export async function deleteUserSolvedProblem(userId: string, problemId: string): Promise<void> {
  if (!userId) return;
  const items = getLocalItems<SolvedProblemData>(userId, "problems");
  saveLocalItems(
    userId,
    "problems",
    items.filter((i) => i.id !== problemId)
  );

  if (isLocalUser(userId)) return;

  const path = `users/${userId}/solvedProblems/${problemId}`;
  try {
    const docRef = doc(db, "users", userId, "solvedProblems", problemId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==========================================
// 3. Quiz Attempts Service
// ==========================================
export async function saveUserQuizAttempt(
  userId: string,
  attempt: Omit<QuizAttemptData, "userId" | "completedAt">
): Promise<QuizAttemptData> {
  const fullData: QuizAttemptData = {
    ...attempt,
    userId,
    completedAt: new Date().toISOString(),
  };

  const localItems = getLocalItems<QuizAttemptData>(userId, "quizzes");
  const existingIdx = localItems.findIndex((i) => i.id === attempt.id);
  if (existingIdx >= 0) {
    localItems[existingIdx] = fullData;
  } else {
    localItems.unshift(fullData);
  }
  saveLocalItems(userId, "quizzes", localItems.slice(0, 50));

  if (isLocalUser(userId)) {
    return fullData;
  }

  const path = `users/${userId}/quizAttempts/${attempt.id}`;
  try {
    const docRef = doc(db, "users", userId, "quizAttempts", attempt.id);
    await setDoc(docRef, fullData);
    return fullData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return fullData;
  }
}

export async function getUserQuizAttempts(userId: string): Promise<QuizAttemptData[]> {
  if (!userId) return [];
  const localFallback = getLocalItems<QuizAttemptData>(userId, "quizzes");

  if (isLocalUser(userId)) {
    return localFallback;
  }

  const path = `users/${userId}/quizAttempts`;
  try {
    const colRef = collection(db, "users", userId, "quizAttempts");
    const q = query(colRef, orderBy("completedAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const cloudItems = snapshot.docs.map((d) => d.data() as QuizAttemptData);
    if (cloudItems.length > 0) {
      saveLocalItems(userId, "quizzes", cloudItems);
      return cloudItems;
    }
    return localFallback;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return localFallback;
  }
}

export async function deleteUserQuizAttempt(userId: string, attemptId: string): Promise<void> {
  if (!userId) return;
  const items = getLocalItems<QuizAttemptData>(userId, "quizzes");
  saveLocalItems(
    userId,
    "quizzes",
    items.filter((i) => i.id !== attemptId)
  );

  if (isLocalUser(userId)) return;

  const path = `users/${userId}/quizAttempts/${attemptId}`;
  try {
    const docRef = doc(db, "users", userId, "quizAttempts", attemptId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==========================================
// 4. Saved Chats & AI Tutor Conversations
// ==========================================
export async function saveUserChat(
  userId: string,
  chat: Omit<SavedChatData, "userId" | "createdAt">
): Promise<SavedChatData> {
  const fullData: SavedChatData = {
    ...chat,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const localItems = getLocalItems<SavedChatData>(userId, "chats");
  const existingIdx = localItems.findIndex((i) => i.id === chat.id);
  if (existingIdx >= 0) {
    localItems[existingIdx] = fullData;
  } else {
    localItems.unshift(fullData);
  }
  saveLocalItems(userId, "chats", localItems.slice(0, 50));

  if (isLocalUser(userId)) {
    return fullData;
  }

  const path = `users/${userId}/savedChats/${chat.id}`;
  try {
    const docRef = doc(db, "users", userId, "savedChats", chat.id);
    await setDoc(docRef, fullData);
    return fullData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return fullData;
  }
}

export async function getUserChats(userId: string): Promise<SavedChatData[]> {
  if (!userId) return [];
  const localFallback = getLocalItems<SavedChatData>(userId, "chats");

  if (isLocalUser(userId)) {
    return localFallback;
  }

  const path = `users/${userId}/savedChats`;
  try {
    const colRef = collection(db, "users", userId, "savedChats");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const cloudItems = snapshot.docs.map((d) => d.data() as SavedChatData);
    if (cloudItems.length > 0) {
      saveLocalItems(userId, "chats", cloudItems);
      return cloudItems;
    }
    return localFallback;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return localFallback;
  }
}

export async function deleteUserChat(userId: string, chatId: string): Promise<void> {
  if (!userId) return;
  const items = getLocalItems<SavedChatData>(userId, "chats");
  saveLocalItems(
    userId,
    "chats",
    items.filter((i) => i.id !== chatId)
  );

  if (isLocalUser(userId)) return;

  const path = `users/${userId}/savedChats/${chatId}`;
  try {
    const docRef = doc(db, "users", userId, "savedChats", chatId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

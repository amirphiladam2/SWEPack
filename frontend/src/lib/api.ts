import type {
  AuthResponse,
  BackendCategory,
  BackendCollection,
  BackendResource,
  BackendTag,
  AdminResourceListResponse,
  AdminResourceSummary,
  LoginInput,
  RegisterInput,
  ResourceLibraryItem,
  ResourceListResponse,
  UserProfile,
} from "@/types/backend";
import type { ResourceSubmission } from "@/types/submission";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import {
  getFirebaseAuth,
  getInitializedFirebaseAuth,
} from "@/lib/firebase";

const API_URL = "/api/backend";
export const PASSWORD_RESET_ENABLED =
  process.env.NEXT_PUBLIC_PASSWORD_RESET_ENABLED === "true";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials:
      authenticated ||
      path === "/auth/login" ||
      path === "/auth/firebase/exchange"
        ? "same-origin"
        : "omit",
  });
  if (!response.ok) {
    if (
      response.status === 401 &&
      authenticated &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("swepack-auth-expired"));
    }
    let message = "The request could not be completed.";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      // Keep the generic message when the server does not return JSON.
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

async function migrateLegacyLogin(input: LoginInput) {
  const migration = await request<{ customToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return signInWithCustomToken(getFirebaseAuth(), migration.customToken);
}

async function exchangeFirebaseCredential(
  credential: UserCredential,
) {
  const idToken = await credential.user.getIdToken();
  return request<AuthResponse>("/auth/firebase/exchange", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export async function login(input: LoginInput) {
  let credential: UserCredential;
  try {
    credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      input.email.trim().toLowerCase(),
      input.password,
    );
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    if (code !== "auth/user-not-found" && code !== "auth/invalid-credential") {
      throw error;
    }
    credential = await migrateLegacyLogin(input);
  }

  try {
    return await exchangeFirebaseCredential(credential);
  } catch (exchangeError) {
    if (
      credential.user.emailVerified ||
      !(exchangeError instanceof ApiError) ||
      exchangeError.status !== 401
    ) {
      throw exchangeError;
    }

    try {
      const migratedCredential = await migrateLegacyLogin(input);
      return await exchangeFirebaseCredential(migratedCredential);
    } catch (migrationError) {
      if (
        !(migrationError instanceof ApiError) ||
        migrationError.status !== 401
      ) {
        throw migrationError;
      }
      try {
        await sendEmailVerification(credential.user, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });
      } catch {
        throw new ApiError(
          "Verify your email before signing in. If you need another link, try again later.",
          401,
        );
      }
      throw new ApiError(
        "Verify the link sent to your email before signing in.",
        401,
      );
    }
  }
}

export async function logout() {
  const result = await request<{ message: string }>(
    "/auth/logout",
    { method: "POST" },
    true,
  );
  const firebaseAuth = getInitializedFirebaseAuth();
  if (firebaseAuth) await signOut(firebaseAuth);
  return result;
}

export function startGithubLogin() {
  window.location.assign(
    new URL("/api/auth/github/start", window.location.origin),
  );
}

export function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let firebaseResetSent = false;
  let firebaseError: unknown;

  return Promise.resolve()
    .then(() =>
      sendPasswordResetEmail(getFirebaseAuth(), normalizedEmail, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      }),
    )
    .then(() => {
      firebaseResetSent = true;
    })
    .catch((error: unknown) => {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : undefined;
      if (code !== "auth/user-not-found") firebaseError = error;
    })
    .then(() =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      }).catch((backendError: unknown) => {
        if (firebaseResetSent) {
          return {
            message:
              "If an account exists for that email, reset instructions will arrive shortly.",
          };
        }
        throw firebaseError ?? backendError;
      }),
    );
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function register(input: RegisterInput) {
  return createUserWithEmailAndPassword(
    getFirebaseAuth(),
    input.email.trim().toLowerCase(),
    input.password,
  ).then(async (credential) => {
    await updateProfile(credential.user, { displayName: input.name.trim() });
    await sendEmailVerification(credential.user, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    });
    await signOut(getFirebaseAuth());
  });
}

export function fetchCategories() {
  return request<BackendCategory[]>("/categories");
}

export function fetchTags() {
  return request<BackendTag[]>("/tags");
}

export type ResourceSort = "newest" | "title";

export type ResourceQueryOptions = {
  search: string;
  categoryId: string;
  page: number;
  sort: ResourceSort;
  signal?: AbortSignal;
};

export function fetchResources({
  search,
  categoryId,
  page,
  sort,
  signal,
}: ResourceQueryOptions): Promise<ResourceListResponse<ResourceLibraryItem>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort,
  });
  if (search) params.set("search", search);
  if (categoryId) params.set("categoryId", categoryId);
  return request<ResourceListResponse<ResourceLibraryItem>>(
    `/resources?${params.toString()}`,
    { signal },
  );
}

export function saveResource(id: string) {
  return request<{ userId: string; resourceId: string; createdAt: string }>(
    `/resources/${id}/save`,
    {
    method: "POST",
    },
    true,
  );
}

export function unsaveResource(id: string) {
  return request<{ userId: string; resourceId: string; createdAt: string }>(`/resources/${id}/save`, {
    method: "DELETE",
  }, true);
}

export function fetchSavedResources() {
  return request<Array<{ resource: BackendResource }>>("/resources/saved", {}, true);
}

export function fetchMyResources() {
  return request<BackendResource[]>("/resources/mine", {}, true);
}

export function submitResource(submission: ResourceSubmission) {
  return request<BackendResource>("/resources", {
    method: "POST",
    body: JSON.stringify(submission),
  }, true);
}

export type ResourceMetadata = {
  title?: string;
  description?: string;
  previewImageUrl?: string;
  logoUrl?: string;
  domain: string;
};

export function fetchResourceMetadata(url: string) {
  return request<ResourceMetadata>("/resources/metadata", {
    method: "POST",
    body: JSON.stringify({ url }),
  }, true);
}

export function fetchCurrentUser() {
  return request<UserProfile>("/auth/me", {}, true);
}

export function fetchAdminResources(search = "", status = "", page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return request<AdminResourceListResponse>(
    `/resources/admin?${params.toString()}`,
    {},
    true,
  );
}

export function fetchAdminSummary() {
  return request<AdminResourceSummary>("/resources/admin/summary", {}, true);
}

export function updateResourceStatus(
  id: string,
  status: BackendResource["status"],
) {
  return request<BackendResource>(`/resources/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, true);
}

export function updateResource(id: string, input: Partial<ResourceSubmission>) {
  return request<BackendResource>(`/resources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, true);
}

export function deleteResource(id: string) {
  return request<BackendResource>(`/resources/${id}`, {
    method: "DELETE",
  }, true);
}

export function createCategory(input: { name: string; description?: string }) {
  return request<BackendCategory>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  }, true);
}

export function updateCategory(
  id: string,
  input: { name?: string; description?: string },
) {
  return request<BackendCategory>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, true);
}

export function deleteCategory(id: string) {
  return request<BackendCategory>(`/categories/${id}`, {
    method: "DELETE",
  }, true);
}

export function createTag(input: { name: string }) {
  return request<BackendTag>("/tags", {
    method: "POST",
    body: JSON.stringify(input),
  }, true);
}

export function updateTag(id: string, input: { name?: string }) {
  return request<BackendTag>(`/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, true);
}

export function deleteTag(id: string) {
  return request<BackendTag>(`/tags/${id}`, {
    method: "DELETE",
  }, true);
}

export function fetchCollections() {
  return request<BackendCollection[]>("/collections", {}, true);
}

export function createCollection(input: { name: string; description?: string }) {
  return request<BackendCollection>("/collections", {
    method: "POST",
    body: JSON.stringify(input),
  }, true);
}

export function deleteCollection(id: string) {
  return request<BackendCollection>(`/collections/${id}`, {
    method: "DELETE",
  }, true);
}

export function fetchCollectionResources(id: string) {
  return request<Array<{ resource: BackendResource }>>(
    `/collections/${id}/resources`,
    {},
    true,
  );
}

export function addResourceToCollection(collectionId: string, resourceId: string) {
  return request<{ collectionId: string; resourceId: string }>(
    `/collections/${collectionId}/resources`,
    {
      method: "POST",
      body: JSON.stringify({ resourceId }),
    },
    true,
  );
}

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
  ResourceListResponse,
} from "@/types/backend";
import type { ResourceSubmission } from "@/types/submission";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "swepack-access-token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
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
  if (authenticated) {
    const token = getAccessToken();
    if (!token) throw new ApiError("Authentication required.", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    if (response.status === 401) clearAccessToken();
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

export function login(input: LoginInput) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((response) => {
    setAccessToken(response.accessToken);
    return response;
  });
}

export function register(input: RegisterInput) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchCategories() {
  return request<BackendCategory[]>("/categories");
}

export function fetchTags() {
  return request<BackendTag[]>("/tags");
}

export function fetchResources(
  search = "",
  categoryId = "",
  page = 1,
): Promise<ResourceListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (search) params.set("search", search);
  if (categoryId) params.set("categoryId", categoryId);
  return request<ResourceListResponse>(`/resources?${params.toString()}`);
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

export function submitResource(submission: ResourceSubmission) {
  return request<BackendResource>("/resources", {
    method: "POST",
    body: JSON.stringify(submission),
  }, true);
}

export function fetchCurrentUser() {
  return request<AuthResponse["user"]>("/auth/me", {}, true);
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

// postman.ts

import { DocCollection, DocRequest, DocParam, DocBody, HttpMethod } from "./types";

// Define specific types for Postman Collection and Request
interface PMKeyVal {
  key: string;
  value: string | number | boolean | undefined; // Update types based on actual values you expect
  description?: string;
  disabled?: boolean;
}

interface PMUrl {
  raw?: string;
  host?: string[];
  path?: (string | { value?: string })[];
  query?: PMKeyVal[];
  variable?: PMKeyVal[];
}

interface PMRequest {
  method?: HttpMethod;  // Use HttpMethod to restrict allowed methods
  url?: PMUrl;
  header?: PMKeyVal[];
  body?: {
    mode?: string;
    raw?: string;
    urlencoded?: PMKeyVal[];
    formdata?: PMKeyVal[];
  };
  description?: string;
}

interface PMResponse {
  code: number; // Status code (e.g., 200, 404)
  status: string; // Status message (e.g., "OK", "Not Found")
  body: string; // Response body (usually in JSON or plain text)
}

interface PMRequestNode {
  name?: string;
  request?: PMRequest;
  item?: PMRequestNode[];
  response?: PMResponse[];
  description?: string;  // Added description to PMRequestNode
  folderPath?: string[];  // Added folderPath to PMRequestNode
}

// Helper function to generate a unique id
const id = (): string => Math.random().toString(36).slice(2);

// Normalize params to DocParam format
const normParams = (arr?: PMKeyVal[]): DocParam[] | undefined =>
  arr?.filter(p => !p.disabled).map(p => ({
    key: p.key,
    value: p.value,
    description: p.description,
  }));

// Convert URL to string
const urlToString = (u?: string | PMUrl): string => {
  if (!u) return "";
  if (typeof u === "string") return u;
  if (u.raw) return u.raw;
  return "";
};

// Walk through the Postman collection nodes recursively
function walk(node: PMRequestNode, trail: string[], acc: DocRequest[]): void {
  node.item?.forEach(child => {
    if (child.item?.length) walk(child, [...trail, child.name ?? "Folder"], acc);
    if (child.request) {
      const r = child.request;
      acc.push({
        id: id(),
        name: child.name ?? "Untitled",  // Ensure that `name` has a fallback value
        method: r.method ?? "GET",  // Ensure valid HttpMethod
        url: urlToString(r.url),
        query: typeof r.url === "object" ? normParams(r.url.query) : undefined,
        headers: normParams(r.header),
        description: typeof r.description === "string" ? r.description : undefined,
        folderPath: trail.slice(1),
      });
    }
    // Check if there are responses and add them to the request
    if (child.response) {
      child.response.forEach((response: PMResponse) => {
        acc[acc.length - 1].response = acc[acc.length - 1].response || [];
        acc[acc.length - 1].response?.push({
          code: response.code,
          status: response.status,
          body: response.body,
        });
      });
    }
  });
}

// Helper function to generate a random ID
function cryptoRandomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Convert Postman collection to DocCollection
export function fromPostmanCollection(pm: { info?: { name?: string }; item?: PMRequestNode[] }): DocCollection {
  const name = pm.info?.name ?? "Postman Collection";
  const acc: DocRequest[] = [];

  pm.item?.forEach(item => {
    const name = item.name;
    const request = item.request || {};
    const description = item.description || request.description || "No description available";

    const headers = request.header?.map((h: PMKeyVal) => ({
      key: h.key,
      value: h.value,
      description: h.description,
    }));

    const query = request.url?.query?.map((q: PMKeyVal) => ({
      key: q.key,
      value: q.value,
      description: q.description,
    }));

    const body = request.body ? {
      mode: request.body.mode as 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql' | undefined,  // Use valid mode
      raw: request.body.raw,
      urlencoded: request.body.urlencoded,
      formdata: request.body.formdata,
    } : undefined;

    const pathVariables = request.url?.variable?.reduce((acc: { [key: string]: string }, v: PMKeyVal) => {
      acc[v.key] = v.value as string; // Ensure correct type handling
      return acc;
    }, {});

    const response = item.response || [];

    acc.push({
      id: cryptoRandomId(),
      name: name || 'name',
      method: request.method || "GET",
      url: request.url?.raw || "No URL",
      description: description,
      folderPath: item.folderPath || ["General"],
      headers,
      query,
      body,
      pathVariables,
      response, // Include response data
    });
  });

  return { name, items: acc };
}

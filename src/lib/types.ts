export type HttpMethod =
  | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type DocParam = { key: string; value?: string; description?: string; required?: boolean };

export type DocBody = {
  mode?: "raw"|"urlencoded"|"formdata"|"file"|"graphql";
  raw?: string;
  urlencoded?: DocParam[];
  formdata?: DocParam[];
  graphql?: { query?: string; variables?: string };
};

export type DocRequest = {
    id: string;
    name: string;
    method: HttpMethod;
    url: string;
    pathVariables?: Record<string, string>;
    query?: DocParam[];
    headers?: DocParam[];
    body?: DocBody;
    description?: string;
    folderPath: string[]; 
    response?: any[]; 
  };
  

export type DocCollection = { name: string; items: DocRequest[] };

// types.ts

// Define the allowed HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // Add more methods as needed

// Define the structure for each parameter in the request or response
export type DocParam = {
  key: string;
  value: string | number | boolean | undefined; // Update to support string, number, boolean, or undefined
  description?: string;
};

// Define the structure for a request in the documentation
export interface DocRequest {
  id: string;
  name: string;
  method: HttpMethod;  // Use HttpMethod to restrict method values
  url: string;
  query?: DocParam[];
  headers?: DocParam[];
  description?: string;
  folderPath: string[];
  response?: { code: number; status: string; body: string }[];
  pathVariables?: { [key: string]: string }; 
  body?: DocBody; 
}

// Define the structure for the body of a request
export type DocBody = {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';  // Restrict to allowed values
  raw?: string;
  urlencoded?: DocParam[];
  formdata?: DocParam[];
};

// Define the collection structure
export interface DocCollection {
  name: string;
  items: DocRequest[];
}

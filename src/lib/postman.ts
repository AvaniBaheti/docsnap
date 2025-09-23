import { DocCollection, DocRequest, DocParam, DocBody } from "./types";

type PMKeyVal = { key: string; value?: any; description?: string; disabled?: boolean };
type PMUrl = { raw?: string; host?: string[]; path?: (string|{value?:string})[]; query?: PMKeyVal[]; variable?: PMKeyVal[] };
type PMRequestNode = { name?: string; request?: any; item?: PMRequestNode[] };

const id = () => Math.random().toString(36).slice(2);

const normParams = (arr?: PMKeyVal[]): DocParam[]|undefined =>
  arr?.filter(p => !p.disabled).map(p => ({ key: p.key, value: p.value, description: p.description }));

const urlToString = (u?: string|PMUrl): string => {
  if (!u) return "";
  if (typeof u === "string") return u;
  if (u.raw) return u.raw;
  return "";
};

function walk(node: PMRequestNode, trail: string[], acc: DocRequest[]) {
  node.item?.forEach(child => {
    if (child.item?.length) walk(child, [...trail, child.name ?? "Folder"], acc);
    if (child.request) {
      const r = child.request;
      acc.push({
        id: id(),
        name: child.name ?? "Untitled",
        method: r.method ?? "GET",
        url: urlToString(r.url),
        query: typeof r.url === "object" ? normParams(r.url.query) : undefined,
        headers: normParams(r.header),
        description: typeof r.description === "string" ? r.description : undefined,
        folderPath: trail.slice(1)
      });
    }
  });
}

function cryptoRandomId() {
    return Math.random().toString(36).substring(2, 10); 
  }
  
  export function fromPostmanCollection(pm: any): DocCollection {
    const name = pm.info?.name ?? "Postman Collection";
    const acc: DocRequest[] = [];
  
    pm.item?.forEach((item: any) => {
      const name = item.name;
      const request = item.request || {};
      const description = item.description || request.description || "No description available";
  
      const headers = request.header?.map((h: any) => ({
        key: h.key,
        value: h.value,
        description: h.description,
      }));
  
      const query = request.url?.query?.map((q: any) => ({
        key: q.key,
        value: q.value,
        description: q.description,
      }));
  
      const body = request.body ? {
        mode: request.body.mode,
        raw: request.body.raw,
        urlencoded: request.body.urlencoded,
        formdata: request.body.formdata,
      } : undefined;
  
      const pathVariables = request.url?.variable?.reduce((acc: any, v: any) => {
        acc[v.key] = v.value;
        return acc;
      }, {});
  
      const response = item.response || [];
  
      acc.push({
        id: cryptoRandomId(),
        name: name,
        method: request.method || "GET",
        url: request.url?.raw || "No URL",
        description: description,
        folderPath: item.folderPath || ["General"],
        headers,
        query,
        body,
        pathVariables,
        response, 
      });
    });
  
    return { name, items: acc };
  }
  
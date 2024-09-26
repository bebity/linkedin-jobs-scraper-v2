export interface InputDto {
  title: string;
  location: string;
  rows: number;
  workType?: string;
  contractType?: string;
  experienceLevel?: string;
  companyName?: string[];
  companyId?: string[];
  publishedAt?: string;
  proxy?: {
    useApifyProxy: boolean;
    apifyProxyGroups: string[];
    apifyProxyCountry: string;
    proxyUrls: string[];
  };
}

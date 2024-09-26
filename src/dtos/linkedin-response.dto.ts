export interface LinkedinLocationResponseDto {
  trackingId: string;
  id: string;
  type: string;
  displayName: string;
}

export interface LinkedinCompanyResponseDto {
  trackingId: string;
  id: string;
  type: string;
  displayName: string;
}

export interface JobLightDto {
  id: string;
  title?: string | undefined;
  companyName?: string | undefined;
  companyURL?: string | undefined;
  publishedAt?: string | undefined;
}

export interface JobDto extends JobLightDto {
  jobUrl?: string;
  jobTitle?: string;
  companyName?: string;
  companyId?: string;
  location?: string;
  postedTime?: string;
  applicationCount?: string;
  contractType?: string;
  experienceLevel?: string;
  workType?: string;
  sector?: string;
  description?: string;
  posterProfileUrl?: string;
  posterFullName?: string;
  applyType?: string;
  applyUrl?: string;
  salary?: string;
}

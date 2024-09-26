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
  publishedDate?: string | undefined;
}

export interface JobDto extends JobLightDto {}

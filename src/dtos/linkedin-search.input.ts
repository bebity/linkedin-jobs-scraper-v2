export interface LinkedinJobSearchInputDto {
  // geoId?: string; // location get by https://linkedin.com/jobs-guest/api/typeaheadHits?query=LOCATION_YOU_WANT
  f_WT?: string; // work type
  f_JT?: string; // contract type
  f_E?: string; // experience level
  f_TPR?: string; // time posted
  f_C?: string; // company ids joined by comma
  start?: number; // start index
  location?: string; // name + geoId
}

export interface LinkedinJobSearchWithInternalFiltersInputDto
  extends LinkedinJobSearchInputDto {
  searchLocation?: string;
  searchCompany?: string;
}

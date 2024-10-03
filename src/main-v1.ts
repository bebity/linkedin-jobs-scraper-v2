// // For more information, see https://sdk.apify.com
// import Apify, { Actor, Dataset } from 'apify';
// // For more information, see https://crawlee.dev
// import { CheerioCrawler } from 'crawlee';
// import { convert } from 'html-to-text';

// const { log } = Apify;

// const option: { wordwrap: null | number } = {
//     wordwrap: null,
// };

// interface DataType {
//     id: string;
//     title: string;
//     publishedAt: string;
//     companyName: string;
//     location: string;
//     postedTime: string;
//     applicationsCount: string;
//     description: string;
//     jobUrl: string;
//     companyUrl: string;
//     contractType: string;
//     experienceLevel: string;
//     workType: string;
//     sector: string;
//     salary: string;
//     applyType?: string;
//     applyUrl?: string;
// }

// // interface LocationResponse {
// //     trackingId: string;
// //     id: string;
// //     type: string;
// //     displayName: string;
// // }

// // interface CompanyResponse {
// //     trackingId: string;
// //     id: string;
// //     type: string;
// //     displayName: string;
// // }

// // Initialize the Apify SDK
// await Actor.init();

// log.setLevel(log.LEVELS.INFO);

// const {
//     title,
//     location,
//     rows,
//     workType,
//     contractType,
//     experienceLevel,
//     companyName,
//     companyId,
//     publishedAt,
//     proxy,
//     // industry,
// } = (await Actor.getInput()) as {
//     title: string;
//     location: string;
//     rows: number;
//     workType?: string;
//     contractType?: string;
//     experienceLevel?: string;
//     companyName?: string[];
//     companyId?: string[];
//     publishedAt?: string;
//     proxy?: {
//         useApifyProxy: boolean;
//         apifyProxyGroups: string[];
//         apifyProxyCountry: string;
//         proxyUrls: string[];
//     };
//     // industry?: string[]
// };

// const companyIds: string[] = [];

// if (companyId) {
//     const cleanedCompanyId = companyId.filter((value) => {
//         const parsedValue = parseInt(value, 10);
//         if (Number.isNaN(parsedValue)) {
//             log.warning(
//                 `Company ID: ${value} seems to be invalid, be sure it's a number`,
//             );
//             return false;
//         }
//         return true;
//     });

//     companyIds.push(...cleanedCompanyId);
// }

// let geoId = '';

// const proxyConfiguration = proxy
//     ? await Actor.createProxyConfiguration({
//           useApifyProxy: proxy?.useApifyProxy,
//           apifyProxyGroups: proxy?.apifyProxyGroups,
//           apifyProxyCountry: proxy?.apifyProxyCountry,
//           proxyUrls: proxy?.proxyUrls,
//       })
//     : await Actor.createProxyConfiguration({
//           groups: ['RESIDENTIAL'],
//       });

// let errors = 0;

// let page = 0;

// // const intervalSec = Math.random() * (3 - 0.5) + 0.5;

// const miscCrawler = new CheerioCrawler({
//     proxyConfiguration,
//     maxRequestRetries: 999,
//     // keepAlive: true,
//     // navigationTimeoutSecs: 60,
//     failedRequestHandler: async ({ request, enqueueLinks, session }) => {
//         log.error(`Request ${request.url} failed too many times retrying...`);
//         await session?.retire();
//         await enqueueLinks({
//             urls: [request.url],
//             userData: { label: request.userData.label },
//         });
//         // await crwlr.addRequests([
//         //     {
//         //         url: request.url,
//         //         userData: { label: request.userData.label },
//         //     },
//         // ]);
//     },
//     useSessionPool: true,
//     ignoreSslErrors: true,
//     persistCookiesPerSession: true,
//     sessionPoolOptions: {
//         maxPoolSize: 20,
//         //     persistStateKeyValueStoreId: 'SESSION_POOL_1',
//         //   persistStateKey: 'SESSION_POOL_STATE',
//         // persistenceOptions: {
//         //     enable: true,
//         // },
//     },
//     // navigationTimeoutSecs: 60,
//     // autoscaledPoolOptions: {
//     //     minConcurrency: 1,
//     //     maxConcurrency: 10,
//     //     // maybeRunIntervalSecs: intervalSec,
//     // },
//     additionalMimeTypes: ['text/plain'],
//     async requestHandler({ request, body }) {
//         if (request.userData.label === 'COMPANY') {
//             const res = JSON.parse(body.toString());
//             if (res.length > 0) {
//                 const firstElement = res[0];
//                 companyIds.push(firstElement.id);
//             } else {
//                 log.warning(
//                     `⚠️ Company ${request.userData.companyName} not found, be sure it is written correctly. (Results may be affected) ⚠️`,
//                 );
//             }
//         } else if (request.userData.label === 'LOCATION') {
//             const res = JSON.parse(body.toString());
//             if (res.length > 0) {
//                 const firstElement = res[0];
//                 if (!firstElement?.id) {
//                     log.warning(
//                         `⚠️ Location ${location} not found, be sure it is written correctly. (Results may be affected) ⚠️`,
//                     );
//                 }
//                 log.info(
//                     `Finding for area: ${firstElement?.displayName ?? location}`,
//                 );
//                 geoId = firstElement?.id || undefined;
//             }
//         }
//     },
// });

// if (location) {
//     const locUrl = `https://linkedin.com/jobs-guest/api/typeaheadHits?query=${encodeURIComponent(
//         location,
//     )}&typeaheadType=GEO&geoTypes=POPULATED_PLACE,ADMIN_DIVISION_2,MARKET_AREA,COUNTRY_REGION`;
//     await miscCrawler.addRequests([
//         { url: locUrl, userData: { label: 'LOCATION' } },
//     ]);
//     await miscCrawler.run();
// }

// if (companyName) {
//     const companyRequests = companyName.map((e) => {
//         return {
//             url: `https://linkedin.com/jobs-guest/api/typeaheadHits?typeaheadType=COMPANY&query=${encodeURIComponent(
//                 e,
//             )}`,
//             userData: { label: 'COMPANY', companyName: e },
//         };
//     });

//     await miscCrawler.addRequests(companyRequests);
//     await miscCrawler.run();
// }

// // log.setLevel(log.LEVELS.ERROR);

// const startUrls = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
//     title,
// )}&location=${encodeURIComponent(location)}${geoId ? `&geoId=${geoId}` : ''}${
//     workType ? `&f_WT=${workType}` : ''
// }${contractType ? `&f_JT=${contractType}` : ''}${
//     experienceLevel ? `&f_E=${experienceLevel}` : ''
// }${publishedAt ? `&f_TPR=${publishedAt}` : ''}${
//     companyIds?.length > 0
//         ? `&f_C=${companyIds.map((item) => item).join(',')}`
//         : ''
// }&start=`;

// const data: DataType[] = [];
// const crawler = new CheerioCrawler({
//     proxyConfiguration,
//     maxRequestRetries: 999,
//     // keepAlive: true,
//     // navigationTimeoutSecs: 60,
//     failedRequestHandler: async ({ request, enqueueLinks }) => {
//         log.error(`Request ${request.url} failed too many times retrying...`);
//         await enqueueLinks({
//             urls: [request.url],
//             userData: { label: request.userData.label },
//         });
//         // await crwlr.addRequests([
//         //     {
//         //         url: request.url,
//         //         userData: { label: request.userData.label },
//         //     },
//         // ]);
//     },
//     useSessionPool: true,
//     ignoreSslErrors: true,
//     persistCookiesPerSession: true,
//     sessionPoolOptions: {
//         maxPoolSize: 20,
//         //     persistStateKeyValueStoreId: 'SESSION_POOL_1',
//         //   persistStateKey: 'SESSION_POOL_STATE',
//         // persistenceOptions: {
//         //     enable: true,
//         // },
//     },
//     // navigationTimeoutSecs: 60,
//     // autoscaledPoolOptions: {
//     //     minConcurrency: 1,
//     //     maxConcurrency: 10,
//     //     // maybeRunIntervalSecs: intervalSec,
//     // },
//     additionalMimeTypes: ['text/plain'],
//     async requestHandler({ $, request, response, session }) {
//         if (request.userData.label === 'LIST') {
//             const lis = $('li');
//             for (let i = 0; i < lis.length; i++) {
//                 const el = lis[i];
//                 const id: string | undefined = $(el)
//                     .find('[data-entity-urn]')
//                     .attr('data-entity-urn')
//                     .split(':')[3];
//                 const url =
//                     'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/';
//                 if (id) {
//                     data.push({
//                         id,
//                         publishedAt:
//                             $(el)
//                                 .find('.job-search-card__listdate')
//                                 .attr('datetime') ?? '',
//                         salary:
//                             $(el)
//                                 .find('.job-search-card__salary-info')
//                                 .text()
//                                 .replace(/\s/g, '') ?? '',
//                         title: 'e',
//                         jobUrl: '',
//                         companyName: '',
//                         companyUrl: '',
//                         location: '',
//                         postedTime: '',
//                         applicationsCount: '',
//                         description: '',
//                         contractType: '',
//                         experienceLevel: '',
//                         workType: '',
//                         sector: '',
//                     });
//                     await crawler.addRequests([
//                         {
//                             url: encodeURI(url + id),
//                             userData: { label: 'DETAILS' },
//                         },
//                     ]);
//                 }
//             }

//             // check if page length is 0
//             if (lis.length === 0 && response.statusCode === 200) {
//                 errors += 1;
//             }

//             // check if there are more than 3 blank pages
//             if (errors >= 3) {
//                 log.info(
//                     'No more pages to scrape, finishing jobs before ending',
//                 );
//             }

//             if (page < rows - 10 && errors < 3) {
//                 await crawler.addRequests([
//                     {
//                         url: startUrls + (page += 10),
//                         userData: { label: 'LIST' },
//                     },
//                 ]);
//             }
//         } else if (request.userData.label === 'DETAILS') {
//             const job = data.find(
//                 (el) => el.id === request.url.split('/').pop(),
//             );

//             const profileUrl =
//                 $('.message-the-recruiter__cta').attr('href') ?? '';
//             const encodedUrl = decodeURIComponent(profileUrl);
//             const urlParams = new URLSearchParams(encodedUrl.split('?')[1]);
//             const redirectUrl = urlParams.get('session_redirect') || '';
//             let posterProfileUrl = '';
//             if (redirectUrl) posterProfileUrl = redirectUrl;

//             const jobUrl =
//                 $(
//                     'a[data-tracking-control-name="public_jobs_topcard-title"]',
//                 ).attr('href') ?? '';

//             const matchResultForCompanyId = $('h4 > a')
//                 ?.attr?.('href')
//                 ?.match?.(/facetCurrentCompany%3D(\d+)/);

//             const findedCompanyId = matchResultForCompanyId
//                 ? matchResultForCompanyId[1] || ''
//                 : '';

//             const applyUrlExternal = $('code#applyUrl')?.html();
//             const urlMatch = applyUrlExternal?.match(/https?:\/\/[^\s"]+/);

//             if (urlMatch) {
//                 try {
//                     const url = new URL(urlMatch[0]);
//                     const params = new URLSearchParams(url.search);
//                     job.applyUrl = params.get('url');
//                     job.applyType = 'EXTERNAL';
//                 } catch (error) {
//                     log.error('Error parsing external apply url', error);
//                 }
//             } else {
//                 job.applyType = 'EASY_APPLY';
//                 job.applyUrl = jobUrl;
//             }

//             const formatedDesc = $(
//                 'div.show-more-less-html__markup--clamp-after-5',
//             ).html();

//             if (!job) {
//                 session.retire();
//                 throw new Error('Job not found, retrying...');
//             }

//             const postedTime =
//                 $('.posted-time-ago__text.topcard__flavor--metadata')
//                     .text()
//                     .trim()
//                     .replace(/\n/g, '') ?? '';

//             if (!job?.publishedAt && postedTime) {
//                 // it means job has been published less than 24 hours ago so we set the date to now YYYY-MM-DD
//                 job.publishedAt = new Date().toISOString().split('T')[0];
//             }

//             Object.assign(job, {
//                 title:
//                     $('.topcard__title').text().trim().replace(/\n/g, '') ?? '',
//                 companyName:
//                     $('.topcard__org-name-link')
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 location:
//                     $('.topcard__flavor:eq(1)')
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 postedTime:
//                     $('.posted-time-ago__text.topcard__flavor--metadata')
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 applicationsCount:
//                     $('.num-applicants__caption')
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 description: convert(formatedDesc, option) ?? '',
//                 jobUrl,
//                 companyUrl:
//                     $(
//                         'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
//                     ).attr('href') ?? '',
//                 contractType:
//                     $(
//                         '.description__job-criteria-list .description__job-criteria-item:nth-child(2) .description__job-criteria-text',
//                     )
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 experienceLevel:
//                     $(
//                         '.description__job-criteria-list .description__job-criteria-item:nth-child(1) .description__job-criteria-text',
//                     )
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 workType:
//                     $(
//                         '.description__job-criteria-list .description__job-criteria-item:nth-child(3) .description__job-criteria-text',
//                     )
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 sector:
//                     $(
//                         '.description__job-criteria-list .description__job-criteria-item:nth-child(4) .description__job-criteria-text',
//                     )
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//                 companyId: findedCompanyId,
//                 posterProfileUrl,
//                 posterFullName:
//                     $('.base-main-card__title')
//                         .text()
//                         .trim()
//                         .replace(/\n/g, '') ?? '',
//             } as Partial<DataType>);

//             // eslint-disable-next-line @typescript-eslint/no-unused-vars
//             const { id, ...jobs } = job;

//             await Dataset.pushData(jobs);
//         }
//     },
// });

// // console.log('Start URL:', startUrls);

// await crawler.addRequests([
//     {
//         url: startUrls + page,
//         userData: { label: 'LIST' },
//     },
// ]);

// await crawler.run();

// await Actor.exit('Scraping finished.');

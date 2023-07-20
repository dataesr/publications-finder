const {
  VITE_BSO_AUTH,
  VITE_BSO_SIZE,
  VITE_BSO_URL,
  VITE_OPENALEX_SIZE,
  VITE_OPENALEX_PER_PAGE,
} = import.meta.env;

const VITE_OPENALEX_MAX_PAGE = Math.floor(VITE_OPENALEX_SIZE / VITE_OPENALEX_PER_PAGE);

const getBsoQuery = (options) => {
  const query = { size: VITE_BSO_SIZE, query: { bool: { filter: [], must: [], must_not: [], should: [] } } };
  options.affiliations.forEach((affiliation) => {
    query.query.bool.should.push({ match: { 'affiliations.name': { query: `"${affiliation}"`, operator: 'and' } } });
  });
  options.authors.forEach((author) => {
    query.query.bool.should.push({ match: { 'authors.full_name': { query: `"${author}"`, operator: 'and' } } });
  });
  options.affiliationsToExclude.forEach((affiliationToExclude) => {
    query.query.bool.must_not.push({ match: { 'affiliations.name': { query: affiliationToExclude, operator: 'and' } } });
  });
  options.authorsToExclude.forEach((authorToExclude) => {
    query.query.bool.must_not.push({ match: { 'authors.full_name': { query: authorToExclude, operator: 'and' } } });
  });
  options.affiliationsToInclude.forEach((affiliationToInclude) => {
    query.query.bool.must.push({ match: { 'affiliations.name': { query: `"${affiliationToInclude}"`, operator: 'and' } } });
  });
  if (options?.startYear && options?.endYear) {
    query.query.bool.filter.push({ range: { year: { gte: options.startYear, lte: options.endYear } } });
  } else if (options?.startYear) {
    query.query.bool.filter.push({ range: { year: { gte: options.startYear } } });
  } else if (options?.endYear) {
    query.query.bool.filter.push({ range: { year: { lte: options.endYear } } });
  }
  query.highlight = { fields: { 'affiliations.name': {}, 'authors.full_name': {} } };
  query.query.bool.filter.push({ terms: { 'external_ids.id_type': options.dataIdentifiers } });
  query.query.bool.minimum_should_match = 1;
  query._source = ['affiliations', 'authors', 'doi', 'external_ids', 'genre', 'hal_id', 'id', 'title', 'year'];
  return query;
};

const getBsoData = (options) => {
  const params = {
    method: 'POST',
    body: JSON.stringify(getBsoQuery(options)),
    headers: {
      'content-type': 'application/json',
      Authorization: VITE_BSO_AUTH,
    },
  };
  return fetch(VITE_BSO_URL, params)
    .then((response) => {
      if (response.ok) return response.json();
      return 'Oops... BSO API request did not work';
    })
    .then((response) => ({
      datasource: 'bso',
      total: response?.hits?.total?.value ?? 0,
      results: (response?.hits?.hits ?? []).map((result) => ({
        ...result._source,
        allIds: result?._source?.external_ids ?? [],
        authors: result?._source?.authors ?? [],
        datasource: 'bso',
        highlight: result.highlight,
        identifier: result?._source?.doi ?? result?._source?.hal_id ?? result._source.id,
      })),
    }));
};

const getIdentifierValue = (identifier) => (identifier ? identifier.replace('https://doi.org/', '').replace('https://openalex.org/', '') : null);

const getIdentifierLink = (type, identifier) => {
  let prefix = null;
  switch (type) {
  case 'crossref':
  case 'doi':
    prefix = 'https://doi.org/';
    break;
  case 'hal_id':
    prefix = 'https://hal.science/';
    break;
  case 'openalex':
    prefix = 'https://openalex.org/';
    break;
  case 'pmcid':
  case 'pmid':
    prefix = '';
    break;
  default:
  }
  return (prefix !== null) ? `${prefix}${identifier}` : false;
};

const getOpenAlexData = (options, page = '1', previousResponse = []) => {
  let url = `https://api.openalex.org/works?mailto=bso@recherche.gouv.fr&per_page=${Math.min(VITE_OPENALEX_SIZE, VITE_OPENALEX_PER_PAGE)}`;
  url += '&filter=is_paratext:false';
  if (options?.startYear && options?.endYear) {
    url += `,publication_year:${Number(options.startYear)}-${Number(options?.endYear)}`;
  } else if (options?.startYear) {
    url += `,publication_year:${Number(options.startYear)}-`;
  } else if (options?.endYear) {
    url += `,publication_year:-${Number(options.endYear)}`;
  }
  if (options.affiliations.length > 0 || options.affiliationsToExclude.length > 0) {
    url += ',raw_affiliation_string.search:';
    if (options.affiliations.length > 0) url += `(${options.affiliations.map((aff) => `"${aff}"`).join(' OR ')})`;
    if (options.affiliationsToExclude.length > 0) url += `${options.affiliationsToExclude.map((aff) => ` AND NOT ${aff}`).join('')}`;
    if (options.affiliationsToInclude.length > 0) url += `${options.affiliationsToInclude.map((aff) => ` AND "${aff}"`).join('')}`;
  }
  url += '&select=authorships,display_name,doi,id,ids,publication_year,type';
  return fetch(`${url}&page=${page}`)
    .then((response) => {
      if (response.ok) return response.json();
      return 'Oops... OpenAlex API request did not work';
    })
    .then((response) => {
      const results = [...previousResponse, ...response.results];
      const nextPage = Number(page) + 1;
      if (Number(response.results.length) === Number(VITE_OPENALEX_PER_PAGE) && nextPage <= VITE_OPENALEX_MAX_PAGE) {
        return getOpenAlexData(options, nextPage, results);
      }
      return ({ total: response.meta.count, results });
    })
    .then((response) => ({
      datasource: 'openalex',
      total: response.total,
      results: response.results.map((item) => ({
        affiliations: item?.authorships?.map((author) => ({ name: author.raw_affiliation_strings })) ?? item.affiliations,
        authors: item?.authorships?.map((author) => ({ ...author, full_name: author.author.display_name })) ?? item.authors,
        datasource: 'openalex',
        doi: getIdentifierValue(item?.doi),
        genre: item?.type ?? item.genre,
        id: item.id,
        identifier: item?.doi ? getIdentifierValue(item.doi) : item.id,
        allIds: item?.ids ? Object.keys(item.ids).map((key) => ({ id_type: key, id_value: getIdentifierValue(item.ids[key]) })) : item.allIds,
        title: item?.display_name ?? item.title,
        year: item?.publication_year ?? item.year,
      })),
    }));
};

const mergePublications = (publi1, publi2) => ({
  ...[publi1, publi2].find((publi) => publi.datasource === 'bso'),
  affiliations: [...publi1.affiliations, ...publi2.affiliations],
  allIds: [...publi1.allIds, ...publi2.allIds],
  authors: [...publi1.authors, ...publi2.authors],
  datasource: 'bso, openalex',
});

export {
  getBsoData,
  getIdentifierLink,
  getIdentifierValue,
  getOpenAlexData,
  mergePublications,
};